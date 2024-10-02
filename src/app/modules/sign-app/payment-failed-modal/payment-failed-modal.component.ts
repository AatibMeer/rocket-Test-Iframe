import { Component } from '@angular/core';
import { CloseReason, ModalControlService } from '../../../services/sign-app/modal-control.service';

@Component({
  selector: 'rl-payment-failed-modal',
  templateUrl: './payment-failed-modal.component.html',
})
export class PaymentFailedModalComponent {
  constructor(private readonly modalControlService: ModalControlService) {}

  close(): void {
    this.modalControlService.close(CloseReason.CompletedSuccessfully);
  }
}
