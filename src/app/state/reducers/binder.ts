import dayjs from 'dayjs';
import { Binder } from '../../services/sign-app/binder.interface';
import { SingleDocument } from '../../services/sign-app/single-document.interface';
import { SignatureInput } from '../../services/sign-app/signature-input.interface';
import { Party, RoleEnum } from '../../services/sign-app/party.interface';
import { clearTemporaryPaymentAgreement } from '../actions/temporary-payment-agreement';
import {
  addParty,
  PartyAction,
  removeParty,
  RemovePartyAction,
  removeTemporaryParties,
  swapPartyReferences,
  SwapPartyReferencesAction,
  updateParty,
  UpdatePartyAction,
} from '../actions/party';
import { getPartyByRoleName, partyHasRole, sortInputsFromTopToBottom } from '../selectors';
import type { State } from './main.interface';
import { recordSignature, RecordSignatureAction, SignAction, updateBinder } from '../actions/sign';

const defaultBinderState = null;
const DEFAULT_INPUT_COLOR = '#333333';

export function binderReducer(binder: Binder, action: PartyAction | SignAction): Binder | null {
  if (action.type == 'UPDATE_BINDER') {
    let { parties } = action.data;
    parties = sortPartiesByInputPosition(action.data, parties);
    parties = assignIndexesForPartiesWithoutLegalName(parties);
    // assign colors
    parties = parties.map((party, partyIndex) => {
      if (party?.metaData?.style?.background) {
        return party;
      }
      for (let i = 0; i < stylePallete.length; i++) {
        for (let j = 0; j < action.data.parties.length; j++) {
          if (action.data.parties.metaData?.style?.background === stylePallete[i].background) {
            break;
          }
          if (j == action.data.parties.length - 1) {
            const partyMetaData = party.metaData || {};
            const updatedMetaData = {
              ...partyMetaData,
              style: i == 0 ? stylePallete[partyIndex] : stylePallete[i],
            };
            return { ...party, metaData: updatedMetaData };
          }
        }
      }
    });
    return { ...action.data, parties };
  }
  if (
    action.type === recordSignature.type ||
    action.type == 'RECORD_DATE' ||
    action.type == 'RECORD_CUSTOM_TEXT' ||
    action.type == 'UPDATE_DOCUMENT_NAME' ||
    action.type == 'REMOVE_SIGNATURES'
  ) {
    return { ...binder, documents: binder.documents.map((doc) => documentReducer(binder, doc, action)) };
  }
  if (
    action.type == 'ADD_INPUT' ||
    action.type == 'UPDATE_INPUT' ||
    action.type == 'SET_INPUT_WARNING' ||
    action.type == 'REMOVE_INPUT_WARNING' ||
    action.type == 'REMOVE_INPUT' ||
    action.type === 'TOGGLE_INPUT_ACTIVENESS'
  ) {
    return { ...binder, documents: binder.documents.map((doc) => documentReducer(binder, doc, action)) };
  }

  // can't use type switch until all actions in binder are typed.
  if (addParty.match(action)) {
    const nextPartyStyle = stylePallete.find((color) => {
      return !binder.parties.some((party) => {
        return color.background === party.metaData.style.background;
      });
    });
    return {
      ...binder,
      parties: [
        ...binder.parties,
        {
          ...action.payload,
          isTemporary: true,
          emailChanged: false,
          isCurrentUser: false,
          metaData: {
            style: nextPartyStyle,
          },
        },
      ],
    };
  }

  if (updateParty.match(action) || swapPartyReferences.match(action)) {
    // editing a party means all inputs assigned to this party need to be updated
    return { ...binder, parties: binder.parties.map((party) => partyReducer(party, action)) };
  }

  if (removeParty.match(action)) {
    if (typeof action.payload === 'string') {
      return {
        ...binder,
        parties: binder.parties.filter((party) => party.id !== action.payload),
        documents: binder.documents.map((doc) => documentReducer(binder, doc, action)),
      };
    }
    if ('id' in action.payload) {
      return binderReducer(binder, removeParty(action.payload.id));
    }
    return {
      ...binder,
      parties: binder.parties.filter((party) => party.reference !== (action.payload as Party).reference),
      documents: binder.documents.map((doc) => documentReducer(binder, doc, action)),
    };
  }

  if (removeTemporaryParties.match(action)) {
    return binder.parties
      .filter((party) => party.isTemporary)
      .map((party) => removeParty(party))
      .reduce((accumulatorBinder, removePartyAction) => {
        return binderReducer(accumulatorBinder, removePartyAction);
      }, binder);
  }

  if (action.type === clearTemporaryPaymentAgreement.type) {
    return binderReducer(binder, removeTemporaryParties());
  }

  return binder || defaultBinderState;
}

