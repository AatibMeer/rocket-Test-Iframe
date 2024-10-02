/* eslint-disable default-case */
/* eslint-disable max-classes-per-file */
import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { Subject, takeUntil, timer } from 'rxjs';
import { ModalControlService } from '../../../services/sign-app/modal-control.service';
import { ModalFlowService } from '../modal/modal-transition.directive';
import { ModalType } from '../sign-app-dashboard/modal-type.enum';
import { showModal } from '../modal/modal.component';
import { animateModalChildren, slideUpDown } from '../../../animations/animations';
import { SignatureInput } from '../../../services/sign-app/signature-input.interface';
import { Binder } from '../../../services/sign-app/binder.interface';
import { SingleDocument } from '../../../services/sign-app/single-document.interface';
import { isNextModalWithDelay, modalRouter } from '../sign-app-dashboard/modal-router';
import { SignService } from '../../../services/sign-app/sign.service';
import { AlertService } from '../../../services/sign-app/alert.service';
import { Store } from '../../../state/store';
import { SearchParamsService } from '../../../services/sign-app/search-params.service';
import {
  agreementUnconfirmed,
  getAllInputs,
  getCurrentParty,
  getPartyByRoleName,
  partyHasRole,
  payoutFailed,
} from '../../../state/selectors';
import { LocalFeatureFlagService } from '../../../services/common/local-feature-flag.service';
import { RoleEnum } from '../../../services/sign-app/party.interface';
import { StorageProxy, getStorageProxy } from '../../../services/common/storage.service';
import { PaymentAgreementStatus } from '../../../services/sign-app/payment-agreement.interface';
import {
  setDocumentEditorMode,
  setInputsNeedRepositioningAfterDocumentEdit,
  setInterviewEditOptions,
  setSignMode,
  setSignatureBuilderMode,
} from '../../../state/actions/uiProps';
import { ModalActions } from '../action-modal/modal-actions';
import { DocPreviewControlService } from '../doc-preview/doc-preview.service';

/**
 * This class encapsulates some of the modal routing logic.
 * It also controls the flow so that only one modal will show up and delayed modals won't interrupt instant modals which
 * were opened since the delay timer was started. */
export class ModalRouteingHelper {
  /** This modal should be visible now. */
  get modalShown(): ModalType | null {
    return this._modalShown;
  }

  /** When this emits, any observables made with timer() will complete and won't update the modalShown value. */
  private readonly modalDelayInterrupt = new Subject<void>();
  private _modalShown: ModalType | null = null;

  /** Prevent any outstanding delayed modals from showing. */
  cancelDelayedModals(): void {
    this.modalDelayInterrupt.next();
  }

  /**
   * Suggest that this modal is shown immediately (or, with null, no modal is shown).
   *
   * Any outstanding delayed modals will be cancelled.
   * @deprecated Add routes to the modalRouter and use the rl-modal-transition directive
   */
  showModalNow(modal: ModalType | null): void {
    this.cancelDelayedModals();
    this._modalShown = modal;
  }

  /**
   * After a delay, suggest that this modal is shown (or, with null, no modal is shown).
   *
   * Any outstanding delayed modals will be cancelled.
   * @deprecated Add routes to the modalRouter and use the rl-modal-transition directive
   */
  showModalLater(modal: ModalType | null, delay: number): void {
    this.cancelDelayedModals();
    timer(Math.max(delay ?? 0, 0))
      .pipe(takeUntil(this.modalDelayInterrupt))
      .subscribe(() => this.showModalNow(modal));
  }

