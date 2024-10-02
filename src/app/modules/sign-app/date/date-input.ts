import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  Optional,
  Self,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { AngularMyDatePickerDirective, IAngularMyDpOptions, IMyDate, IMyDateModel } from '@nodro7/angular-mydatepicker';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import dayjs, { Dayjs } from 'dayjs';
import { BoundBEM, makeBlockBoundBEMFunction } from '../../../common/utility-components/util-functions';
import { isColor, TypographyColors } from '../typography/typography.component';
import { LocalizationService } from '../../../services/common/localization.service';
import { getDateFormat } from '../../../services/common/localization-utils/date';

const baseClass = 'rl-date-input';

export interface DateInput {
  /** For single dates just use the "from" date */
  from?: {
    date: Dayjs;
    formatted?: string;
  };
  to?: {
    date: Dayjs;
    formatted?: string;
  };
}

@Component({
  selector: 'rl-date-input',
  styleUrls: ['./date-input.scss'],
  templateUrl: './date-input.html',
})
export class DateInputComponent implements ControlValueAccessor, OnChanges, OnInit {
  static readonly defaultOptions = Object.freeze<IAngularMyDpOptions>({
    dateRange: false,
    focusInputOnDateSelect: false,
    markCurrentDay: true,
    sunHighlight: false,
  });
  private static readonly defaultStylesDataStyles = `
        {{selector}} .myDpDisabled {
            background: #f7f7f8;
            cursor: default;
            color: #666;
        }
        {{selector}} .myDpSelectedDay {
            background-color: #d68021;
        }
        {{selector}} .ng-mydp {
            margin-left: {{leftMarginValue}}px;
            position: absolute;
            top: {{topPositionValue}};
            z-index: 5;
        }
    `; // this z-index cannot reuse rlDatepickerLayer:../styles/_variables.scss without CSS Modules

  private static readonly DATEPICKER_SIDE_LENGTH = 266;
  private static readonly MINIMAL_MARGIN = 5;
  private static readonly INPUT_HEIGHT_AS_PERCENT = 0.05;

  @Input()
  color: TypographyColors;
  @Input('control-id')
  id: string | null;
  /** Only needed if you don't want to use the locale in the LocalizationService */
  @Input()
  locale: string;
  @Input()
  dateFormat: string;
  @Input()
  options: IAngularMyDpOptions;

  @ViewChild(AngularMyDatePickerDirective)
  readonly datePicker: AngularMyDatePickerDirective;

  private elementRef: ElementRef;

  readonly bem: BoundBEM;
  /** For the inline picker mode. It gets the value from the [value] input otherwise */
  dateModel: IMyDateModel;
  get invalid(): boolean {
    return this.ngControl.invalid;
  }
  private onChangeFn: (date: DateInput) => void;
  private onTouchFn: () => void;

  constructor(
    localizationService: LocalizationService,
    @Self() @Optional() private readonly ngControl: NgControl,
    elementRef: ElementRef
  ) {
    this.bem = makeBlockBoundBEMFunction(baseClass);
    this.color = 'secondary';
    this.id = null;
    this.locale = localizationService.localize.region;
    this.dateModel = {
      isRange: false,
    };
    this.onChangeFn = () => {};
    this.onTouchFn = () => {};

    if (ngControl) {
      ngControl.valueAccessor = this;
    }

    this.elementRef = elementRef;
  }

  calendarIconClick(): void {
    this.datePicker.toggleCalendar();
  }

  inputFocus(): void {
    this.datePicker.openCalendar();
  }

  onDateChange(date: Dayjs | IMyDateModel | undefined): void {
    // this could be called from the rl-quick-date directive or the angular-mydatepicker directive
    // so it will either be a Moment or an IMyDateModel
    if (date === undefined) {
      this.onChangeFn(undefined);
    }
    if (!dayjs.isDayjs(date)) {
      if (date.isRange) {
        return this.onChange(
          dayjs(date.dateRange.beginJsDate).locale(this.locale),
          dayjs(date.dateRange.endJsDate).locale(this.locale)
        );
      }
      return this.onDateChange(dayjs(date.singleDate.jsDate).locale(this.locale));
    }
    return this.onChange(date);
  }

  private onChange(from: Dayjs | undefined, to?: Dayjs | undefined): void {
    if (this.options.dateRange && to) {
      this.onChangeFn({
        from: {
          date: from,
          formatted: from.format(this.dateFormat),
        },
        to: {
          date: to,
          formatted: to.format(this.dateFormat),
        },
      });
    } else {
      this.onChangeFn({
        from: {
          date: from,
          formatted: from.format(this.dateFormat),
        },
      });
    }
  }

