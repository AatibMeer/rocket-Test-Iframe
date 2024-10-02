import { NgModule } from '@angular/core';
import { InclusivelyHiddenDirective } from './inclusively-hidden.directive';

@NgModule({
  declarations: [InclusivelyHiddenDirective],
  exports: [InclusivelyHiddenDirective],
})
export class InclusivelyHiddenModule {}
