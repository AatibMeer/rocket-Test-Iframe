import { AbstractControl, UntypedFormGroup, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';
import { Directive, Input } from '@angular/core';

function uniqueValidator(controlNamePrefix: string, controlId: string) {
  return (formGroup: AbstractControl) => {
    const rootFormGroup = formGroup.root as UntypedFormGroup;
    let controlValue = rootFormGroup.value[controlId] || '';
    let lowerCaseControlValue = controlValue.toLowerCase();
    const formNotEmptyValues: string[] = Object.keys(rootFormGroup.controls)
      .filter((controlName: string) => controlName.startsWith(controlNamePrefix))
      .map((filteredControlName: string) => rootFormGroup.controls[filteredControlName].value)
      .filter(controlValues => controlValues && controlValues.length !== 0);

    const lowerCaseValues = formNotEmptyValues.map(val => val.toLowerCase());
    let hasDuplicates = lowerCaseValues.filter(val => val == lowerCaseControlValue).length > 1;
    return hasDuplicates ? { unique: true } : null;
  }
}


@Directive({
  selector: '[uniqueValidator]',
  providers: [{
    provide: NG_VALIDATORS,
    useExisting: UniqueValidatorDirective,
    multi: true
  }]
})
export class UniqueValidatorDirective implements Validator {
  @Input('unique') unique: string;
  @Input('controlNamePrefix') controlNamePrefix: string;

  validate(control: AbstractControl): ValidationErrors | null {
    return uniqueValidator(this.controlNamePrefix, this.unique)(control);
  }
}