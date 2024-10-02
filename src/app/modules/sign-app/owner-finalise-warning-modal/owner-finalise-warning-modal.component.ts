import { Component, EventEmitter, Output } from '@angular/core';
import { fadeInOut, modalScaleInOut } from '../../../animations/animations';
import { setSignatureBuilderMode } from '../../../state/actions/uiProps';
import { Store } from '../../../state/store';
import { AlertService } from '../../../services/sign-app/alert.service';
import { Binder } from '../../../services/sign-app/binder.interface';
import { PartyService } from '../../../services/sign-app/party.service';
import { CloseReason, ModalControlService } from '../../../services/sign-app/modal-control.service';
import { getStorageProxy, StorageProxy } from '../../../services/common/storage.service';

@Component({
  selector: 'owner-finalise-warning-modal',
  templateUrl: './owner-finalise-warning-modal.component.html',
  styleUrls: ['./owner-finalise-warning-modal.component.scss'],
  animations: [modalScaleInOut, fadeInOut],
})
export class OwnerFinaliseWarningModalComponent {
  @Output() hideModal = new EventEmitter<boolean>();
  @Output() onSavedChanges = new EventEmitter<boolean>();
  showAgain = true;
  actionInProgress = false;
  binder: Binder;
  private readonly storage: StorageProxy<{ showOwnerFinaliseWarning: 'true' | 'false' }>;

  constructor(
    private store: Store,
    private alertService: AlertService,
    private readonly partyService: PartyService,
    private modalControlService: ModalControlService
  ) {
    this.binder = this.store.getState().get('binder');
    this.storage = getStorageProxy({
      storage: sessionStorage,
      ignoreStorageErrors: true,
    });
  }

  finalise() {
    if (!this.showAgain) {
      this.storage.showOwnerFinaliseWarning = 'false';
    }
    this.actionInProgress = true;
    this.partyService.ensurePartyRefIntegrity().subscribe({
      next: () => {
        this.actionInProgress = false;
        this.store.dispatch(setSignatureBuilderMode(false));
        this.modalControlService.close(CloseReason.CompletedSuccessfully);
      },
      error: (e) => {
        this.alertService.addDangerAlert({
          message: 'sign-summary_prepare-to-sign-submit-failed',
        });
        this.actionInProgress = false;
        this.hideModal.emit();
      },
    });
  }

  close() {
    this.showAgain = true;
    this.modalControlService.close(CloseReason.UserNavigatedBack);
  }
}
