// eslint-disable-next-line max-classes-per-file
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { forkJoin, merge, of, Subject } from 'rxjs';
import { concatMap, mapTo, pluck, shareReplay, take, takeUntil, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Store } from '../../../state/store';
import { AlertService } from '../../../services/sign-app/alert.service';
import { SignService } from '../../../services/sign-app/sign.service';
import { PayService } from '../../../services/sign-app/pay.service';
import { PaymentAgreement, PaymentAgreementStatus } from '../../../services/sign-app/payment-agreement.interface';
import { Binder } from '../../../services/sign-app/binder.interface';
import { Party, RoleEnum } from '../../../services/sign-app/party.interface';
import { getCurrentParty, partyHasAnyRole, partyHasRole } from '../../../state/selectors';
import { SingleDocument } from '../../../services/sign-app/single-document.interface';
import {
  ValidateOnSubmitFormControl,
  ValidateOnSubmitFormGroup,
  ValidateOnSubmitFormGroupType,
} from '../forms/validate-on-submit';
import {
  CloseReason,
  ModalControlService,
  ModalNavigateIntention,
} from '../../../services/sign-app/modal-control.service';
import { makeBlockBoundBEMFunction } from '../../../common/utility-components/util-functions';
import { ConfigurationData } from '../../../common/interfaces/branding.interface';
import { saveInviteMessage, updateDocumentName } from '../../../state/actions/sign';
import { selectPartyForEdit } from '../../../state/actions/party-route';
import { PartyService } from '../../../services/sign-app/party.service';
import { MessageService } from '../message';
import { TrackingPublisher } from '../../tracking/publisher';

interface Invite {
  changedDocuments: SingleDocument[];
  message: string;
}

@Component({
  selector: 'rl-invite-collaborators-modal',
  styleUrls: ['./invite-collaborators-modal.component.scss'],
  templateUrl: './invite-collaborators-modal.component.html',
})
export class InviteCollaboratorsModalComponent implements OnInit {
  @Input() canChangeDocumentNames = true;
  @Input() binderIsInPreparation = false;
  /** All documents in the binder */
  @Input() documents: Readonly<SingleDocument>[] = [];
  /** All parties in the binder (even the parties who aren't signers) */
  @Input() parties: Readonly<Party>[] = [];
  @Input() loading = false;
  @Input() initialMessage: string;
  @Input() brandConfig: Readonly<ConfigurationData>;
  @Input() brandingLevel: number;
  @Input() signIconColor: string;

  @Output() sendClick = new EventEmitter<Invite>();
  @Output() partyEditClick = new EventEmitter<Party>();
  @Output() messageSave = new EventEmitter<string>();

  bem = makeBlockBoundBEMFunction('invite-collaborators-modal');
  formGroup: ValidateOnSubmitFormGroupType | undefined;

  get documentCount(): number {
    return this.invitedDocuments.length;
  }
  get documentControls(): UntypedFormControl[] {
    const group = this.formGroup.get('documents') as UntypedFormGroup;
    return Object.keys(group.controls).map((controlName) => {
      return group.controls[controlName] as UntypedFormControl;
    });
  }
  get invitableParties(): Readonly<Party>[] {
    return this._invitableParties;
  }
  readonly messageMaxLength = 600;

  private invitedDocuments: SingleDocument[] = [];
  private _invitableParties: Readonly<Party>[] = [];

  private static getInvitableParties(allParties: Party[]): Party[] {
    return allParties.filter((party) => {
      return !partyHasRole(party, RoleEnum.Owner) && partyHasAnyRole(party, RoleEnum.Signer, RoleEnum.Payer);
    });
  }

  private static getSignableDocuments(documents: SingleDocument[]): SingleDocument[] {
    return documents.filter((document) => document.signable && document.inputs.length > 0);
  }

  private static setupDocumentFormGroup(
    documents: SingleDocument[],
    canChangeDocumentNames: boolean
  ): ValidateOnSubmitFormGroupType {
    const group = new ValidateOnSubmitFormGroup({});

    documents.forEach((document) => {
      const control = new ValidateOnSubmitFormControl(
        {
          disabled: !canChangeDocumentNames,
          value: document.name,
        },
        {
          validators: [Validators.required],
        }
      );
      group.addControl(document.id, control);
    });

    return group;
  }

  ngOnInit(): void {
    this._invitableParties = InviteCollaboratorsModalComponent.getInvitableParties(this.parties);
    const invitingToPay = this._invitableParties.some((party) => partyHasRole(party, RoleEnum.Payer));
    this.invitedDocuments = invitingToPay
      ? this.documents
      : InviteCollaboratorsModalComponent.getSignableDocuments(this.documents);
    const documentsFormGroup = InviteCollaboratorsModalComponent.setupDocumentFormGroup(
      this.invitedDocuments,
      this.canChangeDocumentNames
    );
    this.formGroup = new ValidateOnSubmitFormGroup({
      documents: documentsFormGroup,
      message: new ValidateOnSubmitFormControl('', {
        validators: [Validators.maxLength(this.messageMaxLength)],
      }),
    });
    this.formGroup.get('message').setValue(this.initialMessage);
  }

