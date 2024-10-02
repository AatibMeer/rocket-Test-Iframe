import {Component, HostBinding, Input} from '@angular/core';
import {bem, makeBlockBoundBEMFunction} from '../util-functions';

const baseClass = 'rl-lightbox';

@Component({
    selector: 'rl-lightbox',
    styleUrls: ['./lightbox.component.scss'],
    templateUrl: './lightbox.component.html'
})
export class LightboxComponent {
    readonly bem = makeBlockBoundBEMFunction(baseClass);

    @HostBinding('class')
    get baseClassnames(): string {
        return bem(baseClass, {
            visible: this.visible
        });
    }

    private _visible = false;
    get visible(): boolean {
        return this._visible;
    }
    @Input()
    set visible(visible: boolean | null | undefined) {
        this._visible = !!visible;
    }
}
