import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Store } from '../../../../state/store';
import * as reduxActions from '../../../../state/actions/sign';
import { SignatureInput } from '../../../../services/sign-app/signature-input.interface';
import { Party } from '../../../../services/sign-app/party.interface';
import { NotificationMessageService } from '../../../../services/sign-app/notification.service';
import { getPartyAssignedToInput, getCurrentPartyRef } from '../../../../state/selectors';
import { FontInfo } from '../../../../services/sign-app/font.interface';

@Component({
  selector: 'custom-text-input',
  templateUrl: './custom-text-input.component.html',
  styleUrls: ['./custom-text-input.component.scss'],
})
export class CustomTextInputComponent {
  @Input() input: SignatureInput;
  @Input() highlight: boolean;
  @Input() highlightedInputClicks: number;
  @Input() styles;
  @Input() font;
  @Input() dynamicFontSize;
  @Input() redOutline: boolean;

  @ViewChild('customTextContainer') customTextContainer: ElementRef;
  @ViewChild('wrapper') wrapperEl: ElementRef;
  @ViewChild('textarea') textarea: ElementRef;
  @ViewChild('prompt') promptEl: ElementRef;
  @ViewChild('promptOptional') promptOptionalEl: ElementRef;
  @ViewChild('indicator', { read: ElementRef }) indicator: ElementRef;

  customTextValue = '';
  branding = {};
  focused = false;
  promptOverflow = false;
  minInputHeightInPercent = 2.5;
  maxLength = 250;

  currentPartyRef: string;
  partyAssignedToInput: Party;

  constructor(
    private notificationService: NotificationMessageService,
    private sanitizer: DomSanitizer,
    protected store: Store
  ) {
    if (store.getState().get('brandConfig')) {
      this.branding = store.getState().brandConfig.lookAndFeel;
    }
  }

  ngOnInit(): void {
    const state = this.store.getState();
    this.currentPartyRef = getCurrentPartyRef(state);
    this.partyAssignedToInput = getPartyAssignedToInput(this.store.getState(), this.input);
    setTimeout(() => {
      if (!this.input.optional) {
        if (this.promptEl.nativeElement.scrollHeight > this.promptEl.nativeElement.clientHeight) {
          this.promptOverflow = true;
        }
      } else if (this.promptOptionalEl.nativeElement.scrollHeight > this.promptOptionalEl.nativeElement.clientHeight) {
        this.promptOverflow = true;
      }
    }, 100);
  }

  onKeyup(): void {
    const textarea = this.textarea.nativeElement;
    while (textarea.clientHeight + 5 < textarea.scrollHeight) {
      textarea.value = textarea.value.slice(0, textarea.value.length - 2);
    }
  }

  getIndicatorTopPosition() {
    if (this.indicator && this.indicator.nativeElement) {
      const { top } = this.styles;
      const height = this.styles.height.replace('%', '');
      const halfHeight = height / 2;
      const indicatorHeight = this.indicator.nativeElement.clientHeight;
      const indicatorHalfHeight = indicatorHeight / 2;
      return this.sanitizer.bypassSecurityTrustStyle(`calc(${top} + ${halfHeight}% - ${indicatorHalfHeight}px)`);
    }
    return this.sanitizer.bypassSecurityTrustStyle(`0px`);
  }

  setCustomTextStyle() {
    const bgSize = this.getCustomTextLineHeight();
    return {
      'z-index': '2',
      color: this.font.color,
      'font-family': this.font['font-family'],
      'font-size': `${this.dynamicFontSize}px`,
      'line-height': `${bgSize}px`,
    };
  }

  getCustomTextLineHeight(): number {
    // value in px
    const docPage = document.querySelector('.doc-img');
    if (!docPage) return 30;
    const docPageHeight = docPage.clientHeight;
    return Math.floor((docPageHeight / 100) * this.minInputHeightInPercent);
  }
  getBoundingClientRect() {
    return this.wrapperEl.nativeElement.getBoundingClientRect();
  }

  focusInput(): void {
    if (this.partyAssignedToInput.reference !== this.currentPartyRef) return;
    this.textarea.nativeElement.focus();
  }

  onFocus(): void {
    this.focused = true;
  }

  onFocusOut(): void {
    this.focused = false;
    let fontConfig: FontInfo = {
      color: '#333333',
      sizeInPx: 14,
      type: 'OPEN_SANS',
      weight: 'NORMAL_400',
    };

    if (this.input.font) {
      fontConfig = { ...this.input.font };
    }

    const data = {
      id: this.input.id,
      partyReference: this.input.partyReference,
      value: this.input.value,
      font: fontConfig,
    };

    this.store.dispatch(reduxActions.recordCustomText(data));
  }
}
