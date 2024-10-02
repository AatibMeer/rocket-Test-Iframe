import { Injectable } from '@angular/core';

/* eslint-disable camelcase */
export interface ClientCredentialVars {
  client_id: string;
  client_secret: string;
  brand_id: string;
  purpose: string;
}
// Should be always available at web server at '/app/env-vars.js'
export interface ExpectedEnvVars {
  externalBackendsApiHost: string;
  client_credentials_full: Array<ClientCredentialVars>;
  pendoSnippet: boolean;
  trackErrors: boolean;
  apigeeAuthUrl?: string;
  bindersBaseUrl?: string;
  peerPaymentsBaseUrl?: string;
  identityBaseUrl?: string;
  eprsBaseUrl?: string;
}
/* eslint-enable camelcase */
const windowEnv = (window as Window & typeof globalThis & { env: ExpectedEnvVars }).env;

// Provides environment-specific information, keys and tokens.
// References to 'process.env' are replaced before code hits the browser,
// it is done using the webpack.DefinePluginduring build time.
// References to 'window.env' are populated once in the browser,
// it is done by dynamic app/env-vars.js file deployed to each environment.
@Injectable()
export class EnvInfoService {
  signAppClientID: string;
  signAppClientSecret: string;
  defaultBrandId: string;

  constructor() {
    if (!windowEnv) {
      // TODO: log error in Sumologic and New Relic
      // eslint-disable-next-line no-console
      console.error('Could not detect environment variables in window.env!');
    }
    this.setClientCredentialVars();
  }

  setClientCredentialVars(): void {
    const signappClientCredentials = windowEnv.client_credentials_full.find((client) => {
      return client.purpose.split(' ').indexOf('sign-app') > -1;
    });

    this.signAppClientID = signappClientCredentials.client_id;
    this.signAppClientSecret = signappClientCredentials.client_secret;
  }

  getDefaultBrandId(): string {
    return this.defaultBrandId;
  }
  // eslint-disable-next-line class-methods-use-this
  getApigeeAuthUrl(): string {
    return windowEnv.apigeeAuthUrl;
  }
  // eslint-disable-next-line class-methods-use-this
  getBindersBaseUrl(): string {
    return windowEnv.bindersBaseUrl;
  }

  // eslint-disable-next-line class-methods-use-this
  getEprsBaseUrl(): string {
    return windowEnv.eprsBaseUrl;
  }

  // eslint-disable-next-line class-methods-use-this
  getPeerPaymentsBaseUrl(): string {
    return windowEnv.peerPaymentsBaseUrl;
  }

  // eslint-disable-next-line class-methods-use-this
  getIdentityBaseUrl(): string {
    return windowEnv.identityBaseUrl;
  }

  getAuthClientId(): string {
    return this.signAppClientID;
  }

  // Warning! This is called "secret", but it's completely public!
  getAuthClientSecret(): string {
    return this.signAppClientSecret;
  }

  // eslint-disable-next-line class-methods-use-this
  isPendoSnippetEnabled(): boolean {
    return windowEnv.pendoSnippet;
  }

  // eslint-disable-next-line class-methods-use-this
  shouldTrackClientSideErrors(): boolean {
    return windowEnv.trackErrors;
  }
}
