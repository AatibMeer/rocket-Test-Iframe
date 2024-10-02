import {AfterContentInit, ContentChildren, Directive, ElementRef, OnDestroy, QueryList} from '@angular/core';
import {PartyComponent} from './party.component';
import {Subject, fromEvent} from 'rxjs';
import {filter, map, takeUntil} from 'rxjs/operators';

// noinspection JSMismatchedCollectionQueryUpdate
/**
 * Directive to allow keyboard-accessible navigation of Party components used as radio inputs
 */
@Directive({
    selector: '[rl-party-group]'
})
export class PartyGroupDirective implements AfterContentInit, OnDestroy {
    private readonly destroy = new Subject<void>();
    @ContentChildren(PartyComponent, {descendants: true})
    private readonly parties: QueryList<PartyComponent>;
    @ContentChildren(PartyComponent, {descendants: true, read: ElementRef})
    private readonly partyElements: QueryList<ElementRef>;

    ngAfterContentInit(): void {
        const radioElements = this.partyElements.toArray().map<HTMLElement | null>((root) => {
            return (root.nativeElement as HTMLElement).querySelector('[role="radio"]');
        });
        const partyComponents = this.parties.toArray();
        for (let i = 0; i < partyComponents.length; i += 1) {
            if (radioElements[i] === null) {
                continue;
            }
            fromEvent(radioElements[i], 'keydown').pipe(
                takeUntil(this.destroy),
                map(({key}: KeyboardEvent): number => {
                    if (key === 'ArrowUp' || key === 'ArrowLeft') {
                        return i === 0 ? partyComponents.length - 1 : i - 1;
                    }
                    if (key === 'ArrowDown' || key === 'ArrowRight') {
                        return i === partyComponents.length - 1 ? 0 : i + 1;
                    }
                    return -1;
                }),
                filter((index) => index >= 0)
            ).subscribe((index) => {
                partyComponents[index].onClick.emit(partyComponents[index].party);
                radioElements[index].focus();
            });
        }
    }

    ngOnDestroy(): void {
        this.destroy.next();
    }
}
