import { InjectionToken } from '@angular/core';
import type { TrackingPublisher } from './publisher';

type TrackingSubscriberCtor = new (publisher: TrackingPublisher, ...args: unknown[]) => unknown;
type TrackingSubscriberConfig = { constructor: TrackingSubscriberCtor; args: unknown[] };
type TrackingSubscribers = Array<TrackingSubscriberCtor | TrackingSubscriberConfig>;

export function isSubscriberConfig(
  candidate: TrackingSubscriberCtor | TrackingSubscriberConfig
): candidate is TrackingSubscriberConfig {
  return (
    typeof (candidate as TrackingSubscriberConfig)?.constructor === 'function' &&
    Array.isArray((candidate as TrackingSubscriberConfig)?.args)
  );
}

export interface TrackingModuleConfig {
  subscribers: TrackingSubscribers;
}

export const TRACKING_CONFIG = new InjectionToken<TrackingModuleConfig>('trackingModuleConfig');
