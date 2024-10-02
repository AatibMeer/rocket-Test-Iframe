import {DebugElement, Directive, HostBinding, Input, Predicate} from '@angular/core';
import {By} from '@angular/platform-browser';

// if you change either of these, don't forget to change:
// * the selector for this directive
// * the makeSelector function in the Java ByTestDirective class (Selenium tests)
// * the getByDataTestId and getByDataTestIds functions in testUtils (Playwright tests)
const selector = 'rl-test';
const hostAttribute = 'data-test-id';

/**
 * A hook for e2e and/or integration tests. To add multiple IDs (to mark all parties with a common ID and individual
 * parties with a unique ID, for example) use a whitespace-separated list of IDs.
 *
 * This label shouldn't change over time so that tests become independent of layout or ephemeral attributes.
 * Look for [data-test-id] because [rl-test] and [ng-reflect-label] will not necessarily be on all elements
 */
@Directive({
    selector: '[rl-test]' // if you use a variable here it confuses the IDE
})
export class TestDirective {
    @HostBinding(`attr.${hostAttribute}`)
    private _label: string;
    get label() {
        return this._label;
    }
    @Input('rl-test')
    set label(id: string) {
        this._label = id;
    }
}

/**
 * Makes a selector which will match an element where the rl-test input contains the <code>id</code>.
 */
export function makeDirectiveSelector(id: string): string {
    return `[${hostAttribute}~="${id}"]`;
}

/**
 * Creates a Predicate for use with TestBed's DebugElement query.
 * This will work whether or not the TestDirective is in the TestBed declarations array.
 * @see makeDirectiveSelector
 */
export function byTestDirective(id: string): Predicate<DebugElement> {
    return By.css(`${makeDirectiveSelector(id)},[${selector}~="${id}"]`);
}
