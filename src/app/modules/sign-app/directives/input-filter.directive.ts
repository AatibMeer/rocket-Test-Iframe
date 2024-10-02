import {
  AfterViewInit,
  Directive,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Renderer2,
  SimpleChanges,
} from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import { fromEvent, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * When creating a filter function, limit the condition to only filtering invalid characters. Don't try to enforce
 * patterns or complex logic with could interfere with the normal editing of input data.
 * The filter should pass at *any* point in the typing of the data (being in the process of typing a decimal number, for
 * example, will produce "12." which *must* be accepted so the user can proceed to enter "12.34").
 * Users generally get no feedback when their input is ignored, so don't confuse them.
 */
type FilterFn = (proposedValue: string, oldValue?: string, element?: HTMLInputElement | undefined) => boolean;
type FilterType = 'blacklist' | 'whitelist';
type PredefinedFilterFn = 'alphaNumeric' | 'alphaNumericWithSpaces' | 'number' | 'numeric' | 'numericWithSpaces';

const noOp = () => {
  // nothing
};

const patterns: Readonly<Record<PredefinedFilterFn, string>> = {
  alphaNumeric: '^\\w+$',
  alphaNumericWithSpaces: '^\\w[\\w ]*$',
  // digit, or a "." which is not followed by another "." (nb. you can parseFloat "1.2.3" but not "1..2")
  number: '^(?:(?:\\d|\\.(?!\\.))+|-(?:\\d|\\.(?!\\.))*)$',
  numeric: '^\\d+$',
  numericWithSpaces: '^\\d[\\d ]*$',
};

const getFilterFn = (filterFn: PredefinedFilterFn): FilterFn => {
  const regExp = new RegExp(patterns[filterFn]);
  return (value) => regExp.test(value);
};

@Directive({
  selector: 'input:not([type=checkbox])[rlInputFilter],textarea[rlInputFilter]',
})
export class InputFilterDirective implements ControlValueAccessor, AfterViewInit, OnChanges, OnDestroy {
  // you can use these in your custom filter function. The RegExp is created once, so they aren't expensive.
  public static readonly predefinedFilterFns: Record<PredefinedFilterFn, FilterFn> = {
    get alphaNumeric() {
      return getFilterFn('alphaNumeric');
    },
    get alphaNumericWithSpaces() {
      return getFilterFn('alphaNumericWithSpaces');
    },
    get number() {
      return getFilterFn('number');
    },
    get numeric() {
      return getFilterFn('numeric');
    },
    get numericWithSpaces() {
      return getFilterFn('numericWithSpaces');
    },
  };

  @Input('rlInputFilter')
  set filters(filters: PredefinedFilterFn | FilterFn | FilterFn[]) {
    if (Array.isArray(filters)) {
      this.filtersArray = filters;
    } else if (typeof filters === 'function') {
      this.filtersArray = [filters];
    } else if (InputFilterDirective.predefinedFilterFns[filters]) {
      this.filtersArray = [InputFilterDirective.predefinedFilterFns[filters]];
    } else {
      this.filtersArray = [];
    }
  }

  @Input()
  filterType: FilterType = 'whitelist';

  private readonly destroy = new Subject<void>();
  private onChange: (value: unknown) => void = noOp;
  private onTouch: () => void = noOp;
  private filtersArray: FilterFn[] = [];
  private previousValue = '';

  private static isFilterType(candidate: unknown): candidate is FilterType {
    return candidate === 'blacklist' || candidate === 'whitelist';
  }

  constructor(private readonly elementRef: ElementRef, private readonly renderer: Renderer2) {}

  ngOnChanges({ filterType }: SimpleChanges): void {
    if (filterType) {
      this.filterType = InputFilterDirective.isFilterType(filterType.currentValue)
        ? filterType.currentValue
        : 'whitelist';
    }
  }

  ngAfterViewInit(): void {
    fromEvent(this.elementRef.nativeElement, 'input')
      .pipe(takeUntil(this.destroy))
      .subscribe(($event: InputEvent) => {
        const value = this.getValue(($event.target as HTMLInputElement).value);
        this.onChange(value);
        this.previousValue = value;
      });
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }

  @HostListener('beforeinput', ['$event'])
  beforeInput($event: InputEvent): boolean {
    if ($event.inputType.startsWith('delete')) {
      return true; // deletes are always allowed
    }
    const element = $event.target as HTMLInputElement;
    const newValue = `${element.value.slice(0, element.selectionStart)}${$event.data ?? ''}${element.value.slice(
      element.selectionEnd
    )}`;
    return this.isPermittedValue(newValue);
  }

  isPermittedValue(value: string): boolean {
    const element: HTMLInputElement | undefined = this.elementRef?.nativeElement;
    const passedFilters = this.filtersArray.every((filter) => {
      return filter(value, element?.value, element);
    });
    if (this.filterType === 'whitelist') {
      return passedFilters;
    }
    return !passedFilters;
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouch = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (this.elementRef?.nativeElement) {
      this.renderer.setProperty(this.elementRef.nativeElement, 'disabled', isDisabled);
    }
  }

  writeValue(obj: unknown): void {
    if (this.elementRef?.nativeElement) {
      this.previousValue = this.getValue(obj);
      this.renderer.setProperty(this.elementRef.nativeElement, 'value', this.previousValue);
    }
  }

  private getValue(obj: unknown): string {
    if (obj === null || obj === undefined || obj === '' || typeof obj !== 'string') {
      return '';
    }
    if (this.isPermittedValue(obj)) {
      return obj;
    }
    return this.previousValue ?? '';
  }
}