function assignIndexesForPartiesWithoutLegalName(parties: Party[]): Party[] {
  let missingLegalNameIndex = 1;
  parties.forEach((party) => {
    if (!party.legalName && partyHasRole(party, RoleEnum.Signer)) {
      party.missingLegalNameIndex = missingLegalNameIndex;
    }

    missingLegalNameIndex++;
  });
  return parties;
}

function documentReducer(
  binder: Binder,
  document: SingleDocument,
  action: RemovePartyAction | SignAction
): SingleDocument {
  if (action.type === 'ADD_INPUT') {
    const pageExistsInDocument = document.pages.find((p) => p.id === action.data.position.pageId);
    if (pageExistsInDocument) {
      return { ...document, inputs: [...document.inputs, action.data] };
    }
    return { ...document };
  }

  if (
    action.type == 'UPDATE_INPUT' ||
    removeParty.match(action) ||
    action.type == 'SET_INPUT_WARNING' ||
    action.type == 'REMOVE_INPUT_WARNING' ||
    action.type === 'TOGGLE_INPUT_ACTIVENESS'
  ) {
    return { ...document, inputs: document.inputs.map((input) => newInputReducer(binder, input, action)) };
  }

  if (action.type == 'REMOVE_INPUT') {
    return { ...document, inputs: document.inputs.filter((input) => input.id != action.data.id) };
  }

  if (action.type == 'UPDATE_DOCUMENT_NAME') {
    if (action.data.id == document.id) {
      return { ...document, name: action.data.name };
    }
  }
  if (recordSignature.match(action)) {
    // when updating a sig, find the nearest date to fill default date
    const sigInput = document.inputs.find((input) => input.id === action.payload.id);
    const sigParty = sigInput ? sigInput.partyReference : null;
    const defaultDateInput = document.inputs
      .filter((input) => input.type === 'DATE_SIGNED')
      .filter((input) => input.value == null)
      .find((input) => input.partyReference === sigParty);
    const newInputs = document.inputs.map((input) => {
      if (input.partyReference !== action.payload.partyReference) return input;
      if (input === defaultDateInput) {
        return defaultDateReducer(input, action, binder.dateFormat);
      }
      if (input.type !== 'DATE_SIGNED' && input.type !== 'CUSTOM_TEXT') return sigInputReducer(input, action);
      if (input.type === 'DATE_SIGNED') return dateInputReducer(input, action);
      return input;
    });
    return { ...document, inputs: newInputs };
  }

  if (action.type == 'REMOVE_SIGNATURES') {
    // remove input values belonging to current user
    const inputsWithRemovedSignatures = document.inputs.map((i) => {
      if (i.partyReference != action.data) return i;
      return {
        ...i,
        value: null,
        valueType: null,
        svgData: null,
      };
    });
    return { ...document, inputs: inputsWithRemovedSignatures };
  }

  if (action.type == 'RECORD_CUSTOM_TEXT') {
    const newInputs = document.inputs.map(function (input) {
      if (input.id == action.data.id) return customTextReducer(input, action);
      return input;
    });
    return { ...document, inputs: newInputs };
  }

  if (action.type == 'RECORD_DATE') {
    const newInputs = document.inputs.map(function (input) {
      if (input.id == action.data.id) return dateInputReducer(input, action);
      return input;
    });
    return { ...document, inputs: newInputs };
  }
  return document;
}

function customTextReducer(input, action) {
  return { ...input, ...action.data };
}

function partyReducer(party: Party, action: UpdatePartyAction | SwapPartyReferencesAction): Party {
  switch (action.type) {
    case updateParty.type:
      if (party.reference === action.payload.reference) {
        return {
          ...party,
          ...action.payload,
          emailChanged: 'email' in action.payload ? party.email !== action.payload.email : party.emailChanged,
        };
      }
      return party;
    case swapPartyReferences.type:
      if (action.payload.some((partyToSwap) => partyToSwap.id === party.id)) {
        const partyToSwapWith = action.payload.find((p) => p.id !== party.id);
        return {
          ...party,
          reference: partyToSwapWith.reference,
          metaData: partyToSwapWith.metaData,
        };
      }
      return party;
    default:
      return party;
  }
}

