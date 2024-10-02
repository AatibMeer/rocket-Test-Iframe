import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Store } from '../../../state/store';
import { getCurrentParty } from '../../../state/selectors';
import { AlertService } from '../../../services/sign-app/alert.service';
import {
  CloseReason,
  ModalControlService,
  ModalNavigateIntention,
} from '../../../services/sign-app/modal-control.service';
import { TrackingPublisher } from '../../tracking/publisher';
import { SearchParamsService } from '../../../services/sign-app/search-params.service';
import { EnvInfoService } from '../../../services/common/env-info.service';
import { PaymentAgreement } from '../../../services/sign-app/payment-agreement.interface';
import { Binder } from '../../../services/sign-app/binder.interface';
import { updateAgreement } from '../../../state/actions/payment-agreement';
import { Step } from './step';
import { SignService } from '../../../services/sign-app/sign.service';
import { MessageService } from '../message';

declare interface PaymentAgreementCreator {
  doStepBack(): Promise<void>;
  binder: Binder;
}

@Component({
  selector: 'rl-payment-creator-modal',
  styleUrls: ['./payment-creator-modal.component.scss'],
  templateUrl: './payment-creator-modal.component.html',
})
export class PaymentCreatorModalComponent implements OnDestroy, OnInit, AfterViewInit {
  showBackButton = false;
  binder: Binder;
  currentUserPartyId: string;
  bindersBaseUrl: string;
  paymentAgreement: PaymentAgreement;
  peerPaymentsBaseUrl: string;
  rlAccessToken: string;
  userIsLawyer: boolean;

  @ViewChild('paymentAgreementCreator')
  creator: ElementRef<HTMLElement & PaymentAgreementCreator>;

  private readonly destroy = new Subject<void>();
  private headers: Record<Step, string> = {
    [Step.RoleSelector]: 'payment-creator-modal.headers.pay-get-paid',
    [Step.Overview]: 'payment-creator-modal.headers.set-up-payment',
    [Step.SelectPayee]: 'payment-creator-modal.headers.who-receiving',
    [Step.SelectPayer]: 'payment-creator-modal.headers.who-paying',
    [Step.EditParty]: 'payment-creator-modal.headers.add-details',
    [Step.EditAgreementTypeSelector]: 'payment-creator-modal.headers.edit-agreement-type-selector',
  };
  modalHeader: string;

  constructor(
    private readonly alertService: AlertService,
    private readonly eventTracker: TrackingPublisher,
    private readonly messageService: MessageService,
    private readonly modalControlService: ModalControlService,
    private readonly envInfoService: EnvInfoService,
    private readonly signService: SignService,
    private readonly store: Store,
    private readonly searchParams: SearchParamsService
  ) {}

  ngOnInit(): void {
    const { authInfo, binder, paymentAgreement } = this.store.getState();
    const currentUser = getCurrentParty({ authInfo, binder });
    this.currentUserPartyId = currentUser.id;
    this.paymentAgreement = paymentAgreement;
    // bindersBaseUrl in docmanspa is more like whole endpoint, so for web components we need to trim it
    this.bindersBaseUrl = this.envInfoService.getBindersBaseUrl().replace(/\/binders$/, '');
    this.peerPaymentsBaseUrl = this.envInfoService.getPeerPaymentsBaseUrl();
    this.rlAccessToken = authInfo.access_token;
    this.userIsLawyer = this.searchParams.has('isLawyer');

    this.modalControlService.navigate$.pipe(takeUntil(this.destroy)).subscribe((intention) => {
      this.onNavigate(intention);
    });
  }

  ngAfterViewInit(): void {
    // inject binder object with JS instead of html template/attribute
    // because angular is bad at passing complex objects to web components
    this.binder = this.store.getState().binder;
    this.creator.nativeElement.binder = this.binder;
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }

  private onNavigate(intention: ModalNavigateIntention): void {
    if (intention.data.to === 'back') {
      this.creator.nativeElement.doStepBack();
    } else if (intention.data.to === 'created') {
      const binderHasInputs = this.binder.documents[0].inputs.length > 0;
      if (binderHasInputs) {
        this.modalControlService.close(CloseReason.CompletedSuccessfully);
      } else {
        this.modalControlService.close(CloseReason.CompletedSuccessfully, { nextModal: 'askForSignatures' });
      }
    }
  }

  onStepChange(event: CustomEvent<Step>): void {
    this.modalHeader = this.headers[event.detail];
    this.showBackButton = event.detail !== Step.RoleSelector;
  }

  onSuccess(event: CustomEvent<PaymentAgreement>): void {
    this.eventTracker.paymentAgreementCreated({
      paymentAgreementID: event.detail.externalId,
      source: 'setupAPayment',
      creatorRole: this.getCreatorRole(),
    });
    this.alertService.addSuccessAlert({
      message: {
        key: 'payment-creator-modal.payment-setup-successful',
      },
    });
    // We trigger non-blocking getBinder to reload binder after Agreement was saved.
    // Backend services call each other and may modify the binder.
    this.signService.getBinder(this.binder.id, { saveStore: true }).subscribe();
    // Web component event returns the freshest Agreement so we can save it to Store.
    this.store.dispatch(updateAgreement(event.detail));
    this.modalControlService.navigate('created');
  }

  onError(): void {
    this.alertService.addDangerAlert({
      message: {
        key: 'payment-creator-modal.payment-setup-failure',
      },
    });
  }

  editAgreement(event: CustomEvent<{ type: 'backToInterview' | 'advancedEditor' }>): void {
    if (event.detail.type === 'backToInterview') {
      this.messageService.sendEvent({ action: 'changeAnswers' });
    }
  }

  private getCreatorRole() {
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
  }
}
