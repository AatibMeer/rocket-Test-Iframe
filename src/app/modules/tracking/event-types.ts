import type { Alert } from '../../state/actions/alerts';
import type { PaymentAgreementStatus } from '../../services/sign-app/payment-agreement.interface';

/** The tracking event type. */
export const enum TrackingEventType {
  Action,
  AlertDismissed,
  AlertShown,
  FileDownload,
  FormSubmit,
  KYCStarted,
  KYCSubmitted,
  Pay,
  PaymentAgreementCreated,
  PaymentAgreementDeleted,
  UserClosedModal,
  VirtualPageView,
  Unknown,
}

// Event Parameter types start here!

type ActionEventParameters = {
  id: string;
  text?: string;
};

type AlertEventParameters = {
  fullText: string;
  topic?: string;
  type: Alert['type'];
};

type AlertDismissEventParameters = AlertEventParameters & { closeType: 'auto' | 'button' };

type FileDownloadEventParameters = {
  fileName?: string;
  fileExtension?: string;
  linkURL: string;
  linkText?: string;
  cause: 'auto' | 'manual';
};

type KYCStartedEventParameters = {
  type: 'basic';
};

type KYCSubmittedEventParameters = {
  type: 'basic';
};

type PayEventParameters = {
  methodID: string;
  methodType: 'card' | 'bankAccount' | 'wallet';
  currency: string;
  transactionID: string;
  value: string;
  coupon?: string;
};

type PaymentAgreementCreatedEventParameters = {
  paymentAgreementID: string;
  source: 'setupAPayment' | 'optional' | 'proposed';
  creatorRole?: 'payee' | 'payer' | 'thirdParty';
};

type PaymentAgreementDeletedEventParameters = {
  paymentAgreementID: string;
  status: PaymentAgreementStatus;
};

type UserClosedModalEventParameters = {
  location?: string;
  pageTitle?: string;
};

type VirtualPageViewEventParameters = {
  location: string;
  pageTitle?: string;
};

// Event Parameter types end here!

type EventPayload<T extends TrackingEventType, Params extends Record<string, string>> = {
  type: T;
  parameters: Params & Record<string, string>;
  deviceTime: number;
  pageTitle?: string;
  binderID: string;
  partyID?: string;
  partyEmailAddress?: string;
  paymentAgreementID?: string;
};

/** Typed event payloads. */
export type TrackingEvent =
  | EventPayload<TrackingEventType.Action, ActionEventParameters>
  | EventPayload<TrackingEventType.AlertDismissed, AlertDismissEventParameters>
  | EventPayload<TrackingEventType.AlertShown, AlertEventParameters>
  | EventPayload<TrackingEventType.KYCStarted, KYCStartedEventParameters>
  | EventPayload<TrackingEventType.KYCSubmitted, KYCSubmittedEventParameters>
  | EventPayload<TrackingEventType.FileDownload, FileDownloadEventParameters>
  | EventPayload<TrackingEventType.Pay, PayEventParameters>
  | EventPayload<TrackingEventType.PaymentAgreementCreated, PaymentAgreementCreatedEventParameters>
  | EventPayload<TrackingEventType.PaymentAgreementDeleted, PaymentAgreementDeletedEventParameters>
  | EventPayload<TrackingEventType.UserClosedModal, UserClosedModalEventParameters>
  | EventPayload<TrackingEventType.VirtualPageView, VirtualPageViewEventParameters>
  | EventPayload<TrackingEventType.Unknown, Record<string, string>>;

/** Get an `EventPayload` for a given `EventType`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventPayloadFor<T extends TrackingEventType> = Extract<TrackingEvent, EventPayload<T, any>>;

/** Get the `parameters` type from an `EventPayload` for a given `EventType`. */
export type EventParametersFor<T extends TrackingEventType> = EventPayloadFor<T>['parameters'];

export function isAction(event: TrackingEvent): event is EventPayloadFor<TrackingEventType.Action> {
  return event.type === TrackingEventType.Action && event.parameters.id?.length > 0;
}

export function isAlertDismissed(event: TrackingEvent): event is EventPayloadFor<TrackingEventType.AlertDismissed> {
  return (
    event.type === TrackingEventType.AlertDismissed &&
    event.parameters.type?.length > 0 &&
    event.parameters.fullText?.length > 0 &&
    event.parameters.closeType?.length > 0
  );
}

export function isAlertShown(event: TrackingEvent): event is EventPayloadFor<TrackingEventType.AlertShown> {
  return (
    event.type === TrackingEventType.AlertShown &&
    event.parameters.type?.length > 0 &&
    event.parameters.fullText?.length > 0
  );
}

export function isFileDownload(event: TrackingEvent): event is EventPayloadFor<TrackingEventType.FileDownload> {
  return (
    event.type === TrackingEventType.FileDownload &&
    event.parameters.linkURL?.length > 0 &&
    event.parameters.cause?.length > 0
  );
}

export function isKYCStarted(event: TrackingEvent): event is EventPayloadFor<TrackingEventType.KYCStarted> {
  return event.type === TrackingEventType.KYCStarted && event.parameters.type === 'basic';
}

export function isKYCSubmitted(event: TrackingEvent): event is EventPayloadFor<TrackingEventType.KYCSubmitted> {
  return event.type === TrackingEventType.KYCSubmitted && event.parameters.type === 'basic';
}

export function isPay(event: TrackingEvent): event is EventPayloadFor<TrackingEventType.Pay> {
  return (
    event.type === TrackingEventType.Pay &&
    event.parameters.methodID?.length > 0 &&
    event.parameters.methodType?.length > 0 &&
    event.parameters.currency?.length > 0 &&
    event.parameters.transactionID?.length > 0 &&
    event.parameters.value?.length > 0
  );
}

export function isPaymentAgreementCreated(
  event: TrackingEvent
): event is EventPayloadFor<TrackingEventType.PaymentAgreementCreated> {
  return (
    event.type === TrackingEventType.PaymentAgreementCreated &&
    event.parameters.paymentAgreementID?.length > 0 &&
    event.parameters.source?.length > 0
  );
}

export function isPaymentAgreementDeleted(
  event: TrackingEvent
): event is EventPayloadFor<TrackingEventType.PaymentAgreementDeleted> {
  return event.type === TrackingEventType.PaymentAgreementDeleted && event.parameters.paymentAgreementID?.length > 0;
}

export function isUserClosedModal(event: TrackingEvent): event is EventPayloadFor<TrackingEventType.UserClosedModal> {
  return event.type === TrackingEventType.UserClosedModal;
}

export function isVirtualPageView(event: TrackingEvent): event is EventPayloadFor<TrackingEventType.VirtualPageView> {
  return event.type === TrackingEventType.VirtualPageView && event.parameters.location?.length > 0;
}
