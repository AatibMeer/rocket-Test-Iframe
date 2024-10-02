import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Store } from '../../state/store';
import { setBrandConfig, setGlobalBrandConfig } from '../../state/actions/user';
import { TokenAuthService } from '../login/token-auth.service';
import { BrandConfig, BrandingDataInfo, GlobalBrandConfig } from '../../common/interfaces/branding.interface';
import { PartnersService } from '../common/partners.service';

// Fetches data critical for rendering (e.g. branding) and provides it to the route's component

@Injectable()
export class BrandingResolver {
  constructor(
    private tokenAuthService: TokenAuthService,
    private partnersService: PartnersService,
    private store: Store
  ) {}

  brandingDataInfo: BrandingDataInfo = {
    brandId: this.tokenAuthService.getBrandId(),
    settingSetName: 'RocketSignUX',
    breakingVersion: '1',
  };

  resolve(route: ActivatedRouteSnapshot): Observable<MergedConfigs> {
    return forkJoin({
      brandConfig: this.partnersService.fetchBrandConfig(this.brandingDataInfo),
      globalBrandConfig: this.partnersService.fetchGlobalBrandConfig(this.brandingDataInfo),
    }).pipe(
      tap((combinedConfigs) => {
        this.store.dispatch(setGlobalBrandConfig(combinedConfigs.globalBrandConfig));
        this.store.dispatch(setBrandConfig(combinedConfigs.brandConfig.data));
      }),
      catchError((err) => {
        console.log('Unable to fetch branding.', err);
        return of(null);
      })
    );
  }
}

type MergedConfigs = { brandConfig: BrandConfig; globalBrandConfig: GlobalBrandConfig };
