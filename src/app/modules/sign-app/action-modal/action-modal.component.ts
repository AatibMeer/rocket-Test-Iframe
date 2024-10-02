import {
  AfterViewChecked,
  Component,
  ElementRef,
  HostListener,
  Inject,
  OnDestroy,
  OnInit,
  QueryList,
  Renderer2,
  ViewChild,
  ViewChildren,
} from '@angular/core';

import { from, Observable, of, Subject } from 'rxjs';
import { map, takeUntil, tap } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { CurrencyPipe, DOCUMENT } from '@angular/common';
import { HttpHeaders } from '@angular/common/http';
import { Store } from '../../../state/store';
import { Binder } from '../../../services/sign-app/binder.interface';
import { Party, RoleEnum } from '../../../services/sign-app/party.interface';
import {
  binderHasInputs,
  docOwnerSignedDocAndOtherSignersPending,
  featureOwnerSignsFirstActivated,
  getAllInputs,
  getCurrentParty,
  getPartyByRoleName,
  isNotaryDocument,
  isOwnerSigningSecond,
  isSignerDataMissing,
  noOtherSigners,
  otherSignersHaveInputs,
  partyHasInputs,
  partyHasRole,
  payeeAccountCreated,
  payeeAccountUnverified,
  payoutEnabled,
  signerDeclinedToSign,
  signerOrOwnerSigningCompleted,
  signerSignedAndOtherSignersPending,
  userHasEditableInputs,
  userHasSigned,
} from '../../../state/selectors';
import { SignService } from '../../../services/sign-app/sign.service';
import { MessageService } from '../message';
import { NibblerBusinessEventsService } from '../../../services/nibbler-business-events/nibbler-business-events.service';
import { DocManagerEventDescriptor } from '../../../services/nibbler-business-events/event.interfaces';
import { ActionHeader, ActionItem, CustomActionTypes } from './custom-menu-item.interface';
import { AlertService } from '../../../services/sign-app/alert.service';
import { setSignatureBuilderMode } from '../../../state/actions/uiProps';
import { SignatureInput } from '../../../services/sign-app/signature-input.interface';
import { UserAgentService } from '../../../services/common/user-agent.service';
import { BoundBEM, makeBlockBoundBEMFunction } from '../../../common/utility-components/util-functions';
import { CloseReason, ModalControlService } from '../../../services/sign-app/modal-control.service';
import { LocalFeatureFlagService } from '../../../services/common/local-feature-flag.service';
import { PaymentAgreement, PaymentAgreementStatus } from '../../../services/sign-app/payment-agreement.interface';
import { SingleDocument } from '../../../services/sign-app/single-document.interface';
import type { State } from '../../../state/reducers/main.interface';
import { ActionItemsOrdering } from './action-items-ordering';
import { ActionsOrderByStatus, ConfigurationData } from '../../../common/interfaces/branding.interface';
import { TrackingPublisher } from '../../tracking/publisher';
import { SearchParamsService } from '../../../services/sign-app/search-params.service';
import { ModalActions } from './modal-actions';
import { getDefaultActions } from './actions';

const baseClass = 'rl-action-modal';

@Component({
  providers: [CurrencyPipe],
  selector: 'action-modal',
  templateUrl: './action-modal.component.html',
  styleUrls: ['./action-modal.component.scss'],
})
export class ActionModalComponent implements AfterViewChecked, OnDestroy, OnInit {
  constructor(
    private readonly store: Store,
    private readonly signService: SignService,
    private readonly alertService: AlertService,
    private readonly messageService: MessageService,
    private readonly nibblerBusinessEventsService: NibblerBusinessEventsService,
    private readonly featureFlagService: LocalFeatureFlagService,
    private readonly userAgentService: UserAgentService,
    private readonly modalControlService: ModalControlService,
    private readonly renderer: Renderer2,
    private readonly translateService: TranslateService,
    private readonly currencyPipe: CurrencyPipe,
    private readonly eventTracker: TrackingPublisher,
    private readonly searchParams: SearchParamsService,
    @Inject(DOCUMENT) private document: HTMLDocument
  ) {
    this.bem = makeBlockBoundBEMFunction(baseClass);
    this.brandConfig = this.store.getState().brandConfig;
    this.destroy = new Subject<void>();
    this.paymentsEnabled = this.featureFlagService.flags.payments_enabled;
    this.featureCopyDocumentActivated = searchParams.notEmpty('copyDocument');
    this.featureGoToDashboardActivated = searchParams.notEmpty('goToDashboard');
    this.store
      .getState$()
      .pipe(takeUntil(this.destroy))
      .subscribe((state) => this.setupComponent(state));
  }

