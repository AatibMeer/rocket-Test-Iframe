import { NgModule } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { LocalizeRouterModule } from '@gilsdav/ngx-translate-router';
import { SignAppDashboardComponent } from './sign-app-dashboard.component';
import { PipeModule } from '../../../common/pipes/pipe.module';
import { GeneralModalModule } from '../modal/modal.module';
import { DocPreviewModule } from '../doc-preview/doc-preview.module';
import { AlertModule } from '../alert';
import { NotificationMessageModule } from '../notification-message/notification-message.component';
import { SignSummaryComponent } from '../sign-summary/sign-summary.component';
import { UtilityModule } from '../utility/utility-module.module';
import { CommuteModule } from '../../../common/utility-components/commute/commute.module';
import { SearchParamsService } from '../../../services/sign-app/search-params.service';
import { WalletService } from '../../../services/sign-app/wallet.service';
import { IdentityService } from '../../../services/sign-app/identity.service';
import { PartyService } from '../../../services/sign-app/party.service';
import { PendoSnippetInitializerService } from '../../../services/snippets/pendo-snippet-initializer.service';
import { UserAgentService } from '../../../services/common/user-agent.service';
import { BrandingResolver } from '../../../services/sign-app/branding.resolver';
import { BinderResolver } from '../../../services/sign-app/binder.resolver';
import { ModalControlService } from '../../../services/sign-app/modal-control.service';
import { MessageService } from '../message';
import { StripeAccountService } from '../../../services/sign-app/stripe-account.service';
import { PayService } from '../../../services/sign-app/pay.service';
import { DocumentFormatterService } from '../../../services/sign-app/document-formatter.service';
import { SignService } from '../../../services/sign-app/sign.service';
import { PartnersService } from '../../../services/common/partners.service';
import { CookiesService } from '../../../services/common/cookies.service';
import { NibblerBusinessEventsService } from '../../../services/nibbler-business-events/nibbler-business-events.service';
import { AlertService } from '../../../services/sign-app/alert.service';
import { HeadersService } from '../../../services/common/headers.service';
import { ValidationService } from '../../../services/common/validation.service';
import { LocalFeatureFlagService } from '../../../services/common/local-feature-flag.service';
import { EnvInfoService } from '../../../services/common/env-info.service';
import { TokenAuthService } from '../../../services/login/token-auth.service';
import { Store } from '../../../state/store';
import { ActionModalModule } from '../action-modal/action-modal.module';
import { NotificationMessageService } from '../../../services/sign-app/notification.service';
import { ProgressBannerComponent } from '../progress-banner';
import { InputEditorComponent } from '../progress-banner/input-editor.component';
import { StickyBannerComponent } from '../sticky-banner/banner.component';
import { TestDirectiveModule } from '../test-directive.module';

const routes: Routes = [
  {
    path: '',
    component: SignAppDashboardComponent,
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [
    TranslateModule,
    RouterModule.forChild(routes),
    LocalizeRouterModule.forChild(routes),
    PipeModule,
    CommonModule,
    RouterModule,
    LocalizeRouterModule,
    GeneralModalModule,
    DocPreviewModule,
    AlertModule,
    UtilityModule,
    CommuteModule,
    NotificationMessageModule,
    ActionModalModule,
    TestDirectiveModule,
  ],
  declarations: [
    SignAppDashboardComponent,
    SignSummaryComponent,
    ProgressBannerComponent,
    InputEditorComponent,
    StickyBannerComponent,
  ],
  providers: [
    NotificationMessageService,
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
  ],
})
export class DashboardModule {}
