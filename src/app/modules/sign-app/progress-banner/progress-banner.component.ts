import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';

import { DOCUMENT } from '@angular/common';
import { Store } from '../../../state/store';
import {
  getAllInputs,
  getCurrentParty,
  getCurrentPartyRef,
  getDocumentPagesWithSessionSignatures,
  getEditableInputs,
  getPartiesWithoutAnyRoles,
  otherSignersHaveInputs,
  partyHasInputs,
  partyHasRole,
  userIsPayer,
} from '../../../state/selectors';

import { AlertService } from '../../../services/sign-app/alert.service';
import { SignService } from '../../../services/sign-app/sign.service';
import { MessageService } from '../message/message.service';
import { Binder } from '../../../services/sign-app/binder.interface';
import { UserInputComponent } from '../user-input/user-input.component';
import { DocPreviewComponent } from '../doc-preview';
import { SignatureInput } from '../../../services/sign-app/signature-input.interface';
import { setSignMode } from '../../../state/actions/uiProps';
import { RoleEnum } from '../../../services/sign-app/party.interface';
import { State } from '../../../state/reducers/main.interface';
import { removeSignaturesForParty, updateBinder } from '../../../state/actions/sign';
import { SignatureInputComponent } from '../user-input/signature-input';
import { PaymentAgreementStatus } from '../../../services/sign-app/payment-agreement.interface';

@Component({
  selector: 'progress-banner',
  templateUrl: './progress-banner.component.html',
  styleUrls: ['./progress-banner.component.scss'],
})
export class ProgressBannerComponent {
  constructor(
    public store: Store,
    @Inject(DOCUMENT) public documentEl: Document,
    public signService: SignService,
    public alertService: AlertService,
    public messageService?: MessageService
  ) {}

  @Output() showActionsModal: EventEmitter<any> = new EventEmitter();

  @Input('numberOfDocuments') numberOfDocs: number;
  @Input('documentPreview') docPreview: DocPreviewComponent;
  @Output() nextStep = new EventEmitter();
  @Output() unfilledCustomTextWarning = new EventEmitter();
  @Output() updateBinder = new EventEmitter();
  @Output() showInvitationModal = new EventEmitter<void>();

  requestSent = false;
  sendingSignatures = false;
  public inputs: Array<SignatureInput>;

  private static SINGER_NOT_LINKED_TO_INPUT_KEY = 'error.client.condition.signerLinkedToInputs';

  isComplete(): boolean {
    const totals = this.getStepNumber();
    return totals.total === totals.done;
  }

  cancelSigning() {
    const currentPartyRef = getCurrentParty(this.store.getState()).reference;
    this.store.dispatch(removeSignaturesForParty(currentPartyRef));
    this.store.dispatch(setSignMode(false));
  }

  getStepNumber() {
    const allInputs = getEditableInputs(this.store.getState());
    const mandatoryInputs = allInputs.filter((input) => input.optional !== true);
    const doneInputs = mandatoryInputs.filter((input) => input.value != null && input.value !== '');
    return {
      total: mandatoryInputs.length,
      done: doneInputs.length,
      step: Math.min(doneInputs.length + 1, mandatoryInputs.length),
    };
  }

  getProgressPercent(): string {
    const stepNumber = this.getStepNumber();
    const percentageNumber = Math.floor((stepNumber.done / (stepNumber.total || 1)) * 100);
    return `${percentageNumber}%`;
  }

  submitSignatures() {
    this.sendingSignatures = true;
    const { binder } = this.store.getState();
    if (binder.status === 'IN_PREPARATION') {
      this.finaliseBinderAndRecordSignature(binder);
    } else {
      this.recordSignatures(binder);
    }
  }

  finaliseBinderAndRecordSignature(binder) {
    this.signService.sendFinalisation('', binder).subscribe(
      () => {
        // a restful api should return the target resource on a change (e.g. after finalisation)
        // for now we do that here and update the store accordingly
        const updatedBinder: Binder = { ...binder, status: 'REVIEW_AND_SHARE' };
        this.store.dispatch(updateBinder(updatedBinder));
        this.recordSignatures(binder);
      },
      ({error:{errors}}) => {
        this.sendingSignatures = false;
        if(this.isSingerNotLinkedErrorOccurred(errors)){
          this.showSignerNotLinkedError();
        } else {
          this.showRecordSignatureError();
        }
      }
    );
  }

  recordSignatures(binder: Binder) {
    const preparedBinder = this.prepareBinderForSending();
    this.signService.submitSignatures(preparedBinder).subscribe({
      complete: () => {
        this.onSubmitSuccess();
      },
      error: () => {
        // move binder back to "IN_PREPARATION" in case signature record fails
        // but only in case when binder is in REVIEW_AND_SHARE state
        // otherwise fail with an alert
        if (preparedBinder.status === 'REVIEW_AND_SHARE') {
          this.moveBinderToInPreparation(preparedBinder);
        } else {
          this.sendingSignatures = false;
          this.showRecordSignatureError();
        }
      },
    });
  }

  moveBinderToInPreparation(binder: Binder) {
    this.signService.cancelSigning(binder.id, '', '').subscribe(
      () => {
        const updatedBinder: Binder = { ...binder, status: 'IN_PREPARATION' };
        this.store.dispatch(updateBinder(updatedBinder));
        this.sendingSignatures = false;
        this.showRecordSignatureError();
      },
      () => {
        this.sendingSignatures = false;
        this.showRecordSignatureError();
      }
    );
  }