  // Following flags are based on the state of the Binder:
  binder: Readonly<Binder>;
  private paymentAgreement: PaymentAgreement | null;
  private inputs: Array<SignatureInput>;
  private currentUser: Readonly<Party>;
  userIsOwner: boolean;
  userIsViewer: boolean;
  userIsNotary: boolean;
  private userIsSigner: boolean;
  private userIsPayer: boolean;
  public userIsPayee: boolean;
  private noOtherSigners: boolean;
  private ownerReference: string;
  private otherSignersHaveInputs: boolean;
  private userHasSigned: boolean;
  private userHasEditableInputs: boolean;
  showOtherActions = false;
  private signatureBuilderModeEnabled: boolean;
  public payeeAccountAttached: boolean;
  public payeeAccountVerificationFailed: boolean;
  featureOwnerSignsFirstActivated: boolean;
  isOwnerSigningSecond: boolean;
  signerOrOwnerSigningCompleted: boolean;
  featureCopyDocumentActivated: boolean;
  featureGoToDashboardActivated: boolean;
  public payoutEnabled: boolean;
  brandingLevel = 3;

  // payments feature flipper
  private readonly paymentsEnabled: boolean;

  readonly brandConfig: ConfigurationData;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly isMsie = !!(<any>window).MSInputMethodContext && !!(<any>this.document).documentMode;

  actions: ActionItem[];
  docIsEditable = false;
  mainCta: ActionItem;
  mainCtaHeader: ActionHeader;
  /** Only when signerDataIsMissing */
  secondaryCta: ActionItem | undefined;
  signerDataIsMissing: boolean;
  isNotaryDocument: boolean;
  docOwnerSignedDocAndOtherSignersPending = false;
  signerSignedAndOtherSignersPending = false;
  binderHasInputs = false;
  readonly destroy: Subject<void>;
  @ViewChild('actionList')
  private actionList: ElementRef;
  // noinspection JSMismatchedCollectionQueryUpdate
  @ViewChildren('actionItems')
  private actionItems: QueryList<ElementRef>;
  private actionListDimensionsNeedCalculating = true;
  readonly bem: BoundBEM;
  allActions: ActionItem[];

  @ViewChild('message', { read: ElementRef }) message;
  contextualMessage;
  canToggleText = false;
  textExpanded = false;

  // Note! The order of actions is set up in XXX-spa-brand-config.json files (in Helm chart).
  getActions(): Array<ActionItem> {
    return getDefaultActions.apply(this);
  }

  setupComponent(state: State): void {
    this.binder = state.binder;
    this.brandingLevel = state.globalBrandConfig?.brandingLevel || 3;
    this.paymentAgreement = state.paymentAgreement;
    this.inputs = getAllInputs(state);
    this.currentUser = getCurrentParty(state);
    this.userIsOwner = partyHasRole(this.currentUser, RoleEnum.Owner);
    this.userIsSigner = partyHasInputs(this.currentUser.reference, state);
    this.userIsViewer = partyHasRole(this.currentUser, RoleEnum.Viewer);
    this.userIsPayer = partyHasRole(this.currentUser, RoleEnum.Payer);
    this.userIsNotary = partyHasRole(this.currentUser, RoleEnum.Notary);
    this.ownerReference = this.binder.parties.find((p) => p.roles.includes(RoleEnum.Owner)).reference;
    this.noOtherSigners = noOtherSigners(state);
    this.otherSignersHaveInputs = otherSignersHaveInputs(state, this.ownerReference);
    this.userHasEditableInputs = userHasEditableInputs(state);
    this.signatureBuilderModeEnabled = state.signatureBuilderModeEnabled;
    this.docIsEditable =
      (state.advancedEditorOptionEnabled || state.backToInterviewOptionEnabled) &&
      this.binder.documents[0].contentType === 'text/html';
    this.signerDataIsMissing = this.userIsOwner && isSignerDataMissing(state);
    this.isNotaryDocument = this.isSendToNotaryVisible(state);
    this.docOwnerSignedDocAndOtherSignersPending = docOwnerSignedDocAndOtherSignersPending(state);
    this.userIsPayee = partyHasRole(this.currentUser, RoleEnum.Payee);
    this.payeeAccountAttached = payeeAccountCreated(state);
    this.payeeAccountVerificationFailed = payeeAccountUnverified(state);
    this.userHasSigned = userHasSigned(state);
    this.signerSignedAndOtherSignersPending = signerSignedAndOtherSignersPending(state) && this.userIsSigner;
    this.featureOwnerSignsFirstActivated = featureOwnerSignsFirstActivated(state);
    this.isOwnerSigningSecond = isOwnerSigningSecond(state);
    this.signerOrOwnerSigningCompleted = signerOrOwnerSigningCompleted(state);
    this.binderHasInputs = binderHasInputs(state);
    this.payoutEnabled = payoutEnabled(state);
    this.setContextualMessage();
    this.setupActions();
    this.configureTopSection();
  }

