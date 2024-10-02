import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NgForm } from '@angular/forms';
import { Store } from '../../../state/store';
import { agreementUnconfirmed, getCurrentParty, getCurrentUserDisplayName } from '../../../state/selectors';
import { CloseReason, ModalControlService } from '../../../services/sign-app/modal-control.service';

import { fadeInOut, modalScaleInOut } from '../../../animations/animations';
import { SignService } from '../../../services/sign-app/sign.service';
import { AlertService } from '../../../services/sign-app/alert.service';
import { updateParty } from '../../../state/actions/party';
import { SearchParamsService } from '../../../services/sign-app/search-params.service';
import { LocalFeatureFlagService } from '../../../services/common/local-feature-flag.service';

@Component({
  selector: 'add-name-modal',
  templateUrl: './add-name-modal.component.html',
  styleUrls: ['./add-name-modal.component.scss'],
  animations: [fadeInOut, modalScaleInOut],
})
export class AddNameModalComponent implements OnDestroy, OnInit {
  private readonly destroy = new Subject<void>();

  constructor(
    private store: Store,
    private signService: SignService,
    private alertService: AlertService,
    private readonly modalControlService: ModalControlService,
    private readonly searchParamsService: SearchParamsService,
    private featureFlagService: LocalFeatureFlagService,
    @Inject(DOCUMENT) private documentEl: Document
  ) {}

  currentUserFirstName?: string;
  currentUserLastName?: string;
  actionInProgress = false;

  ngOnInit(): void {
    [this.currentUserFirstName, this.currentUserLastName] = getCurrentUserDisplayName(this.store.getState()).split(' ');
    this.modalControlService.navigate$.pipe(takeUntil(this.destroy)).subscribe({
      next: ({ data }) => {
        const variableFee = this.featureFlagService.flags.variable_fee_enabled;
        if (data.to === 'setupAPayment') {
          if (!variableFee) {
            this.modalControlService.close(CloseReason.CompletedSuccessfully, {
              nextModal: 'selectRoleModal',
            });
          } else {
            this.modalControlService.close(CloseReason.CompletedSuccessfully, {
              nextModal: 'creatorModal',
            });
          }
        } else {
          this.modalControlService.close(CloseReason.CompletedSuccessfully);
        }
      },
    });
  }

  updateName(form: NgForm): boolean {
    // this is needed to rerun the validators for all inputs
    form.form.markAsDirty();
    form.form.markAllAsTouched();
    const formValues = Object.keys(form.controls).map((key) => form.controls[key]);
    formValues.forEach((control) => control.updateValueAndValidity());
    if (!form.valid) {
      return false;
    }

    this.actionInProgress = true;
    const party = getCurrentParty(this.store.getState());
    const firstName = this.currentUserFirstName.trim();
    const lastName = this.currentUserLastName.trim();
    const partyMetadata = {
      ...(party?.metaData || null),
      firstName,
      lastName,
    };
    const data = {
      ...party,
      legalName: `${firstName} ${lastName}`,
      metaData: partyMetadata,
    };
    this.store.dispatch(updateParty(data));
    this.signService.updateBinder(this.store.getState().binder, true).subscribe(
      () => {
        if (this.searchParamsService.get('source') === 'setupAPayment' || agreementUnconfirmed(this.store.getState())) {
          this.modalControlService.navigate('setupAPayment');
        } else {
          this.modalControlService.navigate('end');
        }
      },
      () => {
        this.alertService.addDangerAlert({ message: 'add-name-modal_error' });
        this.actionInProgress = false;
      }
    );
    return true;
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }
}
