import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  SecurityContext,
  ViewChild,
} from '@angular/core';
import { AbstractControl, NgForm } from '@angular/forms';
import { takeWhile } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Unsubscribe } from 'redux';
import { fadeInOut, modalScaleInOut, slideInOut } from '../../../animations/animations';
import { AlertService } from '../../../services/sign-app/alert.service';
import { Binder } from '../../../services/sign-app/binder.interface';
import { Party, RoleEnum } from '../../../services/sign-app/party.interface';
import { SignService } from '../../../services/sign-app/sign.service';
import { SignatureInput } from '../../../services/sign-app/signature-input.interface';
import { setSignatureBuilderMode } from '../../../state/actions/uiProps';
import {
  getActiveInput,
  getAllInputs,
  getInputById,
  getPartyByRoleName,
  getMissingSignerInfoForm,
  partyHasInputs,
  partyHasRole,
  getCurrentParty,
  otherSignersHaveInputs,
} from '../../../state/selectors';

import { Store } from '../../../state/store';
import { ModalType } from '../sign-app-dashboard/modal-type.enum';
import * as reduxActions from '../../../state/actions/sign';
import {
  CloseReason,
  ModalCloseIntention,
  ModalControlService,
} from '../../../services/sign-app/modal-control.service';
import { sortPartiesByInputPosition } from '../../../state/reducers/binder';
import { SignerInfo } from '../../../state/reducers/missing-signer-info';
import type { State } from '../../../state/reducers/main.interface';
import { BoundBEM, makeBlockBoundBEMFunction } from '../../../common/utility-components/util-functions';
import { saveMissingSignerInfoState, updateBinder } from '../../../state/actions/sign';
import { swapPartyReferences } from '../../../state/actions/party';

const baseClass = 'rl-add-signer-data-modal';

@Component({
  selector: 'add-signer-data-modal',
  templateUrl: './add-signer-data.component.html',
  styleUrls: ['./add-signer-data.component.scss'],
  animations: [fadeInOut, modalScaleInOut, slideInOut],
})
export class AddSignerDataModalComponent implements OnInit, OnDestroy {
  constructor(
    private store: Store,
    private signService: SignService,
    private alertService: AlertService,
    private modalControlService: ModalControlService,
    private sanitizer: DomSanitizer,
    @Inject(TranslateService) private translate: TranslateService
  ) {
    this.setupComponent(this.store.getState());
    const storeSub = this.store.subscribe((state) => {
      this.setupComponent(state);
    });
    this.subscriptions.push(storeSub);
    this.bem = makeBlockBoundBEMFunction(baseClass);
    this.translate.get(this.tooltipContentKey).subscribe((translation) => {
      const sanitized = this.sanitizer.sanitize(SecurityContext.HTML, translation);
      this.tooltipContent = sanitized;
    });
  }

  tooltipContentKey = 'add-signer-data-modal_tooltip-content-info';
  showTooltip = false;
  tooltipContent: string;

  @Input() originalOwnerPartyReference;
  @Input() introToUse;
  @ViewChild('form') form: NgForm;
  private binder: Binder;
  partiesWithSignatureInputs: Array<Party>;
  signatureBuilderModeEnabled = false;
  owner: Party;
  ownerHasNewlyCreatedInputs: boolean;
  private modalOpen = true;
  private activeInput: SignatureInput | null;
  brandConfig: any;
  brandingLevel = 3;
  readonly bem: BoundBEM;
  setupComponent(state: State): void {
    this.binder = state.binder;
    this.brandingLevel = state.globalBrandConfig?.brandingLevel || 3;
    this.brandConfig = state.brandConfig;
    this.partiesWithSignatureInputs = AddSignerDataModalComponent.cloneParties(state);
    this.partiesWithSignatureInputs = sortPartiesByInputPosition(this.binder, this.partiesWithSignatureInputs);
    this.owner = getPartyByRoleName(this.binder, RoleEnum.Owner);
    this.signatureBuilderModeEnabled = state.signatureBuilderModeEnabled;
    // inputs which are created in the current session have no status
    this.ownerHasNewlyCreatedInputs = getAllInputs(state)
      .filter((input) => !input.status)
      .some((input) => input.partyReference === this.owner.reference);
    this.activeInput = getActiveInput(state);
    const ownerReference = getCurrentParty(state).reference;
    this.featureOwnerSignsFirstActivated =
      (this.binder.status === 'IN_PREPARATION' || this.binder.status === 'REVIEW_AND_SHARE') &&
      getAllInputs(state).length !== 0 &&
      getCurrentParty(state).roles.includes(RoleEnum.Owner) &&
      getCurrentParty(state).roles.includes(RoleEnum.Signer) &&
      otherSignersHaveInputs(state, ownerReference) &&
      partyHasInputs(ownerReference, state);

    this.loadUnsavedFormChanges();
  }

