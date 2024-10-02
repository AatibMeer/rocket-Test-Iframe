import {
  Component,
  ContentChild,
  Input,
  OnChanges,
  OnInit,
  Optional,
  Self,
  SimpleChanges,
  TemplateRef,
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { bem } from '../../../common/utility-components/util-functions';

const baseClass = 'rl-input';

export interface InputState {
  dirty: boolean;
  disabled: boolean;
  invalid: boolean;
  pending: boolean;
  pristine: boolean;
  touched: boolean;
}

@Component({
  selector: 'rlng-input',
  styleUrls: ['./input.component.scss'],
  templateUrl: './input.component.html',
})
export class InputComponent implements ControlValueAccessor, OnChanges, OnInit {
  get controlClassnames(): string {
    return bem(baseClass, 'control', this.state);
  }
  get dirty(): boolean {
    return this.ngControl && this.ngControl.dirty;
  }
  get disabled(): boolean {
    return this.ngControl && this.ngControl.disabled;
  }
  @Input('control-id')
  id: string | undefined;
  get invalid(): boolean {
    return this.ngControl && this.ngControl.invalid && (this.dirty || this.touched);
  }
  @ContentChild('label')
  labelRef: TemplateRef<unknown>;
  get labelClassnames(): string {
    return bem(baseClass, 'label', this.state);
  }
  @ContentChild('messages')
  messagesRef: TemplateRef<unknown>;
  get messagesClassnames(): string {
    return bem(baseClass, 'messages', this.state);
  }
  get messagesID(): string {
    return `${this.id}-messages`;
  }
  private readonly ngControl: NgControl;
  get pending(): boolean {
    return this.ngControl && this.ngControl.pending;
  }
  get pristine(): boolean {
    return this.ngControl && this.ngControl.pristine;
  }
  get rootClassnames(): string {
    return bem(baseClass, this.state);
  }
  get state(): InputState {
    return {
      dirty: this.dirty,
      disabled: this.disabled,
      invalid: this.invalid,
      pending: this.pending,
      pristine: this.pristine,
      touched: this.touched,
    };
  }
  get touched(): boolean {
    return this.ngControl && this.ngControl.touched;
  }

  constructor(@Self() @Optional() ngControl: NgControl) {
    if (ngControl) {
      // eslint-disable-next-line no-param-reassign
      ngControl.valueAccessor = this;
      this.ngControl = ngControl;
    }
  }

  private checkID(id: string | undefined): void {
    const needsID = this.labelRef || this.messagesRef;
    if (needsID && !id) {
      throw new TypeError(
        `The input "control-id" is required when ${this.constructor.name} is used with a label or description`
      );
    }
  }

  ngOnChanges({ id }: SimpleChanges): void {
    if (id) {
      this.checkID(id.currentValue);
    }
  }

  ngOnInit(): void {
    this.checkID(this.id);
  }

  showErrorMessage(
    validator: string,
    excludeIfPresent: string[] = [],
    control: Pick<NgControl, 'dirty' | 'errors' | 'touched'> = this.ngControl
  ): boolean {
    if (control) {
      const { dirty, errors, touched } = control;
      return !!(
        errors &&
        errors[validator] &&
        (dirty || touched) &&
        !excludeIfPresent.find((exclusion) => {
          return !!errors[exclusion];
        })
      );
    }
    return false;
  }

  // these methods from ControlValueAccessor aren't required since we're not going to interact with the control
  // TODO remove ControlValueAccessor and use injection instead
  // eslint-disable-next-line class-methods-use-this
  registerOnChange(fn: any): void {
    /* nothing */
  }
  // eslint-disable-next-line class-methods-use-this
  registerOnTouched(fn: any): void {
    /* nothing */
  }
  // eslint-disable-next-line class-methods-use-this
  setDisabledState(isDisabled: boolean): void {
    /* nothing */
  }
  // eslint-disable-next-line class-methods-use-this
  writeValue(obj: any): void {
    /* nothing */
  }
}
