import { Injectable } from '@angular/core';
import { Binder } from '../../../services/sign-app/binder.interface';
import { Party } from '../../../services/sign-app/party.interface';

interface ActionMessage {
  action: string;
  payload?: unknown;
}

interface BinderMessage {
  eventName: string;
  binder: Binder;
  category: string;
}

interface ActivitiesCompleteMessage {
  signingComplete: {
    party: Party;
  };
  activitiesComplete: {
    party: Party;
  };
}

// since we can't seem to agree on a format for messages, there's also this type!
type RandomPayloadMessage = Record<string, unknown>;

@Injectable()
export class MessageService {
  // this service posts messages to the parent window (using Window.postMessage)

  /** @deprecated Please use the `ActionMessage` or `BinderMessage` interface. */
  sendEvent(event: string): void;
  /** Send an event in action/payload style. These are picked up by the us-frontend app. */
  sendEvent(event: ActionMessage): void;
  /** Send an event in eventName/binder/category style. I'm not sure who/what listens for these. */
  sendEvent(event: BinderMessage): void;
  /** Send a completion event. This event is an exceptional message format. */
  sendEvent(event: ActivitiesCompleteMessage): void;
  /** This covers the few remaining message detail types. I'm not sure who/what listens for these. */
  sendEvent(event: RandomPayloadMessage): void;
  // eslint-disable-next-line class-methods-use-this
  sendEvent(data: ActionMessage | BinderMessage | ActivitiesCompleteMessage | RandomPayloadMessage | string): void {
    const targetWindow: Window = window.parent || window;
    targetWindow.postMessage(data, '*');
  }
}
