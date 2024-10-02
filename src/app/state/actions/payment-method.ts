import { createAction, withPayloadType } from './action';
import { GenericPaymentMethod } from '../../common/utility-components/payment-method/payment-method-helper';

export const clearPaymentMethod = createAction('paymentMethod/clearPaymentMethod');
export const savePaymentMethod = createAction(
  'paymentMethod/savePaymentMethod',
  withPayloadType<GenericPaymentMethod>()
);

export type ClearPaymentMethodAction = ReturnType<typeof clearPaymentMethod>;
export type SavePaymentMethodAction = ReturnType<typeof savePaymentMethod>;

export type PaymentMethodAction = ClearPaymentMethodAction | SavePaymentMethodAction;
