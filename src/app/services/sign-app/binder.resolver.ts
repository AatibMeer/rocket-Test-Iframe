import { Injectable } from '@angular/core';
import { Router, Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { EMPTY, forkJoin, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { TokenAuthService } from '../login/token-auth.service';
import { SignService } from './sign.service';
import { Binder } from './binder.interface';
import { ResolverUtilities } from './resolverUtilities';
import { PayService } from './pay.service';

// Fetches data critical for rendering and provides it to the route's component

type BinderResolvedOrError = {
  binder: Binder;
  binderError: any;
};

@Injectable()
export class BinderResolver implements Resolve<BinderResolvedOrError> {
  constructor(
    private signService: SignService,
    private payService: PayService,
    private tokenAuthService: TokenAuthService
  ) {}

  resolve(route: ActivatedRouteSnapshot): Observable<BinderResolvedOrError> {
    const token = BinderResolver.getServiceToken(route);
    const currentParty = this.getCurrentPartyIdFromRoute();
    const binderId = this.getBinderIdFromRoute(route);
    if (!ResolverUtilities.parseJwt(token) || !binderId) {
      return of({
        binder: null,
        binderError: 'No token or binderId',
      });
    }

    const binder$ = this.signService.getBinder(binderId, { fetchPages: true }).pipe(
      map((binder: Binder) => {
        return {
          binder,
          binderError: null,
        };
      }),
      catchError((err) => {
        return of({
          binder: null,
          binderError: err,
        });
      })
    );

    const binderEvents$ = this.signService.getDocumentEvents(binderId).pipe(
      catchError(() => {
        console.log('Could not fetch binder history, ignoring.');
        return of({
          binderEventsError: 'Could not fetch binder history, ignoring.',
        });
      })
    );
    const paymentAgreement$ = this.payService.getPaymentAgreementByBinderID(binderId).pipe(
      catchError(() => {
        console.log('Could not fetch payment agreement, ignoring.');
        // TODO: Add some user message here as part of INNO-2451
        return of({
          paymentAgreementError: 'Could not fetch payment agreement, ignoring.',
        });
      })
    );
    const paymentAccount$ = this.payService.getExistingPaymentAccount('rl-us', currentParty).pipe(
      catchError(() => {
        console.log('Could not fetch payment account, ignoring.');
        // TODO: Add some user message here as part of INNO-2451
        return of({
          paymentAccountError: 'Could not fetch payment account, ignoring.',
        });
      })
    );

    return forkJoin([binder$, binderEvents$, paymentAgreement$, paymentAccount$]).pipe(
      map(([binderOrError, _binderEvents, _paymentAgreement, _paymentAccount]) => {
        return {
          binder: binderOrError.binder,
          binderError: binderOrError.binderError,
          paymentAgreement: _paymentAgreement,
          paymentAccount: _paymentAccount,
        };
      })
    );
  }

  getBinderIdFromRoute(routeSnapshot: ActivatedRouteSnapshot): string | null {
    const token = this.tokenAuthService.getServiceTokenFromUrl();
    const binderIdFromUrl = routeSnapshot.paramMap.get('binderId');
    const decodedToken = ResolverUtilities.parseJwt(token);
    if (binderIdFromUrl) return binderIdFromUrl;
    if (decodedToken && decodedToken.srv && decodedToken.srv.binderId) return decodedToken.srv.binderId;
    return null;
  }

  static getServiceToken(routeSnapshot: ActivatedRouteSnapshot): string | null {
    const { fragment } = routeSnapshot;
    return (fragment || '')
      .split('&')
      .filter((p) => p.startsWith('serviceToken='))
      .map((p) => p.replace('serviceToken=', ''))
      .map((p) => decodeURI(p))
      .pop();
  }

  getCurrentPartyIdFromRoute(): string | null {
    const token = this.tokenAuthService.getServiceTokenFromUrl();
    const decodedToken = ResolverUtilities.parseJwt(token);

    if (decodedToken?.srv?.upid) {
      return decodedToken?.srv?.upid;
    }
    if (decodedToken?.srv?.partyId) {
      return decodedToken?.srv?.partyId;
    }
    return null;
  }
}
