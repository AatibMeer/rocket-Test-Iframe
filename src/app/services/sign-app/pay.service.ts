import { Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, mapTo, mergeMap, tap } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Store } from '../../state/store';
import { PaymentAgreement, PaymentAgreementStatus, PaymentAmount } from './payment-agreement.interface';
import { PaymentAccount } from './payment-account.interface';

import { ISpreedlyResponse, SpreedlyTokenError } from './spreedly-response.interface';
import { EnvInfoService } from '../common/env-info.service';
import { getCurrentParty } from '../../state/selectors';
import { PaymentMethod } from './payment-method.interface';
import { PaymentsConfig } from './payments-config.interface';
import { PayoutMethod } from './payout-method.interface';
import { StripeExternalAccount } from './stripe-external-account.interface';
import { clearAgreement, createAgreement, updateAgreement } from '../../state/actions/payment-agreement';
import { clearPayAccount, updatePayAccount } from '../../state/actions/pay-account';
import { AchCharge, AchPaymentMethod, CreateAchPaymentMethod } from './ach-payment-method.interface';

interface SpreedlySuccess {
  success: true;
  token: string;
  reason: never;
  error: never;
}
interface SpreedlyValidationError {
  success: false;
  token: never;
  reason: 'validation_error';
  error: SpreedlyTokenError[];
}
interface SpreedlyServiceError {
  success: false;
  token: never;
  reason: 'service_error';
  error: ISpreedlyResponse;
}
interface SpreedlyHttpError {
  success: false;
  token: never;
  reason: 'http_error';
  error: HttpErrorResponse;
}
export type SpreedlyResponse = SpreedlySuccess | SpreedlyValidationError | SpreedlyServiceError | SpreedlyHttpError;

@Injectable()
export class PayService {
  private readonly baseUrl: string;

  constructor(envInfo: EnvInfoService, private readonly http: HttpClient, private readonly store: Store) {
    this.baseUrl = envInfo.getPeerPaymentsBaseUrl();
  }

  makeEmptyPaymentAgreement(): PaymentAgreement {
    const d = new Date().toISOString();

    return {
      firstPayment: d,
      lastPayment: d,
      brand: 'rl-us',
      paymentPeriod: 'once',
      payments: [
        {
          due: d,
          ins: [
            {
              partyId: '00000000-0000-0000-0000-000000000000',
              payment: {
                amount: 0,
                currency: 'USD',
              },
            },
          ],
          outs: [
            {
              partyId: '00000000-0000-0000-0000-000000000000',
              payment: {
                amount: 0,
                currency: 'USD',
              },
            },
          ],
          fees: [
            {
              code: 'rl-us-fee',
              description: 'Convenience Fee',
              payment: {
                amount: 0,
                currency: 'USD',
              },
              breakdown: [
                {
                  partyId: '00000000-0000-0000-0000-000000000000',
                  payment: {
                    amount: 0,
                    currency: 'USD',
                  },
                },
              ],
            },
          ],
        },
      ],
    };
  }

  getPaymentsConfig() {
    return this.http.get<PaymentsConfig>(`${this.baseUrl}/config`);
  }

  private getSpreedlyKey() {
    return this.getPaymentsConfig().pipe(map((response) => response.spreedlyEnvironmentKey));
  }

  getSpreedlyToken(cardConfig: Record<string, any>): Observable<SpreedlyResponse> {
    return this.getSpreedlyKey().pipe(
      map((spreedlyKey) => {
        const spreedlyURL = 'https://core.spreedly.com/v1/payment_methods.js';
        const params = {
          ...cardConfig,
          environment_key: spreedlyKey,
        };
        // HttpClient.jsonp doesn't have a signature with params, so we need to build the whole URL
        if (URL && URLSearchParams) {
          const searchParams = new URLSearchParams(params);
          return new URL(`${spreedlyURL}?${searchParams.toString()}`).toString();
        }
        const urlEncodedSpace = /%20/g;
        const searchParams = Object.keys(params)
          .reduce((accumulator, key) => {
            const value = encodeURIComponent(params[key] === null ? '' : params[key]).replace(urlEncodedSpace, '+');
            return `${accumulator}&${encodeURIComponent(key)}=${value}`;
          }, '')
          .substring(1);
        return `${spreedlyURL}?${searchParams}`;
      }),
      mergeMap((url) => {
        return this.http.jsonp<ISpreedlyResponse>(url, 'callback');
      }),
      map((response: ISpreedlyResponse) => {
        if (response.status === 201) {
          // great success
          return {
            success: true,
            token: response.transaction.payment_method.token,
          } as SpreedlySuccess;
        }
        if (response.status === 422 && response?.errors[0]?.attribute) {
          return {
            success: false,
            reason: 'validation_error',
            error: response.errors.map(({ attribute }) => {
              if (attribute === 'number') {
                return 'SPREEDLY_VALIDATION_CARD';
              }
              if (attribute === 'card_type') {
                return 'SPREEDLY_VALIDATION_CARD_TYPE';
              }
              if (attribute === 'card_name') {
                return 'SPREEDLY_VALIDATION_CARD_NAME';
              }
              if (attribute === 'month') {
                return 'SPREEDLY_VALIDATION_MONTH';
              }
              if (attribute === 'year') {
                return 'SPREEDLY_VALIDATION_YEAR';
              }
              if (attribute === 'verification_value') {
                return 'SPREEDLY_VALIDATION_CVV';
              }
              return 'SPREEDLY_VALIDATION_OTHER';
            }),
          } as SpreedlyValidationError;
        }
        return {
          success: false,
          reason: 'service_error',
          error: response,
        } as SpreedlyServiceError;
      }),
      catchError((error: HttpErrorResponse) =>
        of({
          success: false,
          reason: 'http_error',
          error,
        } as SpreedlyHttpError)
      )
    );
  }

