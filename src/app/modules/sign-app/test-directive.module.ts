import { NgModule } from '@angular/core';
import { TestDirective } from './test.directive';

@NgModule({
  declarations: [TestDirective],
  exports: [TestDirective],
})
export class TestDirectiveModule {}
