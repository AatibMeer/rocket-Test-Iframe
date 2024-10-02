import { Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';

import { CKEditor4, CKEditorComponent } from 'ckeditor4-angular';
import { Store } from '../../../state/store';

import { Binder } from '../../../services/sign-app/binder.interface';
import { SignService } from '../../../services/sign-app/sign.service';

import { NotificationMessageService } from '../../../services/sign-app/notification.service';
import { setDocumentEditorMode } from '../../../state/actions/uiProps';
import { AlertService } from '../../../services/sign-app/alert.service';
import { SingleDocument } from '../../../services/sign-app/single-document.interface';
import { getAllInputs } from '../../../state/selectors';
import { generateRandomUuid } from '../../../common/utility-components/simple-uuid-generator';
import { SignatureInput } from '../../../services/sign-app/signature-input.interface';
import type { State } from '../../../state/reducers/main.interface';
import { MessageService } from '../message';
import { addInput } from '../../../state/actions/sign';
import { RoleEnum } from '../../../services/sign-app/party.interface';

declare let CKEDITOR: any;

@Component({
  selector: 'document-editor',
  templateUrl: './document-editor.component.html',
  styleUrls: ['./document-editor.component.scss'],
})
export class DocumentEditorComponent implements OnInit, OnDestroy {
  constructor(
    private store: Store,
    private alertService: AlertService,
    public signService: SignService,
    private messageService: MessageService,
    protected notificationService?: NotificationMessageService
  ) {
    const sub = this.store.subscribe((state) => {
      this.setComponentData(state);
    });
    this.subscriptions.push(sub);
  }

  @Input() docHtml;
  @Output() onDocUpdate = new EventEmitter<any>();
  @Output() onBinderUpdate = new EventEmitter<any>();
  @ViewChild('ckeditor') ckeditor: any;
  editorHtml;
  private changedDocument;
  private static EXTRACT_BODY_EXPRESSION = /<body.*?>([\s\S]*)<\/body>/;

  documentEditorSettings = {
    isVisible: false,
    config: {
      fullPage: true,
      versionCheck: false,
      allowedContent: {
        $1: {
          attributes: true,
          styles: true,
          classes: true,
        },
      },
      disallowedContent: {
        title: (element) => element.parent?.name != 'head', // allow title only in head section, the US's interviews html were broken at the time of writing this code
        script: () => true,
      },
      height: '100%',
      width: 'auto',
      toolbarGroups: [
        { name: 'document', groups: ['mode', 'document', 'doctools'] },
        { name: 'clipboard', groups: ['clipboard', 'undo'] },
        { name: 'editing', groups: ['spellchecker', 'find', 'selection', 'editing'] },
        { name: 'links', groups: ['links'] },
        { name: 'insert', groups: ['insert'] },
        { name: 'basicstyles', groups: ['basicstyles', 'cleanup'] },
        { name: 'forms', groups: ['forms'] },
        { name: 'paragraph', groups: ['list', 'indent', 'blocks', 'align', 'bidi', 'paragraph'] },
        '/',
        { name: 'styles', groups: ['styles'] },
        { name: 'colors', groups: ['colors'] },
        { name: 'tools', groups: ['tools'] },
        { name: 'others', groups: ['others'] },
        { name: 'about', groups: ['about'] },
      ],
      removeButtons: `Source,Save,Templates,Find,SelectAll,NewPage,ExportPdf,Preview,Print,Replace,Form,Checkbox,Radio,
      TextField,Textarea,Select,Button,ImageButton,HiddenField,CopyFormatting,Subscript,Superscript,CreateDiv,JustifyLeft,
      JustifyCenter,JustifyRight,JustifyBlock,BidiLtr,BidiRtl,Language,Flash,Smiley,PageBreak,Iframe,FontSize,TextColor,
      BGColor,ShowBlocks,Maximize,About,Font`,
      removePlugins: 'wsc',
      stylesSet: [
        { name: 'Italic Title', element: 'h2', styles: { 'font-style': 'italic' } },
        { name: 'Subtitle', element: 'h3', styles: { color: '#aaa', 'font-style': 'italic' } },
        {
          name: 'Special Container',
          element: 'div',
          styles: {
            padding: '5px 10px',
            background: '#eee',
            border: '1px solid #ccc',
          },
        },

        { name: 'Marker', element: 'span', attributes: { class: 'marker' }, styles: { 'background-color': 'yellow' } },

        { name: 'Big', element: 'big' },
        { name: 'Small', element: 'small' },
        { name: 'Typewriter', element: 'tt' },

        { name: 'Computer Code', element: 'code' },
        { name: 'Keyboard Phrase', element: 'kbd' },
        { name: 'Sample Text', element: 'samp' },
        { name: 'Variable', element: 'var' },

        { name: 'Deleted Text', element: 'del' },
        { name: 'Inserted Text', element: 'ins' },

        { name: 'Cited Work', element: 'cite' },
        { name: 'Inline Quotation', element: 'q' },

        { name: 'Language: RTL', element: 'span', attributes: { dir: 'rtl' } },
        { name: 'Language: LTR', element: 'span', attributes: { dir: 'ltr' } },

        {
          name: 'Styled Image (left)',
          element: 'img',
          attributes: { class: 'left' },
        },

        {
          name: 'Styled Image (right)',
          element: 'img',
          attributes: { class: 'right' },
        },

        {
          name: 'Compact Table',
          element: 'table',
          attributes: {
            cellpadding: '5',
            cellspacing: '0',
            border: '1',
            bordercolor: '#ccc',
          },
          styles: {
            'border-collapse': 'collapse',
          },
        },

        {
          name: 'Borderless Table',
          element: 'table',
          styles: { 'border-style': 'hidden', 'background-color': '#E6E6FA' },
        },
        { name: 'Square Bulleted List', element: 'ul', styles: { 'list-style-type': 'square' } },

        { name: 'Clean Image', type: 'widget', widget: 'image', attributes: { class: 'image-clean' } },
        { name: 'Grayscale Image', type: 'widget', widget: 'image', attributes: { class: 'image-grayscale' } },

        { name: 'Featured Snippet', type: 'widget', widget: 'codeSnippet', attributes: { class: 'code-featured' } },

        { name: 'Featured Formula', type: 'widget', widget: 'mathjax', attributes: { class: 'math-featured' } },

        { name: '240p', type: 'widget', widget: 'embedSemantic', attributes: { class: 'embed-240p' }, group: 'size' },
        { name: '360p', type: 'widget', widget: 'embedSemantic', attributes: { class: 'embed-360p' }, group: 'size' },
        { name: '480p', type: 'widget', widget: 'embedSemantic', attributes: { class: 'embed-480p' }, group: 'size' },
        { name: '720p', type: 'widget', widget: 'embedSemantic', attributes: { class: 'embed-720p' }, group: 'size' },
        { name: '1080p', type: 'widget', widget: 'embedSemantic', attributes: { class: 'embed-1080p' }, group: 'size' },

        // Adding space after the style name is an intended workaround. For now, there
        // is no option to create two styles with the same name for different widget types. See https://dev.ckeditor.com/ticket/16664.
        { name: '240p ', type: 'widget', widget: 'embed', attributes: { class: 'embed-240p' }, group: 'size' },
        { name: '360p ', type: 'widget', widget: 'embed', attributes: { class: 'embed-360p' }, group: 'size' },
        { name: '480p ', type: 'widget', widget: 'embed', attributes: { class: 'embed-480p' }, group: 'size' },
        { name: '720p ', type: 'widget', widget: 'embed', attributes: { class: 'embed-720p' }, group: 'size' },
        { name: '1080p ', type: 'widget', widget: 'embed', attributes: { class: 'embed-1080p' }, group: 'size' },
      ],
    },
  };

  private contentUnchanged = true;
  requestInFlight = false;

  private binder: Binder;
  private readonly subscriptions: Function[] = [];

  ngOnInit() {
    this.clearHTML();
    this.editorHtml = this.docHtml.repeat(1);
    this.setComponentData(this.store.getState());
  }

  // Initial implementation of the advance editor had a bug. Multiple empty <title> tags were inserted just after the opening body tag
  // Adding support for styles (check: SIGN-7579) aggravated this problem because ckeditor wasn't able to output proper HTML because of those <title> tags
  // This code SHOULD cover most of the cases but of course it is a hack
  private clearHTML() {
    const html = this.docHtml.repeat(1);
    const split = html.split('</html>');
    if (split.length > 1) {
      if (split[1].length > split[0].length) {
        // it means after the closing html tag is actual html
        this.docHtml = split[0].replace(
          DocumentEditorComponent.EXTRACT_BODY_EXPRESSION,
          () => `<body>${split[1]}</body></html>`
        );
      } else if (split[1].trim().length > 0) {
        // it means the newest version is at the top of html file
        this.docHtml = split[0].indexOf('</html>') > 0 ? split[0] : `${split[0]}</html>`;
      }
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach((unsub) => unsub());
  }

  onEditorReady() {
    this.ckeditor.config.allowedContent.$1.elements = CKEDITOR.dtd;
    this.setEditorSize();
  }

  setEditorSize() {
    const editorEl = <HTMLElement>document.querySelector('.cke_inner');
    const progBannerHeight = document.querySelector('.button-wrapper-bottom').clientHeight || 0;
    editorEl.style.height = `calc(100vh - ${progBannerHeight}px)`;
  }

  private inputsNeedRepositioningAfterDocumentEdit = false;
  setComponentData(state: State) {
    this.binder = state.binder;
    this.inputsNeedRepositioningAfterDocumentEdit = state.inputsNeedRepositioningAfterDocumentEdit;
    this.documentEditorSettings.isVisible = state.documentEditorModeEnabled;
  }

  cancelEdits() {
    this.store.dispatch(setDocumentEditorMode(false));
  }

  private resizeTimer;
  @HostListener('window:resize', [])
  onResize() {
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => this.setEditorSize(), 50);
  }

  onChange() {
    this.contentUnchanged = false;
  }

  updateDocumentContent() {
    if (this.contentUnchanged) {
      this.store.dispatch(setDocumentEditorMode(false));
      return;
    }
    this.requestInFlight = true;
    this.changedDocument = this.getFullHTMLOutput();
    this.changedDocument = this.cleanDocumentFromDuplicatePlaceholders();
    this.signService.updateDocument(this.binder.id, this.binder.documents[0].id, this.changedDocument, true).subscribe(
      (newDoc) => {
        this.onSuccessfulDocumentEdit(newDoc);
      },
      () => {
        this.showErrorMsg();
        this.requestInFlight = false;
      }
    );
  }

  // We are replacing the body of the original file with the edited one.
  // This work this way because we found problem with ckeditor and grammarly plugin, and also fullstory code
  getFullHTMLOutput() {
    const matches = DocumentEditorComponent.EXTRACT_BODY_EXPRESSION.exec(this.editorHtml);
    if (matches) {
      return this.docHtml.replace(DocumentEditorComponent.EXTRACT_BODY_EXPRESSION, () => matches[0]);
    }
    return this.editorHtml;
  }

  private newlyAddedInputs: Array<SignatureInput> = [];
  cleanDocumentFromDuplicatePlaceholders() {
    this.newlyAddedInputs = [];
    const state = this.store.getState();
    const existingPlaceholderInputs = getAllInputs(state).filter((input) => input.position.type == 'PLACEHOLDER');
    const cleanDocument = this.changedDocument;
    if (existingPlaceholderInputs.length !== 0) {
      const doc = new DOMParser().parseFromString(cleanDocument, 'text/html');
      existingPlaceholderInputs.forEach((input) => {
        const { identifier } = input.position;
        const elementsThatContainIdentifier = Array.from(doc.querySelectorAll('span')).filter(
          (el) => el.innerHTML === identifier
        );
        if (elementsThatContainIdentifier.length > 1) {
          elementsThatContainIdentifier.forEach((el, index) => {
            if (index === 0) return;
            const newIdentifier = generateRandomUuid();
            const newInput = this.createInputFromTemplate(input, newIdentifier);
            this.store.dispatch(addInput(newInput));
            this.newlyAddedInputs.push(newInput);
            el.textContent = newIdentifier;
          });
        }
      });
      // noinspection HtmlRequiredLangAttribute
      return `<html>${doc.documentElement.innerHTML}</html>`;
    }
    return cleanDocument;
  }

  showErrorMsg() {
    this.alertService.setAlertMessage({ message: 'document-editor_changes_error', type: 'danger' });
  }

  createInputFromTemplate(input, newIdentifier): SignatureInput {
    const newPosition = {
      ...input.position,
      identifier: newIdentifier,
      xOffset: null,
      yOffset: null,
    };
    return {
      ...input,
      id: undefined,
      position: newPosition,
    };
  }

  onSuccessfulDocumentEdit(newDoc: SingleDocument) {
    this.onDocUpdate.emit(newDoc);
    this.saveNewDocumentInStoreAndUpdateBinder(newDoc);
  }

  saveNewDocumentInStoreAndUpdateBinder(newDoc: SingleDocument) {
    // fetch fresh binder from API with updated document/pages IDs
    this.signService.fetchBinder(this.binder.id).subscribe(
      (newBinder) => {
        const binder = this.prepareBinderBeforeUpdatingPartiesAndInputs(newBinder, newDoc);
        setTimeout(() => {
          this.updateBinder(binder);
        }, 200);
      },
      () => {
        this.showErrorMsg();
        this.requestInFlight = false;
      }
    );
  }

  // updating a document means some pages might have been lost
  // it also means that the user might have deleted some of the identifiers found in the doc HTML
  // FIND all inputs which do not have an identifier in the HTML
  // remove them from the binder
  // FIND all inputs which do have are assigned to a pageID that no longer exists
  // remove them from the binder
  prepareBinderBeforeUpdatingPartiesAndInputs(newBinder, newDoc): Binder {
    let changedDoc = newBinder.documents.find((doc) => doc.id == newDoc.id);
    const docInputs = [...changedDoc.inputs];
    // valid inputs are inputs that have a valid pageId
    // and have an identifier in the HTML if they are position.type == 'PLACHOLDER'
    const validInputs = docInputs
      .filter((i) => newDoc.pages.some((p) => p.id === i.position.pageId))
      .filter((i) => {
        if (i.position.type === 'ABSOLUTE') return i;
        if (i.position.type === 'PLACEHOLDER' && this.changedDocument.indexOf(i.position.identifier) !== -1) return i;
        return false;
      })
      .concat(this.newlyAddedInputs);
    changedDoc = { ...changedDoc, inputs: validInputs };
    const removedInputs = docInputs.filter((input) => !validInputs.some((validInput) => validInput.id === input.id));
    const newParties = newBinder.parties
      .filter((party) => this.filterOwnerAndValidSigners(party, removedInputs, validInputs))
      .map((party) => this.revokeSignerRoleForOwnerIfNeeded(party, removedInputs, validInputs));
    const newDocs = newBinder.documents.map((d) => (d.id !== changedDoc.id ? d : changedDoc));
    // add flag so interview option is disabled
    const newMetadata = { ...this.binder.metaData, documentUpdatedFromAdvancedEditor: true };
    return { ...newBinder, metaData: newMetadata, documents: newDocs, parties: newParties };
  }

  private revokeSignerRoleForOwnerIfNeeded(party, removedInputs: any[], validInputs: any[]) {
    if (party.roles.includes(RoleEnum.Owner) && party.roles.length > 1) {
      if (
        removedInputs.some(this.isInputAssignedToParty(party)) &&
        !validInputs.some(this.isInputAssignedToParty(party))
      ) {
        return { ...party, roles: [RoleEnum.Owner] };
      }
    }
    return party;
  }

  private filterOwnerAndValidSigners(party, removedInputs: any[], validInputs: any[]) {
    return (
      party.roles.includes(RoleEnum.Owner) ||
      !removedInputs.some(this.isInputAssignedToParty(party)) ||
      validInputs.some(this.isInputAssignedToParty(party))
    );
  }

  private isInputAssignedToParty(party) {
    return (input) => input.partyReference === party.reference;
  }

  updateBinder(binder) {
    this.signService.updateBinder(binder, true).subscribe(
      () => {
        this.reloadDocument();
      },
      () => {
        this.showErrorMsg();
        this.requestInFlight = false;
      }
    );
  }

  reloadDocument() {
    this.messageService.sendEvent({
      action: 'documentEdited',
    });
    this.signService.getBinder(this.binder.id, { fetchPages: true }).subscribe(() => {
      this.alertService.setAlertMessage({ message: 'document-editor_changes-saved', type: 'success' });
      this.requestInFlight = false;
      this.onBinderUpdate.emit();
      $('html,body').animate({ scrollTop: 0 }, 'slow');
    });
  }
}
