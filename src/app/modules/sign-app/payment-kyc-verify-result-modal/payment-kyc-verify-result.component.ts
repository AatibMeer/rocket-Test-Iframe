import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Store } from '../../../state/store';
import {
  CloseReason,
  ModalControlService,
  ModalNavigateIntention,
} from '../../../services/sign-app/modal-control.service';
import { PaymentAccount } from '../../../services/sign-app/payment-account.interface';

@Component({
  selector: 'rl-payment-kyc-verify-result-modal',
  styleUrls: ['./payment-kyc-verify-result-modal.component.scss'],
  templateUrl: './payment-kyc-verify-result-modal.component.html',
})
export class PaymentKycVerifyResultComponent implements OnDestroy, OnInit {
  status?: 'verified' | 'unverified' | 'pending';
  entityType?: PaymentAccount['type'];
  companyName?: string;

  private destroy = new Subject<void>();

  constructor(private readonly modalControlService: ModalControlService, private readonly store: Store) {}

  ngOnInit(): void {
    this.setupStatus();
    this.modalControlService.navigate$.pipe(takeUntil(this.destroy)).subscribe((intention) => {
      this.onNavigate(intention);
    });
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }

  back(): void {
    this.modalControlService.navigate('back');
  }

  next(): void {
    this.modalControlService.navigate('finish');
  }

  private onNavigate(intention: ModalNavigateIntention): void {
    if (intention.data.to === 'back') {
      this.modalControlService.close(CloseReason.UserNavigatedBack);
    } else {
      this.modalControlService.close(CloseReason.CompletedSuccessfully);
    }
  }

  private setupStatus(): void {
    const { paymentAccount } = this.store.getState();
    if (paymentAccount.type === 'INDIVIDUAL') {
      this.status = paymentAccount.individual.verification.status || 'pending';
    } else {
      this.status = 'pending';
    }
    this.companyName = paymentAccount.company?.name;
    this.entityType = paymentAccount.type;
  }
}
