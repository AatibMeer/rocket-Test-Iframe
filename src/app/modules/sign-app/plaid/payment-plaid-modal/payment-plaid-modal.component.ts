import { Component, EventEmitter, Output, OnInit, AfterViewInit } from '@angular/core';
import { Store } from '../../../../state/store';
import { PayService } from '../../../../services/sign-app/pay.service';
import { AlertService } from '../../../../services/sign-app/alert.service';
import { getCurrentParty } from '../../../../state/selectors';
import { updatePayAccount } from '../../../../state/actions/pay-account';
import { TrackingPublisher } from '../../../tracking/publisher';

/**
 * TODO: This file is mostly Copy/Paste of the other Plaid modal, can we dedupe them?
 */
@Component({
  selector: 'rl-payment-plaid-modal',
  templateUrl: './payment-plaid-modal.component.html',
  styleUrls: ['./payment-plaid-modal.component.scss'],
  providers: [{ provide: Window, useValue: window }],
})
export class PaymentPlaidModalComponent implements AfterViewInit, OnInit {
  /** We can't use the normal transition directives as there is no modal to transition! */
  @Output() hideModal = new EventEmitter<{ nextModal: string }>();

  showSpinner = true;
  private partyID: string;

  constructor(
    private readonly alertService: AlertService,
    private readonly payService: PayService,
    private readonly store: Store,
    private readonly tracking: TrackingPublisher
  ) {}

  ngOnInit(): void {
    const store = this.store.getState();
    this.partyID = getCurrentParty(store).id;
  }

  ngAfterViewInit(): void {
    this.tracking.virtualPageView({
      location: 'payment/payByBank',
    });
  }

  onLoaded(): void {
    this.showSpinner = false;
  }

  onError(): void {
    this.showFailureNotification();
    this.hideModal.emit({
      nextModal: 'end',
    });
  }

  onExit(): void {
    this.hideModal.emit({
      nextModal: 'end',
    });
  }

  onSuccess(publicToken: string, metadata: Record<string, unknown>): void {
    this.showSpinner = true;
    const payoutMethod = {
      payeeId: this.partyID,
      binderId: this.store.getState().binder.id,
      accountId: metadata.accounts[0].id,
      token: publicToken,
    };

    this.payService.createPayoutMethod(payoutMethod).subscribe(
      () => {
        this.showSuccessNotification();
        const account = JSON.parse(JSON.stringify(this.store.getState().paymentAccount));
        account.payoutsEnabled = true;
        this.store.dispatch(updatePayAccount(account));
        this.hideModal.emit({
          nextModal: 'end',
        });
      },
      () => {
        this.showFailureNotification();
        this.hideModal.emit({
          nextModal: 'end',
        });
      }
    );
  }

  private showSuccessNotification(): void {
    this.alertService.addSuccessAlert({
      message: 'payment-plaid-modal_payment-setup-successful',
    });
  }

  private showFailureNotification(): void {
    this.alertService.addDangerAlert({
      message: 'payment-plaid-modal_error_endpoint_failure',
    });
  }
}
