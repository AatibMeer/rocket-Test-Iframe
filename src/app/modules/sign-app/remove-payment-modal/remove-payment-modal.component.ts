import { ChangeDetectionStrategy, Component } from '@angular/core';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { CloseReason, ModalControlService } from '../../../services/sign-app/modal-control.service';
import { AlertService } from '../../../services/sign-app/alert.service';
import { Store } from '../../../state/store';
import { makeBlockBoundBEMFunction } from '../../../common/utility-components/util-functions';
import { PartyService } from '../../../services/sign-app/party.service';
import { markPaymentAgreementAsDeleted } from '../../../state/actions/payment-agreement';
import { TrackingPublisher } from '../../tracking/publisher';

const baseClass = 'rl-remove-payment-modal';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'rl-remove-payment-modal',
  styleUrls: ['./remove-payment-modal.component.scss'],
  templateUrl: './remove-payment-modal.component.html',
})
export class RemovePaymentModalComponent {
  loading = false;
  private readonly destroy = new Subject<void>();
  readonly bem = makeBlockBoundBEMFunction(baseClass);

  constructor(
    private readonly alertService: AlertService,
    private readonly eventTracker: TrackingPublisher,
    private readonly modalControlService: ModalControlService,
    private readonly partyService: PartyService,
    private readonly store: Store
  ) {}

  ngOnInit(): void {
    this.modalControlService.navigate$.pipe(takeUntil(this.destroy)).subscribe(() => this.onNavigate());
  }

  private onNavigate(): void {
    this.modalControlService.close(CloseReason.UserNavigatedBack);
  }

  back(): void {
    this.modalControlService.navigate('back');
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }

  removePaymentAgreement(): void {
    if (!this.loading) {
      this.loading = true;
      const { externalId: paymentAgreementID, status } = this.store.getState().paymentAgreement;
      this.store.dispatch(markPaymentAgreementAsDeleted());
      this.partyService.ensurePartyRefIntegrity().subscribe({
        next: () => {
          this.eventTracker.paymentAgreementDeleted({
            paymentAgreementID,
            status,
          });
          this.alertService.addSuccessAlert({
            message: {
              key: 'remove-payment-modal.delete-payment-success',
            },
          });
          this.modalControlService.close(CloseReason.CompletedSuccessfully);
        },
        error: () => {
          this.loading = false;
          this.alertService.addDangerAlert({
            message: {
              key: 'remove-payment-modal.delete-payment-error',
            },
          });
        },
      });
    }
  }
}
