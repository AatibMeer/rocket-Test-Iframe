import type { PaymentAccount } from '../../services/sign-app/payment-account.interface';
import { createAction, withPayloadType } from './action';

export const clearPayAccount = createAction('payAccount/clearPayAccount');
export const updatePayAccount = createAction('payAccount/updatePayAccount', withPayloadType<PaymentAccount>());
export type ClearPaymentAccountAction = ReturnType<typeof clearPayAccount>;
export type UpdatePaymentAccountAction = ReturnType<typeof updatePayAccount>;

export type PayAccountAction = ClearPaymentAccountAction | UpdatePaymentAccountAction;
