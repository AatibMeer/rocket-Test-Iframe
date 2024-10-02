import { Component, EventEmitter, HostListener, Inject, OnDestroy, OnInit, Output } from '@angular/core';

import { DOCUMENT } from '@angular/common';
import { Store } from '../../../state/store';
import { Binder } from '../../../services/sign-app/binder.interface';
import { Party, RoleEnum } from '../../../services/sign-app/party.interface';

import {
  getActiveInput,
  getCurrentParty,
  getPartiesWithAnyRole,
  getPartiesWithoutAnyRoles,
  getPartyByRoleName,
  partyHasRole,
} from '../../../state/selectors';
import * as reduxActions from '../../../state/actions/sign';

import { fadeInOut, modalScaleInOut, slideInOut } from '../../../animations/animations';
import { SignatureInput } from '../../../services/sign-app/signature-input.interface';
import { SignService } from '../../../services/sign-app/sign.service';
import { AlertService } from '../../../services/sign-app/alert.service';
import type { State } from '../../../state/reducers/main.interface';
import { updateParty } from '../../../state/actions/party';
import { selectPartyForEdit } from '../../../state/actions/party-route';
import { PartyService } from '../../../services/sign-app/party.service';

@Component({
  selector: 'edit-input-modal',
  templateUrl: './edit-input-modal.component.html',
  styleUrls: ['./edit-input-modal.component.scss'],
  animations: [modalScaleInOut, fadeInOut, slideInOut],
})
export class EditInputModalComponent implements OnInit, OnDestroy {
  constructor(
    private store: Store,
    @Inject(DOCUMENT) private documentEl: Document,
    private readonly partyService: PartyService,
    private signService: SignService,
    private alertService: AlertService
  ) {
    const state = this.store.getState();
    this.setupComponent(state);
    const sub = this.store.subscribe((state) => {
      this.setupComponent(state);
    });
    this.subscriptions.push(sub);
  }

  @Output() hideModal = new EventEmitter<boolean>();
  @Output() editParty = new EventEmitter<void>();

  @HostListener('document:keydown', ['$event'])
  onkeydown(e) {
    // if user is in main screen on modal, hitting Enter should hide the modal (i.e. not editing or adding a new signer)
    if (e.which == 13 && !this.showNewSignerModal && this.input.type != 'CUSTOM_TEXT') {
      this.hideModal.emit();
    }
  }

  binder: Readonly<Binder>;
  selectedParty: Party;
  private currentParty: Readonly<Party>;
  private showNewSignerModal = false;
  prompt: string;
  input: SignatureInput;
  parties: Array<Party> = [];
  private readonly subscriptions: Function[] = [];

  setupComponent(state: State) {
    this.currentParty = getCurrentParty(state);
    this.binder = state.binder;
    this.parties = getPartiesWithAnyRole(
      this.binder,
      RoleEnum.Owner,
      RoleEnum.Signer,
      RoleEnum.Payee,
      RoleEnum.Payer
    ).concat(getPartiesWithoutAnyRoles(this.binder));
    this.input = this.getCurrentInput();
  }

  ngOnInit() {
    this.input = this.getCurrentInput();
    this.selectedParty = this.getSelectedParty();
    this.prompt = this.input.prompt || '';

    // find new parties and give them the signer role so they show up in the list
    this.binder.parties.forEach((party) => {
      if (party.isTemporary && !partyHasRole(party, RoleEnum.Signer)) {
        const clone: Party = JSON.parse(JSON.stringify(party));
        clone.roles.push(RoleEnum.Signer);
        this.store.dispatch(updateParty(clone));
      }
    });
  }

  ngOnDestroy() {
    this.subscriptions.forEach((unsub) => unsub());
  }

  getCurrentInput(): SignatureInput {
    return getActiveInput(this.store.getState());
  }

  updateInputAndCloseModal() {
    this.updateInputInStore();
    this.hideModal.emit();
  }

  updateInputInStore() {
    const input = {
      ...this.input,
      partyReference: this.selectedParty.reference,
      legalName: this.selectedParty.legalName,
      style: this.selectedParty.metaData.style,
      optional: this.input.optional,
      modalOpened: true,
      isFresh: false,
    };
    if (this.input.type == 'CUSTOM_TEXT') {
      if (this.prompt.length) {
        input.prompt = this.prompt.replace(/"/g, "'");
      } else {
        input.prompt = '';
      }
    }
    this.store.dispatch(reduxActions.updateInput(input));
  }

  actionInProgress = false;
  updatePlaceholderInput() {
    // if input is placeholder, save the result in store and API immediately since user is not in signature builder mode
    this.updateInputInStore();
    this.actionInProgress = true;
    this.partyService.ensurePartyRefIntegrity().subscribe(
      () => this.onUpdateSucces(),
      () => this.onUpdateError()
    );
  }

  onUpdateSucces() {
    this.actionInProgress = false;
    this.alertService.setAlertMessage({ message: 'edit-input-modal_changes-saved', type: 'success' });
    this.store.dispatch(reduxActions.updateInput({ ...this.input, active: false, isFresh: false }));
    this.hideModal.emit();
  }

  onUpdateError() {
    this.alertService.setAlertMessage({ message: 'edit-input-modal_changes-error', type: 'danger' });
  }

  getSelectedParty(): Party {
    if (this.selectedParty && this.selectedParty.reference) {
      return this.selectedParty;
    }
    if (this.input && this.input.partyReference && this.partyAssignedToInputExists()) {
      return this.binder.parties.find((party) => party.reference == this.input.partyReference);
    }

    return getPartyByRoleName(this.binder, RoleEnum.Owner);
  }

  partyAssignedToInputExists() {
    // will check whether the party that is currently assigned to the input exists
    return !!this.binder.parties.find((party) => party.reference == this.input.partyReference);
  }

  selectParty(party) {
    this.selectedParty = party;
  }

  toggleEditSignerModal() {
    this.store.dispatch(
      selectPartyForEdit({
        party: undefined,
        returnRoute: 'editInputModal',
      })
    );
    this.editParty.emit();
  }

  openEditModal(party: Party) {
    this.store.dispatch(
      selectPartyForEdit({
        party,
        returnRoute: 'editInputModal',
      })
    );
    this.editParty.emit();
  }

  checkPromptLengthError() {
    if (this.prompt) {
      return this.prompt.length > 150;
    }
    return false;
  }
  close() {
    if (this.input.isFresh) {
      this.store.dispatch(reduxActions.removeInput({ ...this.input }));
    } else {
      this.store.dispatch(reduxActions.toggleInputActiveness({ id: this.input.id }));
    }

    this.hideModal.emit();
  }
}