  sendClicked(): void {
    if (this.loading) {
      return;
    }
    this.documentControls.forEach(c => c.setValue(c.value.trim()));
    this.formGroup.markAllAsTouched();
    this.formGroup.markAsSubmitted();
    if (this.formGroup.valid) {
      const changedDocuments = this.invitedDocuments
        .map(
          (document): SingleDocument => {
            const control = this.formGroup.get(`documents.${document.id}`);
            return control.value === document.name
              ? undefined
              : {
                  ...document,
                  name: control.value,
                };
          }
        )
        .filter((document) => !!document);

      this.sendClick.emit({
        changedDocuments,
        message: this.formGroup.get('message').value,
      });
    }
  }

  cogClicked($event: Party): void {
    this.messageSave.emit(this.formGroup.get('message').value);
    this.partyEditClick.emit($event);
  }

  clearInviteMessage(): void {
    this.messageSave.emit(null);
  }
}

@Component({
  selector: 'rl-invite-collaborators-connected-modal',
  template: `<rl-invite-collaborators-modal
    [canChangeDocumentNames]="binderIsInPreparation"
    [binderIsInPreparation]="binderIsInPreparation"
    [documents]="documents"
    [parties]="parties"
    [loading]="loading"
    [brandConfig]="brandConfig"
    [brandingLevel]="brandingLevel"
    [signIconColor]="signIconColor"
    (sendClick)="invite($event)"
    (partyEditClick)="editParty($event)"
    (messageSave)="saveMessage($event)"
    [initialMessage]="initialMessage"
  ></rl-invite-collaborators-modal>`,
})
export class InviteCollaboratorsConnectedModalComponent implements OnDestroy, OnInit {
  binderIsInPreparation = false;
  documents: Readonly<SingleDocument>[] = [];
  loading = false;
  parties: Readonly<Party>[] = [];
  initialMessage: string;
  brandConfig: Readonly<ConfigurationData>;

  private readonly destroy = new Subject<void>();

  constructor(
    private readonly alertService: AlertService,
    private readonly modalControlService: ModalControlService,
    private readonly partyService: PartyService,
    private readonly payService: PayService,
    private readonly signService: SignService,
    private readonly store: Store,
    private readonly messageService: MessageService,
    private readonly eventTracker: TrackingPublisher
  ) {}

  brandingLevel = 3;
  signIconColor: string;

  ngOnInit(): void {
    // the Redux store should not be changing whilst this modal is open, so we don't need to subscribe.
    const { documents, parties, status } = this.store.getState().binder;
    this.brandingLevel = this.store.getState().globalBrandConfig?.brandingLevel || 3;
    this.binderIsInPreparation = status === 'IN_PREPARATION';
    this.documents = documents;
    this.parties = parties;
    this.brandConfig = this.store.getState().brandConfig;
    this.signIconColor = this.brandConfig?.lookAndFeel.signIconColor;

    const { inviteMessage } = this.store.getState();
    if (inviteMessage && inviteMessage.value) {
      this.initialMessage = inviteMessage.value;
    }

    this.modalControlService.navigate$
      .pipe(takeUntil(this.destroy))
      .subscribe((intention) => this.onNavigate(intention));
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }

  editParty(party: Party): void {
    this.modalControlService.navigate('editSignerModal', {
      party,
    });
  }

