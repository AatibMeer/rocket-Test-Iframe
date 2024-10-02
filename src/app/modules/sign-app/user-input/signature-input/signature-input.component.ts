import {
  Component,
  Input,
  Output,
  ElementRef,
  EventEmitter,
  ViewChild,
  OnInit,
  ViewEncapsulation,
  OnDestroy,
} from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { IAngularMyDpOptions } from '@nodro7/angular-mydatepicker';
import { UntypedFormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { SignatureInput } from '../../../../services/sign-app/signature-input.interface';
import { Party } from '../../../../services/sign-app/party.interface';
import { getPartyAssignedToInput, getCurrentPartyRef } from '../../../../state/selectors';
import { Store } from '../../../../state/store';
import { DateInput } from '../../date/date-input';
import { getTranslatedDatePlaceholder } from '../../../../common/utility-components/util-functions';
import dayjs from 'dayjs';

@Component({
  selector: 'signature-input',
  templateUrl: './signature-input.component.html',
  styleUrls: ['./signature-input.component.scss'],
  encapsulation: ViewEncapsulation.None, // this is to style datepicker
})
export class SignatureInputComponent implements OnDestroy, OnInit {
  constructor(private sanitizer: DomSanitizer, private store: Store, private translateService: TranslateService) {
    const storeSub = this.store.subscribe((state) => {
      this.refreshData(state);
    });
    this.subscriptions.push(storeSub);
  }

  subscriptions = [];
  @Input() input: SignatureInput;
  @Input() simulationStyles;
  @Input() styles;
  @Input() font;
  @Input() highlight: boolean;
  @Input() highlightedInputClicks: number;
  @Input() datepickerLanguage: string;
  @Input() redOutline: boolean;
  // requestedDateFormat is the date format requested by the Binder/App
  @Input() requestedDateFormat: string;
  @Output() valueChange = new EventEmitter();
  @ViewChild('wrapper') wrapperEl: ElementRef;
  @ViewChild('placeholderWrapper') placeholderWrapper: ElementRef;
  @ViewChild('signatureInputValue') signatureInputValueEl: ElementRef;
  @ViewChild('simulationWrapper') simulationWrapper: ElementRef;
  @ViewChild('simulationInputValue') simulationInputValue: ElementRef;
  @ViewChild('indicator') indicator: ElementRef;
  signModeEnabled: boolean;
  inputTypeToLabel = {
    INITIALS: 'signature-input_initial-here',
    DATE_SIGNED: 'signature-input_date-here',
    SIGNATURE_TEXT: 'signature-input_sign-here',
  };

  readonly iconsSettings = {
    signature: {
      radix: 5,
      maxSize: 20, // 80
    },
    initials: {
      radix: 8,
      maxSize: 18, // 50
    },
    text: {
      radix: 6,
      maxSize: 20, // 68
    },
  };

  iconFontSizes = {
    SIGNATURE_TEXT: '0px',
    INITIALS: '0px',
    CUSTOM_TEXT: '0px',
  };

  @ViewChild('svgSignature') svgSignature: ElementRef;

  public showDatePicker = false;
  public currentDate;
  svgUrl: SafeUrl = '';
  maxFontSize: number;
  partyAssignedToInput: Party;
  currentPartyRef: string;
  inputLabel: string;

  readonly options: IAngularMyDpOptions = {
    inline: true,
  };
  readonly date = new UntypedFormControl();
  private readonly destroy = new Subject<void>();

  ngOnDestroy(): void {
    this.subscriptions.forEach((unsub) => unsub());
    this.destroy.next();
  }

  ngOnInit() {
    const state = this.store.getState();
    this.currentPartyRef = getCurrentPartyRef(state);
    this.partyAssignedToInput = getPartyAssignedToInput(state, this.input);
    const dateFormatUpperCase = this.requestedDateFormat.toUpperCase();
    this.iconFontSizes = {
      SIGNATURE_TEXT: this.getSignIconFontSize(this.iconsSettings.signature.radix, this.iconsSettings.signature.maxSize),
      INITIALS: this.getSignIconFontSize(this.iconsSettings.initials.radix, this.iconsSettings.initials.maxSize),
      CUSTOM_TEXT: this.getSignIconFontSize(this.iconsSettings.text.radix, this.iconsSettings.initials.maxSize),
    };
    this.setCurrentDate(state.signModeEnabled);
    if (this.input.type === 'DATE_SIGNED') {
      // backend supports some peculiar dateformats, frontend (with momentjs) uses iso8601
      // since MM/dd/yyyy was rendered as 05/16/2022, and not as 05/Mo/2022, it means we need to force uppercase to get the same UX
      // once sign-service to support ISO8601 (or any other int`l date standard) we can revisit the uppercase functionality
      this.date.setValue({
        from: {
          date: dayjs(this.input.value, dateFormatUpperCase).locale(this.datepickerLanguage),
        },
      } as DateInput);
    }
    if (this.input.valueType === 'IMAGE') {
      this.svgUrl = this.sanitize(`data:image/svg+xml;base64,${this.input.value}`);
    }
    this.maxFontSize = this.input.type === 'DATE_SIGNED' ? 18 : 42;
    this.date.valueChanges.pipe(takeUntil(this.destroy)).subscribe((value: DateInput) => {
      this.valueChange.emit(value.from.date.format(dateFormatUpperCase));
    });
    this.inputLabel = this.getInputLabel();
  }

  refreshData(state) {
    this.signModeEnabled = state.signModeEnabled;
    this.inputLabel = this.getInputLabel();
    this.setCurrentDate(this.signModeEnabled);
  }

  setCurrentDate(signModeEnabled) {
    if (this.input.type === 'DATE_SIGNED') {
      if (signModeEnabled) {
        this.currentDate = this.translateService.instant('signature-input_date-here');
      } else {
        this.currentDate = getTranslatedDatePlaceholder(this.requestedDateFormat, this.translateService.currentLang);
      }
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

  onClick(event) {
    if (this.input.configuration && this.input.configuration.autoComplete) {
      return;
    }
    if (this.input.type === 'DATE_SIGNED' && this.input.partyReference === this.currentPartyRef) {
      event.stopPropagation();
      this.showDatePicker = !this.showDatePicker;
    }
  }

  sanitize(url: string) {
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }

  // Proxy to the native method. Used to scroll/animate to element.
  getBoundingClientRect() {
    return this.wrapperEl.nativeElement.getBoundingClientRect();
  }

  getSignIconFontSize(radix, max) {
    if (!this.wrapperEl) return `0px`;
    if (this.wrapperEl.nativeElement.clientWidth / radix + 10 < this.wrapperEl.nativeElement.clientHeight)
      return Math.round(this.wrapperEl.nativeElement.clientWidth / radix) < max
        ? `${Math.round(this.wrapperEl.nativeElement.clientWidth / radix)}px`
        : `${max}px`;
    return Math.round(this.wrapperEl.nativeElement.clientHeight - this.wrapperEl.nativeElement.clientHeight / 8) < max
      ? `${Math.round(this.wrapperEl.nativeElement.clientHeight - this.wrapperEl.nativeElement.clientHeight / 8)}px`
      : `${max}px`;
  }

  getInputLabel() {
    if (this.store.getState().signModeEnabled) {
      return this.translateService.instant(this.inputTypeToLabel[this.input.type]);
    }
    return this.partyAssignedToInput.legalName;
  }
}
