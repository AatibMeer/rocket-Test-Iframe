import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';

import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { map, shareReplay, tap } from 'rxjs/operators';
import { EnvInfoService } from '../common/env-info.service';
import { Store } from '../../state/store';

import { TokenAuthInfo } from './token-auth-info.interface';
import { updateAuthInfo } from '../../state/actions/sign';
import { ResolverUtilities } from '../sign-app/resolverUtilities';

export { TokenAuthInfo } from './token-auth-info.interface';

// This service is responsible for Service Token based authentication.
// A valid Service Token is enough to authenticate a user of the Sign App.
// Service Tokens are distributed throgh email inside a link (as an URL param).
@Injectable()
export class TokenAuthService {
  constructor(private http: HttpClient, private envInfo: EnvInfoService, private store: Store) {
    // code..
  }

  private cachedTokenResponse: Observable<any>;

  private getDecodedToken() {
    const token = this.getServiceTokenFromUrl();
    return !token ? null : ResolverUtilities.parseJwt(token);
  }

  getPartnerId() {
    const token = this.getDecodedToken();
    return !token || !token.srv || !token.srv.partnerId ? null : token.srv.partnerId;
  }

  getBrandId(): string {
    const token = this.getDecodedToken();
    return !token || !token.srv || !token.srv.brandId ? null : token.srv.brandId;
  }

  // TODO: once we have Angular routing, we will use ActivatedRoute instead
  getServiceTokenFromUrl(): string {
    const fragment = window.location.hash.substr(1);
    return (fragment || '')
      .split('&')
      .filter((p) => p.startsWith('serviceToken='))
      .map((p) => p.replace('serviceToken=', ''))
      .map((p) => decodeURI(p))
      .pop();
  }

  fetchAccessToken(serviceToken: string): Observable<any> {
    let url;
    let id;
    let secret;
    let body;
    id = this.envInfo.getAuthClientId();
    secret = this.envInfo.getAuthClientSecret();
    url = `${this.envInfo.getApigeeAuthUrl()}/accesstoken`;
    body = {
      client_id: id,
      client_secret: secret,
      grant_type: 'authorization_code',
      code: serviceToken,
    };
    const headers = new HttpHeaders().set('skipAuth', 'true');
    if (!this.cachedTokenResponse) {
      this.cachedTokenResponse = this.http.post(url, body, { headers, observe: 'response' }).pipe(shareReplay(1));
    }
    return this.cachedTokenResponse;
  }

  // This method is asynchronous, as getting the token may take time.
  // Subscribe to returned Observable to wait for the result.
  getAccessToken(): Observable<string> {
    return this.getTokenAuthInfo().pipe(
      map((info) => {
        return info.access_token;
      })
    );
  }

  // Use this method to get authInfo asynchronously (wait until it's ready).
  // Components can usually grab it synchronously from the Redux store.
  getTokenAuthInfo(): Observable<TokenAuthInfo> {
    const serviceToken = this.getServiceTokenFromUrl();
    const tokenAuthInfo = this.loadAuthInfo();
    if (tokenAuthInfo && tokenAuthInfo.serviceToken == serviceToken) {
      // return cached token if available
      return from([tokenAuthInfo]);
    }
    // otherwise request a new one
    const authResponse = this.fetchAccessToken(serviceToken).pipe(
      map((response: HttpResponse<TokenAuthInfo>) => Object.assign(response.body, { serviceToken })),
      tap((tokenAuthInfo: TokenAuthInfo) => this.saveAuthInfo(tokenAuthInfo))
    );
    return authResponse;
  }

  loadAuthInfo() {
    return this.store.getState().get('authInfo');
  }

  saveAuthInfo(info: TokenAuthInfo) {
    function parseJwt(token) {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace('-', '+').replace('_', '/');
      return JSON.parse(window.atob(base64));
    }

    if (!info.serviceData) {
      const serviceToken = this.getServiceTokenFromUrl();
      info.serviceData = parseJwt(serviceToken).srv;
    }
    this.store.dispatch(updateAuthInfo(info));
  }
}
