// eslint-disable-next-line max-classes-per-file
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { CurrencyPipe } from '@angular/common';
import { Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of, Subject } from 'rxjs';

import { catchError, concatMap, map, mapTo, takeUntil, tap } from 'rxjs/operators';
import { ValidateOnSubmitFormControl } from '../forms/validate-on-submit';
import { makeBlockBoundBEMFunction } from '../../../common/utility-components/util-functions';
import { PayService } from '../../../services/sign-app/pay.service';
import { Store } from '../../../state/store';
import { getCurrentParty, partyHasRole } from '../../../state/selectors';
import {
  PartyLinkedPayment,
  PaymentAgreement,
  PaymentAgreementFee,
  PaymentAmount,
} from '../../../services/sign-app/payment-agreement.interface';
import { Party, RoleEnum } from '../../../services/sign-app/party.interface';
import { SignService } from '../../../services/sign-app/sign.service';
import {
  clearTemporaryPaymentAgreement,
  setTemporaryPaymentAgreementPayee,
  setTemporaryPaymentAgreementPayer,
} from '../../../state/actions/temporary-payment-agreement';
import { AlertService } from '../../../services/sign-app/alert.service';
import { CloseReason, ModalControlService } from '../../../services/sign-app/modal-control.service';
import { updateBinder } from '../../../state/actions/sign';
import { removeParty, updateParty } from '../../../state/actions/party';
import { TrackingPublisher } from '../../tracking/publisher';
import { SearchParamsService } from '../../../services/sign-app/search-params.service';
import { Binder } from '../../../services/sign-app/binder.interface';

@Component({
  animations: [
    trigger('openCloseRate', [
      state(
        'open',
        style({
          height: '*',
          marginTop: '*',
          opacity: '1',
        })
      ),
      state(
        'closed',
        style({
          height: '0px',
          marginTop: '0px',
          opacity: '0',
        })
      ),
      transition('open <=> closed', [animate('200ms ease-in-out')]),
    ]),
  ],
  providers: [CurrencyPipe],
  selector: 'rl-payment-details-modal',
  styleUrls: ['./payment-details-modal.component.scss'],
  templateUrl: './payment-details-modal.component.html',
})
export class PaymentDetailsModalComponent implements OnChanges, OnInit {
  @Input()
  currencyCode: string;
  @Input()
  fee: number | undefined;
  @Input()
  receiveAmount: number | undefined;
  @Input()
  payeeTableHeaderText: string;
  @Input()
  error: string | undefined;
  @Input()
  loading = false;

  @Output()
  calculateClick = new EventEmitter<number | null>();
  @Output()
  confirmClick = new EventEmitter<void>();

  /**
   * Payment amount minimum
   * $1
   */
  static readonly paymentAmountMin = 1.0;
  /**
   * Payment amount maximum
   * $10k (10 thousand)
   */
  static readonly paymentAmountMax = 10000.0;

  readonly amountControl = new ValidateOnSubmitFormControl(this.formatCurrency(0), {
    validators: [
      Validators.required,
      // can't use Validators.max() and Validators.min() because the control value is a formatted currency string and
      // not a number. this.amount is a number, so we can use that in a custom validator which mimics max and min.
      () => {
        if (this.amount > PaymentDetailsModalComponent.paymentAmountMax) {
          return {
            max: {
              max: PaymentDetailsModalComponent.paymentAmountMax,
              actual: this.amount,
            },
          };
        }
        return null;
      },
      () => {
        if (
          this.amount === null ||
          this.amount === undefined ||
          this.amount < PaymentDetailsModalComponent.paymentAmountMin
        ) {
          return {
            min: {
              min: PaymentDetailsModalComponent.paymentAmountMin,
              actual: this.amount,
            },
          };
        }
        return null;
      },
    ],
  });
  readonly bem = makeBlockBoundBEMFunction('rl-payment-details-modal');
  feeFormatted = '';
  maxErrorMessage = '';
  minErrorMessage = '';
  receiveAmountFormatted = '';
  showFee = false;

  private amount: number | null = null;
  private invalidAmountCharacters: RegExp | undefined;

  feeIsVisible = false; // maybe not needed

  constructor(private readonly currencyPipe: CurrencyPipe, private readonly translateService: TranslateService) {}

  ngOnChanges({ fee, receiveAmount }: SimpleChanges): void {
    if (fee) {
      this.feeFormatted = this.formatCurrency(fee.currentValue ?? 0);
    }
    if (receiveAmount) {
      this.receiveAmountFormatted = this.formatCurrency(receiveAmount.currentValue ?? 0);
    }
    this.showFee = this.fee !== undefined && this.receiveAmount !== undefined;
  }

