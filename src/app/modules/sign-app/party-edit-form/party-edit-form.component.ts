import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Optional,
  Output,
  SimpleChanges,
} from '@angular/core';
import { AbstractControl, ControlContainer, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { BoundBEM, makeBlockBoundBEMFunction } from '../../../common/utility-components/util-functions';

const baseClass = 'rl-party-edit-form';

@Component({
  selector: 'rl-party-edit-form',
  styleUrls: ['./party-edit-form.component.scss'],
  templateUrl: './party-edit-form.component.html',
})
export class PartyEditFormComponent implements OnChanges, OnDestroy, OnInit {
  readonly bem: BoundBEM;
  private readonly controlContainer: ControlContainer | undefined;
  private readonly destroy: Subject<void>;
  /**
   * Email input for using this component without a form group
   */
  @Input()
  email: string | undefined;
  /**
   * Email output for using this component without a form group
   */
  @Output()
  readonly emailChange: EventEmitter<string>;
  private emailControl: AbstractControl;
  @Input()
  emailErrorMessages: { [validatorName: string]: string } | undefined;
  emailID: string;
  emailNamedErrors: string[];
  formGroup: UntypedFormGroup;
  private readonly id: string;
  @Input()
  idPrefix: string | undefined;
  /** Unless explicitly `false` this will be treated as PII */
  @Input()
  isPII = true;
  /**
   * Name input for using this component without a form group
   */
  @Input()
  name: string | undefined;
  /**
   * Name output for using this component without a form group
   */
  @Output()
  readonly nameChange: EventEmitter<string>;
  private nameControl: AbstractControl;
  @Input()
  nameErrorMessages: { [validatorName: string]: string } | undefined;
  nameID: string;
  nameNamedErrors: string[];

  constructor(@Optional() formGroup: ControlContainer) {
    this.controlContainer = formGroup;
    this.bem = makeBlockBoundBEMFunction(baseClass);
    this.destroy = new Subject<void>();
    this.emailChange = new EventEmitter<string>();
    this.emailNamedErrors = [];
    const blank = new Array(8);
    for (let i = 0; i < blank.length; i += 1) {
      blank[i] = ((Math.random() * 16) | 0).toString(16);
    }
    this.id = blank.join('');
    this.nameChange = new EventEmitter<string>();
    this.nameNamedErrors = [];
  }

  ngOnChanges({ email, emailErrorMessages, idPrefix, name, nameErrorMessages }: SimpleChanges): void {
    if (idPrefix) {
      if (idPrefix.currentValue) {
        this.emailID = `${idPrefix}email`;
        this.nameID = `${idPrefix}name`;
      } else {
        this.setDefaultIDs();
      }
    }
    if (email) {
      this.emailControl.setValue(email.currentValue || '');
    }
    if (name) {
      this.nameControl.setValue(name.currentValue || '');
    }
    if (emailErrorMessages) {
      this.emailNamedErrors = emailErrorMessages.currentValue ? Object.keys(emailErrorMessages.currentValue) : [];
    }
    if (nameErrorMessages) {
      this.nameNamedErrors = nameErrorMessages.currentValue ? Object.keys(nameErrorMessages.currentValue) : [];
    }
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }

  ngOnInit(): void {
    this.setupFormGroup();
    this.setDefaultIDs();
  }

  private setDefaultIDs(): void {
    this.emailID = `party-${this.id}-email`;
    this.nameID = `party-${this.id}-name`;
  }

  /**
   * This component can be used with a formGroup or input/outputs
   * but it uses a formGroup in its own view
   * @private
   */
  private setupFormGroup(): void {
    // if there is an ancestor FormGroup we should use the controls from that
    const ancestor = this.controlContainer ? (this.controlContainer.control as UntypedFormGroup) : undefined;
    if (ancestor) {
      this.emailControl = ancestor.get('email');
      this.nameControl = ancestor.get('name');
    }
    this.emailControl =
      this.emailControl ||
      new UntypedFormControl(this.email || '', {
        validators: [Validators.email, Validators.required],
      });
    this.nameControl =
      this.nameControl ||
      new UntypedFormControl(this.name || '', {
        validators: [Validators.required],
      });

    // our "private" formGroup, copying options from ancestor formGroup if present
    this.formGroup = new UntypedFormGroup(
      {
        email: this.emailControl,
        name: this.nameControl,
      },
      {
        asyncValidators: (ancestor && ancestor.asyncValidator) || null,
        validators: (ancestor && ancestor.validator) || null,
        updateOn: (ancestor && ancestor.updateOn) || 'blur',
      }
    );

    // emit on value changes for anyone using input/output instead of formGroups
    // also update the ancestor formGroup since it won't receive updates any more
    const controlChange = (control: AbstractControl, controlName: string, emitter: EventEmitter<string>): void => {
      control.valueChanges.pipe(takeUntil(this.destroy), distinctUntilChanged()).subscribe((value) => {
        emitter.emit(value);
        if (ancestor && ancestor.contains(controlName)) {
          ancestor.patchValue(
            {
              [controlName]: value,
            },
            {
              onlySelf: false,
            }
          );
        }
      });
    };
    controlChange(this.emailControl, 'email', this.emailChange);
    controlChange(this.nameControl, 'name', this.nameChange);
  }
}
