import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  HostListener,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChildren,
  Inject,
} from '@angular/core';

import { DOCUMENT } from '@angular/common';

import interact from 'interactjs';
import { TranslateService } from '@ngx-translate/core';
import { Store } from '../../../state/store';
import * as reduxActions from '../../../state/actions/sign';
import {
  getEditableInputs,
  getAllInputs,
  getEditableInputsFromPage,
  getAllPendingInputsFromPage,
  getAllInputsFromPage,
  partyHasRole,
  getCurrentParty,
} from '../../../state/selectors';

import { Binder } from '../../../services/sign-app/binder.interface';
import { SingleDocument } from '../../../services/sign-app/single-document.interface';
import { SignatureInput } from '../../../services/sign-app/signature-input.interface';
import { ParentState } from '../../../services/sign-app/parent-state.interface';
import { UserInputComponent } from '../user-input/user-input.component';
import { NewInputComponent } from '../new-input/new-input.component';
import { SignService } from '../../../services/sign-app/sign.service';

import { NotificationMessageService } from '../../../services/sign-app/notification.service';
import { animateModalChildren } from '../../../animations/animations';
import { Party, RoleEnum } from '../../../services/sign-app/party.interface';
import { setSignMode } from '../../../state/actions/uiProps';
import type { State } from '../../../state/reducers/main.interface';
import { SignatureInputComponent } from '../user-input/signature-input';

import { DocPreviewControlService } from './doc-preview.service';

@Component({
  selector: 'doc-preview',
  templateUrl: './doc-preview.component.html',
  styleUrls: ['./doc-preview.component.scss'],
  animations: [animateModalChildren],
})
export class DocPreviewComponent implements OnInit, OnDestroy {
  constructor(
    @Inject(DOCUMENT) private documentEl: Document,
    private store: Store,
    public signService: SignService,
    private translateService: TranslateService,
    private docPreviewService: DocPreviewControlService,
    protected notificationService?: NotificationMessageService
  ) {
    const sub = this.store.subscribe((state) => {
      this.setComponentData(state);
    });
    const shouldHighlightInputs = this.docPreviewService.shouldHighlight$.subscribe(() => {
      this.scrollToNextInputWithoutSignerData(this.confirmHighlightedInputs);
    });
    const shouldHighlightNextInput = this.docPreviewService.highlightNextInputSource$.subscribe(() => {
      this.highlightNextInput();
    });
    this.subscriptions.push(sub);
  }

  // compact style for embedding in document manager
  @Input() compact: boolean;
  @Input() progressActive: boolean;
  @Input() signerDataIsMissing: boolean;

  @Output() showAddSignerDataModal = new EventEmitter();
  @Output() openSigning: EventEmitter<SignatureInput> = new EventEmitter();
  @Output() openInputEditor: EventEmitter<SignatureInput> = new EventEmitter();
  @Output() signatureInputsUpdate: EventEmitter<QueryList<UserInputComponent>> = new EventEmitter();
  highlightedInput: SignatureInput;
  highlightedInputClicks = 0;

  binder: Readonly<Binder>;
  private inputs: Array<SignatureInput> = [];
  private signatureBuilderModeEnabled: boolean;
  private inputsNeedRepositioningAfterDocumentEdit = false;
  private readonly subscriptions: Function[] = [];
  datepickerLanguage: string;
  docShown: string;
  private debounce = null;
  private currentParty: Readonly<Party>;
  private binderHasInputs = false;
  inputDimensions = {
    inputWidth: 25,
    inputHeight: 5,
  };

  private docHasDropzones = false;

  toolboxTooltipShown = false;
  pageClickEvent: Event = null;

  inputsInPages: any = {};

  private onTouchFunc: Function;
  private onCatchMessageFunc: Function;
  private parentState: ParentState = null;
  zoomLevel: number;
  clientWidth: number;
  fixedOffset: number;

  private numberOfPagesInBinder = 0;
  private numberOfPagesLoaded = 0;

  signModeEnabled = false;

  // regular dropzones are zones where an input is legally allowed to be placed (for now, these are document pages)
  // dropping an input on an irregular dropzone means that the input will be deleted
  private regularDropzones = '.new-input, .doc-img, .legal-name, .arrow';
  private irregularDropzones = '.top-banner-container, div:not(.page-container), .draggable';

