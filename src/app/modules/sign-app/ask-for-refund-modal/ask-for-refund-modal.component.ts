import { ChangeDetectionStrategy, Component } from '@angular/core';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import {
  CloseReason,
  ModalControlService,
  ModalNavigateIntention,
} from '../../../services/sign-app/modal-control.service';
import { PaymentAgreement } from '../../../services/sign-app/payment-agreement.interface';
import { Store } from '../../../state/store';
import { State } from '../../../state/reducers/main.interface';
import { makeBlockBoundBEMFunction } from '../../../common/utility-components/util-functions';

const baseClass = 'rl-ask-for-refund-modal';

@Component({
  selector: 'rl-ask-for-refund-modal',
  styleUrls: ['./ask-for-refund-modal.component.scss'],
  templateUrl: './ask-for-refund-modal.component.html',
})
export class AskForRefundModalComponent {
  loading = false;
  paymentAgreement: Readonly<PaymentAgreement> | undefined;
  referenceId: string;

  private readonly destroy = new Subject<void>();
  readonly bem = makeBlockBoundBEMFunction(baseClass);

  constructor(
    private readonly modalControlService: ModalControlService,
    private readonly store: Store
  ) { }

  ngOnInit(): void {
    const { paymentAgreement } = this.store.getState();
    this.referenceId = paymentAgreement.externalId.substring(0, 13).replace(/-/g, '‑'); // changed dashes with a non-breaking hyphen for avoiding new line
    this.modalControlService.navigate$
      .pipe(takeUntil(this.destroy))
      .subscribe((intention) => this.onNavigate(intention));
  }

  private onNavigate(intention: ModalNavigateIntention): void {
    this.modalControlService.close(CloseReason.UserNavigatedBack);
  }

  back(): void {
    this.modalControlService.navigate('back');
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }
}
