import {TokenAuthInfo} from '../../services/login/token-auth-info.interface';
import {Binder} from '../../services/sign-app/binder.interface';
import {InputType, SignatureInput} from '../../services/sign-app/signature-input.interface';
import {MissingSignerInfoState} from '../reducers/missing-signer-info';
import {SingleDocument} from '../../services/sign-app/single-document.interface';
import {createAction, withPayloadType} from './action';

// below actions used in signapp
// for actions related to esign global, see actions/esign.ts

export const updateAuthInfo = createAction<TokenAuthInfo>('sign/updateAuthInfo');

export function updateBinder(binderData: Binder) {
  return {
    type: 'UPDATE_BINDER',
    data: binderData,
  };
}

export function updateDocumentName(data: Pick<SingleDocument, 'id' | 'name'>) {
  return {
    type: 'UPDATE_DOCUMENT_NAME',
    data,
  };
}

export function updateHistory(historyInfo: any) {
  return {
    type: 'UPDATE_HISTORY',
    data: historyInfo,
  };
}

// Updates the binder with recorded signature.
// All logic regarding where to record it and how to update date inputs is
// located in the reducer.
export type RecordSignature = {
  id: string;
  partyReference: string;
  font?: Record<string, unknown>;
  value?: string;
  valueType?: 'IMAGE' | 'TEXT';
  type: InputType;
};
export const recordSignature = createAction('sign/recordSignature', withPayloadType<RecordSignature>());
export type RecordSignatureAction = ReturnType<typeof recordSignature>;

export type RecordCustomTextAction = {
  id: string;
  partyReference: string;
  value?: string;
  font?: Object;
};

export function recordCustomText(data: RecordCustomTextAction) {
  return {
    type: 'RECORD_CUSTOM_TEXT',
    data,
  };
}

export function recordDate(data: RecordDateAction) {
  return {
    type: 'RECORD_DATE',
    data,
  };
}

export function removeSignaturesForParty(data: string) {
  return {
    type: 'REMOVE_SIGNATURES',
    data,
  };
}

export function addInput(data: SignatureInput) {
  return {
    type: 'ADD_INPUT',
    data,
  };
}

export function updateInput(data: SignatureInput) {
  return {
    type: 'UPDATE_INPUT',
    data,
  };
}

export function toggleInputActiveness(data: { id: string }) {
  return {
    type: 'TOGGLE_INPUT_ACTIVENESS',
    data,
  };
}

export function removeInput(data: SignatureInput) {
  return {
    type: 'REMOVE_INPUT',
    data,
  };
}

export function setInputWarning(data) {
  return {
    type: 'SET_INPUT_WARNING',
    data,
  };
}

export function removeInputWarning() {
  return {
    type: 'REMOVE_INPUT_WARNING',
  };
}

export const saveMissingSignerInfoState = createAction<MissingSignerInfoState>('sign/storeMissingSignerInfo');

export type InviteMessage = {
  value: string;
};

export const saveInviteMessage = createAction<InviteMessage>('sign/inviteMessage');

export type RecordDateAction = {
  id: string;
  value: string;
};

export type SignAction = RecordSignatureAction | { type: string; data?: any };