function newInputReducer(
  binder: Binder,
  input: SignatureInput,
  action: RemovePartyAction | SignAction
): SignatureInput {
  if (action.type == 'UPDATE_INPUT') {
    if (action.data.id == input.id) {
      return { ...action.data };
    }
  }

  if (action.type == 'TOGGLE_INPUT_ACTIVENESS') {
    if (action.data.id == input.id) {
      return { ...input, active: !input.active };
    }
    // set all other inputs to inactive
    return { ...input, active: false };
  }

  if (action.type == 'SET_INPUT_WARNING') {
    if (action.data.id == input.id) {
      return { ...input, warning: true };
    }
    return { ...input, warning: false };
  }

  if (action.type == 'REMOVE_INPUT_WARNING') {
    return { ...input, warning: false };
  }

  if (action.type == 'UPDATE_BINDER') {
    const party =
      binder.parties.find((party) => input.partyReference == party.reference) ||
      binder.parties.find((party) => partyHasRole(party, RoleEnum.Owner));
    return { ...input, partyReference: party.reference, position: defaultPositionReducer(input.position, action) };
  }

  if (removeParty.match(action)) {
    // if a party has been removed, every input that is assigned to this party needs to be reassigned back to the owner
    const reference =
      (action.payload as Party).reference ?? binder.parties.find(({ id }) => action.payload === id)?.reference;
    if (
      input.id === action.payload ||
      input.partyReference === reference ||
      input.id === (action.payload as Party).id
    ) {
      const docOwner = getPartyByRoleName(binder, RoleEnum.Owner);
      return {
        ...input,
        position: { ...input.position },
        configuration: { ...input.configuration },
        font: { ...input.font },
        svgData: { ...input.svgData },
        partyReference: docOwner.reference,
      };
    }
  }

  return input;
}

function defaultPositionReducer(position: any, action: any) {
  if (action.type == 'UPDATE_BINDER') {
    return { ...position, hAlignment: position.hAlignment || 'CENTER', vAlignment: position.vAlignment || 'MIDDLE' };
  }
}

function sigInputReducer(input: SignatureInput, action: SignAction) {
  if (recordSignature.match(action)) {
    // if the id is matching, set the font and value
    if (action.payload.id === input.id) {
      return {
        ...input,
        position: { ...input.position },
        configuration: { ...input.configuration },
        font: { ...input.font },
        svgData: { ...input.svgData },
        ...action.payload,
      };
    }
    // also update all existing filled-in signatures
    if (input.value && action.payload.type === input.type) {
      return {
        ...input,
        position: { ...input.position },
        configuration: { ...input.configuration },
        svgData: { ...input.svgData },
        font: { ...action.payload.font },
        value: action.payload.value,
        valueType: action.payload.valueType,
      };
    }
  }
  return input;
}

function getDateFont(color) {
  return { color, type: 'OPEN_SANS' };
}

function dateInputReducer(input: SignatureInput, action: SignAction) {
  if (recordSignature.match(action)) {
    if (action.payload.font) {
      const newFont = getDateFont(action.payload.font.color);
      return {
        ...input,
        position: { ...input.position },
        configuration: { ...input.configuration },
        svgData: { ...input.svgData },
        font: newFont,
      };
    }
    return input;
  }
  if (action.type === 'RECORD_DATE') {
    if (action.data.id === input.id) {
      const font = input.font || getDateFont(DEFAULT_INPUT_COLOR);
      return { ...input, ...action.data, font };
    }
  }
  return input;
}

function defaultDateReducer(input: SignatureInput, action: RecordSignatureAction, dateFormat?: string) {
  const dateValue = dayjs().format(dateFormat.toUpperCase());
  if (action.payload.font) {
    return {
      ...input,
      position: { ...input.position },
      configuration: { ...input.configuration },
      font: getDateFont(action.payload.font.color),
      svgData: { ...input.svgData },
      value: dateValue,
    };
  }
  return {
    ...input,
    position: { ...input.position },
    configuration: { ...input.configuration },
    font: { ...input.font },
    svgData: { ...input.svgData },
    value: dateValue,
  };
}

type BackgroundColor = { background: string };

