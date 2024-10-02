import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CKEditorModule } from 'ckeditor4-angular';
import { AngularMyDatePickerModule } from '@nodro7/angular-mydatepicker';
import { SignatureModalComponent } from '../doc-inputs-modals/signature-modal';
import { InitialsModalComponent } from '../doc-inputs-modals/initials-modal';
import { DocumentActionModalComponent } from '../document-action-modal';
import { CancelSigningModalComponent, RemoveSignatureModalComponent } from '../cancel-signing-modal';
import { DeclineToSignModalComponent } from '../decline-to-sign-modal';
import {
  InviteCollaboratorsModalComponent,
  InviteCollaboratorsConnectedModalComponent,
} from '../invite-collaborators-modal/invite-collaborators-modal.component';
import { InviteViewersModalComponent } from '../invite-viewers-modal/invite-viewers-modal.component';
import { ManageViewersModalComponent } from '../manage-viewers-modal/manage-viewers-modal.component';
import { EditInputModalComponent } from '../edit-input-modal/edit-input-modal.component';
import { EditPartyComponent, EditPartyConnectedComponent } from '../edit-party/edit-party.component';
import { SignaturePadWrapperComponent } from '../signature-pad-wrapper/signature-pad-wrapper.component';
import { OwnerFinaliseWarningModalComponent } from '../owner-finalise-warning-modal/owner-finalise-warning-modal.component';

import { PaymentPayerModalComponent } from '../payment-payer-modal/payment-payer-modal.component';
import { PaymentSelectRoleModalComponent } from '../payment-select-role-modal/payment-select-role-modal.component';
import { PaymentPayeeModalComponent } from '../payment-payee-modal/payment-payee-modal.component';
import {
  PaymentDetailsConnectedModalComponent,
  PaymentDetailsModalComponent,
} from '../payment-details-modal/payment-details-modal.component';
import { PaymentPayNowModalComponent } from '../payment-pay-now-modal/payment-pay-now-modal.component';
import {
  PaymentPayConfirmModalComponent,
  PaymentPayConfirmModalConnectedComponent,
} from '../payment-pay-confirm-modal/payment-pay-confirm-modal.component';
import { PaymentPlaidModalComponent } from '../plaid/payment-plaid-modal/payment-plaid-modal.component';
import { RemovePaymentModalComponent } from '../remove-payment-modal/remove-payment-modal.component';

import { PaymentKycVerifyModalComponent } from '../payment-kyc-verify-modal/payment-kyc-verify-modal.component';
import { PayoutFailedModalComponent } from '../payout-failed-modal/payout-failed-modal.component';
import { PaymentCreatorModalComponent } from '../payment-creator-modal/payment-creator-modal.component';

import { ManageModalComponent } from '../manage-modal';
import { CustomTextWarningModalComponent } from '../custom-text-warning-modal/custom-text-warning-modal.component';

import { EditDocTitleModalComponent } from '../edit-title-modal/edit-title-modal.component';
import { AddNameModalComponent } from '../add-name-modal/add-name-modal.component';
import { HowItWorksModalComponent } from '../how-it-works-modal/how-it-works-modal.component';
import { PayByCardComponent } from '../pay-by-card/pay-by-card.component';

import { SimpleTooltipComponent } from '../../../common/utility-components/simple-tooltip/simple-tooltip.component';
import { DocumentEditorComponent } from '../document-editor';
import { EditModalComponent } from '../edit-modal/edit-modal.component';
import { EditWarningModalComponent } from '../edit-warning-modal/edit-warning-modal.component';
import { RepositioningDemoModalComponent } from '../how-it-works-modal/repositioning-demo-modal.component';
import { AddSignerDataModalComponent } from '../add-signer-data-modal/add-signer-data.component';
import { ExportDocumentModalComponent } from '../export-document-modal/export-document-modal.component';
import {
  PaymentStatusModalComponent,
  PaymentStatusModalConnectedComponent,
} from '../payment-status-modal/payment-status-modal.component';
import { AskForRefundModalComponent } from '../ask-for-refund-modal/ask-for-refund-modal.component';
import { PaymentFailedModalComponent } from '../payment-failed-modal/payment-failed-modal.component';
import { PaymentMethodModalComponent } from '../payment-payment-method-modal/payment-method-modal.component';
import { PaymentAchPlaidModalComponent } from '../plaid/payment-ach-plaid-modal/payment-ach-plaid-modal.component';
import { AddSignaturesSelectorModalComponent } from '../add-signatures-selector-modal/add-signatures-selector-modal.component';
import { GeneralModalModule } from '../modal/modal.module';
import { PipeModule } from '../../../common/pipes/pipe.module';
import { CommuteModule } from '../../../common/utility-components/commute/commute.module';
import { DiffidentClassDirective } from '../../../common/utility-components/class/diffident-class.directive';
import { UtilityModule } from '../utility/utility-module.module';
import { TypographyModule } from '../typography/typography.module';
import { PartyComponent } from '../party/party.component';
import { DateInputModule } from '../date/date-input.module';
import { KeyFilterModule } from '../../../common/utility-components/key-filter.directive';
import { InclusivelyHiddenModule } from '../utility/accessibility/inclusively-hidden-module';
import { TestDirectiveModule } from '../test-directive.module';
import { UtilityDirectivesModule } from '../../../common/utility-components/utility-directives.module';
import { TooltipComponent } from '../tooltip-info/tooltip.component';
import { UniqueValidatorDirective } from '../add-signer-data-modal/unique-validator.directive';
import { CreditCardDirectiveModule } from '../../../common/utility-components/credit-card/credit-card.directive';
import { HistoryComponent } from '../history';
import { ActionModalModule } from '../action-modal/action-modal.module';
import { PaymentKycVerifyResultComponent } from '../payment-kyc-verify-result-modal/payment-kyc-verify-result.component';
import { PaymentPayMethodSelectorComponent } from '../payment-pay-method-selector/payment-pay-method-selector.component';
import { PaymentPlaidComponent } from '../payment-plaid/payment-plaid.component';
import { ExpiryDateDirective } from '../../../common/utility-components/credit-card/expiry-date.directive';
import { TextareaComponent } from '../textarea/textarea.component';
import { PillComponent } from '../pill/pill.component';
import { PartyAvatarComponent } from '../party-avatar/party-avatar.component';
import { PartyEditFormComponent } from '../party-edit-form/party-edit-form.component';
import { ClickOutsideModule } from '../directives/clickOutside.directive';
import { TooltipHost } from '../../../common/utility-components/simple-tooltip/tooltip-host.directive';
import { EmailValidatorDirective } from '../add-signer-data-modal/email-validator.directive';
import { PartyGroupDirective } from '../party/party-group.directive';
import { SecureInfoMessageComponent } from '../secure-info-message/secure-info-message.component';
import { AlphaDirective } from '../directives/alpha.directive';
import { InputFilterDirective } from '../directives/input-filter.directive';
import { DragDropDirective } from '../directives/dragDrop.directive';
import { SignService } from '../../../services/sign-app/sign.service';
import { AppModalsComponent } from './app-modals.component';
import { ModalFlowService } from '../modal/modal-transition.directive';