  private static cloneParties(state: State): Party[] {
    const { binder } = state;
    return binder.parties.filter((p) => partyHasInputs(p.reference, state)).map((p) => ({ ...p }));
  }

  ngOnInit(): void {
    this.brandConfig = this.store.getState().brandConfig;
    this.modalControlService.close$.pipe(takeWhile(() => this.alive)).subscribe((intention) => this.onClose(intention));
  }

  private onClose(intention: ModalCloseIntention) {
    if (this.modalOpen) {
      this.modalOpen = false;
      this.saveFormChanges();
    }

    if (intention.data.reason === CloseReason.UserTerminated) {
      this.disableBuilderMode();
      this.deactivateInput();
    }
  }

  private saveFormChanges() {
    this.propagateFormValuesToModel();

    const actualFormValues = this.partiesWithSignatureInputs.map(AddSignerDataModalComponent.mapParty);
    this.store.dispatch(
      saveMissingSignerInfoState({
        form: actualFormValues,
      })
    );
  }

  private propagateFormValuesToModel() {
    this.form.onSubmit(undefined);
  }

  private static mapParty(party: Party): SignerInfo {
    return {
      id: party.id,
      legalName: party.legalName,
      email: party.email,
    };
  }

  private disableBuilderMode() {
    if (this.forceUserToAddData) {
      this.store.dispatch(setSignatureBuilderMode(false));
    }
  }

  private deactivateInput() {
    if (this.activeInput) {
      this.store.dispatch(reduxActions.toggleInputActiveness({ id: this.activeInput.id }));
    }
  }

  private loadUnsavedFormChanges() {
    const formChanges = getMissingSignerInfoForm(this.store.getState());
    if (formChanges) {
      AddSignerDataModalComponent.applyFormChanges(this.partiesWithSignatureInputs, formChanges);
    }
  }

  private static applyFormChanges(parties: Party[], formChanges: SignerInfo[]) {
    parties.forEach((party) => {
      const changesToOverride = formChanges.find((partyChanges) => partyChanges.id === party.id);
      if (changesToOverride) {
        // eslint-disable-next-line no-param-reassign
        party.email = changesToOverride.email;
        // eslint-disable-next-line no-param-reassign
        party.legalName = changesToOverride.legalName;
      }
    });
  }

  private subscriptions: Unsubscribe[] = [];
  private alive = true;
  ngOnDestroy(): void {
    this.subscriptions.forEach((unsub) => unsub());
    this.alive = false;
  }

  actionInProgress = false;
  onSubmit(form: NgForm): void {
    if (this.modalOpen) {
      this.saveChanges(form);
    }
  }

  saveChanges(form: NgForm): boolean {
    // this is needed to rerun the validators for all inputs
    const formValues = Object.keys(form.controls).map((key) => form.controls[key]);
    formValues.forEach((control) => control.updateValueAndValidity());
    // fetch fresh binder from store
    const freshBinder = this.store.getState().get('binder');
    if (!form.valid) {
      formValues.forEach((control) => control.markAsTouched());
      return;
    }
    this.actionInProgress = true;
    const updatedBinder = { ...freshBinder, parties: [...this.partiesWithSignatureInputs] };
    const owner = this.partiesWithSignatureInputs.find((p) => partyHasRole(p, RoleEnum.Owner));
    if (!owner) {
      updatedBinder.parties.push(getPartyByRoleName(this.binder, RoleEnum.Owner));
    } else {
      const ownerHasSignerRole = partyHasRole(owner, RoleEnum.Signer);
      if (!ownerHasSignerRole) owner.roles.push(RoleEnum.Signer);
      const isPayerPresent = this.partiesWithSignatureInputs.some((p) => partyHasRole(p, RoleEnum.Payer));
      const isPayeePresent = this.partiesWithSignatureInputs.some((p) => partyHasRole(p, RoleEnum.Payee));
      if (!isPayerPresent && isPayeePresent) {
        const ownerHasPayeeRole = partyHasRole(owner, RoleEnum.Payee);
        if (!ownerHasPayeeRole) owner.roles.push(RoleEnum.Payer);
      }
      if (isPayerPresent && !isPayeePresent) {
        const ownerHasPayerRole = partyHasRole(owner, RoleEnum.Payer);
        if (!ownerHasPayerRole) owner.roles.push(RoleEnum.Payee);
      }
    }
    this.signService.updateBinder(updatedBinder).subscribe(
      () => {
        this.onUpdateSuccess();
      },
      () => {
        this.alertService.setAlertMessage({ message: 'add-signer-data-modal_changes_error', type: 'danger' });
        this.actionInProgress = false;
      }
    );
    // eslint-disable-next-line consistent-return
    return false;
  }

