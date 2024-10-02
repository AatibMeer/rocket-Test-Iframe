import { NgModule } from '@angular/core';
import { AngularMyDatePickerModule } from '@nodro7/angular-mydatepicker';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DateInputComponent } from './date-input';
import { InputComponent } from '../input/input.component';
import { UtilityDirectivesModule } from '../../../common/utility-components/utility-directives.module';
import { TextInputModule } from '../text-input/text-input.module';
import { TextInputComponent } from '../text-input/text-input.component';

@NgModule({
  imports: [
    FormsModule,
    CommonModule,
    AngularMyDatePickerModule,
    UtilityDirectivesModule,
    TextInputModule,
    ReactiveFormsModule,
  ],
  declarations: [DateInputComponent, InputComponent],
  exports: [DateInputComponent, InputComponent, TextInputComponent],
})
export class DateInputModule {}
