import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomButtonComponent } from './custom-button/custom-button.component';
import { CommuteModule } from '../../../common/utility-components/commute/commute.module';

@NgModule({
  imports: [CommuteModule, CommonModule],
  declarations: [CustomButtonComponent],
  exports: [CustomButtonComponent],
})
export class UtilityModule {}
