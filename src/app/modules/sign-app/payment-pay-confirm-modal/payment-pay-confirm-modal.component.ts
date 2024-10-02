// eslint-disable-next-line max-classes-per-file
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin, fromEvent, Observable, of, Subject } from 'rxjs';
import { map, mapTo, mergeMap, takeUntil } from 'rxjs/operators';
import { BoundBEM, makeBlockBoundBEMFunction } from '../../../common/utility-components/util-functions';
import { Store } from '../../../state/store';
import { PayService } from '../../../services/sign-app/pay.service';
import {
  CloseReason,
  ModalControlService,
  ModalNavigateIntention,
} from '../../../services/sign-app/modal-control.service';
import { getCurrentParty, getPartyByRoleName, userHasSigned, userIsSigner } from '../../../state/selectors';
import { AlertService } from '../../../services/sign-app/alert.service';
import { Party, RoleEnum } from '../../../services/sign-app/party.interface';
import {
  PaymentAgreement,
  PaymentAgreementStatus,
  PaymentMethodType,
} from '../../../services/sign-app/payment-agreement.interface';
import { SignService } from '../../../services/sign-app/sign.service';
import { MessageService } from '../message';
import { TrackingPublisher } from '../../tracking/publisher';
import {
  GenericPaymentMethod,
} from '../../../common/utility-components/payment-method/payment-method-helper';
import { LocalFeatureFlagService } from '../../../services/common/local-feature-flag.service';
import { AchCharge } from '../../../services/sign-app/ach-payment-method.interface';
import { Binder } from '../../../services/sign-app/binder.interface';

const baseClass = 'rl-payment-pay-confirm-modal';

@Component({
  selector: 'rl-payment-pay-confirm-modal',
  styleUrls: ['./payment-pay-confirm-modal.component.scss'],
  templateUrl: './payment-pay-confirm-modal.component.html',
})
export class PaymentPayConfirmModalComponent implements AfterViewInit, OnInit, OnDestroy {
  /**
   * BEM with fixed B
   */
  readonly bem: BoundBEM;

  @Input()
  loading: boolean;
  @Input()
  payer: Party;
  @Input()
  paymentAmount: number;
  @Input()
  paymentCurrencyCode: string;
  @Input()
  paymentMethod: GenericPaymentMethod;
  @Input()
  recipient: Party;

  @Output()
  payNowClick: EventEmitter<void>;
  @Output()
  changeSourceClick: EventEmitter<void>;

  @ViewChild('payMethodSummary')
  payMethodSummary: ElementRef;

  readonly rootClassnames: string;

  paymentServiceSummaryAccessible: string;
  serviceAgreement: string;

  private readonly destroy: Subject<void> = new Subject<void>();

  constructor(private readonly translationService: TranslateService) {
    this.bem = makeBlockBoundBEMFunction(baseClass);
    this.changeSourceClick = new EventEmitter<void>();
    this.payNowClick = new EventEmitter<void>();
    this.paymentServiceSummaryAccessible = '';
    this.rootClassnames = baseClass;
    this.serviceAgreement = '';
  }

  private static addNonBreakingSpaces(candidate: string): string {
    return candidate.replace(/ /g, '\xa0');
  }

  private getServiceAgreementText(): Observable<string> {
    // we need these for the service agreement placeholders along with cta$
    const termsOfService$ = this.translationService.get('payment-pay-confirm-modal.terms-of-service').pipe(
      map(PaymentPayConfirmModalComponent.addNonBreakingSpaces),
      map((translation) =>
        this.makeServiceAgreementLink(translation, 'https://www.rocketlawyer.com/rocket-wallet-terms')
      )
    );
    const privacyPolicy$ = this.translationService.get('payment-pay-confirm-modal.privacy-policy').pipe(
      map(PaymentPayConfirmModalComponent.addNonBreakingSpaces),
      map((translation) => this.makeServiceAgreementLink(translation, 'https://www.rocketlawyer.com/privacy.rl'))
    );
    const stripeCAA$ = this.translationService.get('payment-pay-confirm-modal.stripe-caa').pipe(
      map(PaymentPayConfirmModalComponent.addNonBreakingSpaces),
      map((translation) => this.makeServiceAgreementLink(translation, 'https://stripe.com/connect-account/legal/full'))
    );

    return forkJoin([termsOfService$, privacyPolicy$, stripeCAA$]).pipe(
      mergeMap(([termsOfService, privacyPolicy, stripeCAA]) => {
        return this.translationService.get('payment-pay-confirm-modal.service-agreement', {
          termsOfService,
          privacyPolicy,
          stripeCAA,
        });
      })
    );
  }

