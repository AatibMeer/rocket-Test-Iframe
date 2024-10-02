import { Component, OnDestroy } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from 'rxjs/operators';
import { CloseReason, ModalControlService } from '../../../services/sign-app/modal-control.service';
import { SignService } from "../../../services/sign-app/sign.service";
import { Store } from '../../../state/store';
import {getCurrentParty, partyHasRole} from "../../../state/selectors";
import {RoleEnum} from "../../../services/sign-app/party.interface";
import {PayService} from "../../../services/sign-app/pay.service";
import {PaymentAgreementStatus} from "../../../services/sign-app/payment-agreement.interface";

@Component({
    selector: 'rl-add-signatures-selector-modal',
    styleUrls: ['./add-signatures-selector-modal.component.scss'],
    templateUrl: './add-signatures-selector-modal.component.html',
})
export class AddSignaturesSelectorModalComponent implements OnDestroy {  
  private readonly destroy = new Subject<void>();
  public busy: boolean = false;

  constructor(
    private readonly modalControlService: ModalControlService,
    private readonly signService: SignService,
    private readonly store: Store,
    private readonly payService: PayService,
  ) {}

  ngOnInit(): void {
    this.modalControlService.navigate$.pipe(takeUntil(this.destroy)).subscribe((intention) => {
      if (intention.data.to === 'back') {
        this.modalControlService.close(CloseReason.UserNavigatedBack);
      } else if (intention.data.to === 'actionModal') {
        this.modalControlService.close(CloseReason.CompletedSuccessfully, {nextModal: 'actionModal'});
      } else if (intention.data.to === 'inviteModal') {
        this.modalControlService.close(CloseReason.CompletedSuccessfully, {nextModal: 'inviteModal'});
      }
    });
  }

  onAddSignatureOptionSelected(event): void {
    const withSignatures = event.detail === 'with-signatures';
    if (withSignatures) {
      this.busy = true;
      this.updateBinderSignable(true).subscribe(() => {
        this.busy = false;
        this.modalControlService.navigate('actionModal');
      });
    } else {
      this.busy = true;
      this.updateBinderSignable(false).subscribe(() => {
        if (partyHasRole(getCurrentParty(this.store.getState()), RoleEnum.Payer)) {
          this.signService.sendFinalisation("finalisation without signing", this.store.getState().binder).subscribe(() => {
              this.payService
                .setPaymentAgreementStatus(
                  this.store.getState().paymentAgreement.externalId,
                  PaymentAgreementStatus.Pending
                )
                .subscribe(() => {
              this.busy = false;
              this.modalControlService.navigate('actionModal');
            });
          });
        } else {
          this.modalControlService.navigate('inviteModal');
        }        
      })
    }
  }

  updateBinderSignable(signable: boolean) {
    const freshBinder = this.store.getState().binder;
    const updatedBinder = { 
      ...freshBinder,
      documents: freshBinder.documents.map(document => ({
        ...document,
        signable: signable
      })),
    };
    return this.signService.updateBinder(updatedBinder, true);
  }
  
  ngOnDestroy(): void {
    this.destroy.next();
  }
}
