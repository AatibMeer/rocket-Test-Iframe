import { Component, Input, OnInit } from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { IdentityService } from '../../../services/sign-app/identity.service';
import { makeBlockBoundBEMFunction } from '../../../common/utility-components/util-functions';
import {
  CloseReason,
  ModalControlService,
  ModalNavigateIntention,
} from '../../../services/sign-app/modal-control.service';
import { Store } from '../../../state/store';
import PaymentMethodHelper, {
  GenericPaymentMethod,
} from '../../../common/utility-components/payment-method/payment-method-helper';
import { clearPaymentMethod, savePaymentMethod } from '../../../state/actions/payment-method';
import { LocalFeatureFlagService } from '../../../services/common/local-feature-flag.service';
import { WalletService } from '../../../services/sign-app/wallet.service';
import { getPartyByRoleName } from '../../../state/selectors';
import { RoleEnum } from '../../../services/sign-app/party.interface';
import { PaymentAgreement, PaymentMethodType } from '../../../services/sign-app/payment-agreement.interface';

@Component({
  selector: 'rl-pay-method-selector',
  styleUrls: ['./payment-pay-method-selector.component.scss'],
  templateUrl: './payment-pay-method-selector.component.html',
})
export class PaymentPayMethodSelectorComponent implements OnInit {
  @Input() personID!: string;

  readonly bem = makeBlockBoundBEMFunction('payment-pay-method-selector');

  methods: GenericPaymentMethod[] = [];
  selectedMethod?: GenericPaymentMethod;
  paymentMethodType: PaymentMethodType;

  private readonly destroy: Subject<void> = new Subject<void>();

  constructor(
    public readonly featureFlagService: LocalFeatureFlagService,
    private readonly identityService: IdentityService,
    private readonly walletService: WalletService,
    private readonly modalControlService: ModalControlService,
    private readonly store: Store
  ) {}

  ngOnInit(): void {
    if (this.personID) {
      this.identityService.getIdentityProfile(this.personID).subscribe();
    }

    this.paymentMethodType = this.store.getState().paymentAgreement.paymentMethodType;

    const { identityProfile, paymentMethod } = this.store.getState();
    this.methods = PaymentMethodHelper.getConvertedGenericPaymentMethodsByType(
      identityProfile,
      this.paymentMethodType
    );

    if (paymentMethod) {
      this.selectedMethod = this.methods.find((genericPaymentMethod) => genericPaymentMethod.id === paymentMethod.id);
      if (!this.selectedMethod) {
        this.store.dispatch(clearPaymentMethod());
      }
    }

    if (!this.selectedMethod && this.methods.length > 0) {
      this.handleMethodChange(this.methods[0]);
    }

    this.modalControlService.navigate$.pipe(takeUntil(this.destroy)).subscribe({
      next: (intention) => {
        this.onNavigate(intention);
      },
    });
  }

  handleMethodChange(method: GenericPaymentMethod): void {
    this.selectedMethod = method;
    this.store.dispatch(savePaymentMethod(method));
  }

  openPayByCardModal(): void {
    this.modalControlService.navigate('payNow');
  }

  openAddBankAccountModal(): void {
    this.modalControlService.navigate('addBankAccount');
  }

  useRocketWallet(): void {
    const { paymentAgreement, binder } = this.store.getState();
    const payer = getPartyByRoleName(binder, RoleEnum.Payer);
    this.walletService.createWalletTransactionIntent(paymentAgreement.externalId, payer.id).subscribe({
      next: () => {
        this.modalControlService.navigate('useWallet');
      },
      error: (e) => {
        // eslint-disable-next-line no-console
        console.error(e);
        this.modalControlService.navigate('useWallet');
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }

  private onNavigate(intention: ModalNavigateIntention): void {
    if (intention.data.to === 'payNow') {
      this.modalControlService.close(CloseReason.UserNavigatedNext, {
        nextModal: 'payNow',
      });
    } else if (intention.data.to === 'addBankAccount') {
      this.modalControlService.close(CloseReason.UserNavigatedNext, {
        nextModal: 'addBankAccount',
      });
    } else if (intention.data.to === 'useWallet') {
      this.modalControlService.close(CloseReason.CompletedSuccessfully);
    }
  }
}
