import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { TranslatableItem } from '../document-action-modal/translatable-item.interface';
import { ModalTextDefinitions } from '../document-action-modal/modal-text-defitinion.interface';
import { SignService } from '../../../services/sign-app/sign.service';
import { Store } from '../../../state/store';

import { animateModalChildren } from '../../../animations/animations';

@Component({
  selector: 'decline-to-sign-modal',
  templateUrl: './decline-to-sign-modal.component.html',
  styleUrls: ['./decline-to-sign-modal.component.scss'],
  animations: [animateModalChildren]
})
export class DeclineToSignModalComponent implements OnChanges{
  @Output() closeModal = new EventEmitter<boolean>();
  @Output() declineConfirmed = new EventEmitter();
  @Input('docOwnerName') docOwnerName: string;
  @Input() show: boolean;

  declineReasons: Array<TranslatableItem> = [
    {
      'value': 'none-selected',
      'translation_key': 'decline-to-sign-modal_select-value-1'
    },
    {
      'value': 'error-contract',
      'translation_key': 'decline-to-sign-modal_select-value-2'
    },
    {
      'value': 'additional-information-required',
      'translation_key': 'decline-to-sign-modal_select-value-3'
    },
    {
      'value': 'other',
      'translation_key': 'decline-to-sign-modal_select-value-4'
    }
  ];

  modalTextDefinitions: ModalTextDefinitions = {
    modalHeader: {key: 'decline-to-sign-modal_modal-header'},
    heading: {key: 'decline-to-sign-modal_main-heading'},
    explanation: {key: 'decline-to-sign-modal_explanation'},
    reasonLabel: {key: 'decline-to-sign-modal_label-reason', params: {name: this.getOwnerName()}},
    primaryCta: {key: 'decline-to-sign-modal_primary-cta'},
    primaryOngoingCta: {key: 'decline-to-sign-modal_declining'},
    secondaryCta: {key: 'decline-to-sign-modal_secondary-cta'},
    alertSuccess: {key: 'decline-to-sign-modal_alert-success'}
  };

  typeOfAction: 'DECLINE_SIGNATURE' = 'DECLINE_SIGNATURE';

  constructor(private store: Store,
              private signService: SignService) {
    this.doDecline = this.doDecline.bind(this);
  }

  ngOnChanges(changes) {
    // refresh docOwnerName
    if(changes.docOwnerName) this.modalTextDefinitions.reasonLabel.params.name = this.getOwnerName();
  }

  getOwnerName() {
    return this.docOwnerName;
  }

  doDecline(reason: { reasonKey: string, message: string }) {
    const binderId = this.store.getState().binder.id;
    this.declineConfirmed.emit();
    return this.signService.declineSigning(binderId, reason.reasonKey, reason.message);
  }
}