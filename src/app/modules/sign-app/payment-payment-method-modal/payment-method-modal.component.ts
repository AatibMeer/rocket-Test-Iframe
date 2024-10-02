import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { distinct, map, takeUntil } from 'rxjs/operators';
import { Store } from '../../../state/store';
import { getCurrentParty } from '../../../state/selectors';
import {
  CloseReason,
  ModalControlService,
  ModalNavigateIntention,
} from '../../../services/sign-app/modal-control.service';

@Component({
  selector: 'rl-payment-method-modal',
  styleUrls: ['./payment-method-modal.component.scss'],
  templateUrl: './payment-method-modal.component.html',
})
export class PaymentMethodModalComponent implements OnDestroy, OnInit {
  hasPaymentMethod = false;
  payeeName: string;
  personID: string;

  private readonly destroy = new Subject<void>();

  constructor(private readonly modalControlService: ModalControlService, private readonly store: Store) {}

  ngOnInit(): void {
    const state = this.store.getState();
    const { personId } = getCurrentParty(state);
    this.personID = personId;
    const payeeID = state.paymentAgreement?.payments[0].outs[0].partyId;
    const payee = state.binder.parties.find(({ id }) => id === payeeID);
    this.payeeName = payee?.legalName || '';
    this.store
      .getState$()
      .pipe(
        takeUntil(this.destroy),
        map((currentState) => currentState.paymentMethod),
        distinct()
      )
      .subscribe({
        next: (paymentMethod) => {
          this.hasPaymentMethod = !!paymentMethod;
        },
      });

    this.modalControlService.navigate$.pipe(takeUntil(this.destroy)).subscribe({
      next: (intention) => {
        this.onNavigate(intention);
      },
    });
  }

  openPayConfirmModal(): void {
    this.modalControlService.navigate('next');
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }

  private onNavigate(intention: ModalNavigateIntention): void {
    if (intention.data.to === 'next') {
      this.modalControlService.close(CloseReason.UserNavigatedNext);
    }
  }
}
