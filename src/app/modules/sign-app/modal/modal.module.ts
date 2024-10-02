import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ModalHeaderComponent } from './modal-header.component';
import { ModalComponent, ModalDescriptionDirective, ModalTitleDirective } from './modal.component';
import { ModalHeaderCloseComponent } from './widgets/close/modal-header-close.component';
import { ModalFooterComponent } from './modal-footer.component';
import { LightboxComponent } from '../../../common/utility-components/lightbox/lightbox.component';
import { ModalBodyComponent } from './modal-body.component';
import { AvatarComponent } from '../avatar/avatar.component';
import { ModalHeaderBackComponent } from './widgets/back/modal-header-back.component';
import { ModalBodyPartsDirective } from './body-parts/modal-body-parts.directive';
import { ModalTransitionDirective } from './modal-transition.directive';
import { ModalHeaderWidgetDirective } from './modal-header-widget.directive';
import { ModalHeaderBrandedComponent } from '../modal-header-branded/modal-header-branded.component';
import { CommuteModule } from '../../../common/utility-components/commute/commute.module';
import { InclusivelyHiddenModule } from '../utility/accessibility/inclusively-hidden-module';
import { GridComponent } from './grid/grid.component';
import { TestDirectiveModule } from '../test-directive.module';

@NgModule({
  imports: [CommonModule, CommuteModule, InclusivelyHiddenModule, TestDirectiveModule],
  declarations: [
    ModalBodyPartsDirective,
    ModalHeaderComponent,
    ModalHeaderCloseComponent,
    ModalHeaderWidgetDirective,
    ModalHeaderBrandedComponent,
    ModalComponent,
    ModalFooterComponent,
    LightboxComponent,
    ModalBodyComponent,
    AvatarComponent,
    ModalHeaderBackComponent,
    ModalTitleDirective,
    ModalDescriptionDirective,
    ModalTransitionDirective,
    GridComponent,
  ],
  exports: [
    ModalHeaderComponent,
    ModalBodyPartsDirective,
    ModalComponent,
    ModalHeaderCloseComponent,
    ModalFooterComponent,
    LightboxComponent,
    ModalBodyComponent,
    AvatarComponent,
    ModalHeaderBackComponent,
    ModalTitleDirective,
    ModalDescriptionDirective,
    ModalTransitionDirective,
    ModalHeaderWidgetDirective,
    ModalHeaderBrandedComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class GeneralModalModule {}