  private isSendToNotaryVisible(state: State) {
    return this.userIsOwner && this.binder.status !== 'SIGN_COMPLETED' && isNotaryDocument(state);
  }

  setContextualMessage(): void {
    const shouldShowSignerMessage =
      !this.userIsOwner && ((this.userIsSigner && this.userHasEditableInputs) || this.userIsViewer);
    if (!shouldShowSignerMessage) return;

    const customInviteMessage = this.getCustomInviteMessage();
    const defaultInviteMessage = this.getDefaultInviteMessage();
    const ownerName = this.binder.parties.find((p) => p.reference === this.ownerReference).legalName;
    this.contextualMessage = {
      isCustom: !!customInviteMessage,
      key: customInviteMessage || defaultInviteMessage,
      params: { name: this.currentUser.legalName, docOwnerName: ownerName },
    };
    if (!this.message || !this.message.nativeElement || this.message.nativeElement.clientHeight === 0) {
      setTimeout(() => this.setContextualMessage(), 50);
    } else
      this.canToggleText =
        this.contextualMessage.key.split('\n').length > ActionModalComponent.getNumberOfLinesToShow();
  }

  private getCustomInviteMessage() {
    const events = this.store.getState().historyInfo;
    const { requests } = this.store.getState().binder;
    if (this.userIsViewer) {
      const viewerRequests = requests.filter((r) => r.type === 'VIEWER_CREATION');
      const currentViewerRequests = viewerRequests.filter((r) =>
        r.recipients.find((recipient) => recipient.partyId === this.currentUser.id)
      );
      return currentViewerRequests.shift()?.message;
    }
    // user is signer
    return events.filter((e) => e.type === 'INVITATION_TO_SIGN_SENT').shift()?.details?.message;
  }

  private getDefaultInviteMessage() {
    if (this.userIsViewer) return 'action-modal_viewer-contextual-message';
    return 'action-modal_signer-contextual-message-sign-now';
  }

  @HostListener('window:resize')
  onResize(): void {
    this.canToggleText = this.contextualMessage?.key.split('\n').length > ActionModalComponent.getNumberOfLinesToShow();
  }

  private static getNumberOfLinesToShow(): number {
    if (window.innerWidth > 480) {
      return 6;
    }
    return 4;
  }

  setupActions(): void {
    const defaultActions = this.getActions();
    const customActions = this.getCustomActions();
    const allActionsWithoutOrder = [...defaultActions, ...customActions];
    this.allActions = this.addOrderToActions(allActionsWithoutOrder);

    if (this.brandConfig && this.brandConfig.featureTogglesForDefaultMenuItems) {
      this.allActions = this.addCustomFeatureTogglesToDefaultActions(this.allActions);
    }

    this.actions = this.allActions.filter((action) => action.visible);
  }

