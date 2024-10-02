import { Reducer } from 'redux';
import { PaymentAccount } from '../../services/sign-app/payment-account.interface';
import { clearPayAccount, PayAccountAction, updatePayAccount} from '../actions/pay-account';

export type PaymentAccountState = PaymentAccount | null;

export const initialState = null;

// This is a very simple reducer that just caches the PaymentAccount in the store.
// This will affect actions we will display to the user.
// Usually only the PAYEE will have a PaymentAccount.
const paymentAccountReducer: Reducer<PaymentAccountState> = (state, action: PayAccountAction) => {
  switch (action.type) {
    case clearPayAccount.type:
      return initialState;
    case updatePayAccount.type:
      return {
        ...state,
        ...action.payload,
      };
    default:
      return state || initialState;
  }
};
export default paymentAccountReducer;
