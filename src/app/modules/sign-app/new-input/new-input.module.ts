import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommuteModule } from '../../../common/utility-components/commute/commute.module';
import { InputTrimModule } from '../../trim.module';
import { NewInputComponent } from './new-input.component';
import { Ng2FitTextModule } from '../directives/fitText.module';

@NgModule({
  imports: [CommonModule, CommuteModule, FormsModule, InputTrimModule, Ng2FitTextModule],
  declarations: [NewInputComponent],
  exports: [NewInputComponent],
  providers: [],
})
export class NewInputModule {}
