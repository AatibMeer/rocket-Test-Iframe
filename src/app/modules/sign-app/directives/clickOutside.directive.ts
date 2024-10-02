import {Directive, ElementRef, Output, EventEmitter, Inject, OnInit, OnDestroy, NgModule} from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {Subject} from 'rxjs';
import {fromEvent} from 'rxjs';
import {filter, take, takeUntil} from 'rxjs/operators';

@Directive({
    selector: '[rl-clickOutside]'
})
export class ClickOutsideDirective implements OnDestroy, OnInit {
    @Output('rl-clickOutside')
    public readonly clickOutsideChange: EventEmitter<MouseEvent>;
    private readonly destroy: Subject<void>;
    private readonly document: HTMLDocument;
    private readonly elementRef: ElementRef;
    private readonly mouseEventIsOutsideElement: (this: ClickOutsideDirective, event: MouseEvent) => boolean;

    private static mouseEventIsInsideElement(event: MouseEvent, element: HTMLElement): boolean {
        return element.contains(event.target as HTMLElement);
    }

    constructor(@Inject(DOCUMENT) document: HTMLDocument, elementRef: ElementRef) {
        this.clickOutsideChange = new EventEmitter<MouseEvent>();
        this.destroy = new Subject<void>();
        this.document = document;
        this.elementRef = elementRef;
        this.mouseEventIsOutsideElement = (event) => {
            return !ClickOutsideDirective.mouseEventIsInsideElement(event, this.elementRef.nativeElement);
        };
    }

    ngOnDestroy(): void {
        this.destroy.next();
    }

    ngOnInit() {
        // separately looking at mouseup and mousedown instead of click to:
        // * prevent cases where a mousedown causes the directive to load, so the subsequent mouseup (click) will always
        // be outside the element (this happens when modals change, for example)
        fromEvent(this.document, 'mousedown').pipe(
            filter(this.mouseEventIsOutsideElement),
            takeUntil(this.destroy)
        ).subscribe(() => {
            fromEvent(this.document, 'mouseup').pipe(
                take(1),
                takeUntil(this.destroy)
            ).subscribe((event: MouseEvent) => {
                if (this.mouseEventIsOutsideElement(event)) {
                    this.clickOutsideChange.emit(event);
                }
            });
        });
    }
}

@NgModule({
    declarations: [ClickOutsideDirective],
    exports: [ClickOutsideDirective]
})
export class ClickOutsideModule {}