  ngOnInit(): void {
    this.invalidAmountCharacters = /[^[\-.\d]]/g;
    this.translateService
      .get('payment-details-modal.error-below-min', {
        min: this.formatCurrency(PaymentDetailsModalComponent.paymentAmountMin),
      })
      .subscribe((message) => {
        this.minErrorMessage = message;
      });
    this.translateService
      .get('payment-details-modal.error-above-max', {
        max: this.formatCurrency(PaymentDetailsModalComponent.paymentAmountMax),
      })
      .subscribe((message) => {
        this.maxErrorMessage = message;
      });
  }

  clearInput(): void {
    if (this.amountControl.submitted) {
      this.amountControl.markAsNotSubmitted();
    }
    this.amountControl.setValue('');
    this.calculateClick.emit(null);
  }

  formatInput(): void {
    if (this.amountControl.value.trim() === '') {
      const formatted = this.formatCurrency(0);
      this.amount = 0;
      this.amountControl.setValue(formatted);
      return;
    }

    const amount = this.getAmountFromControl();
    if (Number.isNaN(amount)) {
      this.amount = null;
    } else {
      this.amount = amount;
      const formatted = this.formatCurrency(this.amount);
      this.amountControl.setValue(formatted);
    }
  }

  primaryCTAClick(): void {
    this.amountControl.markAsSubmitted();
    if (this.amountControl.valid) {
      if (this.showFee) {
        this.confirmClick.emit();
      } else {
        this.calculateClick.emit(this.amount);
      }
    }
  }

  private formatCurrency(value: number | string | null | undefined): string {
    return this.currencyPipe.transform(value, this.currencyCode, 'symbol', '1.2');
  }

  private getAmountFromControl(): number {
    const value = this.amountControl.value.replace(this.invalidAmountCharacters, '');
    return parseFloat(value);
  }

  animationStarted(): void {
    // whether hiding or showing, the fee is visible when the animation starts
    this.feeIsVisible = true;
  }
  animationFinished(): void {
    // when the animation finished, the fee will be visible when showFee is true and hidden when it is false
    this.feeIsVisible = this.showFee;
  }
}

@Component({
  selector: 'rl-payment-details-connected-modal',
  template:
    '<rl-payment-details-modal [currencyCode]="currencyCode" [error]="error" [fee]="fee" [loading]="loading" [payeeTableHeaderText]="payeeTableHeaderText" [receiveAmount]="receiveAmount" (calculateClick)="calculateFee($event)" (confirmClick)="savePaymentAgreement()"></rl-payment-details-modal>',
})
export class PaymentDetailsConnectedModalComponent implements OnDestroy, OnInit {
  readonly currencyCode: string;
  error: string | undefined;
  fee: number | undefined;
  loading = false;
  payAmount: number | undefined;
  payeeTableHeaderText = '';
  receiveAmount: number | undefined;

  private readonly destroy = new Subject<void>();
  private readonly userIsLawyer: boolean;
  private generalError = '';

  private static findPartyByReference<P extends Party>(reference: Party['reference'], parties: P[]): P {
    return parties.find((party) => party.reference === reference);
  }

  constructor(
    private readonly alertService: AlertService,
    private readonly eventTracker: TrackingPublisher,
    private readonly modalControlService: ModalControlService,
    private readonly payService: PayService,
    private readonly signService: SignService,
    private readonly store: Store,
    private readonly translateService: TranslateService,
    searchParams: SearchParamsService
  ) {
    this.currencyCode = 'USD';
    this.userIsLawyer = searchParams.has('isLawyer');
  }

  ngOnInit(): void {
    this.getPayeeTableHeaderText().subscribe((text) => {
      this.payeeTableHeaderText = text;
    });
    this.translateService.get('payment-details-modal.general-error').subscribe((message) => {
      this.generalError = message;
    });

    this.modalControlService.navigate$.pipe(takeUntil(this.destroy)).subscribe((intention) => {
      if (intention.data.to === 'back') {
        this.modalControlService.close(CloseReason.UserNavigatedBack);
      } else if (intention.data.to === 'created') {
        const { binder } = this.store.getState();
        const binderHasInputs = binder?.documents[0]?.inputs?.length > 0;
        if (binderHasInputs) {
          this.modalControlService.close(CloseReason.CompletedSuccessfully);
        } else {
          this.modalControlService.close(CloseReason.CompletedSuccessfully, { nextModal: 'askForSignatures' });
        }
      }
    });
    this.modalControlService.close$.pipe(takeUntil(this.destroy)).subscribe(() => {
      this.store.dispatch(clearTemporaryPaymentAgreement());
    });
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }

  calculateFee(amount: number | null): void {
    this.error = undefined;
    if (amount === null) {
      this.loading = false;
      this.fee = undefined;
      this.payAmount = undefined;
      this.receiveAmount = undefined;
    } else {
      this.loading = true;
      const paymentForQuote: PaymentAgreement = this.createPaymentAgreementForQuote(amount);
      this.payService
        .getFeeQuote(paymentForQuote)
        .pipe(
          takeUntil(this.destroy),
          map((quote) => {
            const feeInMajorUnits = quote.amount / 100;
            return {
              fee: feeInMajorUnits,
              receiveAmount: amount - feeInMajorUnits,
            };
          })
        )
        .subscribe({
          next: ({ fee, receiveAmount }) => {
            this.fee = fee;
            this.receiveAmount = receiveAmount;
            this.payAmount = amount;
          },
          error: (error) => {
            this.loading = false;
            // eslint-disable-next-line no-console
            console.error(error);
            this.error = this.generalError;
            this.payAmount = undefined;
          },
          complete: () => {
            this.loading = false;
          },
        });
    }
  }

  savePaymentAgreement(): void {
    this.loading = true;
    const binderBackup = this.store.getState().binder;
    const removedParties = this.removeUnusedParties();
    const updatedRoles = this.updatePartyRoles();
    const unsavedParties = this.findTemporaryParties();
    const updateBeforeCreation$ =
      removedParties || updatedRoles || unsavedParties.length > 0
        ? this.updateBinderAndTemporaryPaymentAgreementIDs(unsavedParties)
        : of<void>(undefined);
    const createAgreement$ = updateBeforeCreation$.pipe(
      catchError((error) => {
        // only updated the binder (parties) in the store by this point (since updateBinder()'s API call is probably
        // what went wrong); no other API calls made
        this.store.dispatch(updateBinder(binderBackup));
        throw error;
      }),
      concatMap(() => {
        const creatorRole = (() => {
          const storeState = this.store.getState();
          const currentUser = getCurrentParty(storeState);
          const { payeeID, payerID } = storeState.paymentAgreementTemp;
          if (payeeID === currentUser?.id) {
            return 'payee';
          }
          if (payerID === currentUser?.id) {
            return 'payer';
          }
          return 'thirdParty';
        })();
        const proposedPaymentAgreement = this.createPaymentAgreementForSaving();
        return this.payService.createPaymentAgreement(proposedPaymentAgreement).pipe(
          catchError((error) => {
            this.signService.updateBinder(binderBackup, true);
            throw error;
          }),
          tap({
            next: (paymentAgreement) => {
              this.eventTracker.paymentAgreementCreated({
                paymentAgreementID: paymentAgreement.externalId,
                source: 'setupAPayment',
                creatorRole,
              });
            },
          })
        );
      })
    );
    createAgreement$.subscribe({
      next: () => {
        this.loading = false;
        this.alertService.addSuccessAlert({
          message: {
            key: 'payment-details-modal.payment-setup-successful',
          },
        });
        this.modalControlService.navigate('created');
      },
      error: (error) => {
        // eslint-disable-next-line no-console
        console.error(error);
        this.alertService.addDangerAlert({
          message: {
            key: 'payment-details-modal.payment-setup-failure',
          },
        });
        this.loading = false;
      },
    });
  }

  private getPayeeTableHeaderText(): Observable<string> {
    const storeState = this.store.getState();
    const user = getCurrentParty(storeState);
    const { payeeID } = storeState.paymentAgreementTemp;
    return payeeID === user.id
      ? this.translateService.get('payment-details-modal.receive-you')
      : this.translateService.get('payment-details-modal.receive-other-party', {
          otherParty: storeState.binder.parties.find((party) => party.id === payeeID).legalName,
        });
  }

  private createPaymentAgreement(
    payAmount: number,
    payerID: string,
    receiveAmount: number,
    payeeID: string,
    fee: number,
    feePayerID: string
  ): PaymentAgreement {
    const date = new Date().toISOString();
    const { binder } = this.store.getState();
    return {
      binderId: binder.id,
      brand: 'rl-us',
      firstPayment: date,
      lastPayment: date,
      paymentPeriod: 'once',
      userIsLawyer: this.userIsLawyer,
      payments: [
        {
          due: date,
          ins: [this.createPaymentPayment(payAmount, payerID)],
          outs: [this.createPaymentPayment(receiveAmount, payeeID)],
          fees: [this.createPaymentFee(fee, feePayerID)],
        },
      ],
    };
  }

  private createPaymentAgreementForQuote(amount: number): PaymentAgreement {
    const amountInMinorUnits = Math.round(amount * 100);
    const anonymousID = '00000000-0000-0000-0000-000000000000';
    return this.createPaymentAgreement(
      amountInMinorUnits,
      anonymousID,
      amountInMinorUnits,
      anonymousID,
      0,
      anonymousID
    );
  }