  private makeServiceAgreementLink(text: string, href: string): string {
    return `<a class="${this.bem('service-agreement-link')}" href="${href}" target="_blank">${text}</a>`;
  }

  ngAfterViewInit(): void {
    fromEvent(this.payMethodSummary.nativeElement, 'rlPayMethodSummaryCogClick')
      .pipe(takeUntil(this.destroy))
      .subscribe(() => {
        this.changeSourceClick.emit();
      });
  }

  ngOnInit(): void {
    this.getServiceAgreementText().subscribe((serviceAgreement) => {
      this.serviceAgreement = serviceAgreement;
    });

    this.translationService
      .get('payment-pay-confirm-modal.payment-from-source-full-accessible', {
        ID: this.paymentMethod.last4,
        service: this.paymentMethod.name,
      })
      .pipe(takeUntil(this.destroy))
      .subscribe((accessibleSummary) => {
        this.paymentServiceSummaryAccessible = accessibleSummary;
      });
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }
}

@Component({
  selector: 'rl-payment-pay-confirm-modal-connected-component',
  template: ` <rl-payment-pay-confirm-modal
    (changeSourceClick)="changeSource()"
    [loading]="loading"
    [payer]="payer"
    [paymentAmount]="paymentAmountDisplay"
    [paymentCurrencyCode]="paymentCurrency"
    [paymentMethod]="paymentMethod"
    (payNowClick)="payNow()"
    [recipient]="recipient"
  ></rl-payment-pay-confirm-modal>`,
})
export class PaymentPayConfirmModalConnectedComponent implements OnDestroy, OnInit {
  loading: boolean;
  payer: Readonly<Party> | undefined;
  paymentCurrency: string;
  recipient: Readonly<Party> | undefined;
  paymentMethod: GenericPaymentMethod;

  private readonly destroy: Subject<void>;

  private paymentAgreementID: string;
  private paymentAgreementStatus?: PaymentAgreementStatus;
  private paymentAmount: number;

  get paymentAmountDisplay(): number {
    return parseFloat((this.paymentAmount / 100).toFixed(2));
  }

  constructor(
    private readonly alertService: AlertService,
    private readonly eventTracker: TrackingPublisher,
    private readonly modalControlService: ModalControlService,
    private readonly payService: PayService,
    private readonly signService: SignService,
    private readonly store: Store,
    private readonly messageService: MessageService,
    private readonly featureFlagService: LocalFeatureFlagService
  ) {
    this.destroy = new Subject<void>();
    this.loading = false;
    this.paymentAgreementID = '';
    this.paymentAmount = 0;
    this.paymentCurrency = '';
  }

  changeSource(): void {
    this.modalControlService.navigate('back');
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }

  ngOnInit(): void {
    const { binder } = this.store.getState();
    this.loading = true;
    this.payService
      .getPaymentAgreementByBinderID(binder.id)
      .pipe(
        map((agreement) => {
          return {
            id: agreement.externalId,
            status: agreement.status,
            ...agreement.payments[0].ins[0].payment,
          };
        })
      )
      .subscribe({
        next: ({ amount, currency, id, status }) => {
          this.paymentAgreementID = id;
          this.paymentAgreementStatus = status;
          this.paymentAmount = amount;
          this.paymentCurrency = currency;
        },
        error: (e) => {
          this.loading = false;
          // eslint-disable-next-line no-console
          console.error(e);
        },
        complete: () => {
          this.loading = false;
        },
      });
    this.payer = getPartyByRoleName(binder, RoleEnum.Payer);
    this.recipient = getPartyByRoleName(binder, RoleEnum.Payee);

    this.modalControlService.navigate$.pipe(takeUntil(this.destroy)).subscribe((intention) => {
      this.onNavigate(intention);
    });

    const { paymentMethod } = this.store.getState();
    this.paymentMethod = paymentMethod;
  }

