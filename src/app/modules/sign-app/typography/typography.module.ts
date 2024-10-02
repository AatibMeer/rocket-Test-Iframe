import { NgModule } from '@angular/core';
import { TypographyComponent, TypographyDirective } from './typography.component';

@NgModule({
  declarations: [TypographyDirective, TypographyComponent],
  exports: [TypographyDirective, TypographyComponent],
})
export class TypographyModule {}
