import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { fadeInOut, modalScaleInOut } from '../../../animations/animations';
import { ModalControlService } from '../../../services/sign-app/modal-control.service';
import { HowItWorksModalComponent } from './how-it-works-modal.component';

@Component({
    selector: 'repositioning-demo-modal',
    templateUrl: './repositioning-demo-modal.component.html',
    styleUrls: ['./repositioning-demo-modal.component.scss'],
    animations: [modalScaleInOut, fadeInOut]
})
export class RepositioningDemoModalComponent extends HowItWorksModalComponent {
    constructor(modalControlService: ModalControlService, translateService: TranslateService) {
        super(modalControlService, translateService)
    }
}