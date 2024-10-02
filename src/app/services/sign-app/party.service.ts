import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { concatMap, map, mapTo, shareReplay } from 'rxjs/operators';
import { of } from 'rxjs';
import { SignService } from './sign.service';
import { PayService } from './pay.service';
import { Store } from '../../state/store';
import { updateParty } from '../../state/actions/party';
import { Party, RoleEnum } from './party.interface';
import { Binder } from './binder.interface';
import { partyHasInputs, partyHasRole } from '../../state/selectors';
import { PaymentAgreement, PaymentAgreementStatus } from './payment-agreement.interface';
import { State } from '../../state/reducers/main.interface';

interface PartyRolesDetails {
  readonly isSigner: boolean;
  readonly isPayee: boolean;
  readonly isPayer: boolean;
  readonly isMissingSignerRole: boolean;
  readonly isMissingPayeeRole: boolean;
  readonly isMissingPayerRole: boolean;
  readonly hasSignerRoleByMistake: boolean;
  readonly hasPayeeRoleByMistake: boolean;
  readonly hasPayerRoleByMistake: boolean;
  readonly isTemporary: boolean;
}

@Injectable()
export class PartyService {
  constructor(
    private readonly binderService: SignService,
    private readonly payService: PayService,
    private readonly store: Store
  ) {}

  /**
   * Returns a party with its roles corrected to match the source(s) of truth. Always returns a new Party instance with
   * a new roles array.
   *
   * It will not modify roles relating to a source if that source is not provided. Ie. if you were to supply only a
   * binder, this method will add/remove Signer roles as necessary but not add or remove any Payer/Payee role.
   * It will still remove any duplicate roles. If no sources are supplied then it will only remove duplicate roles.
   * @param party - The party to check
   * @param binder - If provided the party's roles will be checked against the Binder roles (Signer)
   * @param paymentAgreement - If provided the party's roles will be checked against the PaymentAgreement roles (Payee, Payer)
   */
  public static fixRoles<P extends Pick<Party, 'id' | 'reference' | 'roles' | 'isTemporary'>>(
    party: P,
    { binder, paymentAgreement }: { binder?: Binder; paymentAgreement?: Readonly<PaymentAgreement> | null }
  ): { updated: boolean; party: P } {
    const deDuplicatedParty = PartyService.removeDuplicateRoles(party);
    const roles = PartyService.getPartyRolesDetails(deDuplicatedParty, { binder, paymentAgreement });
    const isMissingRole = roles.isMissingPayeeRole || roles.isMissingPayerRole || roles.isMissingSignerRole;
    const hasRoleByMistake = roles.hasPayeeRoleByMistake || roles.hasPayerRoleByMistake || roles.hasSignerRoleByMistake;

    if (isMissingRole || hasRoleByMistake) {
      if (hasRoleByMistake) {
        deDuplicatedParty.roles = deDuplicatedParty.roles.filter((thisRole) => {
          if (thisRole === RoleEnum.Payee) {
            return !roles.hasPayeeRoleByMistake;
          }
          if (thisRole === RoleEnum.Payer) {
            return !roles.hasPayerRoleByMistake;
          }
          if (thisRole === RoleEnum.Signer) {
            return !roles.hasSignerRoleByMistake;
          }
          return true;
        });
      }
      if (roles.isMissingPayeeRole) {
        deDuplicatedParty.roles.push(RoleEnum.Payee);
      }
      if (roles.isMissingPayerRole) {
        deDuplicatedParty.roles.push(RoleEnum.Payer);
      }
      if (roles.isMissingSignerRole) {
        deDuplicatedParty.roles.push(RoleEnum.Signer);
      }

      return {
        updated: true,
        party: deDuplicatedParty,
      };
    }

    return {
      updated: deDuplicatedParty.roles.length !== party.roles.length,
      party: deDuplicatedParty,
    };
  }

