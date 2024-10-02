import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';

import { Unsubscribe } from 'redux';
import { Store } from '../../../state/store';
import { Binder } from '../../../services/sign-app/binder.interface';
import { DocumentEvent, HistoryEventType } from '../../../services/sign-app/document-event.interface';
import { Party, RoleEnum } from '../../../services/sign-app/party.interface';
import { fadeInOut, modalScaleInOut } from '../../../animations/animations';
import { getPartyByRoleName } from '../../../state/selectors';

@Component({
  selector: 'history-panel',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss'],
  animations: [fadeInOut, modalScaleInOut],
})
export class HistoryComponent implements OnDestroy {
  numberOfDocs = 1;
  @Output() hideModal: EventEmitter<any> = new EventEmitter();

  documentEvents: Array<DocumentEvent> = [];
  binder: Binder;
  binderOwner: Party;

  private sub: Unsubscribe;

  constructor(private store: Store) {}

  ngOnInit() {
    this.binder = this.store.getState().binder;
    this.binderOwner = getPartyByRoleName(this.binder, RoleEnum.Owner);

    this.sub = this.store.subscribe(() => this.setEvents());
    this.setEvents();
  }

  ngOnDestroy() {
    this.sub();
  }

  setEvents() {
    const cachedEvents = this.store.getState().historyInfo;
    if (!cachedEvents) return;
    this.documentEvents = cachedEvents.filter((e) => e.type in HistoryEventType);
  }

  close() {
    this.hideModal.emit();
  }
}
