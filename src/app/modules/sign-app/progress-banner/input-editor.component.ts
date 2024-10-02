import { Component, Output, EventEmitter, Inject, OnDestroy, OnInit } from '@angular/core';

import { Store } from '../../../state/store';

import { AlertService } from '../../../services/sign-app/alert.service';
import { SignService } from '../../../services/sign-app/sign.service';
import { MessageService } from '../message/message.service';
import { DOCUMENT } from '@angular/common';
import { setInputsNeedRepositioningAfterDocumentEdit, setDocumentEditorMode, setSignatureBuilderMode } from '../../../state/actions/uiProps';
import { ProgressBannerComponent } from './progress-banner.component';
import { SignatureInput } from '../../../services/sign-app/signature-input.interface';
import { getAllInputsFromTopToBottom } from '../../../state/selectors';
import { ModalType } from '../sign-app-dashboard/modal-type.enum';
import type { State } from '../../../state/reducers/main.interface';
import { removeInputWarning, setInputWarning } from '../../../state/actions/sign';
import { getStorageProxy, StorageProxy } from '../../../services/common/storage.service';

@Component({
  selector: 'input-editor',
  templateUrl: './input-editor.component.html',
  styleUrls: ['./progress-banner.component.scss']
})
export class InputEditorComponent extends ProgressBannerComponent implements OnInit, OnDestroy {
  private readonly storage: StorageProxy<{ repositioningDemoCardShown: 'true' }>;

  constructor(
    public store: Store,
    @Inject(DOCUMENT) public documentEl: Document,
    public signService: SignService,
    public alertService: AlertService,
    public messageService?: MessageService
  ) {
        super(store, documentEl, signService, alertService, messageService);
        let storeSub = this.store.subscribe((state) => this.onDataChanges(state));
        this.subscriptions.push(storeSub);
        this.storage = getStorageProxy({
          storage: sessionStorage,
          ignoreStorageErrors: true,
        });
    }

  @Output() updateBinder = new EventEmitter();
  @Output() showModal = new EventEmitter<ModalType>();

  sendingSignatures: boolean = false;
  public inputs: Array<SignatureInput>;
  currentlySelectedInput: SignatureInput;
  public indexOfCurrentInput = 0;
  subscriptions: Function[] = [];

  @Output() stickyMessage = new EventEmitter<string>();

  setStickyMessage() {
    let isTouchDevice = 'ontouchstart' in window || (<any>navigator).msMaxTouchPoints;
    if(isTouchDevice) this.stickyMessage.emit('sign-dashboard_tap-to-continue-mobile');
    else this.stickyMessage.emit('sign-dashboard_tap-to-continue-desktop');
  }

  onDataChanges(state: State) {
    this.inputs = getAllInputsFromTopToBottom(state).filter(i => i.position.type != 'PLACEHOLDER');
    if(!state.get('inputsNeedRepositioningAfterDocumentEdit')) return;
    if(this.inputs.length == 0) {
      this.setStickyMessage();
      return;
    }
    if(!this.inputs.find(input => input.warning)) {
      // if no input has warning (eg if input was removed), assign warning to one
      this.indexOfCurrentInput = this.indexOfCurrentInput == 0 ? 0 : this.indexOfCurrentInput-1;
      this.currentlySelectedInput = this.inputs[this.indexOfCurrentInput];
      this.store.dispatch(setInputWarning({id: this.currentlySelectedInput.id}));
    }
    else {
      this.currentlySelectedInput = this.inputs.find(input => input.warning);
      this.indexOfCurrentInput = this.inputs.findIndex(input => input.warning);
    }
  }

  ngOnInit() {
    this.onDataChanges(this.store.getState());
    const cardShown = this.storage.repositioningDemoCardShown;
    this.storage.repositioningDemoCardShown = 'true';
    if (!cardShown) {
      this.showModal.emit('repositioningDemoModal');
    }
  }

  ngOnDestroy() {
    this.store.dispatch(setSignatureBuilderMode(false));
    this.subscriptions.forEach(unsub => unsub());
  }

  getStepNumber() {
    // show all inputs if user needs to reposition/drag
    return {
        total: this.inputs.length,
        done: this.indexOfCurrentInput +1,
        step: this.indexOfCurrentInput +1
    };
  }

  getProgressPercent(): string {
    var stepNumber = this.getStepNumber();
    var percentageNumber = Math.floor(stepNumber.done / (stepNumber.total || 1) * 100);
    return `${percentageNumber}%`;
  }

  saveChanges() {
    this.store.dispatch(setInputsNeedRepositioningAfterDocumentEdit(false));
    this.store.dispatch(setSignatureBuilderMode(false));
    this.store.dispatch(removeInputWarning());
    this.updateBinder.emit();
  }

  selectNextInput() {
    if(this.indexOfCurrentInput == this.inputs.length) return;
    this.indexOfCurrentInput++;
    this.store.dispatch(setInputWarning({id: this.inputs[this.indexOfCurrentInput].id}));
  }

  selectPreviousInput() {
    if(this.indexOfCurrentInput == 0) return;
    this.indexOfCurrentInput--;
    this.store.dispatch(setInputWarning({id: this.inputs[this.indexOfCurrentInput].id}));
  }

  backToEdit() {
    this.store.dispatch(setDocumentEditorMode(true));
  }
}