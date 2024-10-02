import { combineReducers, Reducer } from 'redux';
import { binderReducer } from './binder';
import { historyReducer } from './history';
import agreementReducer from './agreement';
import paymentAccountReducer from './pay-account';
import { partyRouteReducer } from './party-route';
import { reducer as tempPaymentAgreementReducer } from './temporary-payment-agreement';
import { reducer as alertsReducer } from './alerts';
import identityProfileReducer from './identity-profile';
import type { State } from './main.interface';
import { setBrandConfig, setGlobalBrandConfig } from '../actions/user';
import {
  reminderSentToAllViewers,
  setAdvancedEditOption,
  setBinderHasContent,
  setDocumentEditorMode,
  setInputsNeedRepositioningAfterDocumentEdit,
  setInterviewEditOptions,
  setSignatureBuilderMode,
  setSignMode,
} from '../actions/uiProps';
import type { PayloadAction, PayloadActionCreator } from '../actions/action';
import { recordSignature, saveInviteMessage, saveMissingSignerInfoState, updateAuthInfo } from '../actions/sign';
import { PrepareAction } from '../actions/action';
import paymentMethodReducer from './payment-method';

/**
    We have plenty of reducers that just update one top-level property and need no extra logic.
    This factory creates proper reducer function for all trivial cases.
    @param singleActionCreator - the action type that should be handled by this specific reducer
    @returns reducer function that replaces the state with the action payload if the action type is matched
 */
function trivialReducerFactory<P, T extends string, PA extends PrepareAction<P>>(
  singleActionCreator: PayloadActionCreator<P, T, PA>
): Reducer<P> {
  return ((state, action: PayloadAction<P, T>) =>
    action.type === singleActionCreator.type ? action.payload : state || null) as Reducer<P>;
}

/*
    Since we converted State from Map to Object, we'll polyfill the `get` function.
    Just so that migration goes smoother and we can do `store.getState().get('binder');`
*/
function getPropertyFromContext(name) {
  return this[name];
}
function propGetterReducer() {
  return getPropertyFromContext;
}

export const mainReducer = combineReducers<State>({
  get: propGetterReducer,
  alerts: alertsReducer,
  binder: binderReducer,
  historyInfo: historyReducer,
  identityProfile: identityProfileReducer,
  partyRoute: partyRouteReducer,
  paymentAgreement: agreementReducer,
  paymentAgreementTemp: tempPaymentAgreementReducer,
  paymentAccount: paymentAccountReducer,
  paymentMethod: paymentMethodReducer,
  authInfo: trivialReducerFactory(updateAuthInfo),
  lastSavedInput: trivialReducerFactory(recordSignature),
  brandConfig: trivialReducerFactory(setBrandConfig),
  globalBrandConfig: trivialReducerFactory(setGlobalBrandConfig),
  reminderSentToAllViewers: trivialReducerFactory(reminderSentToAllViewers),
  signatureBuilderModeEnabled: trivialReducerFactory(setSignatureBuilderMode),
  signModeEnabled: trivialReducerFactory(setSignMode),
  documentEditorModeEnabled: trivialReducerFactory(setDocumentEditorMode),
  inputsNeedRepositioningAfterDocumentEdit: trivialReducerFactory(setInputsNeedRepositioningAfterDocumentEdit),
  backToInterviewOptionEnabled: trivialReducerFactory(setInterviewEditOptions),
  advancedEditorOptionEnabled: trivialReducerFactory(setAdvancedEditOption),
  binderHasContent: trivialReducerFactory(setBinderHasContent),
  missingSignerInfo: trivialReducerFactory(saveMissingSignerInfoState),
  inviteMessage: trivialReducerFactory(saveInviteMessage),
});