  configureTopSection(): void {
    this.setupCtas();
    this.mainCta.headers = this.mainCta.headers || [];

    const isDashboardCTA = this.mainCta.id === 'GO_TO_DASHBOARD';
    if (this.userIsOwner && this.binder.status === 'SIGN_COMPLETED' && this.mainCta.id === 'VIEW_LOGOIPSUM_DOCUMENT') {
      this.mainCta.headers.push({
        visible: true,
        useDefaultIcon: true,
        title: () =>
          this.translateService.get('action-modal_owner-signed-signing-complete-logoipsum-header', {
            docName: this.binder.documents[0].name,
          }),
        description: 'action-modal_owner-signed-signing-complete-logoipsum-description',
      });
    } else if (this.docOwnerSignedDocAndOtherSignersPending && this.mainCta.id === 'VIEW_LOGOIPSUM_DOCUMENT') {
      this.mainCta.headers.push({
        visible: true,
        useDefaultIcon: true,
        title: 'action-modal_owner-signed-signing-in-progress-logoipsum-header',
        description: 'action-modal_owner-signed-signing-in-progress-logoipsum-description',
      });
    } else if (
      this.userIsSigner &&
      this.binder.status === 'SIGN_COMPLETED' &&
      this.mainCta.id === 'VIEW_LOGOIPSUM_DOCUMENT'
    ) {
      this.mainCta.headers.push({
        visible: true,
        useDefaultIcon: true,
        title: 'action-modal_signer-signed-signing-complete-logoipsum-header',
        description: 'action-modal_signer-signed-signing-complete-logoipsum-description',
      });
    } else if (this.signerSignedAndOtherSignersPending && this.mainCta.id === 'VIEW_LOGOIPSUM_DOCUMENT') {
      this.mainCta.headers.push({
        visible: true,
        useDefaultIcon: true,
        title: 'action-modal_signer-signed-signing-in-progress-logoipsum-header',
        description: 'action-modal_signer-signed-signing-in-progress-logoipsum-description',
      });
    } else if (this.docOwnerSignedDocAndOtherSignersPending && isDashboardCTA) {
      this.mainCta.headers.push({
        visible: true,
        image: this.brandConfig?.lookAndFeel?.customIcons?.goToDashboard,
        title: 'action-modal_sign-in-progress-first-header',
        description: 'action-modal_sign-in-progress-first-description',
        secondDescription: 'action-modal_sign-in-progress-second-description',
      });
    } else if (this.signerSignedAndOtherSignersPending) {
      this.mainCta.headers.push({
        visible: true,
        useDefaultIcon: true,
        title: 'action-modal_sign-in-progress-first-header_signer',
        description: 'action-modal_sign-in-progress-first-description_signer',
      });
    } else if (this.signerOrOwnerSigningCompleted && isDashboardCTA) {
      this.mainCta.headers.push({
        visible: true,
        image: this.brandConfig?.lookAndFeel?.customIcons?.goToDashboard,
        title: 'action-modal_owner-signer-signing-complete-header',
        description: 'action-modal_owner-signer-signing-complete-description',
        secondDescription: 'action-modal_owner-signer-signing-complete-footer',
      });
    } else if (this.userIsViewer && this.mainCta.id === 'VIEW_LOGOIPSUM_DOCUMENT') {
      this.mainCta.headers.push({
        visible: true,
        title: 'action-modal_viewer-header',
        useDefaultIcon: true,
        description: null,
      });
    }

    this.setupActionHeaders();
    // new actions means the list decorations need their positions recalculating
    this.actionListDimensionsNeedCalculating = true;
  }

  setupCtas(): void {
    let firstAction = this.actions[0];
    let secondAction = this.actions[1];
    if (
      this.docOwnerSignedDocAndOtherSignersPending &&
      (!this.paymentAgreement || this.paymentAgreement.status === PaymentAgreementStatus.Collected) &&
      this.featureGoToDashboardActivated
    ) {
      this.mainCta = this.allActions.find((a) => a.id === 'GO_TO_DASHBOARD');
      this.secondaryCta = this.allActions.find((a) => a.id === 'ASK_A_LAWYER');
    } else if (
      // an Action with no `onClick` signifies it's a custom action item
      (this.featureOwnerSignsFirstActivated ||
        this.isCopyDocumentSecondaryCtaEnabled(this.actions) ||
        this.isOwnerSigningSecond ||
        this.signerSignedAndOtherSignersPending ||
        this.signerOrOwnerSigningCompleted ||
        !firstAction.onClick ||
        secondAction.isSecondaryCTA) &&
        ActionModalComponent.hasLayoutWithSecondaryCta(this.actions[0])
    ) {
      const [mainCTA, secondaryCTA] = this.actions;
      this.mainCta = mainCTA;
      this.secondaryCta = secondaryCTA;
    } else {
      const [mainCTA] = this.actions;
      this.mainCta = mainCTA;
      this.secondaryCta = undefined;
    }

    if (this.mainCta && typeof this.mainCta.secondaryCTA === 'string') {
      this.secondaryCta = this.allActions.find((a) => a.id === this.mainCta.secondaryCTA);
    }
    this.removeCtasFromActionList();
  }

  private static hasLayoutWithSecondaryCta(mainCTA: ActionItem): boolean {
    return mainCTA.layout !== 'primaryButton';
  }

  private removeCtasFromActionList(): void {
    this.actions = this.actions.filter((action) => action.id !== this.mainCta.id);
    if (this.secondaryCta) this.actions = this.actions.filter((action) => action.id !== this.secondaryCta.id);
  }

