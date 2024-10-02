import { Component, ViewEncapsulation, OnDestroy, Inject, HostListener, OnInit } from '@angular/core';

import { DOCUMENT } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';
import {
  Router,
  NavigationEnd,
  RoutesRecognized,
  NavigationStart,
  NavigationCancel,
  NavigationError,
  ActivatedRoute,
} from '@angular/router';
import { Observable } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { SignService } from '../../services/sign-app/sign.service';

import { Store } from '../../state/store';
import { Binder } from '../../services/sign-app/binder.interface';
import { ConfigurationData } from '../../common/interfaces/branding.interface';
import { TokenAuthService } from '../../services/login/token-auth.service';
import { EnvInfoService } from '../../services/common/env-info.service';
import { ErrorHandlerService } from '../../services/sign-app/errorHandler.service';

@Component({
  selector: 'sign-app-root',
  templateUrl: './sign-app.component.html',
  styleUrls: ['../../../../build/rl-icon.scss', './sign-app.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [SignService, ErrorHandlerService],
})
export class SignAppComponent implements OnInit, OnDestroy {
  constructor(
    private sanitizer: DomSanitizer,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private store: Store,
    private translateService: TranslateService,
    @Inject(DOCUMENT) private document: Document,
    private tokenAuthService: TokenAuthService,
    private readonly envInfo: EnvInfoService,
    private errorHandlingService: ErrorHandlerService
  ) {
    const storeSub = this.store.subscribe((state) => {
      this.refreshBrandConfig(state.get('brandConfig'));
      this.setBinder(state.get('binder'));
      this.setFeatureToggles();
    });

    this.subscriptions.push(storeSub);

    SignAppComponent.listenForMessageEvents();
    this.loadThemeForPartner();
  }

  brandConfig: ConfigurationData;
  brandingStyles: any;
  loadWithoutBranding = false;
  readonly subscriptions: Function[] = [];
  routerSub: Observable<any>;
  pageLoaded = false;
  binder: Readonly<Binder>;
  showHeader: boolean;

  @HostListener('window:beforeunload')
  flushLogs(): void {
    this.errorHandlingService.flushLogs();
  }

  ngOnInit(): void {
    this.router.events.subscribe((event) => {
      if (event instanceof RoutesRecognized) {
        // no action required
      }
      if (event instanceof NavigationStart) {
        this.pageLoaded = false;
      }
      if (event instanceof NavigationEnd) {
        this.pageLoaded = true;
      }
      if (event instanceof NavigationCancel || event instanceof NavigationError) {
        this.pageLoaded = true;
      }
    });
  }

  ngOnDestroy() {
    this.subscriptions.forEach((unsub) => unsub());
  }

  getBrandingVars() {
    if (!this.brandConfig || !this.brandConfig.lookAndFeel) return null;
    const config = this.brandConfig.lookAndFeel;
    const style = Object.keys(config)
      .map((key) => `--${key}: ${config[key]}`)
      .join(';');
    return this.sanitizer.bypassSecurityTrustStyle(style);
  }

  refreshBrandConfig(config: ConfigurationData) {
    this.brandConfig = config;
    this.brandingStyles = this.getBrandingVars();
    const lang = this.getLanguage();
    this.translateService.getTranslation(lang);
    this.translateService.use(lang);
    this.translateService.setDefaultLang(lang);
  }

  getLanguage(): string {
    const brandingLevel = this.store.getState().globalBrandConfig?.brandingLevel;
    const langProvidedViaQueryParam = new URLSearchParams(window.location.search).get('lang');
    const binderLanguage = this.binder?.configuration?.locale?.language;
    const rlusLang = 'rlus';
    if (langProvidedViaQueryParam) return langProvidedViaQueryParam;
    if (brandingLevel === 1) return rlusLang;
    if (binderLanguage) return binderLanguage;
    return 'en';
  }

  setBinder(binder) {
    this.binder = binder;
  }

  setFeatureToggles() {
    // set header visibility
    // if binder exists, look for binder statusConfiguration
    if (this.binder && this.brandConfig && this.brandConfig.statusConfiguration) {
      this.showHeader = this.brandConfig.statusConfiguration[this.binder.status].showHeader;
    }
    // if binder does not exist, look for default app setting regardless of binder status 
    else if (this.brandConfig && this.brandConfig.lookAndFeel.showHeader) {
      this.showHeader = this.brandConfig.lookAndFeel.showHeader;
    }
    // by default, hide header
    else {
      this.showHeader = false;
    }
  }

  static listenForMessageEvents(): void {
    window.addEventListener('message', (event) => {
      if (event.data.editDocument) console.log('Received a call to edit the document. Open CKEditor.');
    });
  }

  private generateEprsUrl(path: string): string {
    return this.envInfo.getEprsBaseUrl() + path;
  }

  private loadThemeForPartner() {
    const brandId = this.tokenAuthService.getBrandId();
    const themeUrl = this.generateEprsUrl(`/groups/${brandId}/styles/styles.css`);
    this.loadTheme(themeUrl);
  }

  private loadTheme(cssFileUrl: string) {
    const newLinkElement = this.document.createElement('link');
    newLinkElement.rel = 'stylesheet';
    newLinkElement.type = 'text/css';
    newLinkElement.href = cssFileUrl;

    const headElement = this.document.getElementsByTagName('head')[0];
    headElement.appendChild(newLinkElement);
  }
}
