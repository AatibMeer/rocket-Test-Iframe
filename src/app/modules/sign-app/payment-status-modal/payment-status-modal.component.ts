// eslint-disable-next-line max-classes-per-file
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { Party, RoleEnum } from '../../../services/sign-app/party.interface';
import { makeBlockBoundBEMFunction } from '../../../common/utility-components/util-functions';
import { Store } from '../../../state/store';
import type { State } from '../../../state/reducers/main.interface';
import {
  CloseReason,
  ModalControlService,
  ModalNavigateIntention,
} from '../../../services/sign-app/modal-control.service';
import { PayService } from '../../../services/sign-app/pay.service';
import { AlertService } from '../../../services/sign-app/alert.service';
import { getCurrentParty, partyHasRole } from '../../../state/selectors';
import { MessageService } from '../message';
import { PaymentAgreementStatus } from '../../../services/sign-app/payment-agreement.interface';

const baseClass = 'rl-payment-status-modal';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'rl-payment-status-modal',
  styleUrls: ['./payment-status-modal.component.scss'],
  templateUrl: './payment-status-modal.component.html',
})
export class PaymentStatusModalComponent implements OnChanges {
  @Input()
  loading: boolean;
  @Input()
  state: State | undefined;

  @Output()
  readonly closeClicked = new EventEmitter<void>();
  @Output()
  readonly deleteClicked = new EventEmitter<void>();
  @Output()
  readonly editClicked = new EventEmitter<void>();
  @Output()
  readonly askForRefundClicked = new EventEmitter<void>();

  readonly bem = makeBlockBoundBEMFunction(baseClass);
  canDeclinePaymentAgreement = false;
  canDeletePaymentAgreement = false;
  canAskForRefund = false;
  canGoBackToInterview = false;
  hasBeenCharged = false;
  /** This agreement hasn't been confirmed, yet: it was detected as a potential payment by during the interview */
  isInterviewAgreement = false;
  docName: string;
  payee?: Readonly<Party> | undefined;
  payer?: Readonly<Party> | undefined;
  paymentTotal?: number;
  paymentRate?: number;
  paymentNet?: number;
  paymentCurrency?: string;
  primaryCTA?: string;
  referenceId?: string;
  showStatus = true;

  get status(): string {
    const { paymentAgreement } = this.state;
    const currentParty = getCurrentParty(this.state);
    if (partyHasRole(currentParty, RoleEnum.Payer) && paymentAgreement?.status === 'paid') {
      return 'payment-status.status.paid-payer';
    }
    if (paymentAgreement?.status === 'paid') {
      return 'payment-status.status.paid-payee';
    }
    return `payment-status.status.${paymentAgreement?.status || 'unknown'}`;
  }

  get statusPillColor(): string {
    const { paymentAgreement } = this.state;
    const currentParty = getCurrentParty(this.state);
    if (partyHasRole(currentParty, RoleEnum.Payer) && paymentAgreement?.status === 'paid') {
      return 'happy';
    }
    if (paymentAgreement?.status === 'collected' || paymentAgreement?.status === 'refunded') {
      return 'happy';
    }
    return 'primary';
  }

  private get primaryCTATranslationKey(): string {
    if (this.hasBeenCharged) {
      return 'payment-status.cta-paid';
    }
    if (this.canDeclinePaymentAgreement) {
      return 'payment-status.cta-accept-proposed';
    }
    return 'payment-status.cta-unpaid';
  }

  constructor(private readonly translateService: TranslateService) {}

  ngOnChanges({ state }: SimpleChanges): void {
    if (state) {
      const { binder, paymentAgreement } = this.state;
      this.docName = binder.documents[0]?.name || 'document';
      this.referenceId = paymentAgreement.externalId.substring(0, 13);
      this.getPaymentDetails();
      this.showStatus = paymentAgreement.status !== 'proposed' && paymentAgreement.status !== 'optional';
      this.canDeletePaymentAgreement = ['proposed', 'draft'].includes(paymentAgreement.status);
      this.canDeclinePaymentAgreement = paymentAgreement.status === PaymentAgreementStatus.Optional;
      this.isInterviewAgreement =
        paymentAgreement.status === PaymentAgreementStatus.Optional ||
        paymentAgreement.status === PaymentAgreementStatus.Proposed;

      this.canGoBackToInterview = this.isInterviewAgreement && this.state.backToInterviewOptionEnabled;

      this.hasBeenCharged = !['proposed', 'draft', 'pending', 'optional'].includes(paymentAgreement.status);
      this.translateService.get(this.primaryCTATranslationKey).subscribe((translation) => {
        this.primaryCTA = translation;
      });
      this.canAskForRefund = paymentAgreement.status === 'paid';
    }
  }

