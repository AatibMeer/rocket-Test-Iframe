import {Component, ViewEncapsulation} from '@angular/core';

const baseClass = 'rl-modal-body';

@Component({
    encapsulation: ViewEncapsulation.None,
    selector: 'rl-modal-body',
    styleUrls: ['./modal-body.component.scss'],
    template: `<div class="${baseClass}" rlGrid rl-typography><ng-content></ng-content></div>`
})
export class ModalBodyComponent {}
