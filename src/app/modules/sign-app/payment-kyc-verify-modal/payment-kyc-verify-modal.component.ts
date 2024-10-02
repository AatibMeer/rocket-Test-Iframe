import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { concatMap, pluck, takeUntil } from 'rxjs/operators';
import { forkJoin, fromEvent, Subject } from 'rxjs';
import { Observable } from 'rxjs';
import { CloseReason, ModalControlService } from '../../../services/sign-app/modal-control.service';
import { makeBlockBoundBEMFunction } from '../../../common/utility-components/util-functions';
import { Store } from '../../../state/store';
import { State } from '../../../state/reducers/main.interface';
import { getCurrentParty } from '../../../state/selectors';
import { PayService } from '../../../services/sign-app/pay.service';
import { TokenAuthService } from '../../../services/login/token-auth.service';
import { EnvInfoService } from '../../../services/common/env-info.service';
import { PaymentAccount } from '../../../services/sign-app/payment-account.interface';
import { AlertService } from '../../../services/sign-app/alert.service';
import { updatePayAccount } from '../../../state/actions/pay-account';
import { TrackingPublisher } from '../../tracking/publisher';

const baseClass = 'rl-payment-kyc-details';

@Component({
  selector: 'rl-payment-kyc-verify-modal',
  styleUrls: ['./payment-kyc-verify-modal.component.scss'],
  templateUrl: './payment-kyc-verify-modal.component.html',
})
export class PaymentKycVerifyModalComponent implements AfterViewInit, OnDestroy, OnInit {
  @ViewChild('form') formComponent: ElementRef<HTMLElement>;

  readonly bem = makeBlockBoundBEMFunction(baseClass);

  // props taken from the Redux state
  brandID: string;
  binderID: string;
  currentPartyEmail: string;
  highPayout: boolean;
  partyID: string;
  paymentAccountID: string;
  personID: string;

  // props grabbed from envService
  peerPaymentsBaseURL: string;
  identityBaseURL: string;

  // props which are grabbed async after component init
  rlAccessToken: string;
  stripeAPIKey: string;

  private readonly destroy = new Subject<void>();

  constructor(
    private readonly alertService: AlertService,
    envService: EnvInfoService,
    private readonly eventTracker: TrackingPublisher,
    private readonly modalControlService: ModalControlService,
    private readonly payService: PayService,
    private readonly store: Store,
    private readonly tokenAuthService: TokenAuthService
  ) {
    this.peerPaymentsBaseURL = envService.getPeerPaymentsBaseUrl();
    this.identityBaseURL = envService.getIdentityBaseUrl();
  }

  ngOnInit(): void {
    this.setupFromStateSync(this.store.getState());

    forkJoin({
      rlAPIToken: this.tokenAuthService.getAccessToken(),
      stripeAPIToken: this.payService.getPaymentsConfig().pipe<string>(pluck('stripePublishableKey')),
    }).subscribe({
      next: (keys: { rlAPIToken: string; stripeAPIToken: string }) => {
        this.rlAccessToken = keys.rlAPIToken;
        this.stripeAPIKey = keys.stripeAPIToken;
      },
    });

    this.modalControlService.navigate$.pipe(takeUntil(this.destroy)).subscribe(({ data }) => {
      if (data.to === 'next') {
        this.modalControlService.close(CloseReason.UserNavigatedNext);
      }
    });

    this.eventTracker.kycStarted({
      type: 'basic',
    });
  }

  ngAfterViewInit(): void {
    fromEvent(this.formComponent.nativeElement, 'rlKYCGetVerifiedSubmitSuccess')
      .pipe(takeUntil(this.destroy))
      .subscribe({
        next: (event: CustomEvent) => {
          this.onSubmitSuccess(event.detail.paymentAccount, event.detail.verificationStatus);
          if (event.detail.submittedWithErrors) {
            console.error(
              'There was a problem submitting to the identity service. This has no impact on KYC verification.',
              event.detail.submittedWithErrors?.originalError
            );
          }
        },
      });
    fromEvent(this.formComponent.nativeElement, 'rlKYCGetVerifiedSubmitFail')
      .pipe(takeUntil(this.destroy))
      .subscribe({
        next: () => {
          this.onSubmitFailed();
        },
      });
    fromEvent(this.formComponent.nativeElement, 'rlKYCGetVerifiedSubmitStart')
      .pipe(takeUntil(this.destroy))
      .subscribe({
        next: () => {
          this.eventTracker.kycSubmitted({
            type: 'basic',
          });
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }

  private assignPaymentAccountToPaymentAgreement(account: PaymentAccount): Observable<void> {
    return this.payService.getPaymentAgreementByBinderID(this.binderID).pipe(
      pluck('externalId'),
      concatMap((agreementID) =>
        this.payService.assignPaymentAccountToAgreement(agreementID, this.partyID, account.externalId)
      )
    );
  }

  private onSubmitFailed(): void {
    this.alertService.addDangerAlert({
      message: {
        key: 'payment-kyc-verify.request-failed',
      },
    });
  }

  private onSubmitSuccess(
    account: PaymentAccount,
    status: PaymentAccount['individual']['verification']['status']
  ): void {
    this.store.dispatch(updatePayAccount(account));
    const error = (): void => {
      this.onSubmitFailed();
      this.paymentAccountID = account.externalId;
    };
    if (status === 'verified') {
      this.assignPaymentAccountToPaymentAgreement(account).subscribe({
        next: () => {
          this.modalControlService.navigate('next');
        },
        error,
      });
    } else if (status === 'unverified') {
      this.paymentAccountID = account.externalId;
      this.modalControlService.navigate('next');
    } else {
      this.assignPaymentAccountToPaymentAgreement(account).subscribe({
        next: () => {
          this.modalControlService.navigate('next');
        },
        error,
      });
    }
  }

  private setupFromStateSync(state: Pick<State, 'authInfo' | 'binder' | 'paymentAccount' | 'paymentAgreement'>) {
    const { id: partyID, personId, email } = getCurrentParty(state);
    // const payoutAmount =
    //   state.paymentAgreement.payments[0].outs[0].payment.amount -
    //   state.paymentAgreement.payments[0].fees[0].payment.amount;

    this.binderID = state.binder.id;
    this.brandID = state.paymentAgreement.brand;
    this.currentPartyEmail = email;
    this.highPayout = true; // ignore payoutAmount until BE bug is fixed
    this.partyID = partyID;
    this.paymentAccountID = state.paymentAccount?.externalId;
    this.personID = personId;
  }
}
