import { ModalType } from './modal-type.enum';

type EmptyObject = Record<string, never>;

interface NextModalWithDelay {
  /** The modal to show next */
  nextModal: ModalType;
  /** The delay in milliseconds before showing the next modal */
  delay?: number;
}

interface Route {
  /**
   * "to" is the same data.to value from ModalControlService::close(reason, data).
   * If no value were given to that method (or the user clicked a header button), then these close reasons will have a
   * default "to":
   * * UserNavigatedBack: "back"
   * * UserNavigatedNext: "next"
   * * anything else: "end"
   */
  [to: string]: ModalType | NextModalWithDelay | EmptyObject;
}

/** The link between the current modal (ModalType) and where to go next */
type ModalRouter = { [fromModal in ModalType]: Readonly<Route> | EmptyObject };

export function isNextModalWithDelay(candidate: unknown): candidate is NextModalWithDelay {
  return !!(candidate as NextModalWithDelay)?.nextModal;
}

export const modalRouter: Readonly<ModalRouter> = {
  actionModal: {},
  addNameModal: {
    selectRoleModal: { nextModal: 'paymentSelectRoleModal', delay: 3000 },
    creatorModal: { nextModal: 'paymentCreatorModal', delay: 3000 },
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  addSignerDataModal: {
    // this modal uses this router *and* dashboard methods
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  advancedEditorWarningModal: {
    back: 'editModal',
    end: {},
  }, // this modal isn't yet using this router or transition directive
  askForRefundModal: {
    back: 'paymentStatusModal',
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  cancelSigningModal: {
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  customTextWarningModal: {}, // this modal isn't yet using this router or transition directive
  declineSigningModal: {
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  editDocTitleModal: {
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  editInputModal: {
    // this modal is using a hybrid emitter/ModalFlowService/ModalRouter setup
    next: 'editSignerModal',
    end: {},
  },
  editModal: {
    next: 'advancedEditorWarningModal',
  }, // this modal isn't yet using this router or transition directive
  editPartyModal: {
    paymentPayeeModal: 'paymentPayeeModal',
    paymentPayerModal: 'paymentPayerModal',
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  editSignerModal: {
    // merge this back into editPartyModal when the modals are reconciled
    editInputModal: 'editInputModal',
    inviteCollaboratorsModal: 'inviteCollaboratorsModal',
    end: {},
  },
  exportDocumentModal: {
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  historyPanel: {
    // this modal is using a hybrid emitter/ModalFlowService/ModalRouter setup
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  howItWorksModal: {
    end: {},
  }, // this modal isn't yet using this router or transition directive
  inviteCollaboratorsModal: {
    complete: { nextModal: 'actionModal', delay: 3000 },
    editSignerModal: 'editSignerModal',
    back: {},
    end: { nextModal: 'actionModal', delay: 3000 },
    next: 'editSignerModal',
  },
  inviteViewersModal: {
    back: 'manageViewersModal',
    manageViewersModal: 'manageViewersModal',
  },
  manageModal: {
    cancelSigningModal: 'cancelSigningModal',
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  manageViewersModal: {
    end: {},
  },
  ownerFinaliseWarningModal: {
    back: {},
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  paymentAchPlaidModal: {
    end: 'paymentChoosePaymentMethod',
  },
  paymentDetailsModal: {
    askForSignatures: 'addSignaturesSelectorModal',
    back: 'paymentSelectRoleModal',
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  paymentCreatorModal: {
    askForSignatures: 'addSignaturesSelectorModal',
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  paymentFailedModal: {
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  paymentKYCVerifyModal: {
    next: 'paymentKYCVerifyResultModal',
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  paymentKYCVerifyResultModal: {
    back: 'paymentKYCVerifyModal',
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  paymentPayConfirmModal: {
    paymentFailed: 'paymentFailedModal',
    choosePaymentMethod: 'paymentChoosePaymentMethod',
    back: 'paymentPayNowModal',
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  paymentSelectRoleModal: {
    payeeRole: 'paymentPayerModal',
    payerRole: 'paymentPayeeModal',
    otherRole: 'paymentPayerModal',
  },
  paymentPayeeModal: {
    back: 'paymentSelectRoleModal',
    editParty: 'editPartyModal',
    next: 'paymentDetailsModal',
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  paymentPayerModal: {
    back: 'paymentSelectRoleModal',
    editParty: 'editPartyModal',
    selectPayee: 'paymentPayeeModal',
    paymentDetails: 'paymentDetailsModal',
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  paymentChoosePaymentMethod: {
    payNow: 'paymentPayNowModal',
    addBankAccount: 'paymentAchPlaidModal',
    next: 'paymentPayConfirmModal',
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  paymentPayNowModal: {
    choosePaymentMethod: 'paymentChoosePaymentMethod',
    back: 'paymentChoosePaymentMethod',
    next: 'paymentPayConfirmModal',
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  paymentPlaidModal: {
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  paymentStatusModal: {
    askForRefund: 'askForRefundModal',
    next: 'removePaymentModal',
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  payoutFailedModal: {
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  removePaymentModal: {
    back: 'paymentStatusModal',
    end: { nextModal: 'actionModal', delay: 3000 },
  },
  removeSignatureModal: {}, // this modal isn't yet using this router or transition directive
  repositioningDemoModal: {}, // this modal isn't yet using this router or transition directive
  signatureModal: { end: {} },
  initialsModal: { end: {} },
  addSignaturesSelectorModal: { 
    actionModal: 'actionModal',
    inviteModal: 'inviteCollaboratorsModal',
    end: { nextModal: 'actionModal', delay: 3000 },
  }
};