  private getPaymentDetails(): void {
    const payment = this.state.paymentAgreement?.payments[0];
    if (payment) {
      const payerID = payment.ins[0].partyId;
      const payeeID = payment.outs[0].partyId;
      const { amount } = payment.ins[0].payment;
      const fee = payment.fees[0].payment.amount;
      const netPayment = amount - fee;
      const parties = this.state.binder?.parties;

      if (parties) {
        this.payee = parties.find((party) => party.id === payeeID);
        this.payer = parties.find((party) => party.id === payerID);
      } else {
        this.payee = undefined;
        this.payer = undefined;
      }
      this.paymentTotal = amount / 100;
      this.paymentRate = fee / 100;
      this.paymentNet = netPayment / 100;
      this.paymentCurrency = payment.outs[0].payment.currency;
    } else {
      this.payee = undefined;
      this.payer = undefined;
      this.paymentTotal = undefined;
      this.paymentRate = undefined;
      this.paymentNet = undefined;
      this.paymentCurrency = undefined;
    }
  }
}

@Component({
  selector: 'rl-payment-status-modal-connected',
  template: `<rl-payment-status-modal
    [loading]="loading"
    [state]="state"
    (closeClicked)="primaryCTAClicked()"
    (editClicked)="goToInterview()"
    (deleteClicked)="removePaymentAgreement()"
    (askForRefundClicked)="goToAskForRefund()"
  >
  </rl-payment-status-modal>`,
})
export class PaymentStatusModalConnectedComponent implements OnDestroy, OnInit {
  loading = false;
  state: State;

  private readonly destroy = new Subject<void>();

  constructor(
    private readonly alertService: AlertService,
    private readonly modalControlService: ModalControlService,
    private readonly payService: PayService,
    private readonly messageService: MessageService,
    private readonly store: Store
  ) {}

  ngOnInit(): void {
    this.store
      .getState$()
      .pipe(
        takeUntil(this.destroy),
        filter(() => !this.loading)
      )
      .subscribe((state) => {
        this.state = state;
      });

    this.modalControlService.navigate$
      .pipe(takeUntil(this.destroy))
      .subscribe((intention) => this.onNavigate(intention));
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }

  close(): void {
    this.modalControlService.close(CloseReason.CompletedSuccessfully);
  }

  primaryCTAClicked(): void {
    const { paymentAgreement } = this.store.getState();
    if (
      paymentAgreement.status === PaymentAgreementStatus.Proposed ||
      paymentAgreement.status === PaymentAgreementStatus.Optional
    ) {
      this.loading = true;
      this.payService.setPaymentAgreementStatus(paymentAgreement.externalId, PaymentAgreementStatus.Draft).subscribe({
        next: () => this.close(),
        error: (error) => {
          // eslint-disable-next-line no-console
          console?.warn(error);
          this.close();
        },
      });
    } else {
      this.close();
    }
  }

  removePaymentAgreement(): void {
    this.modalControlService.navigate('next');
  }

  goToAskForRefund(): void {
    this.modalControlService.navigate('askForRefund');
  }

  goToInterview(): void {
    this.messageService.sendEvent({ action: 'changeAnswers' });
    this.close();
  }

  private onNavigate(intention: ModalNavigateIntention): void {
    if (intention.data.to === 'askForRefund') {
      this.modalControlService.close(CloseReason.UserNavigatedNext, {
        nextModal: 'askForRefund',
      });
    } else {
      this.modalControlService.close(CloseReason.UserNavigatedNext, {
        nextModal: 'next',
      });
    }
  }
}
