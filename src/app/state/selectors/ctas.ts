import {RoleEnum} from '../../services/sign-app/party.interface';
import type { State } from '../reducers/main.interface';
import {
  getAllInputs,
  getCompletedUserInputs,
  getCurrentParty,
  getEditableInputs,
  getMandatoryUserInputs,
  otherSignersHaveInputs,
  partyHasInputs,
  partyHasRole,
} from './sign';

// These selectors are used in the ActionModalComponent to determine availability of various actions.
// TODO: clean this up (by deduplicating with ./sign selectors), group them by topic and add unit tests

export function userIsOwner(state: State) {
  return partyHasRole(getCurrentParty(state), RoleEnum.Owner);
}

export function userIsSigner(state: State) {
  return partyHasInputs(getCurrentParty(state).reference, state);
}

export function userIsPayer(state: State) {
  return partyHasRole(getCurrentParty(state), RoleEnum.Payer);
}

export function ownerReference(state: State) {
  return state.binder.parties.find((p) => p.roles.includes(RoleEnum.Owner)).reference;
}

export function noOtherSigners(state: State) {
  const currentUser = getCurrentParty(state);
  return partyHasRole(currentUser, RoleEnum.Owner) &&
    !getAllInputs(state).find((input) => input.partyReference !== currentUser.reference);
}

export function userHasEditableInputs(state: State) {
  return getEditableInputs(state).filter((input) => !input.optional).length !== 0;
}

export function otherSignersHavePendingInputs(state: State) {
  const currentUser = getCurrentParty(state);
  return getAllInputs(state)
    .filter((i) => i.partyReference !== currentUser.reference)
    .filter((i) => i.status === 'PENDING').length !== 0;
}

export function ownerHasSigned(state: State) {
  const ownerRef = ownerReference(state);
  return getAllInputs(state)
    .filter((i) => i.status === 'COMPLETED' && i.partyReference === ownerRef)
    .length !== 0;
}

export function docOwnerSignedDocAndOtherSignersPending(state: State) {
  return state.binder.status === 'SIGN_IN_PROGRESS' &&
    userIsOwner(state) &&
    ownerHasSigned(state) &&
    otherSignersHavePendingInputs(state);
}

export function signerSignedAndOtherSignersPending(state: State) {
  return state.binder.status === 'SIGN_IN_PROGRESS' &&
    !userIsOwner(state) &&
    userHasSigned(state) &&
    otherSignersHavePendingInputs(state);
}

export function featureOwnerSignsFirstActivated(state: State) {
  return (state.binder.status === 'IN_PREPARATION' || state.binder.status === 'REVIEW_AND_SHARE') &&
    getAllInputs(state).length !== 0 &&
    userIsOwner(state) &&
    userIsSigner(state) &&
    otherSignersHaveInputs(state, ownerReference(state)) &&
    partyHasInputs(ownerReference(state), state);
}

export function isOwnerSigningSecond(state: State) {
  return (state.binder.status === 'SIGN_IN_PROGRESS' || state.binder.status === 'IN_PREPARATION') &&
    getAllInputs(state).length !== 0 &&
    userIsOwner(state) &&
    userIsSigner(state) &&
    !userHasSigned(state) &&
    partyHasInputs(ownerReference(state), state);
}

export function binderHasInputs(state: State) {
  return getAllInputs(state).filter((i) => !i.optional).length !== 0;
}

export function userHasSigned(state: State) {
  const mandatoryUserInputs = getMandatoryUserInputs(state, getCurrentParty(state).reference);
  const completedUserInputs = getCompletedUserInputs(state, getCurrentParty(state).reference);
  return mandatoryUserInputs.length === completedUserInputs.length;
}

export function signerOrOwnerSigningCompleted(state: State) {
  return state.binder.status === 'SIGN_COMPLETED' && (userIsSigner(state) || userIsOwner(state));
}

export function signerDeclinedToSign(state: State) {
  const currentUser = getCurrentParty(state);
  if (partyHasRole(currentUser, RoleEnum.Owner)) return false;
  if (state.binder.status === 'SIGN_COMPLETED') return false;

  // combine both cancellations and signature_declines
  const cancellationsAndDeclines = state.binder.requests
    .filter((req) => req.type === 'SIGN_CANCELLATION')
    .concat(
      state.binder.requests.filter(
        (req) => req.type === 'SIGNATURE_DECLINE' && req.data.partyId === currentUser.id
      )
    );

  // sort them from newer to older
  cancellationsAndDeclines.sort((a, b) => {
    return new Date(b.created).getTime() - new Date(a.created).getTime();
  });

  // signer declined to sign the current session if most recent request is SIGNATURE_DECLINE
  if (cancellationsAndDeclines[0]) return cancellationsAndDeclines[0].type === 'SIGNATURE_DECLINE';
  return false;
}
