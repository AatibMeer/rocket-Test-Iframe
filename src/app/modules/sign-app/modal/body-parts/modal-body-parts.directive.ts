import {Directive, ElementRef, Input, OnChanges, Optional, Renderer2, SimpleChanges} from '@angular/core';
import {ClassInput, DiffidentClassHelper} from '../../../../common/utility-components/class/diffident-class.directive';

export type BodyPart =
    | 'heroText' // gives extra vertical padding
    | 'regularContent' // standard vertical padding
    | 'actionsContainer' // like container but can re-order the action buttons properly + vertical padding
    | 'container' // creates a new column layout
    | 'interestPanel' // like container with grey background and modal padding busting + vertical padding
    | 'primaryAction' // button
    | 'secondaryAction' // button
    | 'tertiaryButton' // button
;

function makeClassname(bodyPart: BodyPart): string {
    return bodyPart ? `rl-modal-body-part__${bodyPart}` : '';
}

/**
 * Type safe labelling of modal body parts.
 *
 * It just adds classnames to the host element but this should lay out the elements according to the modal designs
 */
@Directive({
    selector: '[rl-modal-body-part]'
})
export class ModalBodyPartsDirective implements OnChanges {
    private readonly classHelper: DiffidentClassHelper;
    @Input('class')
    externalClassnames: ClassInput;
    @Input('rl-modal-body-part')
    part: BodyPart | undefined;

    constructor(elementRef: ElementRef, renderer: Renderer2, @Optional() classHelper: DiffidentClassHelper) {
        this.classHelper = classHelper || new DiffidentClassHelper(elementRef, renderer);
    }

    ngOnChanges({externalClassnames, part}: SimpleChanges) {
        if (part) {
            this.classHelper.setClassnames(makeClassname(part.currentValue), makeClassname(part.previousValue));
        }
        if (externalClassnames) {
            this.classHelper.setClassnames(externalClassnames.currentValue, externalClassnames.previousValue);
        }
    }
}
