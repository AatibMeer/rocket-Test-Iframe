import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { fadeInOut, modalScaleInOut, intentionModalFadeIn, slideUpDown } from '../../../animations/animations';
import { Binder } from '../../../services/sign-app/binder.interface';
import { Store } from '../../../state/store';
import { MessageService } from '../message';
import { ModalType } from '../sign-app-dashboard/modal-type.enum';
import type { State } from '../../../state/reducers/main.interface';
import { CloseReason, ModalControlService, ModalNavigateIntention } from '../../../services/sign-app/modal-control.service';

@Component({
  selector: 'edit-modal',
  templateUrl: './edit-modal.component.html',
  styleUrls: ['./edit-modal.component.scss'],
  animations: [fadeInOut, modalScaleInOut, intentionModalFadeIn, slideUpDown],
})
export class EditModalComponent implements OnDestroy {
  constructor(
    private messageService: MessageService,
    private store: Store,
    private modalControlService: ModalControlService
  ) {
    this.setupComponent(this.store.getState());
    const storeSub = this.store.subscribe((state) => this.setupComponent(state));
    this.subscriptions.push(storeSub);
  }

  @Output() showModal: EventEmitter<ModalType> = new EventEmitter();

  private readonly destroy = new Subject<void>();
  private readonly subscriptions: Function[] = [];
  private binder: Binder;
  advancedEditorIsEnabled: boolean;
  backToInterviewIsEnabled: boolean;
  editOption = '';

  setupComponent(state: State) {
    this.binder = state.binder;
    this.backToInterviewIsEnabled = state.backToInterviewOptionEnabled;
    this.advancedEditorIsEnabled = state.advancedEditorOptionEnabled;
    this.editOption = this.backToInterviewIsEnabled ? 'interview' : 'advancedEditor';
  }

  ngOnDestroy() {
    this.subscriptions.forEach((unsub) => unsub());
  }

  continueToEdit() {
    if (this.editOption === 'interview') {
      const data = {
        action: 'changeAnswers',
      };
      this.messageService.sendEvent(data);
      this.modalControlService.close(CloseReason.CompletedSuccessfully);
    } else {
      this.modalControlService.close(CloseReason.UserNavigatedNext, {
        nextModal: 'next',
      });
    }
  }
}