  private calculateLeftMargin(): number {
    const { x } = this.elementRef.nativeElement.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    if (x + DateInputComponent.DATEPICKER_SIDE_LENGTH > windowWidth) {
      // added value so datepicker border doesn't touch screen edge
      return windowWidth - (x + DateInputComponent.DATEPICKER_SIDE_LENGTH + DateInputComponent.MINIMAL_MARGIN);
    }

    return 0;
  }

  private calculateTopPosition(): string {
    const { top } = this.elementRef.nativeElement.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const topBarHeight = document.getElementsByClassName('content-wrapper')[0].getBoundingClientRect().height;
    const calculatedInputHeight = DateInputComponent.INPUT_HEIGHT_AS_PERCENT * windowHeight;
    // if input is closer to top edge then size of datepicker + some margin + 5% height (input height)
    // show datepicker below input +1 px so borders dont overlap
    if (
      top - topBarHeight <
      DateInputComponent.DATEPICKER_SIDE_LENGTH + DateInputComponent.MINIMAL_MARGIN + calculatedInputHeight
    ) {
      // if datepicker cannot fit below input and has to overlay it
      if (
        DateInputComponent.DATEPICKER_SIDE_LENGTH + calculatedInputHeight >
        windowHeight - top - calculatedInputHeight
      ) {
        // place datepicker top of page view
        return `${-(top - topBarHeight) + calculatedInputHeight}px`;
      }

      // place datepicker below input, 1 px so borders do not overlap
      return 'calc(100% + 1px)';
    }

    // otherwise display datepicker above input + 1px so borders dont overlap
    return `-${DateInputComponent.DATEPICKER_SIDE_LENGTH + 1}px`;
  }

  /**
   * Smoosh the default styles together with any custom styles in the Options object.
   *
   * Since the styles are CSS any styles in the parameter should cascade and override the defaults
   */
  private makeStylesData(
    stylesDataInput: IAngularMyDpOptions['stylesData'] | undefined
  ): IAngularMyDpOptions['stylesData'] {
    const selector = (stylesDataInput && stylesDataInput.selector) || this.id;
    const defaultStyles = DateInputComponent.defaultStylesDataStyles
      .replace(/{{selector}}/g, selector ? `.${selector}` : '')
      .replace(/{{leftMarginValue}}/g, this.calculateLeftMargin().toString())
      .replace(/{{topPositionValue}}/g, this.calculateTopPosition());
    return {
      selector,
      styles: `${defaultStyles} ${stylesDataInput && stylesDataInput.styles}`,
    };
  }

  ngOnChanges({ color, id, locale, options }: SimpleChanges): void {
    if (color) {
      if (color.currentValue && isColor(color.currentValue)) {
        this.color = color.currentValue;
      } else {
        this.color = 'secondary';
      }
    }
    if (id) {
      this.id = id.currentValue || null;
    }
    if (options) {
      this.options = {
        ...DateInputComponent.defaultOptions,
        dateFormat: this.dateFormat.toLowerCase(),
        ...(options.currentValue || {}),
        stylesData: this.makeStylesData(
          options.currentValue && (options.currentValue as IAngularMyDpOptions).stylesData
        ),
      };
      this.dateModel = {
        ...this.dateModel,
        isRange: !!this.options.dateRange,
      };
    }
    if (locale) {
      this.locale = locale.currentValue;
      this.dateFormat = getDateFormat(locale.currentValue);
      this.options = {
        ...this.options,
        dateFormat: this.dateFormat.toLowerCase(),
      };
    }
  }

  ngOnInit(): void {
    if (this.options === undefined) {
      this.options = {
        ...DateInputComponent.defaultOptions,
        stylesData: this.makeStylesData(undefined),
      };
    }
    if (this.ngControl) {
      this.writeValue(this.ngControl.value);
    }
  }

  registerOnChange(fn: () => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchFn = fn;
  }

  writeValue(date: string | DateInput): void {
    if (typeof date === 'string') {
      const newDate = dayjs(date, this.dateFormat).locale(this.locale);
      if (newDate.isValid()) {
        this.writeValue({
          from: {
            date: newDate,
            formatted: newDate.format(this.dateFormat),
          },
        });
      } else {
        this.dateModel = {
          isRange: this.dateModel.isRange,
        };
      }
    } else if (date.from) {
      const from: IMyDate = {
        year: date.from.date.year(),
        month: date.from.date.month() + 1,
        day: date.from.date.date(),
      };
      if (date.to) {
        this.dateModel = {
          isRange: this.dateModel.isRange,
          dateRange: {
            beginDate: from,
            endDate: {
              year: date.from.date.year(),
              month: date.from.date.month() + 1,
              day: date.from.date.date(),
            },
          },
        };
      } else {
        this.dateModel = {
          isRange: this.dateModel.isRange,
          singleDate: {
            date: from,
          },
        };
      }
    }
  }
}