  invite(details: Invite): void {
    this.loading = true;

    // replace double quotes with single quotes because the backend can't handle it
    const message = (details.message || '').replace(/"/g, "'");

    // update documents whose name was changed
    const invite$ = this.updateDocuments(details.changedDocuments).pipe(
      // remove the signer role from parties which don't have any inputs (like the owner if they aren't actually signing)
      concatMap(() => this.partyService.ensurePartyRefIntegrity()),
      // send invites
      concatMap(() => this.finalizeAndInvite(message)),
      shareReplay() // this stops the multiple subscribe()s from triggering the requests again
    );

    invite$.subscribe((binder) => {
      this.alertService.addSuccessAlert({
        message: {
          key: 'invite-collaborators-modal_invitations-sent',
        },
      });
      this.messageService.sendEvent({
        eventName: 'INVITATIONS_SENT',
        binder,
        category: 'SignEvent',
      });
    });

    // update the payment status (if there is a payment) and payment account and update the binder in the store
    const update$ = invite$.pipe(concatMap((binder) => this.updatePaymentAgreementAndBinder(binder)));

    // the end; either navigate or show an error message
    update$.subscribe({
      complete: () => {
        // this has to be done consecutively
        this.getUpdatedPaymentAccountForCurrentParty().subscribe({
          complete: () => {
            this.loading = false;
            this.modalControlService.navigate('complete');
          },
          error: (error) => {
            this.loading = false;
            this.alertService.addDangerAlert({
              message: {
                key: 'invite-collaborators-modal_invitations-error',
              },
            });
            console?.error('Error updating stripe account', error);
          },
        });
      },
      error: (error) => {
        this.loading = false;
        this.alertService.addDangerAlert({
          message: {
            key: 'invite-collaborators-modal_invitations-error',
          },
        });
        console?.error('Error sending invitations', error);
      },
    });

    this.store.dispatch(saveInviteMessage({ value: null }));
  }

  private getUpdatedPaymentAccountForCurrentParty(): Observable<void> {
    const state = this.store.getState();
    if (state.paymentAccount || !state.paymentAgreement) {
      return of(undefined);
    }
    return this.payService
      .getExistingPaymentAccount(state.paymentAgreement.brand, getCurrentParty(state).id)
      .pipe(mapTo(undefined));
  }

  private finishPaymentAgreementSetup(): Observable<void> {
    const { paymentAgreement } = this.store.getState();
    if ([PaymentAgreementStatus.Proposed, PaymentAgreementStatus.Draft].includes(paymentAgreement?.status)) {
      return this.changePaymentAgreementStatusToPending(paymentAgreement);
    }
    if (paymentAgreement?.status === PaymentAgreementStatus.Optional) {
      return this.deletePaymentAgreement(paymentAgreement);
    }
    return of(undefined);
  }

  private changePaymentAgreementStatusToPending(paymentAgreement: PaymentAgreement): Observable<void> {
    return this.payService
      .setPaymentAgreementStatus(paymentAgreement.externalId, PaymentAgreementStatus.Pending)
      .pipe(mapTo(undefined));
  }

  private deletePaymentAgreement(paymentAgreement: PaymentAgreement): Observable<void> {
    return this.payService.deletePaymentAgreement(paymentAgreement.externalId).pipe(
      tap({
        next: () => {
          this.eventTracker.paymentAgreementDeleted({
            paymentAgreementID: paymentAgreement.externalId,
            status: paymentAgreement.status,
          });
        },
      })
    );
  }

  private finalize(binder: Binder, message: string): Observable<Binder> {
    return binder.status === 'REVIEW_AND_SHARE'
      ? of(binder)
      : this.signService.sendFinalisation(message, binder).pipe(mapTo(binder));
  }

  private onNavigate(intention: ModalNavigateIntention): void {
    if (intention.data.to === 'editSignerModal') {
      this.store.dispatch(
        selectPartyForEdit({
          party: intention.data.party,
          returnRoute: 'inviteCollaboratorsModal',
        })
      );
      this.modalControlService.close(CloseReason.UserNavigatedNext, {
        nextModal: 'editSignerModal',
      });
    } else if (intention.data.to === 'complete') {
      this.modalControlService.close(CloseReason.CompletedSuccessfully, {
        nextModal: 'complete',
      });
    }
  }

  /**
   * Send invites and finalize if needed.
   */
  private finalizeAndInvite(message: string): Observable<Binder> {
    return this.store.getState$().pipe(
      pluck('binder'),
      take(1),
      concatMap((binder) => {
        if (binder.status === 'IN_PREPARATION') {
          return this.finalize(binder, message);
        }
        return of(binder);
      }),
      tap((binder) => {
        return this.signService.getBinder(binder.id, {
          fetchPages: false,
          saveStore: true,
        });
      }),
      concatMap((binder) => {
        return this.signService.sendInvitations(binder.id, message).pipe(mapTo(binder));
      })
    );
  }

  /**
   * Update documents whose name was changed.
   */
  private updateDocuments(documents: SingleDocument[]): Observable<void> {
    if (documents.length === 0) {
      return of(undefined);
    }
    const binderID = this.store.getState().binder.id;
    return forkJoin(
      documents.map((document) =>
        this.signService.updateDocument(binderID, document.id, {
          name: document.name,
        })
      )
    ).pipe(
      tap(() => {
        documents.forEach((document) => this.store.dispatch(updateDocumentName(document)));
      }),
      mapTo(undefined)
    );
  }

  private updatePaymentAgreementAndBinder(binder: Binder): Observable<void> {
    // these can run in parallel
    const finishPaymentAgreementSetup$ = this.finishPaymentAgreementSetup();
    const updateBinder$ = this.signService.getBinder(binder.id, {
      fetchPages: false,
      saveStore: true,
    });
    return merge(updateBinder$, finishPaymentAgreementSetup$).pipe(mapTo(undefined));
  }

  saveMessage($event: string): void {
    this.store.dispatch(saveInviteMessage({ value: $event }));
  }
}