  createPaymentAgreement(paymentAgreement: PaymentAgreement): Observable<PaymentAgreement> {
    const url = `${this.baseUrl}/payment-agreements`;
    return this.http.post<PaymentAgreement>(url, paymentAgreement).pipe(
      tap((newAgreement) => {
        this.store.dispatch(createAgreement(newAgreement));
      })
    );
  }

  deletePaymentAgreement(paymentAgreement: string | Pick<PaymentAgreement, 'externalId'>): Observable<void> {
    const id = typeof paymentAgreement === 'string' ? paymentAgreement : paymentAgreement.externalId;
    const url = `${this.baseUrl}/payment-agreements/${id}`;
    return this.http.delete(url).pipe(
      tap(() => {
        const cachedAgreement = this.store.getState().paymentAgreement;
        if (cachedAgreement && cachedAgreement.externalId === id) {
          this.store.dispatch(clearAgreement());
        }
      }),
      mapTo(undefined)
    );
  }

  /**
   * When you absolutely must have the latest version fresh from the API.
   *
   * Since the payment agreement altering methods also update the cache,
   * using <code>getPaymentAgreementByBinderID()</code> is probably what you need
   */
  getLatestPaymentAgreementByBinderID(binderID: string): Observable<PaymentAgreement | null> {
    const url = `${this.baseUrl}/payment-agreements`;
    return this.http
      .get<PaymentAgreement[]>(url, {
        params: {
          binderId: binderID,
        },
      })
      .pipe(
        map((paymentAgreements) => {
          return paymentAgreements && paymentAgreements.length > 0 ? paymentAgreements[0] : null;
        }),
        tap((paymentAgreement) => {
          if (paymentAgreement) {
            this.store.dispatch(createAgreement(paymentAgreement));
          } else {
            this.store.dispatch(clearAgreement());
          }
        })
      );
  }

  getPaymentAgreementByBinderID(binderID: string): Observable<PaymentAgreement | null> {
    const cachedAgreement = this.store.getState().paymentAgreement;
    if (cachedAgreement && cachedAgreement.binderId === binderID) {
      return of(cachedAgreement);
    }
    return this.getLatestPaymentAgreementByBinderID(binderID);
  }

  /**
   * When you absolutely must have the latest version fresh from the API.
   *
   * Since the payment agreement altering methods also update the cache,
   * using <code>getPaymentAgreementByID()</code> is probably what you need
   */
  getLatestPaymentAgreementByID(paymentAgreementID: string): Observable<PaymentAgreement | null> {
    const url = `${this.baseUrl}/payment-agreements/${paymentAgreementID}`;
    return this.http.get<PaymentAgreement>(url).pipe(
      tap((paymentAgreement) => {
        this.store.dispatch(createAgreement(paymentAgreement));
      })
    );
  }

  getPaymentAgreementByID(paymentAgreementID: string): Observable<PaymentAgreement | null> {
    const cachedAgreement = this.store.getState().paymentAgreement;
    if (cachedAgreement && cachedAgreement.externalId === paymentAgreementID) {
      return of(cachedAgreement);
    }
    return this.getLatestPaymentAgreementByID(paymentAgreementID);
  }

  getFeeQuote(paymentAgreement: PaymentAgreement): Observable<PaymentAmount> {
    return this.getQuote(paymentAgreement).pipe(map((agreement) => agreement.payments[0].fees[0].payment));
  }

  getQuote(paymentAgreement: PaymentAgreement): Observable<PaymentAgreement> {
    const url = `${this.baseUrl}/quotes`;
    return this.http.post<PaymentAgreement>(url, paymentAgreement);
  }

