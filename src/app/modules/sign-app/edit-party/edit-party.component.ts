// eslint-disable-next-line max-classes-per-file
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { Validators } from '@angular/forms';
import { merge, of, Subject, Observable } from 'rxjs';
import { distinctUntilChanged, map, mapTo, mergeMap, pluck, take, takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

import { Party, RoleEnum } from '../../../services/sign-app/party.interface';
import { Store } from '../../../state/store';
import { makeBlockBoundBEMFunction } from '../../../common/utility-components/util-functions';
import {
  CloseReason,
  ModalControlService,
  ModalNavigateIntention,
} from '../../../services/sign-app/modal-control.service';
import { getAllInputs, partyHasRole } from '../../../state/selectors';
import { getNextAvailablePartyColor } from '../../../state/reducers/binder';
import { emailValidator } from '../add-signer-data-modal/email-validator.directive';
import { makeUniquePartyEmailValidatorFn } from '../utility/email-unique';
import { Binder } from '../../../services/sign-app/binder.interface';
import { PartyRouteState } from '../../../state/reducers/party-route';
import { generateRandomUuid } from '../../../common/utility-components/simple-uuid-generator';
import {
  ValidateOnSubmitFormGroupType,
  ValidateOnSubmitFormGroup,
  ValidateOnSubmitFormControl,
} from '../forms/validate-on-submit';
import { clearPartyForEdit } from '../../../state/actions/party-route';
import { addParty, removeParty, updateParty } from '../../../state/actions/party';
import { updateInput } from '../../../state/actions/sign';

const baseClass = 'rl-edit-party';

@Component({
  selector: 'rl-edit-party-modal',
  styleUrls: ['./edit-party.component.scss'],
  templateUrl: './edit-party.component.html',
})
export class EditPartyComponent implements OnChanges, OnDestroy, OnInit {
  /**
   * A collection of all parties in the binder, for validation.
   *
   * Updating this input will update the validators.
   */
  @Input()
  allParties: Readonly<Party>[] = [];
  @Input()
  canDelete = false;
  /** Can the email address be edited? */
  @Input()
  canEditEmail = true;
  /**
   * Whilst the two modals have separate copy, this input controls which one will show
   */
  @Input()
  language: 'edit-party-modal' | 'edit-party-modal-signers';
  @Input()
  party: Readonly<Party> | undefined;
  /**
   * The next available party color. If the party has a color already then this input will be ignored.
   */
  @Input()
  nextPartyColor: string | undefined;

  @Output()
  deleteParty = new EventEmitter<void>();
  @Output()
  saveParty = new EventEmitter<Party>();

  private readonly destroy = new Subject<void>();

  readonly bem = makeBlockBoundBEMFunction(baseClass);
  readonly formGroup: ValidateOnSubmitFormGroupType;
  heading = '';
  /**
   * A translation key for either edit-party hero text or add-party hero text
   */
  heroKey = '';
  isNewParty = true;
  partyColor = '';

  constructor(private readonly translateService: TranslateService) {
    const allWhitespaces = /^\s+$/;
    const name = new ValidateOnSubmitFormControl('', {
      validators: [
        Validators.required,
        (control) => {
          // a value entirely of whitespace characters is invalid
          if (allWhitespaces.test(control.value)) {
            return {
              required: 'A value is required',
            };
          }
          return null;
        },
      ],
    });
    const email = new ValidateOnSubmitFormControl('');
    this.formGroup = new ValidateOnSubmitFormGroup({
      name,
      email,
    });
  }

  ngOnChanges({ allParties, canEditEmail }: SimpleChanges): void {
    if (allParties && !allParties.firstChange) {
      // on firstChange, isNewParty etc won't exist yet since ngOnInit() won't have run
      this.allParties = allParties.currentValue ?? [];
      this.addEmailValidators();
    }
    if (canEditEmail) {
      this.canEditEmail = !!canEditEmail.currentValue;
      this.setupEmailChangeability();
    }
    // not responding to other inputs changing as it increases complexity unnecessarily and we don't want the rest
    // of this view changing when the user isn't expecting it
  }

  ngOnInit(): void {
    this.setupParty();
    this.setupEmailChangeability();
    // when setupLanguage() goes away, remember to call getHeading()!
    this.setupLanguage().subscribe(() => this.getHeading());
  }

  ngOnDestroy(): void {
    // all of our subscriptions should be tied to this with takeUntil()
    this.destroy.next();
  }

  onSubmit(): void {
    this.formGroup.markAllAsTouched();
    this.formGroup.markAsSubmitted();
    if (this.formGroup.valid) {
      const partyID = this.party?.id ?? generateRandomUuid();
      const reference = this.party?.reference ?? generateRandomUuid();
      const party: Party = {
        isTemporary: true,
        roles: [], // a roles array is not optional
        ...this.party,
        id: partyID,
        email: this.formGroup.get('email').value,
        legalName: this.formGroup.get('name').value,
        reference,
      };
      this.saveParty.emit(party);
    }
  }

  private setupEmailChangeability(): void {
    const email = this.formGroup.get('email');
    if (this.canEditEmail) {
      email.enable();
    } else {
      email.disable();
    }
  }

  /**
   * Switch the translations depending on the language (copy) input.
   *
   * This looks complex, but it means that when the edit party modals finally all have the same copy, we can just
   * delete this method and nothing else needs to change (apart from deleting the translations).
   */
  private setupLanguage(): Observable<void> {
    if (this.language === 'edit-party-modal-signers') {
      const lang = this.translateService.currentLang;
      const translations$ = this.translateService.getTranslation(lang).pipe(
        // don't change the translations if the the component is destroyed before getTranslation() resolves
        takeUntil(this.destroy)
      );
      translations$.subscribe((allTranslations) => {
        // replace the translations for this component with the signer translations
        this.translateService.setTranslation(
          lang,
          {
            'edit-party-modal': allTranslations['edit-party-modal-signers'],
          },
          true
        );

        // reload the original translations when the component is destroyed
        this.destroy.pipe(take(1)).subscribe(() => {
          // using translateService.reloadLang() may still be loading the translations when the next view loads,
          // so you may end up with empty strings! Using setTranslation() with the old values, instead.
          this.translateService.setTranslation(
            lang,
            {
              'edit-party-modal': allTranslations['edit-party-modal'],
            },
            true
          );
        });
      });
      return translations$.pipe(mapTo(undefined));
    }
    return of(undefined);
  }

  private setupParty(): void {
    this.isNewParty = !this.party;
    this.addEmailValidators();
    this.formGroup.get('name').setValue(this.party?.legalName ?? '');
    this.formGroup.get('email').setValue(this.party?.email ?? '');
    this.heroKey = this.isNewParty ? 'edit-party-modal.hero-text-new' : 'edit-party-modal.hero-text-edit';
    this.partyColor = this.party?.metaData?.style?.background || this.nextPartyColor || 'transparent';
  }

  private addEmailValidators(): void {
    this.formGroup
      .get('email')
      .setValidators([
        Validators.required,
        emailValidator,
        makeUniquePartyEmailValidatorFn(this.allParties, this.isNewParty ? undefined : this.party),
      ]);
  }

  private getHeading(): void {
    // the heading for new parties is static, but the heading for editing parties is dynamic and changes with the
    // value of the name input (which is why we have an Observable)
    const heading$ = this.isNewParty
      ? this.translateService.get('edit-party-modal.new-party-heading')
      : merge(of(this.party.legalName ?? ''), this.formGroup.get('name').valueChanges).pipe(
          takeUntil(this.destroy),
          map((name: string) => name.trim()),
          distinctUntilChanged(),
          mergeMap((name) => {
            return this.translateService.get('edit-party-modal.edit-party-heading', {
              name: (name || this.party.legalName) ?? '',
            });
          })
        );

    heading$.subscribe((heading) => {
      this.heading = heading;
    });
  }
}

@Component({
  selector: 'rl-edit-party-modal-connected',
  template: ` <rl-edit-party-modal
    [allParties]="allParties"
    [canDelete]="canDelete"
    [canEditEmail]="canEdit"
    [language]="language"
    [nextPartyColor]="nextPartyColor"
    [party]="party"
    (deleteParty)="deleteParty()"
    (saveParty)="saveParty($event)"
  ></rl-edit-party-modal>`,
})
export class EditPartyConnectedComponent implements OnDestroy, OnInit {
  /**
   * Whilst the two modals have separate copy, this input controls which one will show
   */
  @Input()
  language: 'edit-party-modal' | 'edit-party-modal-signers';

  private readonly destroy = new Subject<void>();
  private returnRoute?: string;

  allParties: Readonly<Party>[] = [];
  canDelete = false;
  canEdit = true;
  nextPartyColor?: string;
  party?: Readonly<Party>;

  constructor(private readonly modalControlService: ModalControlService, private readonly store: Store) {}

  ngOnInit(): void {
    const state$ = this.store.getState$().pipe(takeUntil(this.destroy));
    state$.pipe(pluck('binder')).subscribe((binder) => this.useBinder(binder));
    state$.pipe(pluck('partyRoute')).subscribe((partyRoute) => this.usePartyRoute(partyRoute));

    this.modalControlService.navigate$
      .pipe(takeUntil(this.destroy))
      .subscribe((intention) => this.onNavigate(intention));
  }

  ngOnDestroy(): void {
    this.destroy.next();
    this.store.dispatch(clearPartyForEdit());
  }

  deleteParty(): void {
    if (this.canDelete) {
      this.store.dispatch(removeParty(this.party));
      this.modalControlService.navigate('back');
    }
  }

  saveParty(party: Party): void {
    const action = this.party ? updateParty(party) : addParty(party);
    this.store.dispatch(action);
    if (this.language === 'edit-party-modal-signers') {
      const { binder } = this.store.getState();
      const inputs = getAllInputs({ binder });
      const lastInput = inputs.filter((i) => i.isFresh).pop();
      if (lastInput) {
        const inputToEdit = { ...lastInput, partyReference: party.reference };
        this.store.dispatch(updateInput(inputToEdit));
      }
    }
    this.modalControlService.navigate('back');
  }

  private onNavigate({ data }: ModalNavigateIntention): void {
    if (data.to === 'back') {
      this.modalControlService.close(CloseReason.UserNavigatedBack, {
        nextModal: this.returnRoute,
      });
    }
  }

  private useBinder(binder: Readonly<Binder>): void {
    this.allParties = binder.parties;
    this.nextPartyColor = getNextAvailablePartyColor({ binder });
  }

  private usePartyRoute(partyRoute: Readonly<PartyRouteState>): void {
    this.canDelete =
      !!partyRoute.party &&
      !partyHasRole(partyRoute.party, RoleEnum.Owner) &&
      partyRoute?.returnRoute !== 'inviteCollaboratorsModal';
    this.canEdit = !partyHasRole(partyRoute.party, RoleEnum.Owner);
    this.party = partyRoute.party;
    this.returnRoute = partyRoute.returnRoute;
  }
}