  @ViewChildren(UserInputComponent) signatureInputs: QueryList<UserInputComponent>;
  @ViewChildren(NewInputComponent) newInputComponents: QueryList<NewInputComponent>;
  @ViewChildren('docTitle', { read: ElementRef }) docTitles: QueryList<ElementRef>;

  ngOnInit() {
    this.setComponentData(this.store.getState());
  }

  ngOnDestroy() {
    this.subscriptions.forEach((unsub) => unsub());
    (<any>window).removeEventListener('touchend', this.onTouchFunc);
    (<any>window).removeEventListener('message', this.onCatchMessageFunc);
  }

  setComponentData(state: State) {
    this.binder = state.binder;
    this.signModeEnabled = state.signModeEnabled;
    this.inputs = getAllInputs(state);
    this.currentParty = getCurrentParty(state);
    this.setInputsInPages();
    this.inputsNeedRepositioningAfterDocumentEdit = state.inputsNeedRepositioningAfterDocumentEdit;
    this.signatureBuilderModeEnabled = state.signatureBuilderModeEnabled;
    this.binderHasInputs = !!getAllInputs(state).length;
    this.datepickerLanguage = this.getDatepickerLanguage();
    this.docShown = this.allDocuments()[0].name;
    if (
      this.binder.status === 'IN_PREPARATION' &&
      this.inputs &&
      this.signatureBuilderModeEnabled &&
      !this.docHasDropzones
    )
      this.attachDropzones();
    this.setNumberOfPagesInBinder();
    this.attachZoomHandler();
    this.attachPostmessageHandler();
    this.signatureInputsUpdate.emit(this.signatureInputs);
    if (!this.signatureBuilderModeEnabled) this.toolboxTooltipShown = false;
    if (!this.signModeEnabled) this.resetHighlightedInput();
  }

  getDatepickerLanguage(): string {
    // See locales in https://github.com/kekeh/angular-mydatepicker/blob/master/projects/angular-mydatepicker/src/lib/services/angular-mydatepicker.locale.service.ts
    const lang = this.translateService.currentLang;
    if (lang === 'pt') return 'pt-br';
    return lang;
  }

  setNumberOfPagesInBinder() {
    this.binder.documents.forEach((doc) => {
      this.numberOfPagesInBinder += doc.pages.length;
    });
  }

  setInputsInPages() {
    this.binder.documents.map((doc) => {
      doc.pages.map((page) => {
        let pageInputs;
        if (
          this.binder.status === 'IN_PREPARATION' &&
          !this.signModeEnabled &&
          partyHasRole(this.currentParty, RoleEnum.Owner)
        ) {
          pageInputs = getAllInputsFromPage(this.store.getState(), page.id);
        } else {
          pageInputs = this.getInputs(doc, page.id);
        }
        this.inputsInPages[page.id] = pageInputs;
      });
    });
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    if (this.debounce) {
      clearTimeout(this.debounce);
    }
    this.debounce = setTimeout(() => {
      clearTimeout(this.debounce);
      Array.from(document.getElementsByClassName('single-document')).forEach((item: HTMLElement) => {
        const itemDimensions = item.getBoundingClientRect();
        if (itemDimensions.height + itemDimensions.top < itemDimensions.height + 100) {
          this.docShown = item.getAttribute('data-doc-name');
        }
      });
    }, 10);
  }

  // used to close other tooltips when a user opens a specific tooltip
  closeOtherTooltips(event) {
    this.newInputComponents.forEach((inputComponent) => {
      if (event !== inputComponent.input.id) inputComponent.toggleInput(false);
    });
    this.toolboxTooltipShown = false;
  }

  allDocuments(): SingleDocument[] {
    if (this.binder && this.binder.documents) return this.binder.documents;
    return [];
  }

  openSigningModal(input: SignatureInput | false) {
    this.openSigning.emit(input || null);
  }

  openEditor(input) {
    this.openInputEditor.emit(input);
  }

