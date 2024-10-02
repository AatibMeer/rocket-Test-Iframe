import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnChanges,
  OnInit,
  OnDestroy,
  Inject,
} from '@angular/core';

import { ActivatedRoute } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { Store } from '../../../../state/store';
import * as reduxActions from '../../../../state/actions/sign';
import { SignatureInput } from '../../../../services/sign-app/signature-input.interface';

import { getEditableInputs, isCurrentUserOwner } from '../../../../state/selectors';
import { SignaturePadWrapperComponent } from '../../signature-pad-wrapper/signature-pad-wrapper.component';

import { fadeInOut, modalScaleInOut } from '../../../../animations/animations';
import { CloseReason, ModalControlService, ModalNavigateIntention } from '../../../../services/sign-app/modal-control.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SvgData } from '../../../../services/sign-app/signature-pad.interface';

// ViewEncapsulation must stay at the default level (Emulated) for ::ng-deep (used in global-signature-modal.scss) to work
@Component({
  selector: 'signature-modal',
  templateUrl: './signature-modal.component.html',
  styleUrls: ['./signature-modal.component.scss'],
  animations: [fadeInOut, modalScaleInOut],
})
export class SignatureModalComponent implements OnChanges, OnInit, OnDestroy {
  constructor(
    protected modalControlService: ModalControlService,
    protected store: Store,
    protected activatedRoute: ActivatedRoute,
    @Inject(DOCUMENT) public documentEl?: Document
  ) {
    const config = this.store.getState().brandConfig;
    if (config && config.lookAndFeel) {
      this.termsUrl = config.lookAndFeel.partnerTermsAndConditionsPage;
      this.privacyPageUrl = config.lookAndFeel.partnerPrivacyPage;
    }
  }

  readonly destroy = new Subject<void>();

  @Input() input: SignatureInput;
  @Input() currentUserLegalName: string;
  @Input() showModal: boolean;
  @Output() signatureModalSubmitted = new EventEmitter();
  @Output() hideModal = new EventEmitter<string>();
  @ViewChild('editableInput') editableInput: ElementRef;

  @ViewChild('signaturePad') signaturePad: SignaturePadWrapperComponent;

  signatureStyles = ['sig-style-1', 'sig-style-2', 'sig-style-3', 'sig-style-4'];

  // new model
  signatureValue: string;
  signatureStyle = 'sig-style-1';
  typeInSignatureColor = '#333333';
  protected drawSignatureColor = '#333333';
  protected termsAccepted = false;

  termsUrl: string;
  privacyPageUrl: string;

  activeSigType: 'draw' | 'type' = 'draw';
  unsavedSvgData: SvgData;

  ngOnInit(): void {
    this.modalControlService.navigate$
      .pipe(takeUntil(this.destroy))
      .subscribe((intention) => this.onNavigate(intention));

    this.addPasteEventListener();
    if (this.input.value) {
      // DRAW is default, but if signature already has a value, default is TYPE
      this.activeSigType = 'type';
    }
    if (this.input.valueType && this.input.valueType == 'IMAGE') {
      this.activeSigType = 'draw';
      this.unsavedSvgData = this.input.svgData;
      this.drawSignatureColor = this.input.font.color;
      setTimeout(() => {
        // this delay must be here so that signature pad has time to initialize properly
        if (this.drawSignatureColor === '#2c39f9') {
          this.signaturePad.switchColor('rgb(44, 57, 249)');
        } else {
          this.signaturePad.switchColor('rgb(51, 51, 51)');
        }
      }, 200);
    }
  }

  onNavigate(intention: ModalNavigateIntention): void {
    this.modalControlService.close(CloseReason.UserTerminated);
  }

  ngOnDestroy() {
    this.destroy.next();
  }

  addPasteEventListener() {
    if (this.editableInput && this.editableInput.nativeElement) {
      this.editableInput.nativeElement.addEventListener('paste', function (e) {
        e.preventDefault();
        let text = '';
        if (e.clipboardData || e.originalEvent.clipboardData) {
          text = (e.originalEvent || e).clipboardData.getData('text/plain');
        } else if (window['clipboardData']) {
          text = window['clipboardData'].getData('Text');
        }
        if (document.queryCommandSupported('insertText')) {
          document.execCommand('insertText', false, text);
        } else {
          document.execCommand('paste', false, text);
        }
      });
      return;
    }
    setTimeout(() => this.addPasteEventListener(), 100);
  }

  isPadEmpty(pad) {
    if (!pad || !pad.signaturePad) return true;
    return pad.signaturePad.isEmpty();
  }

