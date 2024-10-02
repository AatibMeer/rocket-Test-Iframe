import { RoleEnum } from '../../../services/sign-app/party.interface';
import { PaymentAgreementStatus } from '../../../services/sign-app/payment-agreement.interface';
import { getPartyByRoleName, signerDeclinedToSign } from '../../../state/selectors';
import { ActionItem } from './custom-menu-item.interface';

export function getDefaultActions(): Array<ActionItem> {
  return [
    {
      id: 'SEND_TO_NOTARY',
      visible: this.isNotaryDocument,
      product: 'notary',
      heading: 'action-modal_send-to-notary',
      onClick: this.close,
      eventName: 'sendToNotary',
      secondaryCTA: 'VIEW_DOCUMENT',
      headers: [
        {
          visible: true,
          title: 'action-modal_notary-heading',
          description: 'action-modal_notary-description',
          image: 'images/icon-rocket-notary.svg',
        },
      ],
    },
    {
      id: 'ADD_SIGNER_DATA',
      visible: this.signerDataIsMissing,
      product: 'sign',
      heading: 'action-modal_lets-finish-this',
      onClick: this.showAddSignerDataModal,
      eventName: 'addSignerData',
      layout: 'primaryAndSecondaryButtons',
      headers: [
        {
          visible: true,
          title: 'action-modal_contextual-heading',
          description: 'action-modal_contextual-description',
          useDefaultIcon: true,
        },
      ],
    },
    {
      id: 'VIEW_DOCUMENT',
      visible: this.signerDataIsMissing,
      product: 'sign',
      heading: 'action-modal_view-document',
      onClick: this.close,
      eventName: 'viewDocument',
    },
    {
      id: 'OWNER_SIGNS_FIRST_SIGN_NOW',
      visible: this.featureOwnerSignsFirstActivated && !this.userHasSigned && !this.signerDataIsMissing,
      product: 'sign',
      heading: 'action-modal_owner-signs-first-sign-now',
      iconClassName: 'signature2',
      onClick: this.signNowOwnerOnly,
      eventName: 'ownerSignsFirst',
      headers: [
        {
          visible: true,
          title: 'action-modal_owner-signs-first-header',
          useDefaultIcon: true,
          description: 'action-modal_owner-signs-first-description',
        },
      ],
    },
    {
      id: 'OWNER_SIGNS_FIRST_SIGN_LATER',
      visible:
        this.binder.status === 'IN_PREPARATION' &&
        this.featureOwnerSignsFirstActivated &&
        !this.signerDataIsMissing &&
        !this.paymentAgreement,
      product: 'sign',
      heading: 'action-modal_owner-signs-first-sign-later',
      iconClassName: 'signature2',
      onClick: this.showInviteModal,
      eventName: 'ownerSignsFirst',
    },
    {
      id: 'OWNER_SIGNS_FIRST_GET_IT_SIGNED',
      visible:
        this.binder.status === 'REVIEW_AND_SHARE' &&
        this.featureOwnerSignsFirstActivated &&
        !this.signerDataIsMissing &&
        this.userIsOwner &&
        this.userHasSigned &&
        this.otherSignersHaveInputs,
      product: 'sign',
      heading: 'action-modal_invite-collaborators',
      iconClassName: 'signature2',
      onClick: this.showInviteModal,
      eventName: 'ownerSignsFirst',
      headers: [
        {
          useDefaultIcon: true,
          visible: true,
          title: 'action-modal_owner-signs-first-send-for-signing-header',
          description: 'action-modal_owner-signs-first-send-for-signing-description',
        },
      ],
    },
    {
      id: 'PAY_NOW',
      visible:
        // user is payer AND (invites sent OR the owner is the only signer)
        this.userIsPayer &&
        ((this.paymentAgreement?.status === 'draft' && this.inputs.length > 0 && this.noOtherSigners) ||
          this.paymentAgreement?.status === 'pending'),
      product: 'wallet',
      heading: 'action-modal_pay-confirm',
      iconClassName: 'pay',
      onClick: this.showPaymentPayNowModal,
      eventName: 'payConfirmClicked',
      headerTitle: 'action-modal_setup-payment-header',
      headers: [
        {
          title: () => {
            if (this.paymentAgreement) {
              const { amount, currency } = this.paymentAgreement.payments[0].ins[0].payment;
              const paymentAmount = this.currencyPipe.transform((amount / 100).toFixed(2), currency, 'symbol', '1.2');
              return this.translateService.get('action-modal_setup-payment-title', {
                value: paymentAmount,
              });
            }
            return this.translateService.get('action-modal_setup-payment-title-no-agreement');
          },
          image: 'images/rocketwallet-icon.svg',
          description: 'action-modal_setup-payment-description',
          visible: true,
        },
      ],
    },
    {
      id: 'GET_VERIFIED',
      visible:
        (this.binder.status === 'SIGN_IN_PROGRESS' || this.binder.status === 'SIGN_COMPLETED') &&
        this.userIsPayee &&
        !!this.paymentAgreement &&
        !this.payeeAccountAttached,
      product: 'wallet',
      heading: 'action-modal_get-verified',
      iconClassName: 'pay',
      onClick: this.getVerified,
      eventName: 'getVerifiedClicked',
      headerTitle: 'get-verified-modal-header',
      headers: [
        {
          visible: true,
          image: 'images/icon-wallet-verify.svg',
          title: 'get-verified-modal-body_heading',
          description: null,
        },
      ],
    },
    {
      id: 'RETRY_VERIFICATION',
      visible:
        (this.binder.status === 'SIGN_IN_PROGRESS' || this.binder.status === 'SIGN_COMPLETED') &&
        this.userIsPayee &&
        !!this.paymentAgreement &&
        this.payeeAccountVerificationFailed,
      product: 'wallet',
      heading: 'action-modal_retry-verification-primary',
      iconClassName: 'pay',
      onClick: this.getVerified,
      eventName: 'getVerifiedClicked',
      headers: [
        {
          visible: true,
          image: 'images/icon-wallet-verify.svg',
          title: 'action-modal_retry-verification-header',
          description: 'action-modal_retry-verification-description',
        },
      ],
      secondaryCTA: '__KYC_CALL_US__',
    },
    {
      id: '__KYC_CALL_US__',
      visible: false, // it's only visible if it's pulled in as a secondary CTA
      heading: 'action-modal_retry-verification-secondary',
      eventName: 'kyc_call_assist',
      url: this.translateService.instant('action-modal-retry-verification-contact-number'),
    },
    {
      id: 'ADD_BANK_ACCOUNT',
      visible:
        !this.payoutEnabled &&
        this.userIsPayee &&
        this.payeeAccountAttached &&
        !!this.paymentAgreement &&
        this.paymentAgreement.status !== PaymentAgreementStatus.Optional,
      product: 'wallet',
      heading: 'action-modal_add-bank-account',
      iconClassName: 'pay',
      onClick: this.showPaymentPlaidModal,
      eventName: 'addBankAccountClicked',
      headerTitle: 'action-modal_add-bank-account-header',
      headers: [
        {
          image: 'images/icon-wallet-verify.svg',
          title: 'action-modal_add-bank-account-title',
          description: null,
          visible: true,
        },
      ],
    },
    {
      id: 'GET_SIGNATURE',
      visible:
        this.binder.status === 'IN_PREPARATION' &&
        this.userIsOwner &&
        !this.signatureBuilderModeEnabled &&
        this.inputs.length === 0 &&
        this.binder.documents[0].signable &&
        !this.signerDataIsMissing,
      product: 'sign',
      heading: 'action-modal_get-signature',
      iconClassName: 'signature2',
      onClick: this.getSignature.bind(this),
      eventName: 'getSignatureClicked',
      headers: [
        {
          visible: true,
          useDefaultIcon: true,
          title: 'action-modal_get-signature_header',
          description: 'action-modal_get-signature_header_description',
        },
      ],
    },
    {
      id: 'PAY_ADD_A_PAYMENT',
      visible:
        this.userIsOwner &&
        this.binder.status === 'IN_PREPARATION' &&
        ((this.paymentsEnabled && !this.paymentAgreement) ||
          this.paymentAgreement?.status === PaymentAgreementStatus.Optional) &&
        (this.inputs.length > 0 || this.binder.documents.every((document) => !document.signable)),
      product: 'wallet',
      heading: 'action-modal_set-up-a-payment',
      iconClassName: 'pay',
      onClick: this.showPaymentPayerModal,
      eventName: 'addAPaymentClicked',
      headers: [
        {
          visible: true,
          title: 'action-modal_title-add-payment',
          description: 'action-modal_description-add-payment',
        },
      ],
    },
    {
      id: 'EDIT_SIGNATURE',
      visible:
        this.binder.status === 'IN_PREPARATION' &&
        this.userIsOwner &&
        !this.signatureBuilderModeEnabled &&
        this.inputs.length > 0 &&
        this.binder.documents[0].signable &&
        !this.signerDataIsMissing,
      product: 'sign',
      heading: 'action-modal_edit-signatures',
      iconClassName: 'signature2',
      onClick: this.getSignature,
      eventName: 'editSignatureClicked',
    },
    {
      id: 'INVITE_MODAL_SIGN_ONLY',
      visible:
        (this.binder.status === 'IN_PREPARATION' || this.binder.status === 'REVIEW_AND_SHARE') &&
        this.userIsOwner &&
        this.inputs.length > 0 &&
        this.binder.documents[0].signable &&
        !this.signerDataIsMissing &&
        !this.noOtherSigners &&
        !this.paymentAgreement &&
        !this.featureOwnerSignsFirstActivated,
      product: 'sign',
      heading: 'action-modal_invite-collaborators_sign-only-cta',
      iconClassName: 'addsigner',
      onClick: this.showInviteModal.bind(this),
      eventName: 'inviteSignersModalShown',
      headers: [
        {
          useDefaultIcon: true,
          title: 'action-modal_invite-collaborators_sign-only-title',
          description: 'action-modal_invite-collaborators_sign-only-description',
          visible: true,
        },
      ],
    },
    {
      id: 'INVITE_MODAL_PAY_ONLY',
      visible:
        (this.binder.status === 'IN_PREPARATION' || this.binder.status === 'REVIEW_AND_SHARE') &&
        this.userIsOwner &&
        this.binder.documents[0].signable &&
        !this.signerDataIsMissing &&
        this.noOtherSigners &&
        this.paymentAgreement &&
        !this.userIsPayer,
      product: 'wallet',
      heading: 'action-modal_invite-collaborators_pay-only-cta',
      iconClassName: 'addsigner',
      onClick: this.showInviteModal,
      eventName: 'inviteSignersModalShown',
      headers: [
        {
          title: 'action-modal_invite-collaborators_pay-only-title',
          description: 'action-modal_invite-collaborators_pay-only-description',
          visible: true,
        },
      ],
    },
    {
      id: 'INVITE_MODAL_SIGN_AND_PAY',
      visible: !!(
        (this.binder.status === 'IN_PREPARATION' || this.binder.status === 'REVIEW_AND_SHARE') &&
        this.userIsOwner &&
        this.inputs.length > 0 &&
        this.binder.documents[0].signable &&
        !this.signerDataIsMissing &&
        !this.noOtherSigners &&
        !!this.paymentAgreement &&
        this.paymentAgreement.status !== PaymentAgreementStatus.Optional &&
        this.paymentAgreement.status !== PaymentAgreementStatus.Proposed
      ),
      product: 'sign',
      heading: 'action-modal_invite-collaborators_sign-and-pay-cta',
      iconClassName: 'addsigner',
      onClick: this.showInviteModal,
      eventName: 'inviteSignersModalShown',
      headers: [
        {
          title: 'action-modal_invite-collaborators_sign-and-pay-title',
          description: 'action-modal_invite-collaborators_sign-and-pay-description',
          visible: true,
        },
      ],
    },
    {
      id: 'SIGN_NOW_OWNER',
      visible:
        this.userIsOwner &&
        this.binder.status === 'IN_PREPARATION' &&
        this.noOtherSigners &&
        !this.paymentAgreement &&
        this.inputs.length > 0 &&
        this.binder.documents[0].signable &&
        !this.signerDataIsMissing,
      product: 'sign',
      heading: 'action-modal_sign-now',
      iconClassName: 'signature2',
      onClick: this.signNowOwnerOnly,
      eventName: 'signNowOwnerOnly',
      headers: [
        {
          useDefaultIcon: true,
          visible: this.userIsOwner,
          title: 'action-modal_owner-sign-now-header',
          description: 'action-modal_owner-sign-now-header_description',
        },
        {
          useDefaultIcon: true,
          visible: this.userIsSigner,
          title: 'action-modal_signer-sign-now-header',
          description: 'action-modal_signer-sign-now-header_description',
        },
      ],
    },
    {
      id: 'SIGN_NOW_SIGNER',
      visible:
        this.binder.status === 'SIGN_IN_PROGRESS' &&
        this.userHasEditableInputs &&
        this.userIsSigner &&
        this.binder.documents[0].signable,
      product: 'sign',
      heading: 'action-modal_sign-now',
      iconClassName: 'signature2',
      onClick: this.signNow,
      eventName: 'signNowSigner',
      headers: [
        {
          useDefaultIcon: true,
          visible: this.userIsOwner,
          title: 'action-modal_owner-sign-now-header',
          description: 'action-modal_owner-sign-now-header_description',
        },
        {
          useDefaultIcon: true,
          visible: this.userIsSigner,
          title: 'action-modal_signer-sign-now-header',
          description: 'action-modal_signer-sign-now-header_description',
        },
      ],
    },
    {
      id: 'REVIEW_PAYMENT',
      visible: !!this.paymentAgreement && this.paymentAgreement.status !== PaymentAgreementStatus.Optional,
      product: 'wallet',
      heading: 'action-modal_review-payment',
      iconClassName: 'pay',
      onClick: this.showPaymentStatusModal,
      eventName: 'paymentReviewClicked',
      headers: [
        {
          visible: true,
          image: 'images/rocketwallet-icon.svg',
          title: 'action-modal_review-payment-title',
          description: 'action-modal_review-payment-description',
        },
      ],
    },
    {
      id: 'MANAGE_SIGNERS_MODAL',
      visible: this.binder.status === 'SIGN_IN_PROGRESS' && this.userIsOwner && this.binder.documents[0].signable,
      product: 'sign',
      heading: 'action-modal_manage-recipients',
      iconClassName: 'profile',
      onClick: this.showManageModal,
      eventName: 'manageSignersModalShown',
    },
    {
      id: 'MANAGE_VIEWERS_MODAL',
      visible: this.userIsOwner && !!getPartyByRoleName(this.binder, RoleEnum.Viewer),
      product: 'sign',
      heading: 'action-modal_manage-viewers',
      iconClassName: 'profile',
      onClick: this.showManageViewersModal,
      eventName: 'manageViewersModalShown',
    },
    {
      id: 'SHARE_MODAL',
      visible: this.userIsOwner && !getPartyByRoleName(this.binder, RoleEnum.Viewer),
      product: 'sign',
      heading: 'action-modal_share-document',
      iconClassName: 'share',
      onClick: this.showInviteViewerModal,
      eventName: 'shareModalShown',
    },
    {
      id: 'CHANGE_DOCUMENT_TITLE_MODAL',
      visible: this.binder.status === 'IN_PREPARATION' && this.userIsOwner,
      product: 'sign',
      heading: 'action-modal_change-title',
      iconClassName: 'icon-text',
      onClick: this.changeDocTitle,
      eventName: 'changeDocTitleModalShown',
    },
    {
      id: 'HISTORY_MODAL',
      visible: true,
      product: 'sign',
      heading: 'action-modal_see-history',
      iconClassName: 'clock2',
      onClick: this.seeHistory,
      eventName: 'historyModalShown',
      headers: [
        {
          useDefaultIcon: true,
          visible: this.userIsViewer,
          title: 'action-modal_viewer-header',
          description: null,
        },
      ],
    },
    {
      id: 'DOWNLOAD',
      visible: true,
      product: 'sign',
      heading: 'action-modal_download',
      iconClassName: 'cloud-download',
      onClick: this.exportDocument,
      eventName: 'downloadClicked',
    },
    {
      id: 'PRINT',
      visible: !this.isMsie,
      product: 'sign',
      heading: 'action-modal_print',
      iconClassName: 'print',
      onClick: this.printDoc,
      eventName: 'printClicked',
    },
    {
      id: 'CANCEL_SIGNING_MODAL',
      visible:
        (this.binder.status === 'REVIEW_AND_SHARE' || this.binder.status === 'SIGN_IN_PROGRESS') &&
        this.userIsOwner &&
        this.binder.documents[0].signable,
      product: 'sign',
      heading:
        this.binder.status === 'REVIEW_AND_SHARE' ? 'action-modal_remove-signature' : 'action-modal_cancel-request',
      iconClassName: 'cancel-blue',
      onClick: this.binder.status === 'REVIEW_AND_SHARE' ? this.showRemoveSignatureModal : this.showCancelModal,
      eventName: 'cancelSigningModalShown',
      wrapperClass: 'action-red',
    },
    {
      id: 'DECLINE_SIGNING_MODAL',
      visible:
        this.binder.status === 'SIGN_IN_PROGRESS' &&
        !signerDeclinedToSign(this.store.getState()) &&
        this.userIsSigner &&
        !this.userIsOwner &&
        this.userHasEditableInputs &&
        this.binder.documents[0].signable,
      product: 'sign',
      heading: 'action-modal_decline-request',
      iconClassName: 'cancel-blue',
      onClick: this.showDeclineModal,
      eventName: 'declineSigningModalShown',
      wrapperClass: 'action-red',
    },
    {
      id: 'EDIT_MODAL',
      visible:
        this.binder.status === 'IN_PREPARATION' &&
        this.userIsOwner &&
        this.docIsEditable &&
        window.location.href.includes('advancedEdit=enabled'),
      product: 'sign',
      heading: 'action-modal_edit-document',
      iconClassName: 'settings',
      onClick: this.goToEdit.bind(this),
      eventName: 'editModalShown',
    },
    {
      id: 'ADD_ANOTHER_SIGNER',
      visible:
        this.binder.status === 'IN_PREPARATION' &&
        this.userIsOwner &&
        this.binder.documents[0].signable &&
        this.signerDataIsMissing,
      product: 'sign',
      heading: 'action-modal_add-another-signer',
      iconClassName: 'signature2',
      onClick: this.addAnotherSigner,
      eventName: 'addAnotherSignerClicked',
    },
    {
      id: 'COPY_UPLOADED_DOCUMENT_START_SIGNING',
      visible: false,
      product: 'sign',
      onClick: this.startSigningUploadedDocument.bind(this),
      eventName: 'copyUploadedDocumentStartSigning',
    },
    {
      id: 'COPY_INTERVIEW_DOCUMENT_START_SIGNING',
      visible: false,
      product: 'sign',
      onClick: this.startSigningInterviewedDocument.bind(this),
      eventName: 'copyInterviewDocumentStartSigning',
    },
  ];
}
