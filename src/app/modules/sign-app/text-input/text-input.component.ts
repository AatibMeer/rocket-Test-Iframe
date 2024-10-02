import {
  AfterContentChecked,
  AfterContentInit,
  Component,
  ContentChild,
  ElementRef,
  HostBinding,
  Input,
  OnDestroy,
  Optional,
  Renderer2,
  ViewEncapsulation,
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { fromEvent, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { bem } from '../../../common/utility-components/util-functions';
import { DiffidentClassHelper } from '../../../common/utility-components/class/diffident-class.directive';
import { TypographyColors } from '../typography/typography.component';

const baseClass = 'rl-text-input';

@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'rl-text-input',
  template: '<ng-content></ng-content>',
  styleUrls: ['./text-input.component.scss'],
})
export class TextInputComponent implements AfterContentChecked, AfterContentInit, OnDestroy {
  @ContentChild('append')
  readonly appendRef: ElementRef;
  private appendClassHelper: DiffidentClassHelper;
  get appendClassnames(): string {
    return bem(baseClass, 'appendage');
  }
  @Input()
  color: TypographyColors;
  private disabled: boolean;
  private readonly destroy: Subject<void>;
  @Input('class')
  private existingClassnames: string;
  private hasFocus: boolean;
  private inputClassHelper: DiffidentClassHelper;
  get inputClassnames(): string {
    return bem(baseClass, 'input', {
      'has-appendage': !!this.appendRef,
      'has-prependage': !!this.prependRef,
    });
  }
  @ContentChild('input')
  readonly inputRef: ElementRef;
  private readonly onBlur: () => void;
  private readonly onFocus: () => void;
  @ContentChild('prepend')
  readonly prependRef: ElementRef;
  private prependClassHelper: DiffidentClassHelper;
  get prependClassnames(): string {
    return bem(baseClass, 'prependage');
  }
  @HostBinding('class')
  get rootClassnames(): string {
    const classname = bem(baseClass, {
      [`color-${this.color}`]: true,
      disabled: this.disabled,
      'has-focus': this.hasFocus,
    });
    return this.existingClassnames ? `${classname} ${this.existingClassnames}` : classname;
  }

  constructor(private readonly renderer: Renderer2, @Optional() private readonly ngControl: NgControl) {
    this.color = 'secondary';
    this.disabled = false;
    this.destroy = new Subject<void>();
    this.hasFocus = false;
    this.onBlur = () => {
      this.hasFocus = false;
    };
    this.onFocus = () => {
      this.hasFocus = true;
    };
  }

  ngAfterContentChecked(): void {
    this.disabled = this.ngControl?.disabled ?? false;
    if (this.inputRef) {
      this.hasFocus = this.inputRef.nativeElement === document.activeElement;
      this.inputClassHelper = new DiffidentClassHelper(this.inputRef, this.renderer);
      this.inputClassHelper.setClassnames(this.inputClassnames);
    }
    if (this.appendRef) {
      this.appendClassHelper = new DiffidentClassHelper(this.appendRef, this.renderer);
      this.appendClassHelper.setClassnames(this.appendClassnames);
    }
    if (this.prependRef) {
      this.prependClassHelper = new DiffidentClassHelper(this.prependRef, this.renderer);
      this.prependClassHelper.setClassnames(this.prependClassnames);
    }
  }

  ngAfterContentInit(): void {
    if (this.inputRef?.nativeElement) {
      fromEvent(this.inputRef.nativeElement, 'blur')
        .pipe(takeUntil(this.destroy))
        .subscribe(() => this.onBlur());
      fromEvent(this.inputRef.nativeElement, 'focus')
        .pipe(takeUntil(this.destroy))
        .subscribe(() => this.onFocus());
    }
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }
}