// colors used to assign to signers
const stylePallete: Array<BackgroundColor> = [
  { background: '#FFB26A' },
  { background: '#FF758E' },
  { background: '#43D5CC' },
  { background: '#8997FF' },
  { background: '#FA6767' },
  { background: '#C164D7' },
  { background: '#F18D6C' },
  { background: '#24B59E' },
  { background: '#8E57E0' },
  { background: '#3DB0F2' },
  { background: '#EF423F' },
  { background: '#E34E9E' },
  { background: '#FBD2DD' },
  { background: '#FCCB2B' },
  { background: '#FBF0B1' },
  { background: '#CBA1D2' },
  { background: '#9692DA' },
  { background: '#9DCF49' },
  { background: '#2DB146' },
  { background: '#43D4CC' },
  { background: '#ffb36c' },
  { background: '#ff768f' },
  { background: '#44d5cc' },
  { background: '#8a98ff' },
  { background: '#fa6868' },
  { background: '#c165d7' },
  { background: '#f18e6d' },
  { background: '#24b69f' },
  { background: '#8f58e0' },
  { background: '#3eb0f2' },
  { background: '#ef4340' },
  { background: '#e34f9e' },
  { background: '#fbd3de' },
  { background: '#fccb2c' },
  { background: '#fbf0b2' },
  { background: '#cba2d2' },
  { background: '#9793da' },
  { background: '#9dcf4a' },
  { background: '#2db246' },
  { background: '#44d4cc' },
  { background: '#ffb46e' },
  { background: '#ff7891' },
  { background: '#46d5cc' },
  { background: '#8c9aff' },
  { background: '#fa6a6a' },
  { background: '#c267d7' },
  { background: '#f18f6f' },
  { background: '#24b8a0' },
  { background: '#905ae0' },
  { background: '#40b1f2' },
  { background: '#ef4542' },
  { background: '#e3519f' },
  { background: '#fbd5df' },
  { background: '#fccb2e' },
  { background: '#fbf0b4' },
  { background: '#cca3d3' },
  { background: '#9894db' },
  { background: '#9ecf4c' },
  { background: '#2db447' },
  { background: '#46d4cc' },
  { background: '#ffb570' },
  { background: '#ff7a92' },
  { background: '#47d6cd' },
  { background: '#8e9cff' },
  { background: '#fa6c6c' },
  { background: '#c268d8' },
  { background: '#f19171' },
  { background: '#24baa2' },
  { background: '#915ce0' },
  { background: '#42b2f2' },
  { background: '#ef4744' },
  { background: '#e353a0' },
  { background: '#fbd7e1' },
  { background: '#fccc30' },
  { background: '#fbf1b6' },
  { background: '#cda5d3' },
  { background: '#9a96db' },
  { background: '#9fd04d' },
  { background: '#2eb547' },
  { background: '#47d5cd' },
  { background: '#ffb672' },
  { background: '#ff7d94' },
  { background: '#49d6cd' },
  { background: '#909eff' },
  { background: '#fa6e6e' },
  { background: '#c36ad8' },
  { background: '#f19273' },
  { background: '#25bba3' },
  { background: '#925de1' },
  { background: '#44b3f2' },
  { background: '#ef4946' },
  { background: '#e454a1' },
  { background: '#fbd9e2' },
  { background: '#fccc32' },
  { background: '#fbf1b8' },
  { background: '#cda6d4' },
  { background: '#9b97dc' },
  { background: '#a0d04f' },
  { background: '#2eb748' },
  { background: '#49d5cd' },
];

export function sortPartiesByInputPosition(binder: Binder, parties: Array<Party>) {
  const allInputs: Array<SignatureInput> = binder.documents.reduce(getInputs, []);
  const sortedInputsByPosition = allInputs.sort((a, b) => sortInputsFromTopToBottom(a, b, binder));
  return parties.sort((a, b) => {
    const aIndex = sortedInputsByPosition.findIndex((input) => input.partyReference == a.reference);
    const bIndex = sortedInputsByPosition.findIndex((input) => input.partyReference == b.reference);
    if (aIndex == -1 && bIndex == -1) return 0;
    if (aIndex == -1) return 1;
    if (bIndex == -1) return -1;
    return aIndex - bIndex;
  });
}

function getInputs(all, doc) {
  return all.concat(doc.inputs);
}

// just putting this here whilst we figure out how to properly choose colours. I'd like a proper pure function which the
// reducer would use, rather than this selector using the reducer
/**
 * Get the next available background color
 * @param {State} state
 */
export function getNextAvailablePartyColor({ binder }: Pick<State, 'binder'>): string {
  // the reducer will add the next available color to this fake party
  // since it's not being dispatched it won't update the store;
  // we're using the reducer as a pure function
  const party: Party = {
    isTemporary: true, // it doesn't matter, it's just not optional
    roles: [],
  };
  const action = updateBinder({
    ...binder,
    parties: [...binder.parties, party],
  });
  const { parties } = binderReducer(binder, {
    ...action,
    payload: undefined as never,
  });
  return parties[parties.length - 1].metaData.style.background;
}
