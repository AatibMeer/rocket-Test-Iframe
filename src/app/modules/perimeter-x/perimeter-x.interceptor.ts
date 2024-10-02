import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, concatMap, filter, takeUntil } from 'rxjs/operators';
import type { PerimeterXChallenge } from './perimeter-x-challenge.interface';
import { PerimeterXService } from './perimeter-x.service';

interface PerimeterXChallengeResponse {
  status: 403;
  error: PerimeterXChallenge;
}

function isPerimeterXChallengeResponse(candidate: unknown): candidate is PerimeterXChallengeResponse {
  return (
    (candidate as PerimeterXChallengeResponse)?.status === 403 &&
    typeof (candidate as PerimeterXChallengeResponse)?.error?.blockScript === 'string' &&
    (candidate as PerimeterXChallengeResponse).error.blockScript.length > 0
  );
}

@Injectable()
export class PerimeterXInterceptor implements HttpInterceptor {
  constructor(private readonly service: PerimeterXService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error, caught) => {
        if (isPerimeterXChallengeResponse(error)) {
          // return a retry if the challenge were completed successfully
          return this.service.setupChallenge(error.error).pipe(
            takeUntil(this.service.cancelPending$),
            filter((success) => success),
            concatMap(() => caught)
          );
        }
        throw error;
      })
    );
  }
}
