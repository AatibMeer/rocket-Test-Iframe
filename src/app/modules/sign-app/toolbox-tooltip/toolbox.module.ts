import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToolboxTooltipComponent } from './toolbox-tooltip.component';
import { CommuteModule } from '../../../common/utility-components/commute/commute.module';

@NgModule({
  imports: [CommonModule, CommuteModule],
  declarations: [ToolboxTooltipComponent],
  exports: [ToolboxTooltipComponent],
})
export class ToolboxTooltipModule {}
