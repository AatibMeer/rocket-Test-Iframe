import { createAction, withPayloadType } from './action';

// keep the setting up or changing of payment agreements well away from the real agreement and binder
// until the user really CONFIRMS the changes

export const clearTemporaryPaymentAgreement = createAction('temporary-payment-agreement/clearAgreement');
export type ClearTemporaryPaymentAgreementAction = ReturnType<typeof clearTemporaryPaymentAgreement>;

export const setTemporaryPaymentAgreementPayee = createAction(
  'temporary-payment-agreement/setPayee',
  withPayloadType<string | undefined>()
);
export type SetTemporaryPaymentAgreementPayeeAction = ReturnType<typeof setTemporaryPaymentAgreementPayee>;

export const setTemporaryPaymentAgreementPayer = createAction(
  'temporary-payment-agreement/setPayer',
  withPayloadType<string | undefined>()
);
export type SetTemporaryPaymentAgreementPayerAction = ReturnType<typeof setTemporaryPaymentAgreementPayer>;

export type TemporaryPaymentAgreementAction =
  | ClearTemporaryPaymentAgreementAction
  | SetTemporaryPaymentAgreementPayeeAction
  | SetTemporaryPaymentAgreementPayerAction;
