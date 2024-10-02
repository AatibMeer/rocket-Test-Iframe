import {Injectable} from '@angular/core';

import {Store} from '../../state/store';
import {HeadersService} from '../common/headers.service';
import {CookiesService} from '../common/cookies.service';

import {BusinessEvent, Event, EventDescription} from './event.interfaces';
import {EnvInfoService} from '../common/env-info.service';

import {UIDGenerator} from '../../common/utility-components/uidGenerator';
import {UserAgentService} from '../common/user-agent.service';
import {HttpClient, HttpHeaders} from '@angular/common/http';

@Injectable()

export class NibblerBusinessEventsService {
  uidgen3: any;
constructor (private http: HttpClient,
  private headers: HeadersService,
  private cookiesService: CookiesService,
  private store: Store,
  private envInfo: EnvInfoService,
  private userAgentService: UserAgentService
  ) {
    this.uidgen3 = new UIDGenerator(64, UIDGenerator.BASE16);
  }

  // If there is not coordinating partnered backend service call, pass null for partneredRequestHeaders
  // Develop should intentionally make this null to ignore for things like view page calls
  // If the event coordinates with another backend, partneredRequestHeaders is required
  postBusinessEvent(businessEvent: BusinessEvent, partneredRequestHeaders: HttpHeaders) {
    businessEvent.attemptNumber++;
    businessEvent.event.eventTimestamp = new Date().toISOString();

    // exists & !null
    if(partneredRequestHeaders != void 0) {
      businessEvent.trace = { requestId: partneredRequestHeaders.get('request-id') };
    }

    let headers: HttpHeaders = this.headers.createHeadersForBusinessEvent();
    let url = '/document-manager/external-backends/nibbler/v1/events';
    let body = JSON.stringify(businessEvent);

    return this.http.post(url, body, {headers: headers});
  }

  /* Created for every attempt, wraps an Event
   * To use this, create a new EventDescription type in event.interfaces that extends EventDescription
   * Then pass the new object here as JSON { eventType: 'type', event description specifics here }
   *
   * Pass in overrides if there is a need for it, ex:
   * createBusinessEvent(eventDescriptor, { market: this.currentDocument.interviewRegion});
   */
  createBusinessEvent(eventDescription: EventDescription, optionalOverrides: Record<string, string> = {}): BusinessEvent {
    let event = this.createEvent(eventDescription);
    let descriptorStub = {
      market: 'us',
      serviceName: 'rl-docman-app',
      event: event,
      attemptId: this.uidgen3.generateSync(),
      // First attempt is 1, incremented before each call
      attemptNumber: 0,
    };
    Object.keys(optionalOverrides).forEach( (key: string) => {
      // If the value is undefined or null, retain value
      descriptorStub[key] = optionalOverrides[key] || descriptorStub[key];
    });
    return descriptorStub;
  }

  createEvent(eventDescription: EventDescription): Event {
    const state = this.store.getState();
    const tokenAuthInfo = state.authInfo;
    const serviceTokenData = tokenAuthInfo ? tokenAuthInfo.serviceData : null;
    const originalClientId = serviceTokenData ? serviceTokenData.originalClientId : null;

    if(eventDescription.eventType == void 0) {
      console.log('Event type is required for events');
      return null;
    }

    return {
      sharedSessionId: this.cookiesService.getSessionId(),
      browserSessionId: this.cookiesService.getBrowserId(),
      referrerUrl: document.referrer,
      clientId: originalClientId || this.envInfo.getAuthClientId(),
      pageUrl: window.location.href,
      userAgent: this.userAgentService.getUserAgent(),

      eventDescription: eventDescription
    };
  }
}
