import { Injectable, OnDestroy } from '@angular/core';
import { distinctUntilChanged, filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import type { TrackingPublisher } from '../publisher';
import type { EventParametersFor, EventPayloadFor, TrackingEvent, TrackingEventType } from '../event-types';
import {
  isAction,
  isAlertDismissed,
  isAlertShown,
  isFileDownload,
  isKYCStarted,
  isKYCSubmitted,
  isPay,
  isPaymentAgreementCreated,
  isPaymentAgreementDeleted,
  isUserClosedModal,
  isVirtualPageView,
} from '../event-types';

type WindowWithGTM = Window &
  typeof globalThis & {
    readonly dataLayer: unknown[];
    gtag: (
      type: 'event' | 'config' | 'set',
      valueOrParameters: string | Record<string, string>,
      parameters?: Record<string, unknown>
    ) => void;
  };

function addGTM(window: WindowWithGTM, document: HTMLDocument, gtmID: string): void {
  type WindowWithAssignableDL = Window & typeof globalThis & { dataLayer: unknown[] };
  // eslint-disable-next-line no-param-reassign
  (window as WindowWithAssignableDL).dataLayer = window.dataLayer || [];
  // eslint-disable-next-line no-param-reassign
  window.gtag = function gtag(): void {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  const gtmScript = document.createElement('script');
  gtmScript.async = true;
  gtmScript.src = `https://www.googletagmanager.com/gtm.js?id=${gtmID}`;
  gtmScript.onload = function gtmLoad() {
    window.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js',
    });
  };
  document.body.appendChild(gtmScript);
}

@Injectable()
export class GoogleTagManagerService implements OnDestroy {
  private readonly destroy = new Subject<void>();

  constructor(publisher: TrackingPublisher, config?: { gtmID: string }) {
    if (config?.gtmID?.length > 0) {
      addGTM(window as WindowWithGTM, document, config.gtmID);
    }
    const events$ = publisher.events$.pipe(takeUntil(this.destroy));
    events$
      .pipe(
        distinctUntilChanged((eventA, eventB) => {
          return (
            eventA === eventB ||
            (eventA.binderID === eventB.binderID &&
              eventA.partyID === eventB.partyID &&
              eventA.partyEmailAddress === eventB.partyEmailAddress &&
              eventA.paymentAgreementID === eventB.paymentAgreementID)
          );
        })
      )
      .subscribe(GoogleTagManagerService.updateCommonParameters);
    events$.pipe(filter(isAction)).subscribe(GoogleTagManagerService.action);
    events$.pipe(filter(isAlertDismissed)).subscribe(GoogleTagManagerService.alertDismissed);
    events$.pipe(filter(isAlertShown)).subscribe(GoogleTagManagerService.alertShown);
    events$.pipe(filter(isFileDownload)).subscribe(GoogleTagManagerService.fileDownload);
    events$.pipe(filter(isKYCStarted)).subscribe(GoogleTagManagerService.kycStarted);
    events$.pipe(filter(isKYCSubmitted)).subscribe(GoogleTagManagerService.kycSubmitted);
    events$.pipe(filter(isPay)).subscribe(GoogleTagManagerService.pay);
    events$.pipe(filter(isPaymentAgreementCreated)).subscribe(GoogleTagManagerService.paymentAgreementCreated);
    events$.pipe(filter(isPaymentAgreementDeleted)).subscribe(GoogleTagManagerService.paymentAgreementDeleted);
    events$.pipe(filter(isUserClosedModal)).subscribe(GoogleTagManagerService.userClosedModal);
    events$.pipe(filter(isVirtualPageView)).subscribe(GoogleTagManagerService.virtualPageView);
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }

  /**
   * If you are renaming event parameters, use this to remove the originals from the event parameters so they aren't
   * sent with the gtag event.
   */
  private static removeParameters<P extends EventParametersFor<TrackingEventType>, K extends keyof P>(
    parameters: P,
    ...paramsToRemove: K[]
  ): Omit<P, K> {
    const newParams = { ...parameters };
    paramsToRemove.forEach((param) => {
      delete newParams[param];
    });
    return newParams as Omit<P, K>;
  }

