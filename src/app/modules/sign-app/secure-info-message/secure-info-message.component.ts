import {Component} from '@angular/core';
import {makeBlockBoundBEMFunction} from '../../../common/utility-components/util-functions';

const baseClass = 'rl-secure-info-message';

@Component({
    selector: 'rl-secure-info-message',
    styleUrls: ['./secure-info-message.component.scss'],
    templateUrl: './secure-info-message.component.html'
})
export class SecureInfoMessageComponent {
    readonly bem = makeBlockBoundBEMFunction(baseClass);
}
