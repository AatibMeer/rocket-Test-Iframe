import { AfterViewInit, Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Store } from '../../../../state/store';
import { PayService } from '../../../../services/sign-app/pay.service';
import { AlertService } from '../../../../services/sign-app/alert.service';
import { getCurrentParty } from '../../../../state/selectors';
import { CreateAchPaymentMethod } from '../../../../services/sign-app/ach-payment-method.interface';
import { setAchPaymentMethod } from '../../../../state/actions/identity-profile';
import { TrackingPublisher } from '../../../tracking/publisher';

@Component({
  selector: 'rl-payment-ach-plaid-modal',
  templateUrl: './payment-ach-plaid-modal.component.html',
  styleUrls: ['./payment-ach-plaid-modal.component.scss'],
})
export class PaymentAchPlaidModalComponent implements AfterViewInit, OnInit {
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
    const achPaymentMethod: CreateAchPaymentMethod = {
      brand: 'rl-us',
      token: publicToken,
      partyId: this.partyID,
      // TODO uncomment when BE is changed
      // personId: this.payerParty.personId,
      accountId: metadata.accounts[0].id,
    };

    this.payService.createAchPaymentMethod(achPaymentMethod).subscribe({
      next: (createdAchPaymentMethod) => {
        this.showSuccessNotification();
        this.store.dispatch(setAchPaymentMethod(createdAchPaymentMethod));
        this.hideModal.emit({
          nextModal: 'end',
        });
      },
      error: () => {
        this.showFailureNotification();
        this.hideModal.emit({
          nextModal: 'end',
        });
      },
    });
  }

  private showSuccessNotification(): void {
    this.alertService.addSuccessAlert({
      message: 'payment-ach-plaid-modal.setup-successful',
    });
  }

  private showFailureNotification(): void {
    this.alertService.addDangerAlert({
      message: 'payment-ach-plaid-modal.setup-error',
    });
  }
}