  private createPaymentAgreementForSaving(): PaymentAgreement {
    const payAmountInMinorUnits = Math.round(this.payAmount * 100);
    const feeInMinorUnits = Math.round(this.fee * 100);
    const { paymentAgreementTemp } = this.store.getState();
    return this.createPaymentAgreement(
      payAmountInMinorUnits,
      paymentAgreementTemp.payerID,
      payAmountInMinorUnits, // payout amount must be the receive amount + fee (that's just how the API is)
      paymentAgreementTemp.payeeID,
      feeInMinorUnits,
      paymentAgreementTemp.payeeID
    );
  }

  private createPaymentPayment(amount: number): PaymentAmount;
  private createPaymentPayment(amount: number, partyID: string): PartyLinkedPayment;
  private createPaymentPayment(amount: number, partyID?: string): PaymentAmount | PartyLinkedPayment {
    const payment: PaymentAmount = {
      amount,
      currency: this.currencyCode,
    };
    if (partyID === undefined) {
      return payment;
    }
    return {
      partyId: partyID,
      payment,
    };
  }

  private createPaymentFee(fee: number, partyID: string): PaymentAgreementFee {
    return {
      code: 'rl-us-fee',
      description: 'Convenience Fee',
      payment: this.createPaymentPayment(fee),
      breakdown: [this.createPaymentPayment(fee, partyID)],
    };
  }

  private findTemporaryParties(): Array<Readonly<Party>> {
    return this.store.getState().binder.parties.filter((party) => party.isTemporary);
  }

  private removeUnusedParties(): boolean {
    let binderUpdateNeeded = false;
    const { paymentAgreementTemp } = this.store.getState();
    this.findTemporaryParties().forEach((party) => {
      if (party.id !== paymentAgreementTemp.payeeID && party.id !== paymentAgreementTemp.payerID) {
        this.store.dispatch(
          removeParty({
            id: party.id,
          })
        );
        binderUpdateNeeded = true;
      }
    });
    return binderUpdateNeeded;
  }

  private updateBinderAndTemporaryPaymentAgreementIDs(unsavedParties: Readonly<Party>[]): Observable<void> {
    const { binder, paymentAgreementTemp } = this.store.getState();
    return this.signService.updateBinder(binder, true).pipe(
      tap(({ parties }) => {
        if (unsavedParties.length > 0) {
          // the unsaved parties will have received permanent IDs from the API, so update the temporary agreement details
          unsavedParties.forEach((party) => {
            if (paymentAgreementTemp.payeeID === party.id) {
              const updatedParty = PaymentDetailsConnectedModalComponent.findPartyByReference(party.reference, parties);
              this.store.dispatch(setTemporaryPaymentAgreementPayee(updatedParty.id));
            } else if (paymentAgreementTemp.payerID === party.id) {
              const updatedParty = PaymentDetailsConnectedModalComponent.findPartyByReference(party.reference, parties);
              this.store.dispatch(setTemporaryPaymentAgreementPayer(updatedParty.id));
            }
          });
        }
      }),
      mapTo(undefined)
    );
  }

  /**
   * Ensure that parties in the binder have the correct payment roles.
   * Adds or removed Payee/Payer roles and dispatched store updates.
   */
  private updatePartyRoles(): boolean {
    let binderUpdateNeeded = false;
    const { binder, paymentAgreementTemp } = this.store.getState();
    binder.parties.forEach((party) => {
      const isPayee = party.id === paymentAgreementTemp.payeeID;
      const hasPayeeRole = partyHasRole(party, RoleEnum.Payee);
      const isPayer = party.id === paymentAgreementTemp.payerID;
      const hasPayerRole = partyHasRole(party, RoleEnum.Payer);

      const isMissingPayeeRole = isPayee && !hasPayeeRole;
      const isMissingPayerRole = isPayer && !hasPayerRole;
      const isMissingRole = isMissingPayeeRole || isMissingPayerRole;
      const hasWrongPayeeRole = hasPayeeRole && !isPayee;
      const hasWrongPayerRole = hasPayerRole && !isPayer;
      const hasWrongRole = hasWrongPayeeRole || hasWrongPayerRole;

      if (isMissingRole || hasWrongRole) {
        const partyClone: Party = JSON.parse(JSON.stringify(party));
        if (hasWrongRole) {
          partyClone.roles = party.roles.filter((role) => {
            if (role === RoleEnum.Payee) {
              return isPayee;
            }
            if (role === RoleEnum.Payer) {
              return isPayer;
            }
            return true;
          });
        }
        if (isMissingPayeeRole) {
          partyClone.roles.push(RoleEnum.Payee);
        }
        if (isMissingPayerRole) {
          partyClone.roles.push(RoleEnum.Payer);
        }
        this.store.dispatch(updateParty(partyClone));
        binderUpdateNeeded = true;
        // don't call SignService#updateParty(); we'll update the whole binder in one API call, instead.
      }
    });
    return binderUpdateNeeded;
  }
}
