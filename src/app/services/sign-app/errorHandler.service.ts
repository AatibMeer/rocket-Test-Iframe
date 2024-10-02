import { ErrorHandler, Injectable, Injector } from '@angular/core';
import * as SumoLogger from 'sumo-logger';
import errorToJSON from 'error-to-json';
import { Store } from '../../state/store';
import { EnvInfoService } from '../common/env-info.service';

const SUMOLOGIC_ENDPOINT_URL =
  'https://endpoint1.collection.eu.sumologic.com/receiver/v1/http/ZaVnC4dhaV0u_YDgIsIug1peS84UOrYeB0VkX5fnk2TPjVUheWqtu3oWNiPUP06UBsXfmLES7QbGtIDn_i5nuAM1J1045jkiZ_YxcyO6JTOymD4ubimbgQ==';

@Injectable()
export class ErrorHandlerService extends ErrorHandler {
  sumoLogger: SumoLogger;
  constructor(private store: Store) {
    super();
    const opts = {
      endpoint: SUMOLOGIC_ENDPOINT_URL,
      returnPromise: false,
      interval: 10000, // Send messages in batches every 10 seconds
      batchSize: 100000, // Or when total log length reaches 100k characters
      sendErrors: true,
      sourceName: 'document-manager-spa',
      sourceCategory: 'RocketSign Frontend',
      hostName: 'RocketSign CICD',
      graphite: false, // Disable graphite metrics
    };
    this.sumoLogger = new SumoLogger(opts);
  }
  handleError(error): void {
    const binderId = this.store.getState().binder?.id;
    this.sumoLogger.log(errorToJSON(error), {
      url: `${window.location.origin}, UA: ${navigator.userAgent}`,
      sessionKey: binderId,
    });
    super.handleError(error);
  }
  flushLogs(): void {
    this.sumoLogger.flushLogs();
  }
}

export function ErrorHandlerFactory(injector: Injector): ErrorHandler | ErrorHandlerService {
  const envInfoService = injector.get(EnvInfoService);
  const store = injector.get(Store);
  if (envInfoService.shouldTrackClientSideErrors()) {
    return new ErrorHandlerService(store);
  }
  return new ErrorHandler();
}
