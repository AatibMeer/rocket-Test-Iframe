import type { Reducer } from 'redux';
import { PaymentAgreement, PaymentAgreementStatus } from '../../services/sign-app/payment-agreement.interface';
import {
  clearAgreement,
  createAgreement,
  markPaymentAgreementAsDeleted,
  PaymentAgreementAction,
  updateAgreement,
} from '../actions/payment-agreement';
import { removeParty, RemovePartyAction, UpdatePartyAction } from '../actions/party';

export type PaymentAgreementState = PaymentAgreement | null;

export const initialState: PaymentAgreementState = null;

const partyIsInAgreement = (partyID: string, agreement: PaymentAgreement): boolean => {
  return agreement.payments.some((payment) => {
    return (
      payment.ins.some((paymentIn) => paymentIn.partyId === partyID) ||
      payment.outs.some((paymentOut) => paymentOut.partyId === partyID) ||
      payment.fees.some((fee) => {
        return fee.breakdown.some((breakdown) => breakdown.partyId === partyID);
      })
    );
  });
};

const reducer: Reducer<PaymentAgreementState> = (
  state,
  action: PaymentAgreementAction | RemovePartyAction | UpdatePartyAction
) => {
  switch (action.type) {
    case clearAgreement.type:
      return initialState;

    case createAgreement.type:
      // return a copy of the created agreement
      return {
        ...action.payload,
      };

    case updateAgreement.type: {
      // braces scope the variables to this case
      // merge action into state
      const requiredFallbacks: PaymentAgreementState = state || {
        firstPayment: '',
        lastPayment: '',
        brand: '',
        paymentPeriod: '',
        payments: [],
      };
      return {
        ...requiredFallbacks,
        ...state,
        ...action.payload,
      };
    }

    case markPaymentAgreementAsDeleted.type:
      if (state === null) {
        return null;
      }
      return reducer(state, updateAgreement({ status: PaymentAgreementStatus.DeletedLocally }));

    case removeParty.type: {
      // a party was deleted. If it is party to this payment agreement then we must mark the agreement as deleted
      if (state === null) {
        return null;
      }
      const partyID = typeof action.payload === 'string' ? action.payload : action.payload.id;
      if (!partyID) {
        // can't find a payment by party reference; must be an ID!
        return state;
      }
      const isIncluded = partyIsInAgreement(partyID, state);
      if (isIncluded) {
        return {
          ...state,
          status: PaymentAgreementStatus.DeletedLocally,
          payments: [],
        };
      }
      return state;
    }

    default:
      return state || initialState;
  }
};
export default reducer;
