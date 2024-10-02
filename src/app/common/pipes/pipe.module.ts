import { NgModule } from '@angular/core';
import { AcronymPipe } from './acronym.pipe';

@NgModule({
  imports: [],
  declarations: [AcronymPipe],

  exports: [AcronymPipe],
})
export class PipeModule {}
