import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, mergeMap } from 'rxjs/operators';
import { PayService } from './pay.service';

// The application has to communicate to Stripe external backend directly,
// to create a payment account and to perform account verifcation.
// Only the Connected Stripe Account Id and/or Token are sent to RL backend.
// We can use the StripeJS library but the XHR calls are simple for now.

@Injectable()
export class StripeAccountService {

  static readonly apiUrl = 'https://api.stripe.com/v1';

  constructor (
    private http: HttpClient,
    private payService: PayService
  ) {}

  createIndividualAccountToken({first_name, last_name, ssn, dob_day, dob_month, dob_year}) {
    return this.createAccountToken({
      'account[tos_shown_and_accepted]': 'true',
      'account[business_type]': 'individual',
      'account[individual][first_name]': first_name,
      'account[individual][last_name]': last_name,
      'account[individual][dob][day]': dob_day,
      'account[individual][dob][month]': dob_month,
      'account[individual][dob][year]': dob_year,
      'account[individual][ssn_last_4]': ssn.slice(-4)
    });
  }

  createBusinessAccountToken({name, tax_id}) {
    return this.createAccountToken({
      'account[tos_shown_and_accepted]': 'true',
      'account[business_type]': 'company',
      'account[company][name]': name,
      'account[company][tax_id]': tax_id
    });
  }

  private createAccountToken(data: Record<string, string>) {
    return this.payService.getPaymentsConfig()
      .pipe(
        map( config => config.stripePublishableKey ),
        mergeMap( key => this.createAccountTokenWithKey(data, key) )
      );
  }

  // Creates a new Stripe Token that holds Account Info
  // Token will be used by backend to create a real Stripe Connected Account
  private createAccountTokenWithKey(data: Record<string, string>, stripeApiKey: string) {
    let headers = new HttpHeaders({
      'Authorization': 'Bearer ' + stripeApiKey,
      'Stripe-Version': '2020-03-02',
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    let body = new HttpParams({fromObject: data});
    let url = StripeAccountService.apiUrl + '/tokens';
    return this.http.post<StripeAccountToken>(url, body, {headers});
  }
}

export interface StripeAccountToken {
  client_ip: string; // like "159.205.22.207"
  created: number;
  id: string;
  livemode: boolean;
  object: 'token';
  type: 'account';
  used: boolean;
}