  payNow(): void {
    this.loading = true;
    const state = this.store.getState();
    const getBinderNoStoreUpdate = this.makeGetBinderNoStoreUpdate(state.binder.id);
    const correctAgreementStatus$ =
      this.paymentAgreementStatus === PaymentAgreementStatus.Draft
        ? this.payService.setPaymentAgreementStatus(this.paymentAgreementID, PaymentAgreementStatus.Pending)
        : of({} as PaymentAgreement);
    correctAgreementStatus$
      .pipe(
        mergeMap(() => {
          return this.chargePayer();
        }),
        // get a fresh Binder
        mergeMap(getBinderNoStoreUpdate),
        mergeMap((newBinder) => {
          // check whether we need to finalise it (the API does it when charging)
          if (newBinder.status === 'IN_PREPARATION') {
            return this.signService.sendFinalisation('', newBinder)
              .pipe(mergeMap(getBinderNoStoreUpdate));
          }
          return of(newBinder);
        }),
        mergeMap((newBinder) => {
          // check whether we need to send invitations
          if (newBinder.status === 'REVIEW_AND_SHARE') {
            return this.signService.sendInvitations(newBinder.id, '');
          }
          return of<void>(undefined);
        }),
        mergeMap(() => {
          // get a new Binder for the Store
          return this.signService.getBinder(state.binder.id, {
            saveStore: true,
            fetchHistory: true,
          })
            .pipe(mapTo(undefined));
        }),
      )
      .subscribe({
        next: () => {
          this.eventTracker.pay({
            methodID: this.paymentMethod.id,
            methodType: this.getPaymentMethodType(),
            currency: this.paymentCurrency,
            value: this.paymentAmountDisplay.toString(10),
            transactionID: this.paymentAgreementID,
          });
          this.showSuccessAlert();
          this.modalControlService.navigate('end');
        },
        error: () => {
          this.modalControlService.navigate('error');
        },
        complete: () => {
          this.loading = false;

          if (!userIsSigner(state) || (userIsSigner(state) && userHasSigned(state))) {
            this.sendSigningEventToParentWindow();
          }
        },
      });
  }

  private getPaymentMethodType(): 'card' | 'bankAccount' | 'wallet' {
    switch (this.paymentMethod.type) {
      case PaymentMethodType.ACH:
        return 'bankAccount';
      case PaymentMethodType.Card:
        return 'card';
      default:
        throw new Error(`Unexpected payment method type: ${this.paymentMethod.type}`);
    }
  }

  private chargePayer(): Observable<PaymentAgreement | null> {
    switch (this.paymentMethod.type) {
      case PaymentMethodType.ACH:
        return this.payService.chargeAchPaymentToPaymentAgreement(
          this.paymentAgreementID,
          this.payer.id,
          this.prepareAchCharge(),
          this.getAchPaymentMethodId(),
          this.paymentAmount,
          this.paymentCurrency
        );
      case PaymentMethodType.Card:
        return this.payService.chargePaymentToPaymentAgreement(
          this.paymentAgreementID,
          this.payer.id,
          this.paymentMethod.id,
          this.paymentAmount,
          this.paymentCurrency
        );
      default:
        throw new Error(`Unexpected payment method type: ${this.paymentMethod.type}`);
    }
  }

  private showSuccessAlert(): void {
    switch (this.paymentMethod.type) {
      case PaymentMethodType.ACH:
        this.alertService.addSuccessAlert({
          message: 'payment-pay-confirm-modal.ach-charge-success',
        });
        break;
      case PaymentMethodType.Card:
        this.alertService.addSuccessAlert({
          message: 'payment-pay-confirm-modal.card-charge-success',
        });
        break;
      default:
        throw new Error(`Unexpected payment method type: ${this.paymentMethod.type}`);
    }
  }

  private prepareAchCharge(): AchCharge {
    const { identityProfile } = this.store.getState();
    return {
      customerId: identityProfile.achPaymentMethod.customerId,
      source: this.paymentMethod.id,
    };
  }

  private getAchPaymentMethodId(): string {
    const { identityProfile } = this.store.getState();
    return identityProfile.achPaymentMethod.externalId;
  }

  private sendSigningEventToParentWindow(): void {
    const party = getCurrentParty(this.store.getState());
    const data = {
      // TODO: remove signingComplete field when US team makes changes on their side
      signingComplete: {
        party,
      },
      activitiesComplete: {
        party,
      },
    };
    this.messageService.sendEvent(data);
  }

  private onNavigate(intention: ModalNavigateIntention): void {
    if (intention.data.to === 'back') {
      if (this.featureFlagService.flags.pay_with_bank_account) {
        this.modalControlService.close(CloseReason.UserNavigatedBack, {
          nextModal: 'choosePaymentMethod',
        });
      } else {
        this.modalControlService.close(CloseReason.UserNavigatedBack);
      }
    } else if (intention.data.to === 'end') {
      this.modalControlService.close(CloseReason.CompletedSuccessfully);
    } else if (intention.data.to === 'error') {
      this.modalControlService.close(CloseReason.CompletedWithError, { nextModal: 'paymentFailed' });
    }
  }

  /**
   * Make a function to get a fresh `Binder` without updating the store.
   * Binds the Binder ID so you don't need to keep a reference to one.
   */
  private makeGetBinderNoStoreUpdate(binderID: string): () => Observable<Binder> {
    return () => {
      return this.signService.getBinder(binderID, {
        fetchHistory: false,
        fetchPages: false,
        saveStore: false,
      });
    };
  }
}