  private isCopyDocumentSecondaryCtaEnabled(actionList: ActionItem[]): boolean {
    return (
      this.featureCopyDocumentActivated && ActionModalComponent.isCandidateToSecondaryCta('COPY_DOCUMENT', actionList)
    );
  }

  private static isCandidateToSecondaryCta(actionId: string, actionList: ActionItem[]): boolean {
    return actionList[1].id === actionId;
  }

  private getObservableHeaderPart(
    part: string | (() => string | Promise<string> | Observable<string>) | undefined
  ): Observable<string> {
    if (typeof part === 'string') {
      return this.translateService.get(part, {
        docOwnerName: this.binder.parties.find((party) => party.roles.includes('OWNER')).legalName,
        documentName: this.binder.documents[0].name,
      });
    }
    const callbackResult = typeof part === 'function' ? part() : '';
    if (typeof callbackResult === 'string') {
      return of(callbackResult);
    }
    if (callbackResult instanceof Promise) {
      return from(callbackResult);
    }
    return callbackResult;
  }

  toggleText(): void {
    this.textExpanded = !this.textExpanded;
    const el = this.message.nativeElement;
    el.style.maxHeight =
      el.clientHeight === el.scrollHeight
        ? ActionModalComponent.getContextualMessageMaxHeight()
        : `${el.scrollHeight}px`;
  }

  private static getContextualMessageMaxHeight(): string {
    if (window.innerWidth > 480) {
      return '8em';
    }
    return '6em';
  }

  setupActionHeaders(): void {
    this.mainCtaHeader = ActionModalComponent.getFirstVisibleHeader(this.mainCta);
    if (this.mainCtaHeader) {
      this.getObservableHeaderPart(this.mainCtaHeader.title)
        .pipe(takeUntil(this.destroy))
        .subscribe((translatedTitle) => {
          this.mainCtaHeader.title = translatedTitle;
        });

      this.getObservableHeaderPart(this.mainCtaHeader.description)
        .pipe(takeUntil(this.destroy))
        .subscribe((translatedTitle) => {
          this.mainCtaHeader.description = translatedTitle;
        });

      if (this.mainCtaHeader.secondDescription) {
        this.getObservableHeaderPart(this.mainCtaHeader.secondDescription)
          .pipe(takeUntil(this.destroy))
          .subscribe((translatedTitle) => {
            this.mainCtaHeader.secondDescription = translatedTitle;
          });
      }
    }
  }

  ngAfterViewChecked(): void {
    if (this.actionListDimensionsNeedCalculating) {
      const height = this.calculateActionListHeight(this.showOtherActions);
      this.setActionListHeight(height);
      this.actionListDimensionsNeedCalculating = false;
    }
  }

  private calculateActionListHeight(show: boolean): number | undefined {
    if (!this.actionList || !this.actionList.nativeElement || this.actionItems.length === 0) {
      return undefined;
    }
    if (show) {
      let height = 0;
      this.actionItems.forEach((action: ElementRef) => {
        const actionEl = action.nativeElement;
        actionEl.style.setProperty('--actionHeight', `${actionEl.offsetHeight}px`);
        actionEl.style.setProperty('--dividerTop', `${height}px`);
        height += actionEl.offsetHeight;
      });
      return height;
    }
    const firstAction = this.actionItems.first.nativeElement;
    firstAction.style.setProperty('--actionHeight', `${firstAction.offsetHeight}px`);
    firstAction.style.setProperty('--dividerTop', `0`);
    return firstAction.offsetHeight;
  }

  private setActionListHeight(height: number): void {
    if (height !== undefined && this.actionList && this.actionList.nativeElement) {
      this.renderer.setStyle(this.actionList.nativeElement, 'height', `${height}px`);
    }
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }

  ngOnInit(): void {
    this.modalControlService.navigate$.pipe(takeUntil(this.destroy)).subscribe(({ data }) => {
      this.modalControlService.close(CloseReason.UserNavigatedNext, {
        nextModal: data.action,
      });
    });
  }

  close(): void {
    this.modalControlService.close(CloseReason.UserTerminated);
  }

  showAddSignerDataModal(): void {
    this.modalControlService.navigate('next', {
      action: ModalActions.AddSignerDataModal,
    });
  }

  sendDocumentToNotary(): void {
    this.modalControlService.navigate('next', {
      action: ModalActions.AddSignerDataModal,
    });
  }

  private static getFirstVisibleHeader(action: ActionItem): ActionHeader {
    return (action.headers || []).find((header: ActionHeader) => header.visible);
  }