  /**
   * Can the party be deleted without affecting the Payment Agreement?
   *
   * Is the party <em>not</em> referenced in other data entities?
   * @param party
   */
  isDeletePartySafe(party: Readonly<Party>): boolean {
    const { paymentAgreement } = this.store.getState();
    const partyDetails = PartyService.getPartyRolesDetails(party, { paymentAgreement });
    return !(partyDetails.isPayee || partyDetails.isPayer);
  }

  /**
   * Make sure that the parties have the correct roles, real IDs and still referenced correctly in payment agreements.
   * It <em>will</em> update the binder using the API, so whatever is in the binder will be saved. The store will be
   * updated with the updated binder.
   */
  ensurePartyRefIntegrity(): Observable<State> {
    const state = this.store.getState();
    const { binder, paymentAgreement } = state;
    if (binder.status === 'IN_PREPARATION') {
      this.updatePartyRoles(binder, paymentAgreement);
      return this.binderService.updateBinder().pipe(
        concatMap(() => this.updatePaymentAgreement(binder, paymentAgreement)),
        shareReplay(),
        map(() => this.store.getState())
      );
    }
    return of(state);
  }

  /**
   * Updates the parties' roles in the store. It does <em>not</em> update the binder through the API.
   */
  private updatePartyRoles(binder: Binder, paymentAgreement: Readonly<PaymentAgreement> | null): void {
    const { updatedParties } = PartyService.fixRolesForParties(binder.parties, binder, paymentAgreement);
    updatedParties.forEach((party) => this.store.dispatch(updateParty(party)));
  }

  /**
   * Update the payment agreement if some of the parties in it are getting new IDs.
   *
   * If the Payment Agreement is to change, then it will be saved using the API in this method.
   */
  private updatePaymentAgreement(
    originalBinder: Binder,
    paymentAgreement: Readonly<PaymentAgreement> | null
  ): Observable<{ updatedPaymentAgreement: boolean }> {
    if (paymentAgreement === null) {
      return of({ updatedPaymentAgreement: false });
    }

    if (paymentAgreement.status === PaymentAgreementStatus.DeletedLocally) {
      return this.payService.deletePaymentAgreement(paymentAgreement).pipe(mapTo({ updatedPaymentAgreement: true }));
    }
    const partiesGettingNewIDs = originalBinder.parties.filter((originalParty) => {
      const roles = PartyService.getPartyRolesDetails(originalParty, { binder: originalBinder, paymentAgreement });
      return (roles.isPayee || roles.isPayer) && (roles.isTemporary || originalParty.emailChanged);
    });

    if (partiesGettingNewIDs.length > 0) {
      const amendedAgreement = PartyService.updatePaymentAgreementWithUpdatedParties(
        partiesGettingNewIDs,
        this.store.getState().binder.parties,
        paymentAgreement
      );
      return this.payService.deletePaymentAgreement(paymentAgreement).pipe(
        concatMap(() => {
          if (paymentAgreement.status === PaymentAgreementStatus.DeletedLocally) {
            // don't revive the agreement
            of(undefined);
          }
          return this.payService.createPaymentAgreement(amendedAgreement);
        }),
        mapTo({ updatedPaymentAgreement: true })
      );
    }

    return of({ updatedPaymentAgreement: false });
  }

  private static fixRolesForParties(
    parties: Party[],
    binder: Binder,
    paymentAgreement: PaymentAgreement | null
  ): { updatedParties: Party[] } {
    const updatedParties = parties.reduce((accumulator, party) => {
      const update = PartyService.fixRoles(party, { binder, paymentAgreement });
      if (update.updated) {
        return [...accumulator, update.party];
      }
      return accumulator;
    }, [] as Party[]);
    return { updatedParties };
  }

  private static removeDuplicateRoles<P extends Pick<Party, 'roles'>>(party: P): P {
    return {
      ...party,
      roles: party.roles.filter((role, index) => {
        return party.roles.indexOf(role) === index;
      }),
    };
  }

