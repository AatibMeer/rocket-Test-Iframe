import {Component, ViewEncapsulation} from '@angular/core';

@Component({
    encapsulation: ViewEncapsulation.None,
    selector: '[rlGrid]',
    styleUrls: ['./grid.component.scss'],
    template: '<ng-content></ng-content>'
})
export class GridComponent {}
