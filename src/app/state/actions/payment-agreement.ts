import { PaymentAgreement } from '../../services/sign-app/payment-agreement.interface';
import { createAction, withPayloadType } from './action';

export const createAgreement = createAction('paymentAgreement/createAgreement', withPayloadType<PaymentAgreement>());
export type CreateAgreementAction = ReturnType<typeof createAgreement>;

export const updateAgreement = createAction(
  'paymentAgreement/updateAgreement',
  withPayloadType<Partial<PaymentAgreement>>()
);
export type UpdateAgreementAction = ReturnType<typeof updateAgreement>;

export const clearAgreement = createAction('paymentAgreement/clearAgreement');
export type ClearAgreementAction = ReturnType<typeof clearAgreement>;

export const markPaymentAgreementAsDeleted = createAction('paymentAgreement/markAsDeleted');
export type MarkAgreementAsDeletedAction = ReturnType<typeof markPaymentAgreementAsDeleted>;

export type PaymentAgreementAction =
  | CreateAgreementAction
  | UpdateAgreementAction
  | ClearAgreementAction
  | MarkAgreementAsDeletedAction;
