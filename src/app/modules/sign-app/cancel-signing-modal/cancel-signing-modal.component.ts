// eslint-disable-next-line max-classes-per-file
import { Component, Input, Output, EventEmitter } from '@angular/core';

import { map, mergeMap } from 'rxjs/operators';
import { TranslatableItem } from '../document-action-modal/translatable-item.interface';
import { ModalTextDefinitions } from '../document-action-modal/modal-text-defitinion.interface';
import { SignService } from '../../../services/sign-app/sign.service';

import { Store } from '../../../state/store';
import { animateModalChildren } from '../../../animations/animations';
import { PayService } from '../../../services/sign-app/pay.service';
import { PaymentAgreementStatus } from '../../../services/sign-app/payment-agreement.interface';

@Component({
  selector: 'cancel-signing-modal',
  templateUrl: './cancel-signing-modal.component.html',
  styleUrls: ['./cancel-signing-modal.component.scss'],
  animations: [animateModalChildren],
})
export class CancelSigningModalComponent {
  constructor(public store: Store, public signService: SignService, public payService: PayService) {
    this.doCancel = this.doCancel.bind(this);
  }

  @Output() closeModal = new EventEmitter<boolean>();
  @Output() onCancellationConfirmed = new EventEmitter<boolean>();
  @Input() show: boolean;

  cancelReasons: Array<TranslatableItem> = [
    {
      value: 'none-selected',
      translation_key: 'cancel-signing-modal_select-value-1',
    },
    {
      value: 'error-contract',
      translation_key: 'cancel-signing-modal_select-value-2',
    },
    {
      value: 'changed-decision',
      translation_key: 'cancel-signing-modal_select-value-3',
    },
    {
      value: 'party-changed-decision',
      translation_key: 'cancel-signing-modal_select-value-4',
    },
    {
      value: 'other',
      translation_key: 'cancel-signing-modal_select-value-5',
    },
  ];
  modalTextDefinitions: ModalTextDefinitions = {
    modalHeader: { key: 'cancel-signing-modal_modal-header' },
    heading: { key: 'cancel-signing-modal_main-heading' },
    explanation: { key: 'cancel-signing-modal_explanation' },
    reasonLabel: { key: 'cancel-signing-modal_label-reason' },
    primaryCta: { key: 'cancel-signing-modal_primary-cta' },
    primaryOngoingCta: { key: 'cancel-signing-modal_cancelling' },
    secondaryCta: { key: 'cancel-signing-modal_secondary-cta' },
    alertSuccess: { key: 'cancel-signing-modal_cancelled-successfully-alert' },
    binderStatusConflict: { key: 'cancel-signing-modal_binder-status-conflict' },
  };

  typeOfAction = 'CANCEL_SIGNING';

  doCancel(reason: { reasonKey: string; message: string }) {
    const state = this.store.getState();
    const binderId = state.binder.id;
    const { paymentAgreement } = state;
    this.onCancellationConfirmed.emit();
    if (paymentAgreement && paymentAgreement.status == PaymentAgreementStatus.Pending) {
      return this.signService.cancelSigning(binderId, reason.reasonKey, reason.message).pipe(
        mergeMap((status) => {
          return this.payService
            .setPaymentAgreementStatus(paymentAgreement.externalId, PaymentAgreementStatus.Draft)
            .pipe(map(() => status));
        })
      );
    }

    return this.signService.cancelSigning(binderId, reason.reasonKey, reason.message);
  }
}

@Component({
  selector: 'remove-signature-modal',
  templateUrl: './cancel-signing-modal.component.html',
  styleUrls: ['./cancel-signing-modal.component.scss'],
  animations: [animateModalChildren],
})
export class RemoveSignatureModalComponent extends CancelSigningModalComponent {
  constructor(public store: Store, public signService: SignService, public payService: PayService) {
    super(store, signService, payService);
  }

  modalTextDefinitions: ModalTextDefinitions = {
    modalHeader: { key: 'remove-signature-modal_modal-header' },
    heading: { key: 'remove-signature-modal_main-heading' },
    explanation: { key: 'remove-signature-modal_explanation' },
    primaryCta: { key: 'remove-signature-modal_primary-cta' },
    primaryOngoingCta: { key: 'remove-signature-modal_cancelling' },
    secondaryCta: { key: 'remove-signature-modal_secondary-cta' },
    alertSuccess: { key: 'Your signature has been removed.' },
    binderStatusConflict: { key: 'cancel-signing-modal_binder-status-conflict' },
  };

  cancelReasons = [];
}
