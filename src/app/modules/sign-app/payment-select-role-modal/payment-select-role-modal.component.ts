import { Component, OnDestroy, OnInit, ViewChild, Renderer2 } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BoundBEM, makeBlockBoundBEMFunction } from '../../../common/utility-components/util-functions';
import { Party } from '../../../services/sign-app/party.interface';
import { Store } from '../../../state/store';
import {
  CloseReason,
  ModalCloseIntention,
  ModalControlService,
  ModalNavigateIntention,
} from '../../../services/sign-app/modal-control.service';
import { getCurrentParty } from '../../../state/selectors';
import {
  setTemporaryPaymentAgreementPayee,
  setTemporaryPaymentAgreementPayer,
  clearTemporaryPaymentAgreement,
} from '../../../state/actions/temporary-payment-agreement';

@Component({
  selector: 'rl-payment-select-role-modal',
  styleUrls: ['./payment-select-role-modal.component.scss'],
  templateUrl: './payment-select-role-modal.component.html',
})
export class PaymentSelectRoleModalComponent implements OnDestroy, OnInit {
  readonly bem: BoundBEM;
  private readonly destroy: Subject<void>;
  selectedOption: 'payeeRole' | 'payerRole' | 'otherRole' | undefined;

  constructor(
    private readonly modalControlService: ModalControlService,
    private readonly store: Store
  ) {
    this.bem = makeBlockBoundBEMFunction('rl-select-role-modal');
    this.destroy = new Subject<void>();
  }

  handleChange(e): void {
    this.selectedOption = e.target.id;
  }

  next(): void {
    const currentUserId = getCurrentParty(this.store.getState()).id;
    if (this.selectedOption === 'payeeRole') {
      this.store.dispatch(setTemporaryPaymentAgreementPayee(currentUserId));
    } else if (this.selectedOption === 'payerRole') {
      this.store.dispatch(setTemporaryPaymentAgreementPayer(currentUserId));
    }
    this.modalControlService.navigate(this.selectedOption);
  }

  ngOnDestroy(): void {
    this.destroy.next();
    this.selectedOption = undefined;
  }

  ngOnInit(): void {
    this.modalControlService.navigate$
      .pipe(takeUntil(this.destroy))
      .subscribe((intention) => this.onNavigate(intention));
  }

  private onNavigate(intention: ModalNavigateIntention): void {
      this.modalControlService.close(CloseReason.UserNavigatedNext, {
        nextModal: this.selectedOption,
      });
  }
}
