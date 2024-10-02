import {Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {isColor, TypographyColors} from '../typography/typography.component';

@Component({
    selector: 'rl-pill',
    styleUrls: ['./pill.component.scss'],
    template: '<ng-content></ng-content>'
})
export class PillComponent implements OnChanges {
    @Input()
    color: TypographyColors = 'secondary';

    ngOnChanges({color}: SimpleChanges): void {
        if (color) {
            this.color = isColor(color.currentValue) ? color.currentValue : 'secondary';
        }
    }
}
