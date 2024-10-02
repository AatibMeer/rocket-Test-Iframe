import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';

export interface HeaderTypes {
  json?: boolean;
  form?: boolean;
  auth?: boolean;
  token?: boolean;
}

@Injectable()
export class HeadersService {
  // We don't need requestId in the headers for the business event, requestId is in the trace if one exists
  createHeadersForBusinessEvent(): HttpHeaders {
    const headers = new HttpHeaders();
    headers.append('Content-Type', 'application/json');
    return headers;
  }

}