@NgModule({
  imports: [
    CommonModule,
    CommuteModule,
    PipeModule,
    FormsModule,
    ReactiveFormsModule,
    PipeModule,
    TranslateModule,
    GeneralModalModule,
    UtilityModule,
    TypographyModule,
    DateInputModule,
    InclusivelyHiddenModule,
    CKEditorModule,
    KeyFilterModule,
    TestDirectiveModule,
    UtilityDirectivesModule,
    CreditCardDirectiveModule,
    ActionModalModule,
    AngularMyDatePickerModule,
    ClickOutsideModule,
  ],
  declarations: [
    DragDropDirective,
    InputFilterDirective,
    AlphaDirective,
    SecureInfoMessageComponent,
    SecureInfoMessageComponent,
    PartyGroupDirective,
    EmailValidatorDirective,
    TooltipHost,
    PartyEditFormComponent,
    PartyAvatarComponent,
    TextareaComponent,
    PillComponent,
    ExpiryDateDirective,
    UniqueValidatorDirective,
    TooltipComponent,
    PartyComponent,
    DiffidentClassDirective,
    SignatureModalComponent,
    InitialsModalComponent,
    CancelSigningModalComponent,
    DeclineToSignModalComponent,
    DocumentActionModalComponent,
    ManageModalComponent,
    ManageViewersModalComponent,
    SimpleTooltipComponent,
    InviteCollaboratorsModalComponent,
    InviteCollaboratorsConnectedModalComponent,
    InviteViewersModalComponent,
    EditPartyComponent,
    EditPartyConnectedComponent,
    EditInputModalComponent,
    PaymentPayerModalComponent,
    PaymentSelectRoleModalComponent,
    PaymentPayeeModalComponent,
    PaymentStatusModalConnectedComponent,
    PaymentStatusModalComponent,
    AskForRefundModalComponent,
    PaymentPayNowModalComponent,
    PaymentPayConfirmModalComponent,
    PaymentPlaidModalComponent,
    PayoutFailedModalComponent,
    EditDocTitleModalComponent,
    AddNameModalComponent,
    SignaturePadWrapperComponent,
    HowItWorksModalComponent,
    OwnerFinaliseWarningModalComponent,
    CustomTextWarningModalComponent,
    PayByCardComponent,
    PaymentPayConfirmModalComponent,
    PaymentPayConfirmModalConnectedComponent,
    PaymentKycVerifyModalComponent,
    DocumentEditorComponent,
    EditModalComponent,
    EditWarningModalComponent,
    RepositioningDemoModalComponent,
    AddSignerDataModalComponent,
    ExportDocumentModalComponent,
    PaymentPayerModalComponent,
    PaymentCreatorModalComponent,
    PaymentDetailsModalComponent,
    PaymentDetailsConnectedModalComponent,
    RemoveSignatureModalComponent,
    RemovePaymentModalComponent,
    PaymentFailedModalComponent,
    PaymentMethodModalComponent,
    PaymentAchPlaidModalComponent,
    AddSignaturesSelectorModalComponent,
    HistoryComponent,
    PaymentKycVerifyResultComponent,
    PaymentPayMethodSelectorComponent,
    PaymentPlaidComponent,
    AppModalsComponent,
  ],
  providers: [ModalFlowService, SignService],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModalsModule {
  public static components = {
    dynamicComponent: AppModalsComponent,
  };
}
