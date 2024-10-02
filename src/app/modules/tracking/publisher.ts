import { Subject } from 'rxjs';
import { Inject, Injectable, OnDestroy } from '@angular/core';
import { distinctUntilChanged, map, pluck, takeUntil } from 'rxjs/operators';
import type { EventParametersFor, TrackingEvent } from './event-types';
import { TrackingEventType } from './event-types';
import { Store } from '../../state/store';
import { getCurrentParty } from '../../state/selectors';
import type { Party } from '../../services/sign-app/party.interface';
import type { State } from '../../state/reducers/main.interface';
import { isSubscriberConfig, TRACKING_CONFIG, TrackingModuleConfig } from './config';

function sameBinder({ binder: binderA }: State, { binder: binderB }: State): boolean {
  return binderA?.id === binderB?.id;
}

function sameCurrentParty(stateA: State, stateB: State): boolean {
  const partyA = getCurrentParty(stateA);
  const partyB = getCurrentParty(stateB);
  return (
    partyA === partyB ||
    (partyA?.id === partyB?.id && partyA?.personId === partyB?.personId && partyA?.email === partyB?.email)
  );
}

function samePaymentAgreement(
  { paymentAgreement: agreementA }: State,
  { paymentAgreement: agreementB }: State
): boolean {
  return agreementA === agreementB || agreementA?.externalId === agreementB?.externalId;
}

@Injectable()
export class TrackingPublisher implements OnDestroy {
  private readonly events = new Subject<TrackingEvent>();
  readonly events$ = this.events.pipe();
  private binderID = '';
  private currentModalTitle?: string;
  private currentParty?: Readonly<Party>;
  private readonly destroy = new Subject<void>();
  private paymentAgreementID?: string;
  private serviceToken?: string;

  constructor(store: Store, @Inject(TRACKING_CONFIG) config: TrackingModuleConfig) {
    const state$ = store.getState$().pipe(takeUntil(this.destroy));
    state$.pipe(distinctUntilChanged(sameBinder), pluck('binder', 'id')).subscribe({
      next: (binderID) => {
        this.binderID = binderID;
      },
    });
    state$.pipe(distinctUntilChanged(sameCurrentParty), map(getCurrentParty)).subscribe({
      next: (currentParty) => {
        this.currentParty = currentParty;
      },
    });
    state$.pipe(distinctUntilChanged(samePaymentAgreement), pluck('paymentAgreement', 'externalId')).subscribe({
      next: (paymentAgreementID) => {
        this.paymentAgreementID = paymentAgreementID;
      },
    });
    state$.subscribe({
      next: ({ authInfo }) => {
        this.serviceToken = authInfo?.serviceToken;
      },
    });
    config.subscribers.forEach((ctorOrConfig) => {
      if (isSubscriberConfig(ctorOrConfig)) {
        return new ctorOrConfig.constructor(this, ...ctorOrConfig.args);
      }
      // eslint-disable-next-line new-cap
      return new ctorOrConfig(this);
    });
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }

  private trackEvent<T extends TrackingEventType>(type: T, parameters: EventParametersFor<T>): void {
    this.events.next({
      type: type as TrackingEventType.Unknown,
      parameters,
      deviceTime: Date.now(),
      pageTitle: this.currentModalTitle ?? '',
      binderID: this.binderID,
      partyEmailAddress: this.currentParty?.email,
      partyID: this.currentParty?.id,
      paymentAgreementID: this.paymentAgreementID,
    });
  }

  action(parameters: EventParametersFor<TrackingEventType.Action>): void {
    return this.trackEvent(TrackingEventType.Action, {
      ...parameters,
    });
  }

  alertDismissed(parameters: EventParametersFor<TrackingEventType.AlertDismissed>): void {
    return this.trackEvent(TrackingEventType.AlertDismissed, {
      ...parameters,
    });
  }

  alertShown(parameters: EventParametersFor<TrackingEventType.AlertShown>): void {
    return this.trackEvent(TrackingEventType.AlertShown, {
      ...parameters,
    });
  }

  fileDownload(parameters: EventParametersFor<TrackingEventType.FileDownload>): void {
    return this.trackEvent(TrackingEventType.FileDownload, {
      ...parameters,
    });
  }

  kycStarted(parameters: EventParametersFor<TrackingEventType.KYCStarted>): void {
    return this.trackEvent(TrackingEventType.KYCStarted, {
      ...parameters,
    });
  }

  kycSubmitted(parameters: EventParametersFor<TrackingEventType.KYCSubmitted>): void {
    return this.trackEvent(TrackingEventType.KYCSubmitted, {
      ...parameters,
    });
  }

  pay(parameters: EventParametersFor<TrackingEventType.Pay>): void {
    return this.trackEvent(TrackingEventType.Pay, {
      ...parameters,
    });
  }

  paymentAgreementCreated(parameters: EventParametersFor<TrackingEventType.PaymentAgreementCreated>): void {
    this.paymentAgreementID = parameters.paymentAgreementID;
    return this.trackEvent(TrackingEventType.PaymentAgreementCreated, {
      ...parameters,
    });
  }

  paymentAgreementDeleted(parameters: EventParametersFor<TrackingEventType.PaymentAgreementDeleted>): void {
    return this.trackEvent(TrackingEventType.PaymentAgreementDeleted, {
      ...parameters,
    });
  }

  userTerminatedModal(parameters: EventParametersFor<TrackingEventType.UserClosedModal>): void {
    this.modalClosed();
    return this.trackEvent(TrackingEventType.UserClosedModal, {
      ...parameters,
    });
  }

  /** When the modal flow is ended naturally, call this to prevent the modal title being sent with subsequent events. */
  modalClosed(): void {
    this.currentModalTitle = undefined;
  }

  virtualPageView(parameters: EventParametersFor<TrackingEventType.VirtualPageView>): void {
    this.currentModalTitle = parameters.pageTitle;
    return this.trackEvent(TrackingEventType.VirtualPageView, {
      ...parameters,
      location: this.removeServiceTokenFromURL(parameters.location),
    });
  }

  private removeServiceTokenFromURL(url: string): string {
    return url.replace(`serviceToken=${this.serviceToken}`, '');
  }
}