  isOwner(): boolean {
    return isCurrentUserOwner(this.store.getState());
  }

  ngOnChanges(changes) {
    if (changes.currentUserLegalName) {
      const typedSignatureValue = this.input.valueType === 'TEXT' ? this.input.value : null;
      this.signatureValue = typedSignatureValue ?? changes.currentUserLegalName.currentValue;
    }
    if (changes.showModal) {
      this.setFontStyle();
    }
  }

  setFontStyle() {
    const editedInput = getEditableInputs(this.store.getState())
      .filter((input) => !!input.font)
      .find((input) => input.type !== 'DATE_SIGNED');
    if (editedInput) {
      if (editedInput.font.type === 'CAVEAT_REGULAR') this.signatureStyle = 'sig-style-1';
      if (editedInput.font.type === 'SHADOWS_INTO_LIGHT_TWO') this.signatureStyle = 'sig-style-2';
      if (editedInput.font.type === 'DANCING_SCRIPT') this.signatureStyle = 'sig-style-3';
      if (editedInput.font.type === 'JUST_ME_AGAIN_DOWN_HERE') this.signatureStyle = 'sig-style-4';
      this.typeInSignatureColor = editedInput.font.color;
    }
  }

  switchColor() {
    if (this.activeSigType === 'draw') {
      this.switchDrawColor();
    } else {
      this.switchTypeInColor();
    }
  }

  switchTypeInColor() {
    if (this.typeInSignatureColor === '#333333') {
      this.typeInSignatureColor = '#2c39f9';
    } else {
      this.typeInSignatureColor = '#333333';
    }
  }

  switchDrawColor() {
    if (this.drawSignatureColor === '#333333') {
      this.drawSignatureColor = '#2c39f9';
      this.signaturePad.switchColor('rgb(44, 57, 249)');
    } else {
      this.drawSignatureColor = '#333333';
      this.signaturePad.switchColor('rgb(51, 51, 51)');
    }
  }

  switchFont() {
    const nextIndex = this.signatureStyles.indexOf(this.signatureStyle) + 1;
    if (nextIndex === this.signatureStyles.length) {
      this.signatureStyle = this.signatureStyles[0];
    } else {
      this.signatureStyle = this.signatureStyles[nextIndex];
    }
  }

  isSigValid(): boolean {
    if (!this.signatureValue) return false;
    const value = this.signatureValue.trim();
    if (!value || value.length < 1) return false;
    return value.length <= 75;
  }

  confirmSignatureEditsAndTos() {
    if (!this.isSigValid()) return;
    this.signatureModalSubmitted.emit();
    this.modalControlService.close(CloseReason.CompletedSuccessfully);
    // record changes into the signature input
    const value = this.signatureValue.trim();
    const font = {
      color: this.typeInSignatureColor,
      type: 'CAVEAT_REGULAR',
      sizeInPx: 26,
      weight: 'NORMAL_400',
    };
    if (this.signatureStyle === 'sig-style-1') font.type = 'CAVEAT_REGULAR';
    if (this.signatureStyle === 'sig-style-2') font.type = 'SHADOWS_INTO_LIGHT_TWO';
    if (this.signatureStyle === 'sig-style-3') font.type = 'DANCING_SCRIPT';
    if (this.signatureStyle === 'sig-style-4') font.type = 'JUST_ME_AGAIN_DOWN_HERE';
    // save it to redux store
    const { id } = this.input;
    const { partyReference } = this.input;
    const action = { id, partyReference, font, value, type: this.input.type, valueType: 'TEXT' };

    this.submitToStore(action);
  }

  saveDrawSign() {
    this.signatureModalSubmitted.emit('scrollToNextInput');
    this.modalControlService.close(CloseReason.CompletedSuccessfully);
    this.submitToStore({
      id: this.input.id,
      partyReference: this.input.partyReference,
      valueType: 'IMAGE',
      font: {
        color: this.drawSignatureColor,
      },
      value: this.signaturePad.cropSignatureCanvas(),
      svgData: this.signaturePad.getSvgData(),
      type: this.input.type,
    });
  }

  submitToStore(data) {
    this.store.dispatch(reduxActions.recordSignature(data));
  }

  switchSigType(type) {
    // whats 'typeIn' ?
    if (this.activeSigType === 'draw') {
      this.unsavedSvgData = this.signaturePad.getSvgData();
    }
    if (this.activeSigType !== type) {
      this.activeSigType = type;
    }
  }

  clearPad() {
    this.signaturePad.clearPad();
  }
}
