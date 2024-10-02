import { Reducer } from 'redux';
import { IdentityProfile } from './identity-profile.interface';
import {
  IdentityProfileAction,
  setAchPaymentMethod,
  setCompanyData,
  setIdentityProfile,
  setPaymentMethods,
  setPayoutMethods,
  setPersonData,
} from '../actions/identity-profile';

export type IdentityProfileState = IdentityProfile;

export const initialState: Readonly<IdentityProfileState> = Object.freeze({
  verifications: null,
  paymentMethods: null,
  payoutMethods: null,
  personData: null,
  companyData: null,
  achPaymentMethod: null,
});

const reducer: Reducer<IdentityProfileState> = (state, action: IdentityProfileAction) => {
  switch (action.type) {
    case setIdentityProfile.type:
      return {
        ...action.payload,
        // TODO temporary hack to avoid resetting payment methods when we get identity profile
        paymentMethods: (state.paymentMethods ? state : action.payload).paymentMethods,
        achPaymentMethod: (state.paymentMethods ? state : action.payload).achPaymentMethod,
      };
    case setPaymentMethods.type:
      return {
        ...state,
        paymentMethods: action.payload,
      };
    case setAchPaymentMethod.type:
      return {
        ...state,
        achPaymentMethod: action.payload,
      };
    case setPayoutMethods.type:
      return {
        ...state,
        payoutMethods: action.payload,
      };
    case setCompanyData.type:
      return {
        ...state,
        companyData: action.payload,
      };
    case setPersonData.type:
      return {
        ...state,
        personData: action.payload,
      };
    default:
      return state || initialState;
  }
};

export default reducer;
