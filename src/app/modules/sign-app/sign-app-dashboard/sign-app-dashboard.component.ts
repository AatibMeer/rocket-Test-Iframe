// eslint-disable-next-line max-classes-per-file
import {
  Compiler,
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Inject,
  Injector,
  NgModuleFactory,
  NgModuleRef,
  OnDestroy,
  OnInit,
  QueryList,
  Type,
  ViewChild,
  ViewContainerRef,
  createNgModuleRef
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { DOCUMENT } from '@angular/common';
import { map, pluck } from 'rxjs/operators';
import { EventEmitter } from 'events';
import { ActivatedRoute, ActivatedRouteSnapshot, Router } from '@angular/router';
import { SignService } from '../../../services/sign-app/sign.service';
import { Store } from '../../../state/store';
import {
  getAllInputs,
  getCurrentParty,
  getEditableInputs,
  getPartyByRoleName,
  isCurrentUserOwner,
  partyHasInputs,
  partyHasRole,
  isSignerDataMissing,
} from '../../../state/selectors';

import { Binder } from '../../../services/sign-app/binder.interface';
import { SingleDocument } from '../../../services/sign-app/single-document.interface';
import { Party, RoleEnum } from '../../../services/sign-app/party.interface';
import { SignatureInput } from '../../../services/sign-app/signature-input.interface';
import { AlertService } from '../../../services/sign-app/alert.service';
import { PendoSnippetInitializerService } from '../../../services/snippets/pendo-snippet-initializer.service';

import { DocPreviewComponent } from '../doc-preview';
import { ProgressBannerComponent } from '../progress-banner';
import { animateModalChildren, slideUpDown } from '../../../animations/animations';
import { SignSummaryComponent } from '../sign-summary/sign-summary.component';
import { ModalType } from './modal-type.enum';
import {
  setAdvancedEditOption,
  setBinderHasContent,
  setDocumentEditorMode, setInterviewEditOptions,
  setSignatureBuilderMode,
  setSignMode
} from '../../../state/actions/uiProps';
import { UserInputComponent } from '../user-input/user-input.component';
import { UserAgentService } from '../../../services/common/user-agent.service';
import { ModalFlowService } from '../modal/modal-transition.directive';
import { showModal } from '../modal/modal.component';
import { getStorageProxy, StorageProxy } from '../../../services/common/storage.service';
import { SearchParamsService } from '../../../services/sign-app/search-params.service';
import { updateBinder } from '../../../state/actions/sign';
import { MessageService } from '../message';

@Component({
  selector: 'dashboard',
  templateUrl: './sign-app-dashboard.component.html',
  styleUrls: ['./sign-app-dashboard.component.scss'],
  providers: [SignService, ModalFlowService],
  animations: [animateModalChildren, slideUpDown, showModal],
})
export class SignAppDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  constructor(
    private compiler: Compiler,
    private store: Store,
    private alertService: AlertService,
    private translate: TranslateService,
    private signService: SignService,
    private userAgentService: UserAgentService,
    private pendoSnippetInitializerService: PendoSnippetInitializerService,
    readonly modalFlowService: ModalFlowService,
    private readonly searchParams: SearchParamsService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    public viewRef: ViewContainerRef,
    private injector: Injector,
    private messageService: MessageService,
    @Inject(DOCUMENT) private documentEl: Document
  ) {
    this.sessionStorage = getStorageProxy({
      storage: sessionStorage,
      ignoreStorageErrors: true,
    });
    this.localStorage = getStorageProxy({
      storage: localStorage,
      ignoreStorageErrors: false,
    });
    const { binder, binderError } = this.activatedRoute.snapshot.data.binderOrError;
    // eslint-disable-next-line prefer-const
    const binderId = this.activatedRoute.snapshot.paramMap.get('binderId');
    const routeSnapshot = this.activatedRoute.snapshot;
    // check if no content was uploaded to any doc
    if (
      binder &&
      binder.documents.length !== 0 &&
      !!binder.documents.find((d: SingleDocument) => !d.pages || d.pages.length === 0)
    ) {
      this.store.dispatch(setBinderHasContent(false));
      this.handleDocumentNotUploadedError(binderId, routeSnapshot);
      return;
    }
    if (binderError) {
      this.handleBinderErrors(binderError, binderId, routeSnapshot);
      return;
    }

    const state = this.store.getState();
    this.setSignData(state);
    this.setDocumentEditToggles();
    this.isMobileDevice = this.userAgentService.isMobileDevice();
    this.isSafariBrowser = this.userAgentService.isSafariBrowser();
    const storeSub = this.store.subscribe((newState) => {
      this.setSignData(newState);
      this.pendoSnippetInitializerService.initialize(newState);
    });
    this.subscriptions.push(storeSub);

    const alertSub = this.store
      .getState$()
      .pipe(
        pluck('alerts', 'alerts'),
        map((alerts) => alerts.length > 0)
      )
      .subscribe((hasAlerts) => {
        this.alertShown = hasAlerts;
      });
    this.subscriptions.push(() => alertSub.unsubscribe());

    this.checkFreshUpload();
    this.checkOwnerLegalName();
  }

  private readonly sessionStorage: StorageProxy<{ rlShownHowItWorks: 'true' }>;
  private readonly localStorage: StorageProxy<{ plaidRedirectLinkToken: string; plaidRedirectRoute: string }>;
  signatureBuilderModeEnabled = false;
  alertShown = false;
  showGlobalLoader = false;
  binder: Binder;
  binderHasInputs = false;
  isMobileDevice: boolean;
  isSafariBrowser: boolean;
  documents: Array<SingleDocument>;
  currentUserIsOwner: boolean;
  currentUser: Readonly<Party>;
  noOtherSigners = false;

  newInput: Event = null;
  editedInput: SignatureInput;
  currentUserLegalName: string;
  userSignedDoc: boolean;
  editableDocIndex: number = null;

  stickyBannerMsg: string = null;

  signerDataIsMissing = false;

  signatureModalSubmitted = new EventEmitter();
  // Partner can enable/disable action modal from opening (!!)
  actionModalEnabledFromPartner = true;

  @ViewChild('topBannerContainer', { read: ElementRef }) topBannerContainer;
  @ViewChild(DocPreviewComponent) docPreview: DocPreviewComponent;
  @ViewChild(ProgressBannerComponent) progressBanner: ProgressBannerComponent;
  @ViewChild(SignSummaryComponent) signBanner: SignSummaryComponent;

  modalsComponentRef;

  subscriptions: Function[] = [];
  signingModeEnabled = false;
  docHtml;

  signatureInputs: QueryList<UserInputComponent>;

  inputs: Array<SignatureInput> = [];

  inputsNeedRepositioningAfterDocumentEdit = false;
  documentEditorModeEnabled = false;
  partnerRequestedBackToInterviewOption = false;
  documentWasEditedUsingAdvancedEditor = false;
  backToInterviewIsEnabled = false;
  advancedEditorIsEnabled = false;

  inputEditModeEnabled = false;

  signingComplete = false;
  ownerLegalName: string;
  proceedWithEditInputOnSave = false;

  @HostListener('window:message', ['$event'])
  onMessage(event: MessageEvent): void {
    const eventData = event.data;
    if (eventData) {
      if (eventData.hasOwnProperty('editorIsShown')) {
        this.store.dispatch(setDocumentEditorMode(eventData.editorIsShown));
      } else if (eventData.hasOwnProperty('actionModalEnabled')) {
        this.externalActionUpdate(null);
        this.actionModalEnabledFromPartner = eventData.actionModalEnabled;
      } else if (eventData.hasOwnProperty('modalShown')) {
        this.externalActionUpdate(eventData.modalShown);
      } else if (eventData.hasOwnProperty('refreshBinderState')) {
        this.refreshBinderState();
      }
    }
  }

  showModal(modal: ModalType) {
    if (this.modalsComponentRef) this.modalsComponentRef.instance.showModal(modal);
    else setTimeout(() => this.showModal(modal), 300);
  }

  handleDocumentNotUploadedError(binderId: string, route: ActivatedRouteSnapshot) {
    this.router.navigate([`/${binderId}/service-down`], { fragment: route.fragment });
  }

  handleBinderErrors(error: any, binderId: string, route: ActivatedRouteSnapshot): void {
    if (error === 'No token or binderId') {
      this.router.navigate([`/not-found`], { fragment: route.fragment });
    } else if (error.noContent) {
      this.router.navigate([`/${binderId}/service-down`], { fragment: route.fragment });
    } else if (error.status) {
      const errorStatus = error.status.toString();
      if (errorStatus.indexOf(409) === 0) {
        // reponse is 409, binder is cancelled
        this.router.navigate([`/${binderId}/cancelled`], { fragment: route.fragment });
      }
      if (errorStatus.indexOf(403) === 0) {
        // reponse is 403, party has been removed
        this.router.navigate([`/${binderId}/access-revoked`], { fragment: route.fragment });
      } else if (errorStatus.indexOf(404) === 0 || errorStatus.indexOf(400) === 0) {
        // response is 4xx, there's an error somewhere
        this.router.navigate([`/${binderId}/not-found`], { fragment: route.fragment });
      } else if (errorStatus.indexOf(5) === 0) {
        // response is 5xx
        this.router.navigate([`/${binderId}/service-down`], { fragment: route.fragment });
      }
    } else {
      // most likely if the network is interrupted
      this.router.navigate([`/${binderId}/service-down`], { fragment: route.fragment });
    }
  }

  private refreshBinderState() {
    this.showGlobalLoader = true;
    this.signService.getBinder(this.binder.id, { saveStore: false }).subscribe((newBinder: Binder) => {
      this.store.dispatch(updateBinder(newBinder));
      this.showGlobalLoader = false;
    });
  }

  private externalActionUpdate(modal: ModalType): void {
    this.modalFlowService.end();
  }

  lazyloadModuleFactory!: NgModuleFactory<any>;
  lazyloadComponent!: any;

  ngOnInit(): void {
    import('../app-modals/app-modals.module').then((importedFile) => {
      const componentToOpen = importedFile.AppModalsModule.components.dynamicComponent;
      this.openLazyLoadedComponent(importedFile, componentToOpen);
    });
  }

  private openLazyLoadedComponent<T>(importedFile: T, componentToOpen: Type<any>): void {
    const module: Type<T> = (<any>importedFile)[Object.keys(importedFile)[0]];
    const moduleRef: NgModuleRef<T> = createNgModuleRef(module, this.injector);
    this.modalsComponentRef = this.viewRef.createComponent(componentToOpen, { ngModuleRef: moduleRef });
  }

  // eslint-disable-next-line class-methods-use-this
  ngAfterViewInit(): void {
    const now = new Date().getTime();
    // startedAt is calculated in index.html
    const startedAt = (<any>window).renderStartedAt;
    const timeToInteractive = now - startedAt;
    this.messageService.sendEvent({
      timeToInteractive,
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((unsub) => unsub());
  }

  setSignData(state): void {
    const binder = state.get('binder');
    if (!binder) return;
    this.binder = binder;
    this.inputs = getAllInputs(state);
    this.signingModeEnabled = state.get('signModeEnabled');
    this.signerDataIsMissing = this.binder.parties.some((p) => !p.legalName || !p.email);
    this.signatureBuilderModeEnabled = state.get('signatureBuilderModeEnabled');
    this.inputsNeedRepositioningAfterDocumentEdit = state.get('inputsNeedRepositioningAfterDocumentEdit');
    this.documentEditorModeEnabled = state.get('documentEditorModeEnabled');
    this.advancedEditorIsEnabled = state.get('advancedEditorOptionEnabled');
    this.backToInterviewIsEnabled = state.get('backToInterviewOptionEnabled');
    this.userSignedDoc = !getEditableInputs(state).filter((input) => {
      return !input.optional;
    }).length;

    this.inputEditModeEnabled = this.isInputModeEnabled();
    if (this.inputEditModeEnabled && !this.signatureBuilderModeEnabled)
      this.store.dispatch(setSignatureBuilderMode(true));
    this.ownerLegalName = getPartyByRoleName(this.binder, RoleEnum.Owner).legalName;
    this.signingComplete = this.binder.status === 'SIGN_COMPLETED';
    this.documents = this.binder.documents.filter((d) => d.pages);
    this.currentUser = getCurrentParty(state);
    this.currentUserLegalName = this.currentUser ? this.currentUser.legalName : '';
    this.currentUserIsOwner = isCurrentUserOwner(state);
    this.noOtherSigners =
      this.currentUserIsOwner &&
      partyHasInputs(this.currentUser.reference, state) &&
      !this.inputs.find((input) => input.partyReference != this.currentUser.reference);
    this.binderHasInputs = this.inputs.length !== 0 || getAllInputs(state).length !== 0;
    this.setStickyBannerMsg();
  }

  isInputModeEnabled(): boolean {
    return this.inputsNeedRepositioningAfterDocumentEdit && !this.documentEditorModeEnabled;
  }

  progressBarIsVisible(): boolean {
    return !this.userSignedDoc && this.signingModeEnabled;
  }

  setDocumentEditToggles(): void {
    this.documentWasEditedUsingAdvancedEditor = this.binder.metaData
      ? this.binder.metaData.documentUpdatedFromAdvancedEditor == true
      : false;
    this.partnerRequestedBackToInterviewOption = this.searchParams.get('documentFromInterview') === 'true';
    this.backToInterviewIsEnabled =
      this.partnerRequestedBackToInterviewOption && !this.documentWasEditedUsingAdvancedEditor;
    this.advancedEditorIsEnabled = this.binder.documents[0].contentType == 'text/html';
    this.store.dispatch(setAdvancedEditOption(this.advancedEditorIsEnabled));
    this.store.dispatch(setInterviewEditOptions(this.backToInterviewIsEnabled));
  }

  setStickyBannerMsg(): void {
    if (this.binder.status != 'IN_PREPARATION' || this.documentEditorModeEnabled || this.signingModeEnabled) {
      this.stickyBannerMsg = null;
    } else if (this.inputEditModeEnabled) {
      this.stickyBannerMsg = 'sign-dashboard_edit-inputs';
    } else if (this.signatureBuilderModeEnabled) {
      this.stickyBannerMsg =
        !this.binderHasInputs && this.isMobileDevice
          ? 'sign-dashboard_instruction-text-mobile'
          : this.binderHasInputs && this.isMobileDevice
          ? 'sign-dashboard_instruction-text-additional-fields-mobile'
          : !this.binderHasInputs && !this.isMobileDevice
          ? 'sign-dashboard_instruction-text-desktop'
          : 'sign-dashboard_instruction-text-additional-fields-desktop';
    } else if (this.binder.status == 'IN_PREPARATION' && this.noOtherSigners && !this.signatureBuilderModeEnabled) {
      this.stickyBannerMsg = 'sign-dashboard_instruction-text-only-owner-as-signer';
    } else {
      this.stickyBannerMsg = null;
    }
  }

  onShowFinaliseWarning() {
    this.showModal('ownerFinaliseWarningModal');
  }

  onSavedChanges() {
    this.showModal('actionModal');
  }

  checkOwnerLegalName() {
    if (!this.ownerLegalName || this.ownerLegalName.trim().length == 0) {
      this.showModal('addNameModal');
      this.translate.get('sign-dashboard_doc-owner').subscribe((translated) => (this.ownerLegalName = translated));
    }
  }

  // Showing upload success should be partner's FE responsibility.
  // But we cheat a little because it's easy and looks simple.
  checkFreshUpload() {
    const timeSinceCreation = Date.now() - Date.parse(this.binder.created);
    if (timeSinceCreation > 5 * 60 * 1000) return;
    if (this.binder.status !== 'IN_PREPARATION') return;
    if (this.binderHasInputs) return;
    if (this.binder.requests.length > 1) return;
    this.alertService.setAlertMessage({ message: 'sign-dashboard_upload-success', type: 'success' });
  }

  isViewerRole(): boolean {
    return partyHasRole(this.currentUser, RoleEnum.Viewer);
  }

  // current signer has signed but other users haven't
  showSingleSignSuccess() {
    this.alertService.setAlertMessage({ message: 'single-sign-success', type: 'success' });
  }

  // all users have signed
  showFullSignSuccess() {
    this.alertService.setAlertMessage({ message: 'full-sign-success', type: 'success' });
  }

  showSignError() {
    this.alertService.setAlertMessage({ message: 'sign-error', type: 'danger' });
  }

  openSigningModal(input: SignatureInput | false) {
    if (this.modalsComponentRef) this.modalsComponentRef.instance.openSigningModal(input);
  }

  highlightNextInput() {
    setTimeout(() => {
      this.docPreview.highlightNextInput();
    }, 800);
  }

  openInputEditor() {
    const state = this.store.getState();
    const currentUser = getCurrentParty(state);
    const userIsOwner = partyHasRole(currentUser, RoleEnum.Owner);
    if (userIsOwner && isSignerDataMissing(state)) {
      this.proceedWithNextActionsOnSave = false;
      this.proceedWithEditInputOnSave = true;
      this.addSignerDataModalIntroText = 'standard';
      this.showModal('addSignerDataModal');
    } else {
      this.showModal('editInputModal');
    }
  }

  onError() {
    this.showGlobalLoader = false;
    this.alertService.setAlertMessage({ message: 'sign-dashboard_save-error', type: 'danger' });
  }

  proceedWithNextActionsOnSave;
  forceUserToAddData;
  addSignerDataModalIntroText: 'standard' | 'signatureBuilder' | 'addAnotherSigner';

  onInvitationsSent() {
    setTimeout(() => {
      this.showModal('actionModal');
    }, 2000);
  }

  isModalActive() {
    if (this.newInput) return true;
    if (this.editedInput) return true;
    return false;
  }

  onInviteCollaboratorsBtnClicked() {
    this.showModal('inviteCollaboratorsModal');
  }

  proceedWithSigning() {
    this.closeModal();
    this.progressBanner.submitSignatures();
  }

  closeModal() {
    if (this.modalsComponentRef) this.modalsComponentRef.instance.closeModal();
  }

  saveChanges() {
    this.signService.updateBinder(this.binder, true).subscribe(
      () => {
        this.stickyBannerMsg = null;
        setTimeout(() => {
          this.showModal('actionModal');
        }, 3000);
        this.alertService.setAlertMessage({ message: 'sign-dashboard_inputs-repositioned-success', type: 'success' });
      },
      () => {
        this.alertService.setAlertMessage({ message: 'document-editor_changes_error', type: 'danger' });
      }
    );
  }
}
