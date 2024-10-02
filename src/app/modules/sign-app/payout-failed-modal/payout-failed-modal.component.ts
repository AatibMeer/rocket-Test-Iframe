import { Component, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { CloseReason, ModalControlService } from '../../../services/sign-app/modal-control.service';
import { makeBlockBoundBEMFunction } from '../../../common/utility-components/util-functions';
import { Store } from '../../../state/store';

const baseClass = 'rl-payout-failed';

@Component({
  providers: [CurrencyPipe],
  selector: 'rl-payout-failed',
  styleUrls: ['./payout-failed-modal.component.scss'],
  templateUrl: './payout-failed-modal.component.html',
})
export class PayoutFailedModalComponent implements OnInit {
  readonly bem = makeBlockBoundBEMFunction(baseClass);

  public accountDescription: string;
  public amountPending: string;

  constructor(
    private readonly modalControlService: ModalControlService,
    private readonly currencyPipe: CurrencyPipe,
    private readonly store: Store
  ) {}

  ngOnInit(): void {
    const { paymentAccount, paymentAgreement } = this.store.getState();
    this.accountDescription = `${paymentAccount.bankName} - ${paymentAccount.last4}`;

    // this is just an estimation, because payouts from multiple binders can be grouped
    const { amount, currency } = paymentAgreement.payments[0]?.outs[0]?.payment || {};
    this.amountPending = amount
      ? this.currencyPipe.transform((amount / 100).toFixed(2), currency, 'symbol', '1.2')
      : 'money';
  }

  closeModal(): void {
    this.modalControlService.close(CloseReason.CompletedSuccessfully);
  }
}
