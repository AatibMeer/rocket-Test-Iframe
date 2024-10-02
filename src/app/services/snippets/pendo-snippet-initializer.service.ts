import { Injectable } from '@angular/core';
import { Store } from '../../state/store';
import { EnvInfoService } from '../common/env-info.service';
import type { State } from '../../state/reducers/main.interface';

@Injectable()
export class PendoSnippetInitializerService {

  private initialized = false;

  constructor(
    private store: Store,
    private envInfoService: EnvInfoService
  ) {

  }

  public initialize(state: State) {
    if (!this.initialized && this.envInfoService.isPendoSnippetEnabled()) {
      const upid = state.authInfo.serviceData.upid;

      // @ts-ignore
      pendo.initialize({
        visitor: {
          id: upid
        },
        account: {
          id: 'default-sign-app-account'
        }
      });

      this.initialized = true;
    }
  }
}
