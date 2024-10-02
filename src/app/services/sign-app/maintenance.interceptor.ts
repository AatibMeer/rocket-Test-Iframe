import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LocalFeatureFlagService } from '../common/local-feature-flag.service';
@Injectable()

// attach token to requests
export class MaintenanceInterceptor implements HttpInterceptor {
  constructor(public featureFlagService: LocalFeatureFlagService) {}
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const { headers } = request;
    // Enable usage while maintenance mode is enabled in binders-service
    const forceBindersServiceInMaintenceMode = this.featureFlagService.flags.force_binders_service;
    if (!forceBindersServiceInMaintenceMode) {
      return next.handle(request);
    }
    request = request.clone({
      setHeaders: {
        'Skip-Maintenance': `true`,
      },
    });
    return next.handle(request);
  }
}