  setPaymentAgreementStatus(paymentAgreementID: string, status: PaymentAgreementStatus): Observable<PaymentAgreement> {
    const url = `${this.baseUrl}/payment-agreements/${paymentAgreementID}/status`;
    return this.http
      .post<PaymentAgreement>(url, {
        status,
      })
      .pipe(
        tap((paymentAgreement) => {
          this.store.dispatch(updateAgreement(paymentAgreement));
        })
      );
  }

  createPayoutMethod(payoutMethod: PayoutMethod): Observable<StripeExternalAccount> {
    const url = `${this.baseUrl}/payout-methods`;
    return this.http.post<StripeExternalAccount>(url, payoutMethod);
  }

  createPaymentMethod(paymentMethod: PaymentMethod): Observable<{ externalId: string }> {
    const url = `${this.baseUrl}/payment-methods`;
    return this.http.post<{ externalId: string }>(url, paymentMethod);
  }

  createAchPaymentMethod(achPaymentMethod: CreateAchPaymentMethod): Observable<AchPaymentMethod> {
    const url = `${this.baseUrl}/payment-methods-ach`;
    return this.http.post<AchPaymentMethod>(url, achPaymentMethod);
  }

  addPaymentMethodToPaymentAgreement(
    paymentMethodID: string,
    paymentAgreementID: string,
    partyID: string,
    paymentAmount: number,
    paymentCurrencyCode: string
  ): Observable<PaymentMethod> {
    const url = `${this.baseUrl}/payment-agreements/${paymentAgreementID}/payment-methods`;
    return this.http.post<PaymentMethod>(url, {
      partyId: partyID,
      payment: {
        amount: paymentAmount,
        currency: paymentCurrencyCode,
      },
      paymentMethodId: paymentMethodID,
    });
  }

  /**
   * Make a payment. This will take money from someone!
   *
   * The method with all of the arguments can be used without addPaymentMethodToPaymentAgreement()
   * The method with minimal arguments MUST be called AFTER addPaymentMethodToPaymentAgreement()
   * You only need to use one of these above
   */
  chargePaymentToPaymentAgreement(paymentAgreementID: string, partyID: string): Observable<PaymentAgreement | null>;
  chargePaymentToPaymentAgreement(
    paymentAgreementID: string,
    partyID: string,
    paymentMethodID: string,
    paymentAmount: number,
    paymentCurrencyCode: string
  ): Observable<PaymentAgreement | null>;
  chargePaymentToPaymentAgreement(
    paymentAgreementID: string,
    partyID: string,
    paymentMethodID?: string,
    paymentAmount?: number,
    paymentCurrencyCode?: string
  ): Observable<PaymentAgreement | null> {
    const observable = paymentMethodID
      ? this.addPaymentMethodToPaymentAgreement(
          paymentMethodID,
          paymentAgreementID,
          partyID,
          paymentAmount,
          paymentCurrencyCode
        )
      : of(null);
    const url = `${this.baseUrl}/payment-agreements/${paymentAgreementID}/party/${partyID}/charges`;
    return observable.pipe(
      mergeMap(() => {
        return this.http.post(url, null);
      }),
      mergeMap(() => {
        return this.getLatestPaymentAgreementByID(paymentAgreementID);
      })
    );
  }

  chargeAchPaymentToPaymentAgreement(
    paymentAgreementID: string,
    partyID: string,
    achChange: AchCharge,
    paymentMethodID?: string,
    paymentAmount?: number,
    paymentCurrencyCode?: string
  ): Observable<PaymentAgreement | null> {
    const observable = paymentMethodID
      ? this.addPaymentMethodToPaymentAgreement(
          paymentMethodID,
          paymentAgreementID,
          partyID,
          paymentAmount,
          paymentCurrencyCode
        )
      : of(null);
    const url = `${this.baseUrl}/payment-agreements/${paymentAgreementID}/party/${partyID}/charges_ach`;
    return observable.pipe(
      mergeMap(() => {
        return this.http.post(url, achChange);
      }),
      mergeMap(() => {
        return this.getLatestPaymentAgreementByID(paymentAgreementID);
      })
    );
  }

  // One method for fast payment account creation.
  // Warning! Endpoints with `/brand/` will significantly change in near future in BE.
  payeeAssignmentProcess(externalToken: string): Observable<PaymentAccount> {
    const state = this.store.getState();
    const brandId = 'rl-us'; // by default, will be removed in future
    const partyId = getCurrentParty(state).id;
    const hasAccount = !!state.paymentAccount;
    const partyEmail = getCurrentParty(state).email;

    const paymentAgreementID$ = this.getPaymentAgreementByBinderID(state.binder.id).pipe(
      map((paymentAgreement) => paymentAgreement.externalId)
    );
    let paymentAccount$: Observable<PaymentAccount | PaymentAccount[]>;
    let paymentAccount: PaymentAccount;
    if (hasAccount) {
      paymentAccount$ = this.updateExistingPaymentAccount(brandId, partyId, partyEmail, externalToken);
    } else {
      paymentAccount$ = this.createPaymentAccount(brandId, partyId, partyEmail, externalToken);
    }
    const paymentAccountID$: Observable<string> = paymentAccount$.pipe(
      tap((account: any) => {
        paymentAccount = account;
      }),
      map((account) => account.externalId as string)
    );
    return forkJoin([paymentAccountID$, paymentAgreementID$]).pipe(
      mergeMap(([accountID, agreementID]) => {
        return this.assignPaymentAccountToAgreement(agreementID, partyId, accountID);
      }),
      map(() => paymentAccount)
    );
  }