  showManageModal(): void {
    this.modalControlService.navigate('next', {
      action: ModalActions.Manage,
    });
  }

  showInviteViewerModal(): void {
    this.modalControlService.navigate('next', {
      action: ModalActions.InviteViewers,
    });
  }

  showManageViewersModal(): void {
    this.modalControlService.navigate('next', {
      action: ModalActions.ManageViewers,
    });
  }

  signNowOwnerOnly(): void {
    this.modalControlService.navigate('next', {
      action: ModalActions.SignNowOwner,
    });
  }

  showInviteModal(): void {
    this.modalControlService.navigate('next', {
      action: ModalActions.InviteCollaborators,
    });
  }

  addAnotherSigner(): void {
    this.modalControlService.navigate('next', {
      action: ModalActions.AddAnotherSigner,
    });
  }

  startSigningUploadedDocument(): void {
    if (this.userIsSigner) {
      this.signNowOwnerOnly();
    } else {
      this.showInviteModal();
    }
  }

  startSigningInterviewedDocument(): void {
    if (this.userIsOwner && this.userIsSigner) {
      if (this.noOtherSigners) {
        this.signNowOwnerOnly();
      }
    } else {
      this.showInviteModal();
    }
  }

  getSignature(): void {
    this.store.dispatch(setSignatureBuilderMode(true));
    this.alertService.clearAlerts();
    const docOwner = getPartyByRoleName(this.binder, RoleEnum.Owner);
    const binderDocument = this.binder.documents[0];
    this.modalControlService.navigate('next', {
      action: ModalActions.GetSignature,
    });

    this.callBusinessEvent(
      {
        eventType: 'SIGN_PREPARE_STARTED',
        party: {
          partyId: docOwner.id,
          partyName: docOwner.legalName,
          partyEmail: docOwner.email,
          partyRoles: docOwner.roles,
        },
        binder: {
          binderId: this.binder.id,
          binderName: this.binder.name,
          binderStatus: this.binder.status,
          country: this.binder?.configuration?.locale?.country,
          language: undefined /* this.binder.language */,
          signable: true,
        },
        document: {
          documentId: binderDocument.id,
          documentName: binderDocument.name,
          signable: binderDocument.signable,
          contentType: binderDocument.contentType,
          templateId: binderDocument.id,
          templateName: binderDocument.name,
        },
      },
      null
    );
  }

  showPaymentPayerModal(): void {
    if (
      this.paymentAgreement?.status === PaymentAgreementStatus.Optional ||
      this.paymentAgreement?.status === PaymentAgreementStatus.Proposed
    ) {
      this.modalControlService.navigate('next', {
        action: ModalActions.ShowPaymentCreatorModal,
      });
    } else if (this.featureFlagService.flags.variable_fee_enabled) {
      this.modalControlService.navigate('next', {
        action: ModalActions.ShowPaymentCreatorModal,
      });
    } else {
      this.modalControlService.navigate('next', {
        action: ModalActions.ShowPaymentSelectRoleModal,
      });
    }
  }

  showPaymentStatusModal(): void {
    this.modalControlService.navigate('next', {
      action: ModalActions.ShowPaymentStatusModal,
    });
  }

  showPaymentPayNowModal(): void {
    const next = (() => {
      const { paymentMethods, achPaymentMethod } = this.store.getState().identityProfile;
      if (this.paymentAgreement.paymentMethodType === 'card') {
        return paymentMethods?.length ? ModalActions.PayChoosePaymentMethod : ModalActions.ShowPaymentPayNow;
      }
      return ModalActions.ShowPaymentPayNow;
    })();
    this.modalControlService.navigate('next', {
      action:
        this.featureFlagService.flags.pay_with_bank_account ||
        this.featureFlagService.flags.wallet_enabled ||
        this.paymentAgreement.paymentMethodType === 'bank'
          ? ModalActions.PayChoosePaymentMethod
          : ModalActions.ShowPaymentPayNow,
    });
  }

  showPaymentPlaidModal(): void {
    this.modalControlService.navigate('next', {
      action: ModalActions.ShowPlaid,
    });
  }

  showRemoveSignatureModal(): void {
    this.modalControlService.navigate('next', {
      action: ModalActions.RemoveSignature,
    });
  }

  showCancelModal(): void {
    this.modalControlService.navigate('next', {
      action: ModalActions.Cancel,
    });
  }

  showDeclineModal(): void {
    this.modalControlService.navigate('next', {
      action: ModalActions.Decline,
    });
  }

