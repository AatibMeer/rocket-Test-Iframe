import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { AlertService } from '../../../services/sign-app/alert.service';
import { SignService } from '../../../services/sign-app/sign.service';

import { TranslatableItem } from './translatable-item.interface';
import { Binder } from '../../../services/sign-app/binder.interface';
import { ModalTextDefinitions } from './modal-text-defitinion.interface';

import { fadeInOut, modalScaleInOut } from '../../../animations/animations';
import { getDocumentPagesWithApiSignatures } from '../../../state/selectors';
import { Store } from '../../../state/store';
import { updateBinder } from '../../../state/actions/sign';
import { MessageService } from '../message';
import { CloseReason, ModalControlService } from '../../../services/sign-app/modal-control.service';

@Component({
  selector: 'document-action-modal',
  templateUrl: './document-action-modal.component.html',
  styleUrls: ['./document-action-modal.component.scss'],
  animations: [fadeInOut, modalScaleInOut],
})
export class DocumentActionModalComponent implements OnInit {
  constructor(
    private store: Store,
    private alertService: AlertService,
    private translate: TranslateService,
    private signService: SignService,
    private messageService: MessageService,
    private modalControlService: ModalControlService
  ) {}

  @Input() actionReasons: Array<TranslatableItem>;
  @Input() typeOfAction: 'CANCEL_SIGNING' | 'DECLINE_SIGNATURE';
  @Input() modalTextDefinitions: ModalTextDefinitions;
  @Input() action: (reason: { reasonKey: string; message: string }) => Observable<any>;
  @Output() onResolve = new EventEmitter<{ reasonKey: string; message: string }>();

  actionInProgress = false;
  selectedReason = 'none-selected';
  customMessage = '';

  ngOnInit(): void {
    this.actionReasons.forEach((reason, idx) => {
      this.translate.get(reason.translation_key).subscribe((translated) => {
        this.actionReasons[idx].translated = translated;
      });
    });
  }

  resolveAction() {
    const reason = this.resolveReason();
    this.actionInProgress = true;
    this.action(reason).subscribe(
      (status) => {
        if (status == 200 || status == 201) {
          this.alertService.setAlertMessage({ message: this.modalTextDefinitions.alertSuccess.key, type: 'success' });
          this.actionInProgress = false;
          this.reloadDocument();
          this.hideModal();
        }
      },
      (error) => {
        if (error.binderStatus && (error.binderStatus === 'SIGN_COMPLETED' || error.binderStatus === 'IN_PREPARATION')) {
          this.actionInProgress = false;
          if (error.binderStatus === 'SIGN_COMPLETED') {
            this.alertService.addNotification({
              message: this.modalTextDefinitions.binderStatusConflict.key,
              type: 'notification',
              autoClose: true,
            });
          }
          this.reloadDocument();
          this.hideModal();
        } else {
          this.actionInProgress = false;
          this.alertService.setAlertMessage({ message: 'document-action-modal_error-occured', type: 'danger' });
        }
      }
    );
  }

  reloadDocument() {
    const state = this.store.getState();
    const { binder } = state;
    const pagesSelectedToFetch = getDocumentPagesWithApiSignatures(state);
    const fetchPages = !(pagesSelectedToFetch.length == 0 || this.typeOfAction == 'DECLINE_SIGNATURE');
    this.signService.getBinder(binder.id, { fetchPages, pagesSelectedToFetch, saveStore: false }, binder).subscribe(
      (newBinder: Binder) => {
        this.store.dispatch(updateBinder(newBinder));
        this.messageService.sendEvent({
          eventName: this.typeOfAction == 'DECLINE_SIGNATURE' ? "SIGNER_DECLINED" : 'SIGNING_CANCELLED',
          binder: newBinder,
          category: 'SignEvent'
        });
        // scroll to top, slowly
        $('html,body').animate({ scrollTop: 0 }, 'slow');
      },
      () => setTimeout(() => location.reload(), 5000)
    );
  }

  private resolveReason(): { reasonKey: string; message: string } {
    if (this.selectedReason == 'none-selected') {
      return {
        reasonKey: this.selectedReason,
        message: '',
      };
    }

    if (this.selectedReason == 'other') {
      return {
        reasonKey: this.selectedReason,
        // we need to replace double quotes because it breaks backend otherwise.
        message: this.customMessage.replace(/"/g, "'"),
      };
    }

    const reason = this.actionReasons.find((r) => r.value == this.selectedReason);
    return {
      reasonKey: this.selectedReason,
      message: reason.translated,
    };
  }

  hideModal() {
    if (this.actionInProgress) {
      return;
    }
    this.modalControlService.close(CloseReason.CompletedSuccessfully);
  }
}
