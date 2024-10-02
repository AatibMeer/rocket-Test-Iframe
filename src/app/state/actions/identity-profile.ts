import { createAction, withPayloadType } from './action';
import { Company, IdentityProfile, PaymentMethod, PayoutMethod, Person } from '../reducers/identity-profile.interface';
import { AchPaymentMethod } from '../../services/sign-app/ach-payment-method.interface';

export const setPaymentMethods = createAction('identityProfile/setPaymentMethods', withPayloadType<PaymentMethod[]>());
export type SetPaymentMethodsAction = ReturnType<typeof setPaymentMethods>;

export const setPayoutMethods = createAction('identityProfile/setPayoutMethods', withPayloadType<PayoutMethod[]>());
export type SetPayoutMethodsAction = ReturnType<typeof setPayoutMethods>;

export const setAchPaymentMethod = createAction(
  'identityProfile/setAchPaymentMethod',
  withPayloadType<AchPaymentMethod>()
);
export type SetAchPaymentMethodAction = ReturnType<typeof setAchPaymentMethod>;

export const setCompanyData = createAction('identityProfile/setCompanyData', withPayloadType<Company>());
export type SetCompanyDataAction = ReturnType<typeof setCompanyData>;

export const setPersonData = createAction('identityProfile/setPersonData', withPayloadType<Person>());
export type SetPersonDataAction = ReturnType<typeof setPersonData>;

export const setVerifications = createAction('identityProfile/setVerifications', withPayloadType<unknown[]>());
export type SetVerificationsAction = ReturnType<typeof setVerifications>;

export const setIdentityProfile = createAction('identityProfile/setProfile', withPayloadType<IdentityProfile>());
export type SetIdentityProfileAction = ReturnType<typeof setIdentityProfile>;

export type IdentityProfileAction =
  | SetPaymentMethodsAction
  | SetPayoutMethodsAction
  | SetCompanyDataAction
  | SetPersonDataAction
  | SetVerificationsAction
  | SetIdentityProfileAction
  | SetAchPaymentMethodAction;
