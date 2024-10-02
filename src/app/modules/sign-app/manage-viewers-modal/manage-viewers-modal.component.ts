import {Component, EventEmitter, Inject, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {DOCUMENT} from '@angular/common';

import {Binder} from '../../../services/sign-app/binder.interface';
import {Party, RoleEnum} from '../../../services/sign-app/party.interface';

import {Store} from '../../../state/store';
import {getPartiesWithStatus, partyHasRole} from '../../../state/selectors';

import {SignService} from '../../../services/sign-app/sign.service';
import {AlertService} from '../../../services/sign-app/alert.service';
import {fadeInOut, modalScaleInOut} from '../../../animations/animations';
import {reminderSentToAllViewers} from '../../../state/actions/uiProps';
import {removeParty} from '../../../state/actions/party';
import { CloseReason, ModalControlService, ModalNavigateIntention } from '../../../services/sign-app/modal-control.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { MessageService } from '../message';

@Component({
  selector: 'manage-viewers-modal',
  templateUrl: './manage-viewers-modal.component.html',
  styleUrls: ['./manage-viewers-modal.component.scss'],
  animations: [fadeInOut, modalScaleInOut]
})
export class ManageViewersModalComponent implements OnInit, OnDestroy {
  constructor(
    private store: Store,
    private signService: SignService,
    private alertService: AlertService,
    private modalControlService: ModalControlService,
    @Inject(DOCUMENT) private documentEl: Document,
    private messageService: MessageService
  ) {
    let state = this.store.getState();
    this.binder = this.store.getState().get('binder');

    if (this.binder) {
      this.setData(state);
    }
    let sub = this.store.subscribe((state) => {
      this.setData(state);
    });
    this.subscriptions.push(sub);
  }

  @Input() showModal = true;
  @Output() closeModal = new EventEmitter<void>();
  @Output() startAction = new EventEmitter<string>();

  parties = [];
  binder: Binder;
  reminders = [];
  subscriptions: Function[] = [];
  reminderBtnsDisabled = false;

  private readonly destroy = new Subject<void>();
  private returnRoute?: string;

  setData(state) {
    this.binder = state.get('binder');
    this.parties = getPartiesWithStatus(state).filter(p => partyHasRole(p, RoleEnum.Viewer));
    this.reminderBtnsDisabled = state.get('reminderSentToAllViewers');
  }

  ngOnInit() {
    this.modalControlService.navigate$
      .pipe(takeUntil(this.destroy))
      .subscribe((intention) => this.onNavigate(intention));
  }

  private onNavigate({ data }: ModalNavigateIntention): void {
    if (data.to === 'back') {
      this.modalControlService.close(CloseReason.UserNavigatedBack, {
        nextModal: this.returnRoute,
      });
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(unsub => unsub());
    this.destroy.next();
  }

  removeViewer(e, party) {
    e.stopPropagation();
    party.showActionDropdown = false;
    this.signService.removeViewer(party.id, this.binder.id).subscribe({
      complete: () => {
        // this immediately updates the store for fast visual effect
        this.store.dispatch(removeParty({id: party.id}));
        // this will async make sure the history and rest is up to date
        this.signService.getBinder(this.binder.id, {fetchPages: false}).subscribe(
          (binder) => {
            this.messageService.sendEvent({
              eventName: "VIEWER_REMOVED",
              binder: binder,
              category: 'SignEvent'
            });
          }
        );
      },
      error: () => {
        this.alertService.setAlertMessage({message: 'manage-viewers-modal_remove-error', type: 'danger'});
      }
    });
  }

  close() {
    this.closeModal.emit();
  }

  gotoInviteViewersModal() {
    this.closeModal.emit();
    this.startAction.emit('invite-viewers-modal');
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
    return `solid ${party.metaData.style.background}`;
  }

  sendReminder(party) {
    if(this.isReminderDisabled(party)) {
      return false;
    }
    let reminderSentTo = party.legalName;
    this.reminders.push(party.id);
    this.signService.sendReminder([party], this.binder.id).subscribe({
      complete: () => {
        this.alertService.setAlertMessage({
          message: 'manage-viewers-modal_reminder-sent',
          type: 'success',
          params: { name : reminderSentTo }
        });
        this.reloadBinder();
      },
      error: () => {
        this.alertService.setAlertMessage({
          message: 'manage-viewers-modal_reminder-error',
          type: 'danger',
          params: { name : reminderSentTo }
        });
      }
    });
  }

  sendReminderToAll() {
    this.signService.sendReminder(this.parties, this.binder.id).subscribe({
      complete: () => {
        this.store.dispatch(reminderSentToAllViewers(true));
        this.reloadBinder();
        this.alertService.setAlertMessage({
          message: 'manage-viewers-modal_reminder-sent-to-all',
          type: 'success'
        });
      },
      error: () => {
        this.alertService.setAlertMessage({
          message: 'manage-viewers-modal_reminder-error',
          type: 'danger'
        });
      }
    });
  }

  reloadBinder() {
    const state = this.store.getState();
    const { binder } = state;
    this.signService.getBinder(binder.id, { fetchPages: false, saveStore: true }, binder).subscribe(
      (binder: Binder) => {
        this.messageService.sendEvent({
          eventName: "VIEWER_REMINDER_SENT",
          binder: binder,
          category: 'SignEvent'
        });
      },
      () => setTimeout(() => location.reload(), 5000)
    );
  }

  isReminderDisabled(party: Party): boolean {
    if(this.reminderBtnsDisabled) {
      return true;
    }
    if(this.reminders.includes(party.id)) {
      return true;
    }
    return partyHasRole(party, RoleEnum.Viewer) && party.status == 'VIEWED';

  }
}