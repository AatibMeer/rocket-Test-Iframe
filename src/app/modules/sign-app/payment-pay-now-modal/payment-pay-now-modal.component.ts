import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { map, mergeMap, takeUntil } from 'rxjs/operators';

import { Store } from '../../../state/store';
import { getCurrentParty } from '../../../state/selectors';

import {
  CloseReason,
  ModalControlService,
  ModalNavigateIntention,
} from '../../../services/sign-app/modal-control.service';
import { PayService } from '../../../services/sign-app/pay.service';
import { PaymentMethod } from '../../../services/sign-app/payment-method.interface';
import { AlertService } from '../../../services/sign-app/alert.service';
import { makeBlockBoundBEMFunction } from '../../../common/utility-components/util-functions';
import { setPaymentMethods } from '../../../state/actions/identity-profile';
import { LocalFeatureFlagService } from '../../../services/common/local-feature-flag.service';
import { savePaymentMethod } from '../../../state/actions/payment-method';
import PaymentMethodHelper from '../../../common/utility-components/payment-method/payment-method-helper';
import { GlobalBrandConfig } from '../../../common/interfaces/branding.interface';

const baseClass = 'rl-payment-pay-now-modal';

export interface SpreedlySuccessEvent {
  token: string;
  pmData: {
    // eslint-disable-next-line camelcase
    card_type: string; // like 'VISA'
    number: string; // like 'XXXX-XXXX-XXXX-4242'
    // has some more irrelevant stuff
  };
}

@Component({
  selector: 'rl-payment-pay-now-modal',
  styleUrls: ['./payment-pay-now-modal.component.scss'],
  templateUrl: './payment-pay-now-modal.component.html',
})
export class PaymentPayNowModalComponent implements OnDestroy, OnInit {
  readonly bem = makeBlockBoundBEMFunction(baseClass);
  readonly rootClassnames: string;
  readonly payWithBankAccountEnabled: boolean;
  readonly walletEnabled: boolean;

  cardIsProcessing: boolean;
  spreedlyEnvKey: string;
  userEmail?: string;

  private readonly destroy: Subject<void>;

  @ViewChild('spreedlyCardForm')
  private readonly spreedlyCardForm;
  cardIconUrl: string;
  globalBrandingStyles?: GlobalBrandConfig['styles'];

  constructor(
    private readonly alertService: AlertService,
    private readonly modalControlService: ModalControlService,
    private readonly payService: PayService,
    private readonly store: Store,
    private readonly featureFlagService: LocalFeatureFlagService
  ) {
    this.cardIsProcessing = false;
    this.destroy = new Subject<void>();
    this.rootClassnames = baseClass;
    this.payWithBankAccountEnabled = this.featureFlagService.flags.pay_with_bank_account;
    this.walletEnabled = this.featureFlagService.flags.wallet_enabled;
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }

  ngOnInit(): void {
    this.modalControlService.navigate$.pipe(takeUntil(this.destroy)).subscribe({
      next: (intention) => {
        this.onNavigate(intention);
      },
    });
    // TODO: Eager fetch it or cache it.
    this.payService.getPaymentsConfig().subscribe((config) => {
      this.spreedlyEnvKey = config.spreedlyEnvironmentKey;
    });
    this.userEmail = getCurrentParty(this.store.getState()).email;
    const { brandConfig, globalBrandConfig } = this.store.getState();
    this.cardIconUrl = brandConfig?.lookAndFeel.walletIconUrl;
    this.globalBrandingStyles = globalBrandConfig?.styles;
  }

  showFailureAlert(): void {
    this.alertService.addDangerAlert({
      message: 'payment-pay-now-modal_add-card-failed',
    });
  }

  validateCard(): void {
    // this method is called from the submit event in the view
    this.cardIsProcessing = true;
    // You can get same results both through the Promise or onSuccess Event.
    this.spreedlyCardForm.nativeElement
      .submit()
      .then((result) => this.onSpreedlySuccess(result))
      .catch(() => {
        this.cardIsProcessing = false;
      });
  }

  onSpreedlySuccess({ token, pmData }: SpreedlySuccessEvent): void {
    const state = this.store.getState();
    const date = new Date().toISOString();
    const currentParty = getCurrentParty(state);
    this.payService
      .getPaymentAgreementByBinderID(state.binder.id)
      .pipe(
        map(
          (paymentAgreement) =>
            ({
              brand: 'rl-us',
              created: date,
              externalId: paymentAgreement.externalId,
              partyId: currentParty.id,
              token,
              updated: date,
            } as PaymentMethod)
        ),
        mergeMap((paymentMethod) => this.payService.createPaymentMethod(paymentMethod)),
        takeUntil(this.destroy)
      )
      .subscribe(
        (method) => {
          const paymentMethods = this.store.getState().identityProfile.paymentMethods || [];
          const paymentMethod = {
            paymentMethodId: method.externalId,
            cardNumberLast4: pmData.number.slice(-4),
            cardType: pmData.card_type,
          };
          paymentMethods.push(paymentMethod);

          this.store.dispatch(setPaymentMethods(paymentMethods));

          if (!this.isPaymentMethodModalEnabled()) {
            const genericPaymentMethod = PaymentMethodHelper.convertCardPaymentMethod(paymentMethod);
            this.store.dispatch(savePaymentMethod(genericPaymentMethod));
          }

          this.modalControlService.navigate('next');
        },
        () => {
          this.showFailureAlert();
          this.cardIsProcessing = false;
        },
        () => {
          this.cardIsProcessing = false;
        }
      );
  }

  isPaymentMethodModalEnabled(): boolean {
    return this.payWithBankAccountEnabled || this.walletEnabled;
  }

  private onNavigate(intention: ModalNavigateIntention): void {
    if (intention.data.to === 'next') {
      if (this.isPaymentMethodModalEnabled()) {
        this.modalControlService.close(CloseReason.UserNavigatedNext, {
          nextModal: 'choosePaymentMethod',
        });
      } else {
        this.modalControlService.close(CloseReason.UserNavigatedNext);
      }
    } else if (intention.data.to === 'back') {
      if (this.isPaymentMethodModalEnabled()) {
        this.modalControlService.close(CloseReason.UserNavigatedBack);
      }
    } else if (intention.data.to === 'end') {
      this.modalControlService.close(CloseReason.UserTerminated);
    }
  }
}
