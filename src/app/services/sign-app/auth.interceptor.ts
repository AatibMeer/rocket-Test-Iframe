import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { TokenAuthService } from '../login/token-auth.service';
import { PartnersService } from '../common/partners.service';
import { BrandingResolver } from './branding.resolver';
import { EnvInfoService } from '../common/env-info.service';
@Injectable()

// attach token to requests
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    public tokenAuth: TokenAuthService,
    public brandingService: BrandingResolver,
    private readonly envInfo: EnvInfoService
  ) {}
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const { headers } = request;

    if (headers.get('skipAuth') || headers.get('authorization') || this.isPublicApi(request)) {
      return next.handle(request);
    }

    return this.tokenAuth.getAccessToken().pipe(
      mergeMap((token) => {
        request = request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        });
        return next.handle(request);
      })
    );
  }

  private isPublicApi(request: HttpRequest<any>) {
    // TODO: should be replaced by a list/service in case of more conditions
    return request.url.startsWith(this.envInfo.getEprsBaseUrl());
  }
}
