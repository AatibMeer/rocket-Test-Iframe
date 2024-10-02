import {
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  SimpleChanges,
} from '@angular/core';
import { fromEvent, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import dayjs, { Dayjs } from 'dayjs';
import { getDateFormat } from '../../services/common/localization-utils/date';
import { LocalizationService } from '../../services/common/localization.service';

interface QuickDateDirectiveOptions {
  /**
   * If explicitly false then the day is not needed
   */
  day?: boolean;
  /** Only needed if you don't want to use the locale in the LocalizationService */
  locale?: string;
  /**
   * If explicitly false then the month is not needed
   */
  month?: boolean;
  /**
   * If explicitly false then the year is not needed
   */
  year?: boolean;
}

/**
 * A date directive for inputs.
 *
 * An auto-formatter and moment date creator.
 * If you use DAyjs (rl-quick-date="moment") the date and format is already localized so you shouldn't need the Localization Service
 */
@Directive({
  selector: 'input[rl-quick-date]',
})
export class QuickDateDirective implements OnChanges, OnDestroy, OnInit {
  private dateFormat: string;
  @Input()
  date: Dayjs | Date | undefined;
  @Output()
  dateChanged: EventEmitter<Dayjs | Date | undefined>;
  /** The date type. Default is 'native' aka Date */
  @Input('rl-quick-date')
  dateType: 'moment' | 'native';
  private dayRegExp: RegExp | undefined;
  private readonly destroy: Subject<void>;
  private doubleSeparatorRegExp: RegExp | undefined;
  private readonly fullDateFormat: string;
  private locale: string;
  private monthRegExp: RegExp | undefined;
  private nonNumericRegExp: RegExp | undefined;
  @Input('rl-quick-date-options')
  options: QuickDateDirectiveOptions | undefined;
  private separatorRegExp: RegExp | undefined;
  private yearRegExp: RegExp | undefined;

  constructor(
    private readonly elementRef: ElementRef,
    localizationService: LocalizationService,
    private readonly renderer: Renderer2
  ) {
    this.dateFormat = '';
    this.dateChanged = new EventEmitter<Dayjs | Date | undefined>();
    this.dateType = 'native';
    this.destroy = new Subject<void>();
    this.locale = localizationService.localize.region;
    this.fullDateFormat = getDateFormat(this.locale);

    this.dayRegExp = /D+/gi;
    this.doubleSeparatorRegExp = /[., \/\\-]{2,}/g;
    this.monthRegExp = /M+/gi;
    this.nonNumericRegExp = /\D+/g;
    this.separatorRegExp = /[., \/\\-]+/g;
    this.yearRegExp = /Y+/gi;
  }

  private isValid(): boolean {
    const formattingGroups = this.dateFormat.split(this.separatorRegExp);
    const dateGroups = (this.elementRef.nativeElement as HTMLInputElement).value
      .split(this.separatorRegExp)
      .filter((part) => part);
    return formattingGroups.length === dateGroups.length;
  }

  ngOnChanges({ date, options }: SimpleChanges): void {
    if (date) {
      if (date.currentValue) {
        this.setDate(date.currentValue);
      }
    }
    if (options) {
      const { day, month, year, locale } = options.currentValue as QuickDateDirectiveOptions;
      if (locale) {
        this.locale = locale;
      }
      let format = this.fullDateFormat;
      if (day === false) {
        format = format.replace(this.dayRegExp, '');
      }
      if (month === false) {
        format = format.replace(this.monthRegExp, '');
      }
      if (year === false) {
        format = format.replace(this.yearRegExp, '');
      }
      format = format.replace(this.doubleSeparatorRegExp, (match) => match.charAt(0));
      this.setDateFormat(format);
      this.updateInput();
    }
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }

  ngOnInit(): void {
    this.renderer.setAttribute(this.elementRef.nativeElement, 'inputmode', 'numeric');
    fromEvent(this.elementRef.nativeElement, 'input')
      .pipe(takeUntil(this.destroy))
      .subscribe(($event: { inputType: string }) => {
        const isDeleteEvent = $event.inputType === 'deleteContentBackward' || $event.inputType === 'historyUndo';
        if (!isDeleteEvent) {
          this.updateInput();
        }
      });
    fromEvent(this.elementRef.nativeElement, 'change')
      .pipe(takeUntil(this.destroy))
      .subscribe(() => {
        this.updateInput();
        const date = dayjs(this.elementRef.nativeElement.value, this.dateFormat).locale(this.locale);
        const valid = date.isValid() && this.isValid();
        if (valid) {
          this.dateChanged.emit(this.dateType === 'moment' ? date : date.toDate());
        } else {
          this.dateChanged.emit(undefined);
        }
      });
    if (!this.dateFormat) {
      this.setDateFormat(this.fullDateFormat);
    }
    this.setDate(this.date);
  }

  private setDate(date: Dayjs | Date | undefined): void {
    if (dayjs.isDayjs(date) && (date as Dayjs).isValid()) {
      const newValue = (date as Dayjs).format(this.dateFormat);
      this.renderer.setProperty(this.elementRef.nativeElement, 'value', newValue);
    } else if (date instanceof Date) {
      this.setDate(dayjs(date).locale(this.locale));
    } else {
      this.renderer.setProperty(this.elementRef.nativeElement, 'value', '');
    }
  }

  private setDateFormat(format: string): void {
    this.dateFormat = format;
    this.renderer.setAttribute(this.elementRef.nativeElement, 'maxlength', format.length.toString(10));
    this.renderer.setProperty(this.elementRef.nativeElement, 'placeholder', format);
  }

  private updateInput(): void {
    const input: HTMLInputElement = this.elementRef.nativeElement;
    const number = input.value.replace(this.nonNumericRegExp, '');
    // after removing all of the separators in the date, in which position is the cursor?
    const cursorPositionInUnformattedDate = input.value
      .substring(0, input.selectionStart)
      .replace(this.nonNumericRegExp, '').length;
    const dateGroups = this.dateFormat.split(this.separatorRegExp);
    let newValue = '';
    let substringStart = 0;
    let newCursorPosition = cursorPositionInUnformattedDate;
    // build the formatted date string and calculate the cursor position
    for (let i = 0; i < dateGroups.length; i += 1) {
      const separator = this.separatorRegExp.exec(this.dateFormat);
      // increase cursor position by the size of the separator if the cursor is further along
      if (separator && cursorPositionInUnformattedDate > substringStart + separator[0].length) {
        newCursorPosition += separator[0].length;
      }
      const part = number.substring(substringStart, substringStart + dateGroups[i].length);
      substringStart += dateGroups[i].length;
      newValue += part;
      if (part.length === dateGroups[i].length && separator) {
        newValue += separator[0];
      }
    }
    if (newCursorPosition < 0) {
      newCursorPosition = 0;
    }
    this.renderer.setProperty(input, 'value', newValue);
    input.setSelectionRange(newCursorPosition, newCursorPosition);
  }
}