  showRecordSignatureError() {
    this.alertService.setAlertMessage({ message: 'progress-banner_signing-error', type: 'danger' });
  }

  prepareBinderForSending(): Binder {
    // this modifies the binder.documents[x].inputs so that font sizes are correct
    const state = this.store.getState();
    const { binder } = state;
    const partyRef = getCurrentPartyRef(state);
    const newDocuments = binder.documents.map((doc) => {
      const newInputs = doc.inputs.map((input) => {
        // return inputs that dont belong to this party, dont have a valid position (xOffset), or are already complete
        if (input.partyReference !== partyRef) return input;
        if (input.position.xOffset === undefined) return input;
        if (input.status === 'COMPLETED') return input;
        if (input.valueType === 'IMAGE') return { ...input, valueType: 'IMAGE' as const };
        // assign a fontSize to rest of inputs
        const fontSize = this.getFontSizeInPx(input.id);
        let inputFont = { ...input.font, sizeInPx: fontSize };

        // for all inputs except CUSTOM_TEXT add minFontSize
        if (input.type !== 'CUSTOM_TEXT') inputFont = Object.assign(inputFont, { minFontSizeInPx: 6 });
        return { ...input, font: inputFont, valueType: 'TEXT' as const };
      });
      return { ...doc, inputs: newInputs };
    });
    return { ...binder, documents: newDocuments };
  }

  getFontSizeInPx(inputId: string) {
    const inputComponent: UserInputComponent = this.docPreview.signatureInputs.find(
      (input) => input.input.id === inputId && input.input.type !== 'CUSTOM_TEXT'
    );
    if (inputComponent) {
      const simulationInputComponent = (inputComponent.inputEl as SignatureInputComponent).simulationInputValue.nativeElement;
      return simulationInputComponent.style.fontSize.replace('px', '');
    }

    // default for custom text
    return '16';
  }

  onSubmitSuccess() {
    const state = this.store.getState();
    const binder = state.get('binder');

    if (!userIsPayer(state) || (userIsPayer(state) && state.paymentAgreement.status === PaymentAgreementStatus.Paid)) {
      this.sendSigningEventToParentWindow();
    }

    const pagesSelectedToFetch = getDocumentPagesWithSessionSignatures(state);
    // Perform a fetch to grab a fresh, signed version of document.
    this.signService
      .getBinder(binder.id, { fetchPages: true, pagesSelectedToFetch }, binder)
      .subscribe((newBinder: Binder) => {
        this.showSuccessAlert();

        if (['REVIEW_AND_SHARE', 'SIGN_IN_PROGRESS', 'SIGN_COMPLETED'].includes(newBinder.status)) {
          if (ProgressBannerComponent.isSignedFirstByTheOwner(state)) {
            this.showInvitationModal.emit();
          } else {
            this.showActionsModal.emit();
          }
        }

        let event = (newBinder.status == 'REVIEW_AND_SHARE' || newBinder.status == 'SIGN_IN_PROGRESS') ? 'SIGNER_SIGNED' : 'SIGNING_COMPLETE';
        this.messageService.sendEvent({
          eventName: event,
          binder: newBinder,
          category: 'SignEvent'
        });

        this.store.dispatch(setSignMode(false));
      });
  }

  private static isSignedFirstByTheOwner(state: State): boolean {
    const binder = state.get('binder');
    const inputs = getAllInputs(state);
    const currentUser = getCurrentParty(state);
    const currentUserHasOwnerAndSignerRole =
      partyHasRole(currentUser, RoleEnum.Owner) && partyHasRole(currentUser, RoleEnum.Signer);

    return (
      binder.status === 'REVIEW_AND_SHARE' &&
      inputs.length !== 0 &&
      currentUserHasOwnerAndSignerRole &&
      otherSignersHaveInputs(state, currentUser.reference) &&
      partyHasInputs(currentUser.reference, state)
    );
  }

  showSuccessAlert() {
    const { status } = this.store.getState().binder;
    if (status === 'REVIEW_AND_SHARE' || status === 'SIGN_IN_PROGRESS') {
      this.alertService.setAlertMessage({ message: 'progress-banner_you-signed', type: 'success' });
    } else if (status === 'SIGN_COMPLETED') {
      if (getPartiesWithoutAnyRoles(this.store.getState().binder, RoleEnum.Viewer).length < 2) {
        this.alertService.setAlertMessage({
          message: 'progress-banner_signing-completed-single-signer',
          type: 'success',
        });
      } else if (this.numberOfDocs === 1)
        this.alertService.setAlertMessage({ message: 'progress-banner_all-signed-document', type: 'success' });
      else this.alertService.setAlertMessage({ message: 'progress-banner_all-signed-documents', type: 'success' });
    }
  }

  // this method sends an event
  // a parent window can be a window that embeds the app or the normal window (if app is not embedded)
  // this is used to achieve responsiveness of the iframe (thus eliminating double scrollbars)
  private sendSigningEventToParentWindow(): void {
    const party = getCurrentParty(this.store.getState());
    const data = {
      // TODO: remove signingComplete field when US team makes changes on their side
      signingComplete: {
        party,
      },
      activitiesComplete: {
        party,
      },
    };
    this.messageService.sendEvent(data);
  }

  private showSignerNotLinkedError() {
    this.alertService.addDangerAlert({ message: 'progress-banner_singer-not-linked-error'});
  }

  private isSingerNotLinkedErrorOccurred(errors: {code}[]) {
    return errors.some(({code}) => ProgressBannerComponent.SINGER_NOT_LINKED_TO_INPUT_KEY === code);
  }
}
