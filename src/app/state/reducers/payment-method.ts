import { Reducer } from 'redux';
import { GenericPaymentMethod } from '../../common/utility-components/payment-method/payment-method-helper';
import { clearPaymentMethod, PaymentMethodAction, savePaymentMethod } from '../actions/payment-method';

export const initialState = null;

const paymentMethodReducer: Reducer<GenericPaymentMethod> = (state, action: PaymentMethodAction) => {
  switch (action.type) {
    case clearPaymentMethod.type:
      return initialState;
    case savePaymentMethod.type:
      return {
        ...action.payload,
      };
    default:
      return state || initialState;
  }
};
export default paymentMethodReducer;