  /**
   * Get the low-down on a Party's roles:
   * * Which roles the data says it has,
   * * Which roles it should have but are missing from its <code>roles</code> array,
   * * Which roles are in its <code>roles</code> array but shouldn't be.
   */
  private static getPartyRolesDetails(
    party: Readonly<Pick<Party, 'id' | 'reference' | 'roles' | 'isTemporary'>>,
    { binder, paymentAgreement }: { binder?: Binder; paymentAgreement?: Readonly<PaymentAgreement> | null }
  ): PartyRolesDetails {
    const { payers, payees } = PartyService.getPartiesFromPaymentAgreement(paymentAgreement);

    const isPayee = !!party.id && payees.includes(party.id);
    const hasPayeeRole = partyHasRole(party, RoleEnum.Payee);
    const isPayer = !!party.id && payers.includes(party.id);
    const hasPayerRole = partyHasRole(party, RoleEnum.Payer);
    const isSigner = binder && party.reference ? partyHasInputs(party.reference, { binder }) : false;
    const hasSignerRole = partyHasRole(party, RoleEnum.Signer);

    const isMissingPayeeRole = isPayee && !hasPayeeRole;
    const isMissingPayerRole = isPayer && !hasPayerRole;
    const isMissingSignerRole = isSigner && !hasSignerRole;

    const hasPayeeRoleByMistake = !!paymentAgreement && hasPayeeRole && !isPayee;
    const hasPayerRoleByMistake = !!paymentAgreement && hasPayerRole && !isPayer;
    const hasSignerRoleByMistake = !!binder && hasSignerRole && !isSigner;

    const isTemporary = (isPayee || isPayer) && party.isTemporary;

    return {
      isPayee,
      isPayer,
      isSigner,
      isMissingPayeeRole,
      isMissingPayerRole,
      isMissingSignerRole,
      hasPayeeRoleByMistake,
      hasPayerRoleByMistake,
      hasSignerRoleByMistake,
      isTemporary,
    };
  }

  /**
   * Get the parties in a payment agreement.
   */
  private static getPartiesFromPaymentAgreement(
    paymentAgreement?: Readonly<PaymentAgreement> | null
  ): { payers: string[]; payees: string[] } {
    if (!paymentAgreement || paymentAgreement.status === PaymentAgreementStatus.DeletedLocally) {
      return { payers: [], payees: [] };
    }
    return paymentAgreement.payments.reduce(
      ({ payers, payees }, payment) => {
        const ins = payment.ins.map((paymentIn) => paymentIn.partyId);
        const outs = payment.outs.map((paymentOut) => paymentOut.partyId);
        return { payers: [...payers, ...ins], payees: [...payees, ...outs] };
      },
      { payers: [] as string[], payees: [] as string[] }
    );
  }

  private static updatePaymentAgreementWithUpdatedParties(
    editedOldParties: Readonly<Party>[],
    newParties: Readonly<Party>[],
    paymentAgreement: Readonly<PaymentAgreement>
  ): PaymentAgreement {
    const updatePartyMapper = <T extends { partyId: string }>(withPartyID: T) => {
      const oldParty = editedOldParties.find((party) => party.id === withPartyID.partyId);
      if (oldParty) {
        const newParty = newParties.find((party) => party.reference === oldParty.reference);
        if (!newParty) {
          // eslint-disable-next-line no-console
          console.warn(
            `A party to a payment agreement is gone! "${oldParty.reference}" was scheduled for a new ID, but` +
              ' that reference could not be found in the current binder.'
          );
        }
        return {
          ...withPartyID,
          partyId: newParty?.id ?? '',
        };
      }
      return withPartyID;
    };

    return {
      ...paymentAgreement,
      payments: paymentAgreement.payments.map((payment) => {
        return {
          ...payment,
          ins: [...payment.ins.map(updatePartyMapper)],
          outs: [...payment.outs.map(updatePartyMapper)],
          fees: [
            ...payment.fees.map((fee) => ({
              ...fee,
              breakdown: fee.breakdown.map(updatePartyMapper),
            })),
          ],
        };
      }),
    };
  }
}