  editInput(input: SignatureInput, newValue?: string) {
    if (!this.signModeEnabled) {
      this.store.dispatch(setSignMode(true));
    }
    if (
      input.type === 'CUSTOM_TEXT' ||
      (input.type === 'DATE_SIGNED' && input.configuration && input.configuration.autoComplete)
    ) {
      return;
    }
    const lastSavedInput = this.getLastSavedInput(input);
    if (newValue) {
      // save newValue into the redux store
      const action = { id: input.id, value: newValue, type: input.type };
      this.recordDate(action);
      setTimeout(() => {
        this.highlightNextInput();
      }, 800);
    } else if (input.type === 'DATE_SIGNED') {
      // date-picker is opened by SignatureInputComponent itself
    } else if (!input.value && lastSavedInput) {
      // auto-fill the input with previously saved values
      const { font } = lastSavedInput.input;
      const { value } = lastSavedInput.input;
      const { valueType } = lastSavedInput.input;
      const { partyReference } = input;
      const action = {
        id: input.id,
        font,
        value,
        partyReference,
        type: input.type,
        valueType,
        svgData: null,
      };
      if (lastSavedInput.input.valueType && lastSavedInput.input.valueType === 'IMAGE') {
        action.svgData = lastSavedInput.input.svgData;
      }
      this.recordSignature(action);
      setTimeout(() => {
        this.highlightNextInput();
      }, 1500);
    } else {
      // open modal to allow input editing
      this.openSigningModal(input);
    }
  }

  private getLastSavedInput(input: SignatureInput) {
    return this.signatureInputs
      .filter((comp) => comp.input.type !== 'DATE_SIGNED')
      .filter((comp) => comp.input.type === input.type)
      .find((comp) => !!comp.input.value);
  }

  recordDate(action) {
    this.store.dispatch(reduxActions.recordDate(action));
  }

  recordSignature(action) {
    this.store.dispatch(reduxActions.recordSignature(action));
  }

  pageLoaded(page) {
    page.loaded = true;
    this.numberOfPagesLoaded += 1;
    if (this.numberOfPagesInBinder === this.numberOfPagesLoaded) {
      // reset counter
      this.numberOfPagesLoaded = 0;
    }
  }

  // Filters which interactive signature inputs should be displayed on page.
  // SIGN-4490
  // normal mode means all inputs are shown
  // when user hits 'Sign now' button we only show inputs that user can sign
  getInputs(doc: any, pageId: string): Array<SignatureInput> {
    const state = this.store.getState();
    const signingCompletedForCurrentUser = !getEditableInputs(state).filter((input) => !input.optional).length;
    if (!partyHasRole(this.currentParty, RoleEnum.Owner)) {
      return getEditableInputsFromPage(state, pageId);
    }

    if (signingCompletedForCurrentUser) {
      return getAllPendingInputsFromPage(state, pageId).filter(
        (input) => input.partyReference !== this.currentParty.reference
      );
    }
    if (this.signModeEnabled) {
      return getEditableInputsFromPage(state, pageId);
    }

    return getAllPendingInputsFromPage(state, pageId);
  }

