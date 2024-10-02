import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Store } from '../../state/store';
import { EnvInfoService } from '../common/env-info.service';
import { IdentityProfile } from '../../state/reducers/identity-profile.interface';
import { setIdentityProfile } from '../../state/actions/identity-profile';

@Injectable()
export class IdentityService {
  private readonly baseURL: string;

  constructor(envInfoService: EnvInfoService, private readonly http: HttpClient, private readonly store: Store) {
    this.baseURL = envInfoService.getIdentityBaseUrl();
  }

  getIdentityProfile(personID: string): Observable<IdentityProfile> {
    return this.http.get<IdentityProfile>(`${this.baseURL}/profile/${personID}`).pipe(
      tap((profile) => {
        this.store.dispatch(setIdentityProfile(profile));
      })
    );
  }
}
