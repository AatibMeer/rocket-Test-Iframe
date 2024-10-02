import { NgModule } from '@angular/core';
import { QuickDateDirective } from './quick-date.directive';

@NgModule({
  declarations: [QuickDateDirective],
  exports: [QuickDateDirective],
})
export class UtilityDirectivesModule {}
