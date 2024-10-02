import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EnvInfoService } from '../common/env-info.service';

@Injectable()
export class WalletService {
  private readonly baseURL: string;

  constructor(envInfoService: EnvInfoService, private readonly http: HttpClient) {
    this.baseURL = envInfoService.getPeerPaymentsBaseUrl();
  }

  createWalletTransactionIntent(paymentAgreement: string, party: string): Observable<any> {
    return this.http.post(
      `${this.baseURL}/payment-agreements/${paymentAgreement}/party/${party}/wallet/transaction`,
      {}
    );
  }
}
