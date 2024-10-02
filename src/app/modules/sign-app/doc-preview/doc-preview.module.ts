import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { InputModule } from '../user-input/input.module';
import { ToolboxTooltipModule } from '../toolbox-tooltip/toolbox.module';
import { DocPreviewComponent } from './doc-preview.component';
import { NewInputModule } from '../new-input/new-input.module';
import { CommuteModule } from '../../../common/utility-components/commute/commute.module';
import { NewInputComponent } from '../new-input/new-input.component';
import { DocPreviewControlService } from './doc-preview.service';
import { ClickOutsideDirective, ClickOutsideModule } from '../directives/clickOutside.directive';

@NgModule({
  imports: [CommonModule, InputModule, ToolboxTooltipModule, NewInputModule, CommuteModule, ClickOutsideModule],
  declarations: [DocPreviewComponent],
  providers: [DocPreviewControlService],
  exports: [DocPreviewComponent],
})
export class DocPreviewModule {}