  highlightNextInput() {
    // TODO use Angular animations and animation callbacks
    // highlight the first unfinished available input
    if (!this.store.getState().signModeEnabled) return;
    let redOutline = false;
    const inputComponents = this.signatureInputs.toArray();
    const currentUserInputComponents = inputComponents.filter(
      (i) => i.input.partyReference === this.currentParty.reference
    );
    const inputComponentsFromTopToBottom = currentUserInputComponents.sort(
      (a, b) => getInputTopPosition(a) - getInputTopPosition(b)
    );
    const nextInput: UserInputComponent = inputComponentsFromTopToBottom.find(function (inputComponent) {
      return !inputComponent.input.value && !inputComponent.input.alreadyShown;
    });

    if (!nextInput) {
      setTimeout(() => this.highlightNextInput(), 100);
      return;
    }

    // don't auto-open the input if the user has clicked on it already.
    let userAlreadyClickedInput = false;
    let timeout1: NodeJS.Timer | number | undefined;
    let timeout2: NodeJS.Timer | number | undefined;
    const manualClick = () => {
      if (timeout1 !== undefined) {
        clearTimeout(timeout1 as number);
      }
      if (timeout2 !== undefined) {
        clearTimeout(timeout2 as number);
      }
      userAlreadyClickedInput = true;
      (nextInput?.inputEl?.wrapperEl?.nativeElement as HTMLElement)?.removeEventListener('click', manualClick);
    };
    (nextInput?.inputEl?.wrapperEl?.nativeElement as HTMLElement)?.addEventListener('click', manualClick);

    if (this.highlightedInput === nextInput.input) {
      this.highlightedInputClicks++;
      redOutline = true;
    } else {
      this.highlightedInputClicks = 0;
    }

    this.highlightedInput = nextInput.input;

    // if input is optional, the user is not forced to sign it; we alreadyShown to true
    // the next time highLightNextInput() fires, it will look for an input that's not already shown to the user (thus is optional)
    if (nextInput.input.optional) nextInput.input.alreadyShown = true;

    if (!userAlreadyClickedInput) {
      const elemRect = nextInput.getBoundingClientRect();
      this.scrollToElem(elemRect);
    }
    if (!userAlreadyClickedInput) {
      timeout1 = setTimeout(() => {
        if (redOutline) {
          nextInput.redOutline = redOutline;
          nextInput.highlightedInputClicks = 0;
          // need to wait for angular to recognize change in value to replay animation
          setTimeout(() => {
            nextInput.highlightedInputClicks = 1;
          }, 10);
        } else {
          nextInput.highlightedInputClicks = 1;
        }
        nextInput.highlight = true;
        if (!userAlreadyClickedInput) {
          timeout2 = setTimeout(() => {
            if (nextInput.input.type === 'DATE_SIGNED') {
              (nextInput.inputEl as SignatureInputComponent).showDatePicker = true;
            }
            if (nextInput.input.type === 'CUSTOM_TEXT') {
              nextInput.inputEl.wrapperEl.nativeElement.click();
            } else {
              const lastSaveInput = this.getLastSavedInput(nextInput.input);
              if (!lastSaveInput) {
                nextInput.editInput(nextInput.input);
              }
            }
          }, 1500);
        }
      }, 600);
    }

    function getInputTopPosition(input) {
      if (input.inputEl) {
        return input.inputEl.wrapperEl.nativeElement.getBoundingClientRect().top;
      }
    }
  }

  scrollToNextInputWithoutSignerData(onFinish: () => any) {
    // highlight the first unfinished available input
    const partyToScrollToInput = this.binder.parties.find(DocPreviewComponent.hasSignerWithMissingData);
    const inputComponentsFromTopToBottom = this.newInputComponents
      .toArray()
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    const nextInput = inputComponentsFromTopToBottom.find(function (inputComponent) {
      return inputComponent.input.partyReference === partyToScrollToInput.reference;
    });

    if (nextInput) {
      this.scrollToElem(nextInput.getBoundingClientRect());
      setTimeout(() => {
        onFinish.apply(this);
      }, 3000);
    } else {
      onFinish();
    }
  }

  confirmHighlightedInputs() {
    this.docPreviewService.confirmHighlightedInputs();
  }

  private static hasSignerWithMissingData(party: Party): boolean {
    return party.roles.includes(RoleEnum.Signer) && (!party.legalName || !party.email);
  }

  pageClicked(event) {
    // if signature builder mode is off, or user is in repositioning mode, do nothing
    if (!this.signatureBuilderModeEnabled || this.inputsNeedRepositioningAfterDocumentEdit) return false;
    // popup the toolbox tooltip
    this.pageClickEvent = event;
    if (this.binder.status === 'IN_PREPARATION') {
      this.toggleToolboxTooltip();
    }
  }

  attachDropzones() {
    interact.dynamicDrop(true);
    interact(this.regularDropzones).dropzone({
      overlap: 0.999,
      ondrop: this.onDrop.bind(this),
      ondragenter: (e) => {
        const draggableEl = e.relatedTarget;
        const inputId = e.dragEvent.target.dataset.id;
        if (inputId === draggableEl.dataset.id) {
          this.notificationService.closeNotification();
        }
        draggableEl.classList.remove('delete');
      },
    });
    interact(this.irregularDropzones).dropzone({
      overlap: 0.001,
      ondragenter: (e) => {
        const draggableEl = e.relatedTarget;
        const inputId = e.dragEvent.target.dataset.id;
        if (inputId === draggableEl.dataset.id) {
          if (e.target.classList.contains('draggable')) {
            this.notificationService.setNotification({ key: 'new-input_notification-overlap-warning' });
          } else {
            this.notificationService.setNotification({ key: 'new-input_notification-delete-warning' });
          }
        }
        draggableEl.classList.add('delete');
      },
      ondrop: (e) => {
        const draggableEl = e.relatedTarget;
        const inputId = e.dragEvent.target.dataset.id;
        // if draggableEl is not an input, do nothing
        if (draggableEl.classList.contains('clone')) {
          return false;
        }
        if (inputId === draggableEl.dataset.id) {
          this.notificationService.closeNotification();
          if (e.target.classList.contains('draggable')) {
            const inputComponent = this.newInputComponents.find(
              (inputComponent) => inputComponent.input.id === inputId
            );
            inputComponent.input.position.xOffset = inputComponent.lastValidPosition.x;
            inputComponent.input.position.yOffset = inputComponent.lastValidPosition.y;
            draggableEl.classList.remove('delete');
            return;
          }
          this.deleteInput(e);
        }
      },
    });
    this.docHasDropzones = true;
  }

