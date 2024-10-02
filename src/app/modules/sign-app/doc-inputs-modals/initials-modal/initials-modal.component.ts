import { Component, OnChanges, Inject, ViewChild, OnInit, OnDestroy } from '@angular/core';

import { ActivatedRoute } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { Store } from '../../../../state/store';
import { SignatureModalComponent } from '../signature-modal/index';
import { fadeInOut, modalScaleInOut } from '../../../../animations/animations';
import {
  CloseReason,
  ModalControlService,
  ModalNavigateIntention,
} from '../../../../services/sign-app/modal-control.service';

@Component({
  selector: 'initials-modal',
  templateUrl: './initials-modal.component.html',
  styleUrls: ['./initials-modal.component.scss'],
  animations: [fadeInOut, modalScaleInOut],
})
export class InitialsModalComponent extends SignatureModalComponent implements OnChanges, OnInit, OnDestroy {
  constructor(
    protected modalControlService: ModalControlService,
    protected store: Store,
    protected activatedRoute: ActivatedRoute,
    @Inject(DOCUMENT) public documentEl
  ) {
    super(modalControlService, store, activatedRoute);
  }

  initialsValue: string;
  private initialsBaseValue: string;

  @ViewChild('signaturePad') signaturePad;

  ngOnInit() {
    this.modalControlService.navigate$
      .pipe(takeUntil(this.destroy))
      .subscribe((intention) => this.onNavigate(intention));

    if (this.input.value) {
      // DRAW is default, but if signature already has a value, default is TYPE
      this.activeSigType = 'type';
    }

    if (this.input.valueType && this.input.valueType === 'IMAGE') {
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

  ngOnDestroy() {
    this.destroy.next();
  }

  ngOnChanges(changes) {
    if (changes.currentUserLegalName) {
      const typedInitialsValue = this.input.valueType === 'TEXT' ? this.input.value : null;
      this.initialsValue = typedInitialsValue ?? changes.currentUserLegalName.currentValue.match(/\b\w/g).join('');
      this.initialsBaseValue = this.initialsValue;
    }
    if (changes.showModal) {
      this.setFontStyle();
    }
  }

  onInput() {
    this.initialsValue = this.editableInput.nativeElement.innerText;
    if (!this.initialsValue || !this.initialsValue.trim()) {
      this.initialsValue = this.currentUserLegalName.match(/\b\w/g).join('');
    }
  }

  isInitialsValid(): boolean {
    if (!this.initialsValue) return false;
    if (!this.initialsValue.trim()) return false;
    if (this.initialsValue.length < 1) return false;
    return this.initialsValue.length <= 4;
  }

  isPadEmpty(pad) {
    if (!pad || !pad.signaturePad) return true;
    return pad.signaturePad.isEmpty();
  }

  confirmSignatureEditsAndTos() {
    if (!this.isInitialsValid()) return;
    this.signatureModalSubmitted.emit();
    this.modalControlService.close(CloseReason.CompletedSuccessfully);
    // record changes into the signature input
    const value = this.initialsValue.trim();
    const font = {
      color: this.typeInSignatureColor,
      type: 'CAVEAT_REGULAR',
      sizeInPx: 26,
      weight: 'NORMAL_400',
    };
    if (this.signatureStyle == 'sig-style-1') font.type = 'CAVEAT_REGULAR';
    if (this.signatureStyle == 'sig-style-2') font.type = 'SHADOWS_INTO_LIGHT_TWO';
    if (this.signatureStyle == 'sig-style-3') font.type = 'DANCING_SCRIPT';
    if (this.signatureStyle == 'sig-style-4') font.type = 'JUST_ME_AGAIN_DOWN_HERE';
    // save it to redux store
    const { id } = this.input;
    const { partyReference } = this.input;
    const action = { id, partyReference, font, value, type: this.input.type, valueType: 'TEXT' };

    this.submitToStore(action);
  }
}