  // Once the user sends his data to Stripe, he gets temporary "Account token".
  // This call registers this token in the PP service and saves account.
  // Warning! Endpoints with `/brand/` will significantly change in near future in BE.
  createPaymentAccount(
    brandId: string,
    payeePartyId: string,
    payeePartyEmail: string,
    stripeAccountToken: string
  ): Observable<PaymentAccount | PaymentAccount[] | null> {
    const body = {
      country: 'US',
      email: payeePartyEmail,
      accountToken: stripeAccountToken,
    };
    const url = `${this.baseUrl}/brand/${brandId}/party/${payeePartyId}/payment-accounts`;

    return this.http.post<PaymentAccount | PaymentAccount[] | null>(url, body).pipe(
      tap((accounts: any) => {
        if (accounts.length > 0) {
          this.store.dispatch(updatePayAccount(accounts[0]));
        } else {
          this.store.dispatch(updatePayAccount(accounts));
        }
      }),
      catchError(() => this.getExistingPaymentAccount(brandId, payeePartyId))
    );
  }

  updateExistingPaymentAccount(
    brandId: string,
    payeePartyId: string,
    payeePartyEmail: string,
    stripeAccountToken: string
  ): Observable<PaymentAccount> {
    const body = {
      country: 'US',
      email: payeePartyEmail,
      accountToken: stripeAccountToken,
    };
    const url = `${this.baseUrl}/brand/${brandId}/party/${payeePartyId}/payment-accounts`;

    return this.http
      .put<PaymentAccount>(url, body)
      .pipe(tap((account) => this.store.dispatch(updatePayAccount(account))));
  }

  // Get info if the party (represented by the partyId) already has an account.
  // The account's id is different than the party's id even if it's 1:1.
  // Warning! Endpoints with `/brand/` will significantly change in near future in BE.
  getExistingPaymentAccount(
    brandId: string,
    payeePartyId: string
  ): Observable<PaymentAccount | PaymentAccount[] | null> {
    const url = `${this.baseUrl}/brand/${brandId}/payment-accounts?partyId=${payeePartyId}`;

    return this.http.get<PaymentAccount[]>(url).pipe(
      tap((accounts) => {
        if (accounts.length > 0) {
          this.store.dispatch(updatePayAccount(accounts[0]));
        } else {
          this.store.dispatch(clearPayAccount());
        }
      }),
      catchError(() => {
        return of(null);
      })
    );
  }

  // Once a user has a paymentAccount in PP service, you add it to the "deal"/"agreement".
  assignPaymentAccountToAgreement(
    paymentAgreementId: string,
    payeePartyId: string,
    paymentAccountId: string
  ): Observable<any> {
    const body = {
      partyId: payeePartyId,
      payment: {
        amount: 10000, // why do we need this early? get it from the binder
        currency: 'USD',
      },
      paymentAccountId,
    };
    const url = `${this.baseUrl}/payment-agreements/${paymentAgreementId}/payment-accounts`;
    return this.http.post(url, body);
  }

  // accept Stripe Terms of Service (payee)
  // deprecated KYC code

  acceptStripeTOS(payeeUuid: string): Observable<PaymentAgreement> {
    const url = `${this.baseUrl}/payees/${payeeUuid}/accept_stripe_tos/`;
    const headers = new HttpHeaders({ Accept: 'application/json' });

    return this.http.get<PaymentAgreement>(url, { headers });
  }

  getTimestampAddDays(addDays) {
    return new Date(new Date().setDate(new Date().getDate() + addDays)).getTime();
  }

  getQueryUrl(data: any) {
    // If this is not an object, defer to native stringification.
    const type = typeof data;
    const isObject = data != null && type == 'object';
    if (!isObject) {
      return data == null ? '' : data.toString();
    }
    const buffer = [];
    // Serialize each key in the object.
    for (const name in data) {
      if (!data.hasOwnProperty(name)) {
        continue;
      }
      const value = data[name];
      buffer.push(`${encodeURIComponent(name)}=${encodeURIComponent(value == null ? '' : value)}`);
    }
    // Serialize the buffer and clean it up for transportation.
    return buffer.join('&').replace(/%20/g, '+');
  }
}
