import { Component, Input, OnDestroy, Inject, Output, EventEmitter, OnInit } from '@angular/core';

import { DOCUMENT } from '@angular/common';
import { Store } from '../../../state/store';
import * as reduxActions from '../../../state/actions/sign';

import { SignService } from '../../../services/sign-app/sign.service';
import { AlertService } from '../../../services/sign-app/alert.service';

import { Binder } from '../../../services/sign-app/binder.interface';
import { fadeInOut, modalScaleInOut } from '../../../animations/animations';
import { CloseReason, ModalControlService } from '../../../services/sign-app/modal-control.service';

@Component({
  selector: 'edit-title-modal',
  templateUrl: './edit-title-modal.component.html',
  styleUrls: ['./edit-title-modal.component.scss'],
  animations: [fadeInOut, modalScaleInOut],
})
export class EditDocTitleModalComponent implements OnInit, OnDestroy {
  constructor(
    private store: Store,
    private signService: SignService,
    private alertService: AlertService,
    private modalControlService: ModalControlService,
    @Inject(DOCUMENT) private documentEl: Document
  ) {
    const sub = this.store.subscribe((state) => {
      this.binder = state.binder;
    });
    this.binder = this.store.getState().binder;
    this.subscriptions.push(sub);
  }

  private binder: Binder;
  docTitle: string;
  private readonly subscriptions: Function[] = [];
  actionInProgress = false;

  ngOnInit() {
    this.docTitle = this.binder.documents[0].name;
  }

  updateDocumentName() {
    const cleanDocName = this.cleanString(this.docTitle);

    if (cleanDocName.length == 0 || cleanDocName == this.binder.documents[0].name) {
      // user didn't change anything, close modal
      this.close();
      return false;
    }

    this.actionInProgress = true;
    this.signService.updateDocument(this.binder.id, this.binder.documents[0].id, { name: cleanDocName }).subscribe(
      (res) => {
        const actionData = {
          id: res.id,
          name: res.name,
        };
        this.store.dispatch(reduxActions.updateDocumentName(actionData));
        this.actionInProgress = false;
        this.alertService.setAlertMessage({ message: 'edit-title_success', type: 'success' });
        this.modalControlService.close(CloseReason.CompletedSuccessfully);
      },
      () => {
        this.actionInProgress = false;
        this.alertService.setAlertMessage({ message: 'edit-title_failure', type: 'danger' });
      }
    );
  }

  cleanString(value: string): string {
    return value.trim().replace(/^\s+|\s+$/g, '');
  }

  ngOnDestroy() {
    this.subscriptions.forEach((unsub) => unsub());
  }

  close() {
    if (this.actionInProgress) {
      return;
    }
    this.modalControlService.close(CloseReason.UserTerminated);
  }
}
