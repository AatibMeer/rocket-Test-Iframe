import {
    AfterViewInit,
    Directive,
    ElementRef,
    Inject,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Renderer2,
    SimpleChanges
} from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {Subject} from 'rxjs';
import {take} from 'rxjs/operators';

type Group =
    | 'everyone'
    | 'visualOnly'
    | 'assistiveOnly'
    | 'none';
const groups: ReadonlyArray<Group> = [
    'everyone',
    'visualOnly',
    'assistiveOnly',
    'none',
];
function isGroup(candidate: any): candidate is Group {
    return groups.indexOf(candidate) > -1;
}

/**
 * A directive to take the RSI out of a11y and hiding content from certain groups.
 *
 * The default directive value is "visualOnly" which will hide the content for visual users whilst keeping it available
 * for assistive tech (AT).
 * "assistiveOnly" will hide the content from ATs whilst keeping it visible.
 * "everyone" will hide it for everyone (unless you are dynamically switching this value you should use [hidden] or *ngIf)
 * "none" keeps the content as-is.
 *
 * This way you don't need to remember all the CSS rules for maintaining accessibility or keep global classes/mixins on hand
 */
@Directive({
    selector: `[rl-inclusively-hidden]`
})
export class InclusivelyHiddenDirective implements AfterViewInit, OnChanges, OnDestroy, OnInit {
    static readonly defaultGroup: Group = 'visualOnly';
    private readonly stylesheetID: string;
    static readonly styleID = 'rl-inclusively-hidden-at-stylesheet';
    static readonly everybodyClassName = 'rl-ih-hide-for-all';
    static readonly visualOnlyClassName = 'rl-ih-atOnly';

    @Input('rl-inclusively-hidden')
    for: Group;

    private readonly destroy: Subject<void>;
    private viewInitialised: boolean;

    constructor(
        private readonly elementRef: ElementRef,
        private readonly renderer: Renderer2,
        @Inject(DOCUMENT) private document: HTMLDocument
    ) {
        this.for = InclusivelyHiddenDirective.defaultGroup;
        this.destroy = new Subject<void>();
        this.viewInitialised = false;

        const blank = new Array(8);
        for (let i = 0; i < blank.length; i += 1) {
            blank[i] = (Math.random() * 16 | 0).toString(16);
        }
        this.stylesheetID = `${InclusivelyHiddenDirective.styleID}-${blank.join('')}`;
    }

    ngAfterViewInit(): void {
        this.viewInitialised = true;
        this.updateNewVisibility();
    }

    ngOnChanges({for: hiddenForGroup}: SimpleChanges) {
        if (hiddenForGroup) {
            this.setForGroup(hiddenForGroup.currentValue, hiddenForGroup.previousValue);
        }
    }

    ngOnDestroy(): void {
        this.destroy.next();
    }

    ngOnInit(): void {
        // directives can't have styles in Angular, so attach our own!
        const stylesheetExists = this.document.querySelector(`style#${this.stylesheetID}`) !== null;
        if (!stylesheetExists) {
            const style = this.createStyleSheet();
            this.renderer.appendChild(this.document.head, style);
            this.destroy.pipe(
                take(1)
            ).subscribe(() => this.renderer.removeChild(this.document.head, style));
        }
    }

    private createStyleSheet(): HTMLStyleElement {
        const style = this.renderer.createElement('style') as HTMLStyleElement;
        this.renderer.setProperty(style, 'type', 'text/css');
        this.renderer.setProperty(style, 'id', this.stylesheetID);
        const fullIdentifier = `.${InclusivelyHiddenDirective.visualOnlyClassName}:not(:focus):not(:active)`;
        style.innerText = `${fullIdentifier}{clip:rect(0 0 0 0);clip-path:inset(50%);height:1px;overflow:hidden;position:absolute;white-space:nowrap;width:1px}.${InclusivelyHiddenDirective.everybodyClassName}{display:none};`;
        return style;
    }

    private setForGroup(group: any, oldGroup?: any): void {
        if (oldGroup) {
            isGroup(oldGroup) ? this.updateOldVisibility(oldGroup) : this.updateOldVisibility(InclusivelyHiddenDirective.defaultGroup);
        }
        this.for = isGroup(group) ? group : InclusivelyHiddenDirective.defaultGroup;
        this.updateNewVisibility();
    }

    private updateNewVisibility(): void {
        if (this.viewInitialised) {
            const nativeElement: HTMLElement = this.elementRef.nativeElement;
            try {
                if (this.for === 'everyone') {
                    // display: none
                    this.renderer.addClass(nativeElement, InclusivelyHiddenDirective.everybodyClassName);
                } else if (this.for === 'assistiveOnly') {
                    // aria-hidden
                    this.renderer.setAttribute(nativeElement, 'aria-hidden', 'true');
                } else if (this.for === 'visualOnly') {
                    // CSS to hide
                    this.renderer.addClass(nativeElement, InclusivelyHiddenDirective.visualOnlyClassName);
                }
            } catch (error: any) {
                if (error instanceof TypeError && nativeElement?.nodeType !== Node.ELEMENT_NODE) {
                    console?.warn('You tried to use rl-inclusively-hidden on something which did not produce an Element ' +
                        `node. Actual type was "${nativeElement?.nodeType}"` +
                        `${nativeElement?.nodeType === Node.COMMENT_NODE ? ' (a comment node)' : ''}. Did you try to ` +
                        'use it with an <ng-container> or something similar? The element must exist to add classes or attributes.');
                }
                throw error;
            }
        }
    }

    /**
     * Clean up old group modifications
     */
    private updateOldVisibility(oldGroup: Group): void {
        const nativeElement: HTMLElement = this.elementRef.nativeElement;
        if (oldGroup === 'everyone') {
            // display: none
            this.renderer.removeClass(nativeElement, InclusivelyHiddenDirective.everybodyClassName);
        } else if (oldGroup === 'assistiveOnly') {
            // aria-hidden
            this.renderer.setAttribute(nativeElement, 'aria-hidden', 'false');
        } else if (oldGroup === 'visualOnly') {
            // CSS to hide
            this.renderer.removeClass(nativeElement, InclusivelyHiddenDirective.visualOnlyClassName);
        }
    }
}