  private static action(event: EventPayloadFor<TrackingEventType.Action>): void {
    (window as WindowWithGTM).gtag('event', 'action_selected', {
      ...event.parameters,
      text: event.parameters.text || '',
    });
  }

  private static alertDismissed(event: EventPayloadFor<TrackingEventType.AlertDismissed>): void {
    const parameters = GoogleTagManagerService.removeParameters(event.parameters, 'fullText', 'type');
    (window as WindowWithGTM).gtag('event', 'notification_dismiss', {
      ...parameters,
      label: event.parameters.fullText,
    });
  }

  private static alertShown(event: EventPayloadFor<TrackingEventType.AlertShown>): void {
    const parameters = GoogleTagManagerService.removeParameters(event.parameters, 'fullText');
    (window as WindowWithGTM).gtag('event', 'notification_open', {
      ...parameters,
      label: event.parameters.fullText,
    });
  }

  private static fileDownload(event: EventPayloadFor<TrackingEventType.FileDownload>): void {
    if (event.parameters.cause === 'manual') {
      // this event is automatically collected by Google Analytics 4
      return;
    }
    const url = new URL(event.parameters.linkURL);
    const parameters = GoogleTagManagerService.removeParameters(
      event.parameters,
      'fileExtension',
      'fileName',
      'linkURL',
      'linkText',
      'cause'
    );
    (window as WindowWithGTM).gtag('event', 'file_download', {
      ...parameters,
      file_extension: event.parameters.fileExtension,
      file_name: event.parameters.fileName,
      link_text: event.parameters.linkText,
      link_url: url.toString(),
      link_domain: url.hostname,
    });
  }

  private static kycStarted(event: EventPayloadFor<TrackingEventType.KYCStarted>): void {
    (window as WindowWithGTM).gtag('event', 'kyc_started', event.parameters);
  }

  private static kycSubmitted(event: EventPayloadFor<TrackingEventType.KYCSubmitted>): void {
    (window as WindowWithGTM).gtag('event', 'kyc_submitted', event.parameters);
  }

  private static pay(event: EventPayloadFor<TrackingEventType.Pay>): void {
    const value = parseFloat(event.parameters.value);
    if (Number.isNaN(value)) {
      return;
    }
    const parameters = GoogleTagManagerService.removeParameters(event.parameters, 'transactionID');
    (window as WindowWithGTM).gtag('event', 'purchase', {
      ...parameters,
      transaction_id: event.parameters.transactionID,
      value,
      items: [
        {
          item_id: event.paymentAgreementID,
          quantity: 1,
        },
      ],
    });
  }

  private static paymentAgreementCreated(event: EventPayloadFor<TrackingEventType.PaymentAgreementCreated>): void {
    (window as WindowWithGTM).gtag('event', 'payment_agreement_created', {
      ...event.parameters,
      creatorRole: event.parameters.creatorRole || '',
    });
  }

  private static paymentAgreementDeleted(event: EventPayloadFor<TrackingEventType.PaymentAgreementDeleted>): void {
    (window as WindowWithGTM).gtag('event', 'payment_agreement_deleted', event.parameters);
  }

  private static updateCommonParameters(
    parameters: Pick<TrackingEvent, 'binderID' | 'partyID' | 'partyEmailAddress' | 'paymentAgreementID'>
  ): void {
    (window as WindowWithGTM).gtag('set', {
      binderID: parameters.binderID,
      partyID: parameters.partyID || '',
      partyEmailAddress: parameters.partyEmailAddress || '',
      paymentAgreementID: parameters.paymentAgreementID || '',
    });
  }

  private static userClosedModal(event: EventPayloadFor<TrackingEventType.UserClosedModal>): void {
    const parameters = GoogleTagManagerService.removeParameters(event.parameters, 'location');
    (window as WindowWithGTM).gtag('event', 'modal_close', {
      ...parameters,
      page_title: event.pageTitle || '',
      page_location: event.parameters.location || '',
    });
  }

  private static virtualPageView(event: EventPayloadFor<TrackingEventType.VirtualPageView>): void {
    const parameters = GoogleTagManagerService.removeParameters(event.parameters, 'location', 'pageTitle');
    (window as WindowWithGTM).gtag('event', 'page_view', {
      ...parameters,
      page_title: event.pageTitle || '',
      page_location: event.parameters.location,
    });
  }
}
