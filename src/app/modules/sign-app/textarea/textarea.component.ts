import {
    AfterContentInit,
    Component,
    ContentChild,
    ElementRef, Input,
    OnDestroy,
    Optional,
    ViewEncapsulation
} from '@angular/core';
import {NgControl} from '@angular/forms';
import {makeBlockBoundBEMFunction} from '../../../common/utility-components/util-functions';
import {Observable} from 'rxjs';
import {fromEvent, ReplaySubject, Subject} from 'rxjs';
import {map, takeUntil} from 'rxjs/operators';
import {TypographyColors} from '../typography/typography.component';

@Component({
    encapsulation: ViewEncapsulation.None,
    selector: 'rl-textarea',
    styleUrls: ['./textarea.component.scss'],
    template: `
        <div [class]="rootClassnames">
          <div [class]="bem('container')">
            <ng-content></ng-content>
          </div>
          @if (showCounter) {
            <span
              [class]="bem('counter', {oversize: maxlengthExceeded$ | async})"
              rl-typography="small"
            >{{ (maxlength > 0 ? 'textarea_component.counter_with_limit' : 'textarea_component.counter') | translate:{count: charCount$ | async, max: maxlength} }}</span>
          }
        </div>`
})
export class TextareaComponent implements AfterContentInit, OnDestroy {
    static readonly DEFAULT_MAX_LENGTH = 0;

    @Input()
    color: TypographyColors = 'secondary';

    /**
     *  Set a soft maxlength for the input. If the input is longer than this it will only turn the counter red. This
     *  number sets what shows on the counter as the maximum length. Set to 0 for no limit.
     *
     *  Setting this value will not limit the textarea input length. It will also be overridden by a maxlength attribute
     *  on the textarea. Setting a maxLength validator will have no effect on this number (since you can't detect the
     *  presence of validators)
     */
    @Input()
    set maxlength(maxlength: number) {
        this._maxlength = maxlength > 0 ? maxlength : 0;
    }
    @Input()
    showCounter = false;

    bem = makeBlockBoundBEMFunction('rl-textarea');
    charCount$: Observable<number>;
    hasFocus = false;
    get maxlength(): number {
        return this._maxlength;
    }
    readonly maxlengthExceeded$: Observable<boolean>;
    get rootClassnames(): string {
        return this.bem({
            [`color-${this.color}`]: true,
            'has-focus': this.hasFocus
        })
    }

    @ContentChild('input')
    readonly textareaRef: ElementRef;

    private readonly destroy = new Subject<void>();
    private readonly charCount = new ReplaySubject<number>(1);
    private _maxlength = TextareaComponent.DEFAULT_MAX_LENGTH;

    constructor(
        @Optional() private readonly control: NgControl
    ) {
        this.charCount$ = this.charCount.pipe();
        this.charCount.next(0);
        this.maxlengthExceeded$ = this.charCount$.pipe(
            map((count) => this.maxlengthExceeded(count))
        );
    }

    ngAfterContentInit(): void {
        if (this.textareaRef?.nativeElement?.textLength !== undefined) {
            // get input length from input after input events
            fromEvent(this.textareaRef.nativeElement, 'input').pipe(
                takeUntil(this.destroy),
                map(() => (this.textareaRef.nativeElement as HTMLTextAreaElement).textLength)
            ).subscribe((count) => this.charCount.next(count));

            fromEvent(this.textareaRef.nativeElement, 'blur').pipe(
                takeUntil(this.destroy)
            ).subscribe(() => this.hasFocus = false);
            fromEvent(this.textareaRef.nativeElement, 'focus').pipe(
                takeUntil(this.destroy)
            ).subscribe(() => this.hasFocus = true);
        }
        // also get input length from Control value (if available) when that changes
        this.control?.control?.valueChanges.pipe(
            takeUntil(this.destroy),
            map((value) => value?.length || 0)
        ).subscribe((count) => this.charCount.next(count));
        this.charCount.next(this.textareaRef?.nativeElement?.textLength ?? this.control?.control?.value?.length);

        // if there is a maxlength attribute set, use its value for the maxlength input
        if ((this.textareaRef?.nativeElement as HTMLElement)?.hasAttribute('maxlength')) {
            this._maxlength = parseInt((this.textareaRef.nativeElement as HTMLElement).getAttribute('maxlength'), 10);
            if (isNaN(this._maxlength)) {
                this._maxlength = TextareaComponent.DEFAULT_MAX_LENGTH;
            }
        }
    }

    ngOnDestroy(): void {
        this.destroy.next();
    }

    maxlengthExceeded(length): boolean {
        const maxLength = this.maxlength;
        return maxLength > 0 && length > maxLength;
    }
}