  goToEdit(): void {
    this.modalControlService.navigate('next', {
      action: ModalActions.StartDocumentEdit,
    });
  }

  changeDocTitle(): void {
    this.modalControlService.navigate('next', {
      action: ModalActions.ChangeTitle,
    });
  }

  seeHistory(): void {
    this.modalControlService.navigate('next', {
      action: ModalActions.ShowHistory,
    });
  }

  signNow(): void {
    this.modalControlService.navigate('next', {
      action: ModalActions.SignNow,
    });
  }

  getVerified(): void {
    this.modalControlService.navigate('next', {
      action: ModalActions.ShowKYCVerify,
    });
  }

  exportDocument(): void {
    if (this.userIsNotary || this.binder.status === 'IN_PREPARATION') {
      this.modalControlService.navigate('next', {
        action: ModalActions.ExportDocument,
      });
      return;
    }
    this.signService.download(this.binder, '.pdf').subscribe((blob) => {
      if (blob) this.modalControlService.close(CloseReason.CompletedSuccessfully);
    });
  }

  printDoc(): void {
    const binder = this.store.getState().get('binder');
    this.messageService.sendEvent({ eventName: 'DOCUMENT_PRINTED', binder, category: 'SignEvent' });
    const fileToPrint$ = this.signService.getFullDocument(binder.id, true).pipe(
      takeUntil(this.destroy),
      map((pdfBuffer) => new Blob([pdfBuffer], { type: 'application/pdf' })),
      tap((blob) => this.emitEvents(blob)),
      tap(() => this.updateDocumentHistory(binder.id))
    );

    if (this.userAgentService.isAndroidDevice()) {
      ActionModalComponent.openPdfWindowForAndroid(fileToPrint$);
    } else if (this.userAgentService.isIOSDevice()) {
      ActionModalComponent.openPdfWindowForIOS(fileToPrint$);
    } else {
      ActionModalComponent.openNativePrintPopup(fileToPrint$);
    }
  }

  private emitEvents(blob: Blob) {
    // emit the download data as a postMessage
    const reader = new FileReader();
    reader.addEventListener('loadend', (event) => {
      this.messageService.sendEvent({ printFullDoc: event.target.result });
    });
    reader.readAsText(blob);
  }

  private updateDocumentHistory(binderId: string) {
    this.signService.getDocumentEvents(binderId).subscribe();
  }

  private static openPdfWindowForIOS(fileToPrint$: Observable<Blob>): void {
    const pdfWindow = window.open();
    fileToPrint$.subscribe((blob) => pdfWindow.location.assign(URL.createObjectURL(blob)));
  }

  private static openPdfWindowForAndroid(fileToPrint$: Observable<Blob>): void {
    fileToPrint$.subscribe((blob) => window.open(URL.createObjectURL(blob)));
  }

  private static openNativePrintPopup(fileToPrint$: Observable<Blob>) {
    fileToPrint$.subscribe((blob) => {
      const objUrl = URL.createObjectURL(blob);
      const frame = window.document.createElement('iframe');
      frame.setAttribute('src', objUrl);
      frame.style.display = 'none';
      window.document.body.appendChild(frame);
      setTimeout(() => {
        frame.contentWindow.print();
      }, 1000);
    });
  }

  toggleOtherActions(): void {
    this.actionListDimensionsNeedCalculating = true;
    this.showOtherActions = !this.showOtherActions;
  }

  addCustomFeatureTogglesToDefaultActions(actions: Array<ActionItem>): Array<ActionItem> {
    return actions.map((action) => {
      const itemFeatureToggle = this.brandConfig.featureTogglesForDefaultMenuItems.find(
        (toggle) => toggle.id === action.id
      );
      if (itemFeatureToggle) {
        return {
          ...action,
          visible: ActionModalComponent.itemVisibilityFromUserRole(
            itemFeatureToggle,
            this.currentUser,
            this.binder.status
          ),
        };
      }
      return action;
    });
  }

  addOrderToActions(actions: ActionItem[]): ActionItem[] {
    const actionItemsOrder = this.getCustomActionItemsOrder();
    const binderStatus = this.binder.status;

    return new ActionItemsOrdering(actionItemsOrder, binderStatus).sort(actions);
  }

  getCustomActionItemsOrder(): ActionsOrderByStatus | null {
    return this.brandConfig && this.brandConfig.orderOfItemsInIntentionModal
      ? this.brandConfig.orderOfItemsInIntentionModal
      : null;
  }

