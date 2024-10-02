import {Component, Inject, Input, OnDestroy} from '@angular/core';
import {DOCUMENT} from '@angular/common';

import {Binder} from '../../../services/sign-app/binder.interface';
import {Party, RoleEnum} from '../../../services/sign-app/party.interface';

import {Store} from '../../../state/store';
import {getAllInputs, getPartiesWithStatus, partyHasRole} from '../../../state/selectors';

import {SignService} from '../../../services/sign-app/sign.service';
import {AlertService} from '../../../services/sign-app/alert.service';
import {fadeInOut, modalScaleInOut} from '../../../animations/animations';
import type {State} from '../../../state/reducers/main.interface';
import {CloseReason, ModalControlService} from '../../../services/sign-app/modal-control.service';
import {removeParty} from '../../../state/actions/party';
import { MessageService } from '../message';

@Component({
  selector: 'manage-modal',
  templateUrl: './manage-modal.component.html',
  styleUrls: ['./manage-modal.component.scss'],
  animations: [fadeInOut, modalScaleInOut]
})

export class ManageModalComponent implements OnDestroy {
  constructor(
    private store: Store,
    private signService: SignService,
    private alertService: AlertService,
    @Inject(DOCUMENT) private documentEl: Document,
    private modalControlService: ModalControlService,
    private messageService: MessageService
  ) {
    const state = this.store.getState();
    this.binder = this.store.getState().binder;

    if (this.binder) {
      this.setData(state);
    }
    let sub = this.store.subscribe((state) => {
      this.setData(state);
    });
    this.subscriptions.push(sub);
  }

  @Input() signingFinished: boolean;

  parties = [];
  inputs = [];
  binder: Binder;
  paymentAgreement = {
    paid: false,
    identityVerified: false,
    collected: false
  };
  reminders = [];
  subscriptions: Function[] = [];
  actionInProgress = false;

  setData(state: State) {
    this.binder = state.binder;
    this.inputs = getAllInputs(state);
    this.parties = getPartiesWithStatus(state).filter(p => partyHasRole(p, RoleEnum.Signer));
  }

  ngOnDestroy() {
    this.subscriptions.forEach(unsub => unsub());
  }

  cancelBtnClick() {
    this.modalControlService.close(CloseReason.UserTerminated, {
      nextModal: 'cancelSigningModal'
    });
  }

  clickModalBody(e) {
    e.stopPropagation();
    this.parties.forEach((party)=> {party.showActionDropdown = false;});
  }

  sendReminder(party) {
    if(this.isReminderDisabled(party)) {
      return false;
    }
    this.reminders.push(party.id);
    this.actionInProgress = true;
    this.signService.sendReminder([party], this.binder.id).subscribe({
      complete: () => {
        let partyName = party.legalName; 
        this.alertService.addSuccessAlert({
          message: {
            key: 'Manage-modal_manage-signers-reminder-sent',
            params: { name : partyName }
          },
        });
        this.reloadBinder();
        this.actionInProgress = false;
      },
      error: () => {
        let partyName = party.legalName; 
        this.alertService.addDangerAlert({
          message: {
            key: 'Manage-modal_manage-signers-reminder-error',
            params: { name : partyName }
          },
        });
        this.actionInProgress = false;
      }
    });
  }

  reloadBinder() {
    const state = this.store.getState();
    const { binder } = state;
    this.signService.getBinder(binder.id, { fetchPages: false, saveStore: true }, binder).subscribe(
      (binder: Binder) => {
        this.messageService.sendEvent({
          eventName: "SIGNER_REMINDER_SENT",
          binder: binder,
          category: 'SignEvent'
        });
      },
      () => setTimeout(() => location.reload(), 5000)
    );
  }

  removeViewer(e, party) {
    e.stopPropagation();
    party.showActionDropdown = false;
    this.signService.removeViewer(party.id, this.binder.id).subscribe({
      complete: () => {
	      this.store.dispatch(removeParty({id: party.id}));
      },
      error: () => {
        this.alertService.setAlertMessage({message: 'Manage-modal_manage-signers-remove-error', type: 'danger'});
      }
    });
  }

  getColorClass(party) {
    if(partyHasRole(party, RoleEnum.Viewer)) {
      return {'ready': party.status == 'VIEWED', 'waiting': party.status == 'INVITED'};
    }
    else {
      return {'ready': party.status == 'SIGNED', 'waiting': party.status == 'INVITED' || party.status == 'VIEWED', 'declined': party.status == 'DECLINED'};
    }
  }

  getPartyColor(party) {
    return party.metaData.style.background;
  }

  getPartyBorder(party) {
    return `1px solid ${party.metaData.style.background}`;
  }

  isReminderDisabled(party: Party): boolean {
    if(partyHasRole(party, RoleEnum.Owner)) return true;
    if(this.reminders.includes(party.id)) return true;
    if(partyHasRole(party, RoleEnum.Viewer) && party.status == 'VIEWED') return true;
    return party.status === 'SIGNED';
  }

  close(): void {
    this.modalControlService.close(CloseReason.UserTerminated)
  }
}