  formHasEmptyOrNotUniqueField(form: NgForm): boolean {
    const formControls: AbstractControl[] = Object.keys(form.controls).map((key) => form.controls[key]);
    return formControls.some(
      (formControl) => formControl.errors && (formControl.errors.required || formControl.errors.unique)
    );
  }

  formHasInvalidEmail(form: NgForm): boolean {
    const formControls: AbstractControl[] = Object.keys(form.controls).map((key) => form.controls[key]);
    return formControls.some(
      (formControl) => formControl.errors && formControl.errors.email && !formControl.errors.required
    );
  }

  static partyDataValid(party: Party, dataType: string): boolean {
    return party[dataType].length !== 0;
  }

  @Output() showModalWithDelay: EventEmitter<ModalType> = new EventEmitter();
  @Input() proceedWithNextActionsOnSave = false;
  @Input() proceedWithEditInputOnSave = false;
  featureOwnerSignsFirstActivated = false;
  onUpdateSuccess(): void {
    const activeInputId = this.activeInput ? this.activeInput.id : null;
    this.signService.getBinder(this.binder.id, { fetchPages: false }).subscribe((binder) => {
      this.store.dispatch(updateBinder(binder));
      this.alertService.setAlertMessage({ message: 'add-signer-data-modal_changes_saved', type: 'success' });
      this.actionInProgress = false;
      this.modalControlService.close(CloseReason.CompletedSuccessfully);
      if (this.proceedWithNextActionsOnSave) {
        this.store.dispatch(setSignatureBuilderMode(false));
        this.checkNextSteps();
      }
      if (this.proceedWithEditInputOnSave) {
        const inputToActivate = getInputById(this.store.getState(), activeInputId);
        this.store.dispatch(reduxActions.updateInput({ ...inputToActivate, active: true }));
        this.showModalWithDelay.emit('editInputModal');
      }
    });
  }

  @Input() forceUserToAddData = false;

  toggleOwner(party: Party) {
    const partyIsOwner = party.roles.includes(RoleEnum.Owner);
    const currentOwnerIsOriginalOwner = this.owner.reference === this.originalOwnerPartyReference;
    const originalOwner = this.binder.parties.find((p) => p.reference === this.originalOwnerPartyReference);
    if (partyIsOwner) {
      // revert to original owner
      this.swapPartyRefs([party, originalOwner]);
    } else if (!partyIsOwner && currentOwnerIsOriginalOwner) {
      this.swapPartyRefs([this.owner, party]);
    } else {
      // owner was already re-assigned, swap old party then swap new party
      this.swapPartyRefs([this.owner, originalOwner]);
      this.swapPartyRefs([this.owner, party]);
    }
  }

  shouldHideOption(party: Party): boolean {
    const somePartyIsAssignedOwnersEmail = this.partiesWithSignatureInputs.find((p) => p.email === this.owner.email);
    const thisPartyIsAssignedOwnersEmail = party?.email === this.owner.email;
    if (somePartyIsAssignedOwnersEmail && !thisPartyIsAssignedOwnersEmail) return true;
    return false;
  }

  swapPartyRefs(parties: [Party, Party]): void {
    this.store.dispatch(swapPartyReferences(parties));
  }

  trackByPartyReference(idx: number, item: Party): string {
    return item.reference;
  }

  onEmailChange(event: Event, party: Party, ngForm: NgForm): void {
    const val: string = (event.target as HTMLInputElement).value;
    const lowerCaseVal = val.toLowerCase();
    const lowerCaseOwnerEmail = this.owner.email.toLowerCase();
    if (lowerCaseVal === lowerCaseOwnerEmail) {
      // reset party email and make owner that signer
      // eslint-disable-next-line no-param-reassign
      party.email = '';
      ngForm.form.markAsPristine();
      this.toggleOwner(party);
    }
  }

  checkNextSteps(): void {
    if (this.featureOwnerSignsFirstActivated) {
      this.showModalWithDelay.emit('actionModal');
      return;
    }
    const owner = getPartyByRoleName(this.binder, RoleEnum.Owner);
    const inviteesPresent = this.binder.parties.some(
      (p) => p.reference !== owner.reference && partyHasInputs(p.reference, this.store.getState())
    );
    if (inviteesPresent) {
      this.showModalWithDelay.emit('inviteCollaboratorsModal');
    } else {
      this.showModalWithDelay.emit('actionModal');
    }
  }
}
