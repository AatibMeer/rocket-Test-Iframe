import { Injectable } from '@angular/core';
import { from, Observable, of, Subscription, throwError } from 'rxjs';
import { BrandingDataInfo, BrandConfig, BrandInfo, GlobalBrandConfig } from '../../common/interfaces/branding.interface'
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { EnvInfoService } from './env-info.service';

// can fetch brandConfig and brandInfo
@Injectable()
export class PartnersService {
  brandConfig: BrandConfig;
  pendingReq: Subscription;

  constructor(private http: HttpClient, private readonly envInfo: EnvInfoService) {}

  private generateEprsUrl(path: string): string {
    return this.envInfo.getEprsBaseUrl() + path;
  }

  // Fetches fresh config from PartnerConfigAPI
  // 'breakingVersions/1' - if we making api changes, we will increase number
  private fetchBrandConfigFromPartnerConfigService(brandingDataInfo: BrandingDataInfo): Observable<BrandConfig> {
    const url = `/partners/v1/brands/${brandingDataInfo.brandId}/settingSets/${brandingDataInfo.settingSetName}/breakingVersions/${brandingDataInfo.breakingVersion}`;
    // note: no authentication required
    const headers = new HttpHeaders().set('skipAuth', 'true');
    headers.append('Content-Type', 'application/json');
    return this.http.get<BrandConfig>(url, { headers });
  }

  private fetchBrandConfigFromEnterprisePublishedResourcesService(
    brandingDataInfo: BrandingDataInfo
  ): Observable<BrandConfig> {
    const url = this.generateEprsUrl(`/groups/${brandingDataInfo.brandId}/configs/document-manager`);
    // note: no authentication required
    const headers = new HttpHeaders();
    headers.append('Content-Type', 'application/json');
    return this.http.get<BrandConfig>(url, { headers });
  }

  fetchGlobalBrandConfig(brandingDataInfo: BrandingDataInfo): Observable<GlobalBrandConfig> {
    const url = this.generateEprsUrl(`/groups/${brandingDataInfo.brandId}/configs/brand`);
    return this.http.get<GlobalBrandConfig>(url).pipe(
      catchError((err: HttpErrorResponse) => {
        return throwError(() => err);
      })
    );
  }

  fetchBrandConfig(brandingDataInfo: BrandingDataInfo): Observable<BrandConfig> {
    return this.fetchBrandConfigFromEnterprisePublishedResourcesService(brandingDataInfo).pipe(
      catchError(() => this.fetchBrandConfigFromPartnerConfigService(brandingDataInfo))
    );
  }
}