  getCustomActions(): Array<ActionItem> {
    if (this.brandConfig && this.brandConfig.customMenuItems)
      return this.getCustomMenuItems(this.brandConfig.customMenuItems);
    return [];
  }

  elemClicked(event: MouseEvent, action: ActionItem & { isCustom?: boolean }): void {
    this.emitToParentWindow(action.eventName);
    this.eventTracker.action({
      id: action.id,
      text: action.heading ? this.translateService.instant(action.heading) : undefined,
    });
    const isListedAction = action.id !== this.mainCta.id && action.id !== this.secondaryCta?.id;
    if (isListedAction && action.url) {
      // check if the click was outside of the <a>. This happens if the pseudo-element highlight was clicked
      // since the <a> can only reach to the edges of the list and not to the edges of the highlightable container
      const anchor = (event.currentTarget as HTMLLIElement).querySelector(
        `a.${this.bem('listed-action-anchor')}`
      ) as HTMLAnchorElement;
      if (!anchor.contains(event.target as HTMLElement)) {
        // click was on an action with a URL, but outside the anchor element so the hyperlink won't trigger!
        if (action.openInNewWindow) {
          // only with 3 arguments is this an alias for Window.open() [https://developer.mozilla.org/en-US/docs/Web/API/Document/open#three-argument_document.open]
          // otherwise Document.open opens a document for *writing*
          this.document.open(action.url, '_blank', 'noopener=true');
        } else {
          this.document.location.href = action.url;
        }
      }
    }
    if (action.isCustom && !action.onClick) {
      this.modalControlService.close(CloseReason.CompletedSuccessfully);
    } else {
      action.onClick?.apply(this);
    }
  }

  getCustomMenuItems(customMenuItems: Array<ActionItem>): Array<ActionItem> {
    // simplifies a customMenuItem so the template can read it more easily
    return customMenuItems.map((item) => {
      return {
        id: item.id,
        product: item?.product,
        name: item.name,
        eventName: item.eventName,
        iconClassName: item.iconClassName || null,
        queryStringFeatureToggle: item.queryStringFeatureToggle,
        visible:
          ActionModalComponent.itemVisibilityFromUserRole(item, this.currentUser, this.binder.status) &&
          this.itemVisibilityFromQueryParam(item) &&
          ActionModalComponent.itemVisibilityForBinderType(item, this.binder.documents),
        url: item.url || null,
        openInNewWindow: item.openInNewWindow,
        layout: item.layout,
        onClick: this.mapCustomActionToCallback(item.onClick),
        isCustom: true,
        headers: item.headers,
        isSecondaryCTA: item.isSecondaryCTA,
      };
    });
  }

  private mapCustomActionToCallback(actionType: () => void | CustomActionTypes): () => void | null {
    if (actionType) {
      switch (<CustomActionTypes>(<unknown>actionType)) {
        case CustomActionTypes.CloseModal: {
          return this.close;
        }
        default: {
          throw new Error('Unexpected custom action, please verify the brand configuration file!');
        }
      }
    }

    return null;
  }

  emitToParentWindow(name: string): void {
    const data = {
      action: name,
    };
    this.messageService.sendEvent(data);
  }

  callBusinessEvent(docManagerEventDescriptor: DocManagerEventDescriptor, headers: HttpHeaders): void {
    const businessEvent = this.nibblerBusinessEventsService.createBusinessEvent(docManagerEventDescriptor, {
      market: docManagerEventDescriptor.binder.country as string,
    });
    this.nibblerBusinessEventsService.postBusinessEvent(businessEvent, headers);
  }

  private static itemVisibilityFromUserRole(
    item: ActionItem,
    currentUser: Party,
    binderStatus: Binder['status']
  ): boolean {
    if (!item.featureToggles) {
      return false;
    }
    return currentUser.roles.some((role) => item.featureToggles[binderStatus][role] === true);
  }

  private itemVisibilityFromQueryParam(item: ActionItem): boolean {
    // if the item has queryStringFeatureToggle set to true, then the app will look for a URL query param with the items eventName
    // this could be provided by the partner for additional customization
    if (item.queryStringFeatureToggle) {
      return this.searchParams.get(item.eventName) === 'true';
    }
    return true;
  }

  private static itemVisibilityForBinderType(item: ActionItem, documents: SingleDocument[]): boolean {
    // if the binder is nonsignable, see if item needs to be visible
    if (!documents[0].signable) {
      return item.visibleForNonSignableDocs ?? true;
    }
    return true;
  }
}
