import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { fadeInOut, modalScaleInOut, intentionModalFadeIn, slideUpDown } from '../../../animations/animations';
import { CloseReason, ModalControlService } from '../../../services/sign-app/modal-control.service';
import { setDocumentEditorMode } from '../../../state/actions/uiProps';
import { Store } from '../../../state/store';

@Component({
  selector: 'edit-warning-modal',
  templateUrl: './edit-warning-modal.component.html',
  styleUrls: ['./edit-warning-modal.component.scss'],
  animations: [fadeInOut, modalScaleInOut, intentionModalFadeIn, slideUpDown],
})
export class EditWarningModalComponent {
  constructor(private store: Store, private router: ActivatedRoute, private modalControlService: ModalControlService) {}

  continueToEdit() {
    this.store.dispatch(setDocumentEditorMode(true));
    this.close();
  }

  backToEditModal() {
    this.modalControlService.close(CloseReason.UserNavigatedBack, {
      nextModal: 'back',
    });
  }

  close() {
    this.modalControlService.close(CloseReason.CompletedSuccessfully);
  }
}
