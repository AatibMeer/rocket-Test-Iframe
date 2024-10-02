import { Component, EventEmitter, Input, Output, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { Store } from '../../../state/store';
import * as reduxActions from '../../../state/actions/sign';

import { SignatureInput } from '../../../services/sign-app/signature-input.interface';
import { SignatureInputComponent } from './signature-input/signature-input.component';
import { CustomTextInputComponent } from './custom-text-input/custom-text-input.component';
import { Party } from '../../../services/sign-app/party.interface';
import { getCurrentParty, getPartyAssignedToInput } from '../../../state/selectors';
import { setSignMode } from '../../../state/actions/uiProps';

@Component({
  selector: 'user-input',
  templateUrl: './user-input.component.html',
  styleUrls: ['./user-input.component.scss'],
})
export class UserInputComponent implements OnChanges {
  @Input() input: SignatureInput;
  @Input() highlight: boolean;
  @Input() highlightedInputClicks: number;
  @Input() datepickerLanguage: string;
  // requestedDateFormat is the date format requested by the Binder/App
  @Input() requestedDateFormat: string;
  @Input() redOutline: boolean;
  @Output() valueChange = new EventEmitter();
  @Output() clicked = new EventEmitter();
  @ViewChild('inputEl') inputEl: SignatureInputComponent | CustomTextInputComponent;

  simulationStyles;
  boxStyles;
  fontStyles;
  currentSigner: Readonly<Party>;
  partyThatInputIsAssignedTo: Party;

  ngOnChanges(changes: SimpleChanges) {
    if (changes && changes.input) {
      const { binder } = this.store.getState();
      this.partyThatInputIsAssignedTo = binder.parties.find((p) => p.reference == this.input.partyReference);
      this.boxStyles = this.getBoxStyle();
      this.fontStyles = this.getFontStyle();
      this.simulationStyles = this.getSimulationStyles();
    }
  }

  editInput(input: SignatureInput, newValue?: string) {
    const partyAssignedToInput = getPartyAssignedToInput(this.store.getState(), input);
    // if currentUser is not one assigned to input, do nothing
    if (this.currentSigner.id != partyAssignedToInput.id) return;
    if (!this.store.getState().get('signModeEnabled')) this.highlight = true;
    if (newValue) {
      this.valueChange.emit(newValue);
    } else {
      this.store.dispatch(setSignMode(true));
      this.clicked.emit();
    }
  }

  constructor(protected store: Store) {
    this.currentSigner = getCurrentParty(this.store.getState());
  }

  getBoundingClientRect() {
    return this.inputEl.getBoundingClientRect();
  }

  getBoxStyle() {
    const styleUnits = this.getCssPositionUnits(this.input);
    const styles: any = {
      border: `1px solid ${this.partyThatInputIsAssignedTo.metaData.style.background}`,
      position: 'absolute',
      width: this.input.position.width + styleUnits,
      height: this.input.position.height + styleUnits,
      padding: '0',
      display: 'flex',
    };

    if (this.input.position.type == 'STICKY') {
      switch (this.input.position.corner) {
        // 10px for input box padding, 5px for document image box-shadow which is enlarging container
        case 'TOP_LEFT':
          styles.left = `${this.input.position.xOffset}${styleUnits}`;
          styles.top = `${this.input.position.yOffset}${styleUnits}`;
          break;
        case 'TOP_RIGHT':
          styles.left = `calc(${this.input.position.xOffset}${styleUnits} - 10px)`;
          styles.top = `${this.input.position.yOffset}${styleUnits}`;
          break;
        case 'BOTTOM_LEFT':
          styles.left = `${this.input.position.xOffset}${styleUnits}`;
          styles.top = `calc(${this.input.position.yOffset}${styleUnits} - 5px)`;
          break;
        case 'BOTTOM_RIGHT':
          styles.left = `calc(${this.input.position.xOffset}${styleUnits} - 10px)`;
          styles.top = `calc(${this.input.position.yOffset}${styleUnits} - 5px)`;
          break;
      }
    } else {
      styles.top = this.input.position.yOffset + styleUnits;
      styles.left = this.input.position.xOffset + styleUnits;
    }

    return Object.assign(styles, {
      alignItems: getHorizontalPosition(this.input),
      justifyContent: 'center',
    });

    function getHorizontalPosition(input): string {
      switch (input.position.hAlignment) {
        case 'LEFT':
          return 'flex-start';
        case 'CENTER':
          return 'center';
        case 'RIGHT':
          return 'flex-end';
        default:
          return 'center';
      }
    }
  }

  getSimulationStyles() {
    // maxPageWidth and maxPageHeight are the maximum possible width and height values of the page when viewed on a large screen (> 968px width);
    const maxPageWidth = 890;
    const maxPageHeight = 1152;
    const width = `${(maxPageWidth / 100) * this.input.position.width}px`;
    const height = `${(maxPageHeight / 100) * this.input.position.height}px`;
    return Object.assign(this.getBoxStyle(), {
      width,
      height,
      left: '-999px',
      visibility: 'hidden',
      zIndex: '-999',
    });
  }

  getCssPositionUnits(input: SignatureInput): string {
    const apiUnits = input.position.unit;
    if (apiUnits === 'PX') return 'px';
    if (apiUnits === 'PCT') return '%';
    return '%'; // default
  }

  getDynamicFontSize() {
    let ratio;
    const viewport = document.documentElement.clientWidth;
    let fontSize;

    if (viewport < 890) {
      ratio = viewport / 890;
    } else {
      ratio = 1;
    }

    if (this.input.font && this.input.font.sizeInPx) {
      fontSize = ratio * this.input.font.sizeInPx;
    } else {
      fontSize = ratio * 14;
    }
    return fontSize;
  }

  getFontStyle() {
    if (!this.input) return {};
    if (!this.input.font) return {};
    const { font } = this.input;
    let fontFamily;
    if (font.type === 'CAVEAT_REGULAR') fontFamily = 'Caveat';
    if (font.type === 'SHADOWS_INTO_LIGHT_TWO') fontFamily = 'Shadows Into Light Two';
    if (font.type === 'DANCING_SCRIPT') fontFamily = 'Dancing Script';
    if (font.type === 'JUST_ME_AGAIN_DOWN_HERE') fontFamily = 'Just Me Again Down Here';
    if (font.type === 'LORA') fontFamily = 'Lora';
    if (font.type === 'TINOS') fontFamily = 'Tinos';
    if (font.type === 'OPEN_SANS') fontFamily = 'Open Sans';

    return {
      color: font.color || '#333',
      'font-family': fontFamily,
    };
  }

  submitToStore(data) {
    this.store.dispatch(reduxActions.recordSignature(data));
  }
}