  onDrop(e) {
    const droppedEl = e.relatedTarget;
    if (droppedEl.classList.contains('draggable-tool')) return false;
    const inputId = e.dragEvent.target.dataset.id;

    // do nothing if this input is not the one being acted upon
    if (inputId !== e.relatedTarget.dataset.id) return false;

    const page = e.target;
    const inputRect = e.dragEvent.target.getBoundingClientRect();
    const inputComponent = this.newInputComponents.find((inputComponent) => inputComponent.input.id === inputId);
    if (inputComponent) {
      const newInputPositioning = inputComponent.calculateInputPositionAndSize(page, inputRect);
      inputComponent.updateInputPositionAndSize(newInputPositioning);
    }
  }

  deleteInput(e) {
    e.stopPropagation();
    const inputId = e.dragEvent.target.dataset.id;
    const inputComponent = this.newInputComponents.find((inputComponent) => inputComponent.input.id === inputId);
    this.notificationService.setNotification({ key: 'new-input_notification-delete-message', autoClose: true });
    if (inputComponent) this.store.dispatch(reduxActions.removeInput(inputComponent.input));
  }

  updateInputSize(event) {
    this.inputDimensions = event;
  }

  toggleToolboxTooltip() {
    this.toolboxTooltipShown = !this.toolboxTooltipShown;
    if (this.toolboxTooltipShown) {
      this.inputs.forEach((input) => this.store.dispatch(reduxActions.updateInput({ ...input, active: false })));
    }
  }

  onInputClicked() {
    this.toolboxTooltipShown = false;
  }

  attachZoomHandler() {
    if ((<any>window).visualViewport && (<any>window).visualViewport.scale && !this.onTouchFunc) {
      this.onTouchFunc = this.scaleTooltip.bind(this);
      (<any>window).addEventListener('touchend', this.onTouchFunc);
    }
  }

  scaleTooltip() {
    if (this.parentState) {
      // compute zoom/page values from iframe parent
      this.zoomLevel = this.parentState.zoomLevel;
      this.clientWidth = this.parentState.clientWidth;
      this.fixedOffset = this.parentState.fixedOffset;
    } else {
      // compute zoom from this window
      let scale;
      scale = (<any>window).visualViewport.scale;
      this.zoomLevel = 1 / scale;
    }
  }

  attachPostmessageHandler() {
    this.onCatchMessageFunc = this.catchMessage.bind(this);
    (<any>window).addEventListener('message', this.onCatchMessageFunc);
  }

  catchMessage(event) {
    try {
      const postMessage: ParentState = JSON.parse(event.data);
      if (postMessage.clientWidth && postMessage.zoomLevel) {
        this.parentState = postMessage;
      }
    } catch (err) {
      // payload is not valid JSON and therefore not for us
    }
  }

  trackBy(idx, item) {
    return item.id;
  }

  trackPagesBy(idx, item) {
    return idx;
  }

  trackDocsBy(idx, item) {
    return item.id;
  }

  scrollToElem(elemRect: ClientRect) {
    // scroll to highlighted element
    const bodyRect = this.documentEl.body.getBoundingClientRect();
    const topOffset = elemRect.top - bodyRect.top - window.innerHeight / 2;
    $('html,body').animate({ scrollTop: topOffset }, 'slow');
  }

  resetHighlightedInput() {
    this.highlightedInput = null;
    this.highlightedInputClicks = 0;
  }
}
