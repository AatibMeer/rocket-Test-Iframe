import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CustomTextInputComponent } from './custom-text-input/custom-text-input.component';
import { UserInputComponent } from './user-input.component';
import { CommuteModule } from '../../../common/utility-components/commute/commute.module';
import { InputTrimModule } from '../../trim.module';
import { Ng2FitTextModule } from '../directives/fitText.module';
import { DateInputModule } from '../date/date-input.module';
import { SignatureInputComponent } from './signature-input';
import { ClickOutsideModule } from '../directives/clickOutside.directive';

@NgModule({
  imports: [
    CommonModule,
    CommuteModule,
    FormsModule,
    InputTrimModule,
    Ng2FitTextModule,
    DateInputModule,
    ReactiveFormsModule,
    ClickOutsideModule,
  ],
  declarations: [CustomTextInputComponent, UserInputComponent, SignatureInputComponent],
  exports: [UserInputComponent],
  providers: [],
})
export class InputModule {}
