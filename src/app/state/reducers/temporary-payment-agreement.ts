import { Reducer } from 'redux';
import {
  clearTemporaryPaymentAgreement,
  setTemporaryPaymentAgreementPayee,
  setTemporaryPaymentAgreementPayer,
  TemporaryPaymentAgreementAction,
} from '../actions/temporary-payment-agreement';

export interface TemporaryPaymentAgreementState {
  /** Party paying */
  payerID?: string;
  /** Party receiving */
  payeeID?: string;
}

export const initialState = Object.freeze<TemporaryPaymentAgreementState>({});

export const reducer: Reducer<TemporaryPaymentAgreementState> = (state, action: TemporaryPaymentAgreementAction) => {
  switch (action.type) {
    case clearTemporaryPaymentAgreement.type:
      return initialState;
    case setTemporaryPaymentAgreementPayee.type:
      return {
        ...state,
        payeeID: action.payload,
      };
    case setTemporaryPaymentAgreementPayer.type:
      return {
        ...state,
        payerID: action.payload,
      };
    default:
      return state || initialState;
  }
};
