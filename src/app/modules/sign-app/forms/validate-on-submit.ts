import {
    AbstractControl,
    UntypedFormControl,
    UntypedFormGroup,
    ValidatorFn
} from '@angular/forms';
import {take} from 'rxjs/operators';

/**
 * AbstractControls have an internal method called _forEachChild, but it isn't mentioned in the .d.ts
 * so here it is all nicely typed
 */
function forEachChild(ofControl: AbstractControl, cb: (this: undefined, childControl: AbstractControl) => void): void {
    ((ofControl as any)._forEachChild as ((cb: (control: AbstractControl) => void) => void))(cb);
}

/**
 * Create a validator which only calls the original validatorFn if the control is in a "submitted" state.
 *
 * Just a DRY function call from the validate-on-submit classes below
 */
function makeValidateOnSubmitValidator(this: AbstractControl & IValidateAbstractControlOnSubmit, originalValidatorFn: ValidatorFn): ValidatorFn {
    return (control) => this.submitted ? originalValidatorFn(control) : null;
}

interface IValidateAbstractControlOnSubmit {
    readonly submitted: boolean;
}

export interface IValidateControlOnSubmit extends IValidateAbstractControlOnSubmit {
    /**
     * Marks the control as not submitted. A control which is not in a submitted is not allowed to run its validators.
     */
    markAsNotSubmitted(): void;
    /**
     * Marks the control as submitted. A submitted control is allowed to run its validators.
     */
    markAsSubmitted(): void;
}

export interface IValidateGroupOnSubmit extends IValidateAbstractControlOnSubmit {
    /**
     * Marks the control as not submitted. A control which is not in a submitted is not allowed to run its validators.
     *
     * @param [opts] If <code>onlySelf</code> is <code>true</code> then the descendents will not be marked as submitted.
     */
    markAsNotSubmitted(opts?: {onlySelf?: boolean}): void;
    /**
     * Marks the control as submitted. A submitted control is allowed to run its validators.
     *
     * @param [opts] If <code>onlySelf</code> is <code>true</code> then the descendents will not be marked as submitted.
     */
    markAsSubmitted(opts?: {onlySelf?: boolean}): void;
}

type AbstractControlBase<T extends AbstractControl> = new (...args: any[]) => T;

/**
 * A TypeScript mixin to wrap a FormControl class with properties and methods to only validate when the control is
 * marked as "submitted". Additionally, changing the value will invalidate the validators causing them to stop
 * validating until the control is marked as "submitted" once again.
 *
 * Unlike a class, this could be mixed with other mixins (or classes extending FormControl) if we want to add more
 * boilerplate-reducing code to controls.
 * If you aren't using additional mixins then there is a MixedFormControl class and type exported from this file.
 */
export function ValidateControlOnSubmit<TControl extends AbstractControlBase<UntypedFormControl>>(Control: TControl) {
    return class ValidateControlOnSubmit extends Control implements IValidateControlOnSubmit {
        /** @private */
        _submitted = false;
        get submitted(): boolean {
            return this._submitted;
        }

        constructor(...args: any[]) {
            super(...args);

            this.setValidators(this.validator);
        }

        markAsNotSubmitted() {
            this._submitted = false;
            this.updateValueAndValidity({
                emitEvent: false,
                onlySelf: false
            });
        }

        markAsSubmitted() {
            this._submitted = true;
            this.updateValueAndValidity({
                emitEvent: false,
                onlySelf: false
            });
            this.valueChanges.pipe(
                take(1)
            ).subscribe(() => this.markAsNotSubmitted());
        }

        setValidators(newValidator: ValidatorFn[] | ValidatorFn | null): void {
            if (newValidator === null) {
                super.setValidators(null);
            } else if (Array.isArray(newValidator)) {
                super.setValidators(newValidator.map(makeValidateOnSubmitValidator, this));
            } else {
                super.setValidators(makeValidateOnSubmitValidator.call(this, newValidator));
            }
        }
    }
}

/**
 * A TypeScript mixin to wrap a FormGroup class with properties and methods to only validate when the control is marked
 * as "submitted". Marking the group will also mark the descendent elements (if they can be marked).
 *
 * Unlike a class, this could be mixed with other mixins (or classes extending FormGroup) if we want to add more
 * boilerplate-reducing code to controls.
 * If you aren't using additional mixins then there is a MixedFormGroup class and type exported from this file.
 */
export function ValidateGroupOnSubmit<TControl extends AbstractControlBase<UntypedFormGroup>>(Control: TControl) {
    return class ValidateGroupOnSubmit extends Control implements IValidateGroupOnSubmit {
        /** @private */
        _submitted = false;
        get submitted(): boolean {
            return this._submitted;
        }

        constructor(...args: any[]) {
            super(...args);

            this.setValidators(this.validator);
        }

        markAsNotSubmitted(opts?: { onlySelf?: boolean }) {
            this._submitted = false;
            if (!opts || !opts.onlySelf) {
                const mark = (control: AbstractControl): void => {
                    if ((control as unknown as IValidateGroupOnSubmit).markAsNotSubmitted) {
                        (control as ValidateGroupOnSubmit).markAsNotSubmitted({
                            onlySelf: false
                        });
                    }
                    forEachChild(control, mark);
                }
                forEachChild(this, mark);
            }
            this.updateValueAndValidity({
                emitEvent: false,
                onlySelf: false
            })
        }

        markAsSubmitted(opts?: { onlySelf?: boolean }) {
            this._submitted = true;
            if (!opts || !opts.onlySelf) {
                const mark = (control: AbstractControl): void => {
                    if ((control as unknown as IValidateGroupOnSubmit).markAsSubmitted) {
                        (control as ValidateGroupOnSubmit).markAsSubmitted({
                            onlySelf: false
                        });
                    }
                };
                forEachChild(this, mark);
            }
            this.updateValueAndValidity({
                emitEvent: false,
                onlySelf: false
            })
        }

        setValidators(newValidator: ValidatorFn[] | ValidatorFn | null): void {
            if (newValidator === null) {
                super.setValidators(null);
            } else if (Array.isArray(newValidator)) {
                super.setValidators(newValidator.map(makeValidateOnSubmitValidator, this));
            } else {
                super.setValidators(makeValidateOnSubmitValidator.call(this, newValidator));
            }
        }
    }
}

export type ValidateOnSubmitFormControlType = IValidateControlOnSubmit & UntypedFormControl;
interface ControlConstructor {
    new (...args: ConstructorParameters<typeof UntypedFormControl>): ValidateOnSubmitFormControlType;
}
export const ValidateOnSubmitFormControl: ControlConstructor = ValidateControlOnSubmit(UntypedFormControl);

export type ValidateOnSubmitFormGroupType = IValidateGroupOnSubmit & UntypedFormGroup;
interface GroupConstructor {
    new (...args: ConstructorParameters<typeof UntypedFormGroup>): ValidateOnSubmitFormGroupType;
}
export const ValidateOnSubmitFormGroup: GroupConstructor = ValidateGroupOnSubmit(UntypedFormGroup);