  /** Use the modalRouter map to determine the next modal to show. */
  routeModal(from: ModalType, to: string): void {
    const next = modalRouter[from][to];
    if (next) {
      if (isNextModalWithDelay(next)) {
        this.showModalNow(null);
        this.showModalLater(next.nextModal, next.delay);
      } else if (typeof next === 'string') {
        this.showModalNow(next);
      } else {
        this.showModalNow(null);
      }
    } else {
      const definedDestinations = Object.keys(modalRouter[from]);
      // eslint-disable-next-line no-console
      console?.warn(
        `Tried to route from "${from}" to "${to}". ${
          definedDestinations.length > 0
            ? `Expected "${to}" to be one of ["${definedDestinations.join('", "')}"].`
            : `"${from} has no routes defined.`
        }`
      );
      this.showModalNow(null);
    }
  }
}

export type ComponentConfig = {
  binder: Binder;
  currentUserLegalName: string;
  editedInput: SignatureInput;
  signingComplete: boolean;
  ownerLegalName: string;
  forceUserToAddData: boolean;
  addSignerDataModalIntroText: 'standard' | 'signatureBuilder' | 'addAnotherSigner';
  proceedWithEditInputOnSave: boolean;
  proceedWithNextActionsOnSave: boolean;
  originalOwnerPartyReference: string;
  editableDocIndex: number;
  documents: Array<SingleDocument>;
  docHtml: any;
  documentEditorModeEnabled: boolean;
  signingModeEnabled: boolean;
};

@Component({
  selector: 'app-modals',
  templateUrl: 'app-modals.component.html',
  animations: [animateModalChildren, slideUpDown, showModal],
})
export class AppModalsComponent implements OnDestroy {
  currentUser: any;
  constructor(
    public modalControlService: ModalControlService,
    public modalFlowService: ModalFlowService,
    private signService: SignService,
    private alertService: AlertService,
    private store: Store,
    private readonly searchParams: SearchParamsService,
    private docPreviewService: DocPreviewControlService,
    private featureFlagService: LocalFeatureFlagService
  ) {
    this.modalRouteingHelper = new ModalRouteingHelper();

    this.sessionStorage = getStorageProxy({
      storage: sessionStorage,
      ignoreStorageErrors: true,
    });
    this.localStorage = getStorageProxy({
      storage: localStorage,
      ignoreStorageErrors: false,
    });

    this.setupComponent(this.store.getState());
    const storeSub = this.store.subscribe((state) => {
      this.setupComponent(state);
    });
    if (!this.binder) return;

    this.originalOwnerPartyReference = this.binder.parties.find((p) => partyHasRole(p, RoleEnum.Owner)).reference;

    this.checkStartingActionModal();
    this.subscriptions.push(storeSub);
    this.destroy = new Subject<void>();
    this.downloadDocHtml();
  }

  @Input() config: ComponentConfig;
  @Input() editedInput: SignatureInput;
  private readonly sessionStorage: StorageProxy<{ rlShownHowItWorks: 'true' }>;
  private readonly localStorage: StorageProxy<{ plaidRedirectLinkToken: string; plaidRedirectRoute: string }>;

  binder: Binder;
  subscriptions: Function[] = [];
  private readonly modalRouteingHelper: ModalRouteingHelper;
  @Output() onRouteChange = new EventEmitter();
  documentEditorModeEnabled;
  docHtml;
  documents;
  editableDocIndex;
  originalOwnerPartyReference;
  proceedWithNextActionsOnSave;
  proceedWithEditInputOnSave;
  addSignerDataModalIntroText;
  forceUserToAddData;
  ownerLegalName;
  signingComplete;
  currentUserLegalName;
  signerDataIsMissing;
  signatureBuilderModeEnabled;
  advancedEditorIsEnabled;
  backToInterviewIsEnabled;
  inputs: Array<SignatureInput>;

  readonly destroy: Subject<void>;

  setupComponent(state) {
    this.binder = state.binder;
    if (!this.binder) return;
    this.signerDataIsMissing = this.binder.parties.some((p) => !p.legalName || !p.email);
    this.documentEditorModeEnabled = state.get('documentEditorModeEnabled');
    this.documents = this.binder.documents;
    this.signatureBuilderModeEnabled = state.signatureBuilderModeEnabled;
    this.advancedEditorIsEnabled = state.get('advancedEditorOptionEnabled');
    this.backToInterviewIsEnabled = state.get('backToInterviewOptionEnabled');
    this.inputs = getAllInputs(state);
    this.currentUser = getCurrentParty(state);
    this.currentUserLegalName = this.currentUser ? this.currentUser.legalName : '';
    this.ownerLegalName = getPartyByRoleName(this.binder, RoleEnum.Owner).legalName;
    this.signingComplete = this.binder.status === 'SIGN_COMPLETED';
  }

  downloadDocHtml(): void {
    if (this.binder.documents[0].contentType == 'text/html') {
      this.signService.fetchHtmlDocument(this.binder.id, this.binder.documents[0].id).subscribe((html) => {
        this.docHtml = html;
      });
    }
  }

  onDocUpdate(): void {
    this.downloadDocHtml();
    // user edited document manually, disable back to interview option
    this.store.dispatch(setInterviewEditOptions(false));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((unsub) => unsub());
    this.destroy.next();
  }

  get modalShown(): ModalType | null {
    return this.modalRouteingHelper.modalShown;
  }

  onBinderUpdate(): void {
    // disable document-editor
    this.store.dispatch(setDocumentEditorMode(false));
    if (this.inputs.filter((i) => i.position.type === 'ABSOLUTE').length !== 0) {
      // prompt user to reposition and resize fields because content has changed
      this.store.dispatch(setInputsNeedRepositioningAfterDocumentEdit(true));
    }
  }
  
  onDecline() {
    this.store.dispatch(setSignMode(false));
  }

  onCancel() {
    this.store.dispatch(setSignMode(false));
  }

  onModalAction(data: string) {
    switch (data) {
      case ModalActions.InviteCollaborators:
        this.showModal('inviteCollaboratorsModal');
        break;
      case ModalActions.InviteViewers:
        this.showModal('inviteViewersModal');
        break;
      case ModalActions.SignNowOwner:
        this.closeModal();
        this.startSigning();
        this.highlightNextInput();
        break;
      case ModalActions.Cancel:
        this.showModal('cancelSigningModal');
        break;
      case ModalActions.RemoveSignature:
        this.showModal('removeSignatureModal');
        break;
      case ModalActions.Decline:
        this.showModal('declineSigningModal');
        break;
      case ModalActions.ChangeTitle:
        this.showModal('editDocTitleModal');
        break;
      case ModalActions.ShowHistory:
        this.showModal('historyPanel');
        break;
      case ModalActions.SignNow:
        this.closeModal();
        this.signNow();
        break;
      case ModalActions.Manage:
        this.showModal('manageModal');
        break;
      case ModalActions.ManageViewers:
        this.showModal('manageViewersModal');
        break;
      case ModalActions.GetSignature:
        this.editSignatures();
        break;
      case ModalActions.ShowFinaliseWarning:
        this.showModal('ownerFinaliseWarningModal');
        break;
      case ModalActions.ShowPaymentCreatorModal:
        this.showModal('paymentCreatorModal');
        break;
      case ModalActions.ShowPaymentPayerModal:
        this.showModal('paymentPayerModal');
        break;
      case ModalActions.ShowPaymentStatusModal:
        this.showModal('paymentStatusModal');
        break;
      case ModalActions.ShowPaymentSelectRoleModal:
        this.showModal('paymentSelectRoleModal');
        break;
      case ModalActions.ShowPaymentPayNow:
        this.showModal('paymentPayNowModal');
        break;
      case ModalActions.PayChoosePaymentMethod:
        this.showModal('paymentChoosePaymentMethod');
        break;
      case ModalActions.ShowKYCVerify:
        this.showModal('paymentKYCVerifyModal');
        break;
      case ModalActions.Edit:
        this.showModal('editModal');
        break;
      case ModalActions.StartDocumentEdit:
        this.startDocEdit();
        break;
      case ModalActions.AddSignerDataModal:
        this.closeModal();
        this.proceedWithNextActionsOnSave = true;
        this.addSignerDataModalIntroText = 'standard';
        this.proceedWithEditInputOnSave = false;
        this.docPreviewService.highlightInputs();
        this.docPreviewService.highlightConfirmed$.subscribe(() => {
          this.showModal('addSignerDataModal');
        });
        break;
      case ModalActions.ExportDocument:
        this.showModal('exportDocumentModal');
        break;
      case ModalActions.AddAnotherSigner:
        this.proceedWithNextActionsOnSave = false;
        this.proceedWithEditInputOnSave = false;
        this.forceUserToAddData = true;
        this.addSignerDataModalIntroText = 'addAnotherSigner';
        this.store.dispatch(setSignatureBuilderMode(true));
        this.showModal('addSignerDataModal');
        break;
      case ModalActions.ShowPlaid:
        this.showModal('paymentPlaidModal');
        break;
    }
  }

  startSigning() {
    this.store.dispatch(setSignMode(true));
  }

  signNow() {
    this.store.dispatch(setSignMode(true));
    this.highlightNextInput();
  }

  editSignatures() {
    const seenHowItWorks = this.sessionStorage.rlShownHowItWorks;
    this.sessionStorage.rlShownHowItWorks = 'true';
    if (seenHowItWorks) {
      this.closeModal();
    } else {
      this.showModal('howItWorksModal');
    }
  }

  startDocEdit() {
    if (this.advancedEditorIsEnabled && this.backToInterviewIsEnabled) {
      this.showModal('editModal');
    } else {
      this.closeModal();
      this.store.dispatch(setDocumentEditorMode(true));
    }
  }

  highlightNextInput() {
    setTimeout(() => {
      this.docPreviewService.highlightNextInput();
    }, 800);
  }

  /** Which modal will show first, when the dashboard loads? This one. */
  checkStartingActionModal(): void {
    if (!this.ownerLegalName || this.ownerLegalName.trim().length == 0) {
      return undefined;
    }
    if (this.modalShown || this.signatureBuilderModeEnabled) {
      return undefined;
    }

    // returning from a Plaid bank-account-connecting OAuth App-2-App flow
    if (this.searchParams.has('plaid_redirect_uri') && this.localStorage.plaidRedirectLinkToken) {
      const route = this.localStorage.plaidRedirectRoute;
      if (route === 'payment/payByBank') {
        return this.showModal('paymentAchPlaidModal');
      }
      if (route === 'payment/bankPayout') {
        return this.showModal('paymentPlaidModal');
      }
      delete this.localStorage.plaidRedirectRoute;
      delete this.localStorage.plaidRedirectLinkToken;
    }

    // check for important alerts
    const state = this.store.getState();
    if (payoutFailed(state)) {
      return this.showModal('payoutFailedModal');
    }
    if (agreementUnconfirmed(state)) {
      return this.showModal(
        state.paymentAgreement.status === PaymentAgreementStatus.Optional ? 'paymentCreatorModal' : 'paymentStatusModal'
      );
    }
    const setupAPayment = this.searchParams.get('source') === 'setupAPayment';
    const variableFee = this.featureFlagService.flags.variable_fee_enabled;
    if (setupAPayment && !state.paymentAgreement && !variableFee) {
      return this.showModal('paymentSelectRoleModal');
    }
    if (setupAPayment && !state.paymentAgreement && variableFee) {
      return this.showModal('paymentCreatorModal');
    }

    return this.showModal('actionModal');
  }

  closeSigModal(modal: 'signatureModal' | 'initialsModal', event) {
    this.openSigningModal(false);
    this.routeModal(modal, event.nextModal);
  }

  public openSigningModal(input: SignatureInput | false) {
    this.store.dispatch(setSignMode(true));
    if (input && input.type == 'INITIALS') {
      // do nothing
    } else if (input && input.type == 'SIGNATURE_TEXT') {
      this.showModal('signatureModal');
    } else {
      this.closeModal();
    }
    if (input) {
      this.editedInput = input;
    } else {
      this.editedInput = null;
    }
  }

  isModalActive() {
    return this.modalShown != null;
  }

  /**
   * @deprecated Don't add new modals which use this method. Instead, add a route to modalRouter and use the
   * rl-modal-transition directive with the routeModal method for routeing.
   */
  public closeModal() {
    this.modalRouteingHelper.showModalNow(null);
    this.modalFlowService.end();
  }

  /**
   * @deprecated Don't add new modals which use this method. Instead, add a route to modalRouter and use the
   * rl-modal-transition directive with the routeModal method for routeing.
   */
  public showModal(name: ModalType) {
    if (name == null) {
      this.modalRouteingHelper.showModalNow(null);
      return;
    }
    this.modalRouteingHelper.showModalNow(name);
    // it sometimes wont toggle correctly in an iframe on Safari
  }

  /**
   * @deprecated Don't add new modals which use this method. Instead, add a route to modalRouter and use the
   * rl-modal-transition directive with the routeModal method for routeing.
   */
  showModalWithDelay(modal: ModalType) {
    this.modalRouteingHelper.showModalLater(modal, 3000);
  }

  routeModal(thisModal: ModalType, to: string): void {
    return this.modalRouteingHelper.routeModal(thisModal, to);
  }
}
