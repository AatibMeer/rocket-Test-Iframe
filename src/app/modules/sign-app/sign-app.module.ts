import { NgModule, CUSTOM_ELEMENTS_SCHEMA, ErrorHandler, Injector } from '@angular/core';
import { HttpClientModule, HttpClient, HTTP_INTERCEPTORS, HttpClientJsonpModule } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Location, APP_BASE_HREF, DatePipe } from '@angular/common';
import { LocalizeRouterModule, LocalizeParser, LocalizeRouterSettings } from '@gilsdav/ngx-translate-router';
import { TranslateService, TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { CKEditorModule } from 'ckeditor4-angular';
import { AngularMyDatePickerModule } from '@nodro7/angular-mydatepicker';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { defaultLanguageFunction, localTranslateLoader, localizeLoaderFactory } from '../../routing/router.config';

import { SignAppComponent } from './sign-app.component';
import { Store } from '../../state/store';
import { LocalizationModule } from '../localization.module';

import { TokenAuthService } from '../../services/login/token-auth.service';
import { EnvInfoService } from '../../services/common/env-info.service';
import { LocalFeatureFlagService } from '../../services/common/local-feature-flag.service';
import { HeadersService } from '../../services/common/headers.service';
import { ValidationService } from '../../services/common/validation.service';
import { AlertService } from '../../services/sign-app/alert.service';
import { NibblerBusinessEventsService } from '../../services/nibbler-business-events/nibbler-business-events.service';
import { CookiesService } from '../../services/common/cookies.service';
import { signAppRoutes } from './sign-app.routes';

import { BinderResolver } from '../../services/sign-app/binder.resolver';
import { SignService } from '../../services/sign-app/sign.service';
import { DocumentFormatterService } from '../../services/sign-app/document-formatter.service';
import { PayService } from '../../services/sign-app/pay.service';
import { StripeAccountService } from '../../services/sign-app/stripe-account.service';
import { BrandingResolver } from '../../services/sign-app/branding.resolver';

import { MessageService } from './message';
import { PartnersService } from '../../services/common/partners.service';

import { UtilityModule } from './utility/utility-module.module';

import { UserAgentService } from '../../services/common/user-agent.service';
import { ModalControlService } from '../../services/sign-app/modal-control.service';
import { AuthInterceptor } from '../../services/sign-app/auth.interceptor';
import { CommuteModule } from '../../common/utility-components/commute/commute.module';
import { CoreModule } from '../core.module';
import { PendoSnippetInitializerService } from '../../services/snippets/pendo-snippet-initializer.service';
import { MaintenanceInterceptor } from '../../services/sign-app/maintenance.interceptor';
import { PartyService } from '../../services/sign-app/party.service';
import { IdentityService } from '../../services/sign-app/identity.service';
import { ErrorHandlerFactory, ErrorHandlerService } from '../../services/sign-app/errorHandler.service';
import { WalletService } from '../../services/sign-app/wallet.service';
import { TrackingModule } from '../tracking/tracking.module';
import { GoogleTagManagerService } from '../tracking/subscribers/google-tag-manager.service';
import { SearchParamsService } from '../../services/sign-app/search-params.service';
import { PerimeterXModule } from '../perimeter-x/perimeter-x.module';
import { NotificationMessageService } from '../../services/sign-app/notification.service';

export const baseHREF = '/';

@NgModule({
  imports: [
    BrowserModule,
    HttpClientModule,
    HttpClientJsonpModule,
    TranslateModule.forRoot({
      defaultLanguage: 'en',
      loader: {
        provide: TranslateLoader,
        useFactory: localTranslateLoader,
        deps: [HttpClient],
      },
    }),
    RouterModule.forRoot(
      signAppRoutes,
      // { enableTracing: true }
      { paramsInheritanceStrategy: 'always' }
    ),
    LocalizeRouterModule.forRoot(signAppRoutes, {
      parser: {
        provide: LocalizeParser,
        useFactory: localizeLoaderFactory,
        deps: [TranslateService, Location, LocalizeRouterSettings],
      },
      defaultLangFunction: defaultLanguageFunction,
      alwaysSetPrefix: false,
    }),
    LocalizationModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    HttpClientJsonpModule,
    BrowserAnimationsModule,
    CommuteModule,
    CoreModule,
    TrackingModule.forRoot({
      subscribers: [
        {
          constructor: GoogleTagManagerService,
          args: [{ gtmID: 'GTM-5JLWHWB' }],
        },
      ],
    }),
    PerimeterXModule,
  ],
  declarations: [SignAppComponent],
  providers: [
    { provide: APP_BASE_HREF, useValue: baseHREF },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MaintenanceInterceptor,
      multi: true,
    },
    {
      provide: ErrorHandler,
      deps: [Injector],
      useFactory: ErrorHandlerFactory,
      useClass: ErrorHandlerService,
    },
    Store,
    TokenAuthService,
    EnvInfoService,
    LocalFeatureFlagService,
    TranslateService,
    ValidationService,
    HeadersService,
    AlertService,
    NibblerBusinessEventsService,
    CookiesService,
    DatePipe,
    PartnersService,
    SignService,
    DocumentFormatterService,
    PayService,
    StripeAccountService,
    MessageService,
    ModalControlService,
    BinderResolver,
    BrandingResolver,
    UserAgentService,
    PendoSnippetInitializerService,
    PartyService,
    IdentityService,
    WalletService,
    SearchParamsService,
    NotificationMessageService,
  ],
  bootstrap: [SignAppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SignAppModule {}
