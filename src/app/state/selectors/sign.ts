import {Binder} from '../../services/sign-app/binder.interface';
import {Party, Role, RoleEnum} from '../../services/sign-app/party.interface';
import {SignatureInput} from '../../services/sign-app/signature-input.interface';
import {SignerInfo} from '../reducers/missing-signer-info';
import type {State} from '../reducers/main.interface';

// This a place for common functions that need to extract complex data from
// the stored state. We might consider using cached selectors in future.

// below selectors are used in signapp
// for esign global related selectors, see selectors/esign.ts

export function getPartiesWithStatus({binder, historyInfo}: Pick<State, 'binder' | 'historyInfo'>): Party[] {
  const documentEvents = historyInfo || [];
  return binder.parties.map((party) => {
    const partyStatus = getPartyMostImportantAction(party);
    return {
      ...party,
      status: partyStatus
    };
  });

  function getPartyMostImportantAction(party: Readonly<Party>): Party['status'] {
    let cancelEvent;
    let events;
    documentEvents.forEach((event)=> {
      if(event.type == 'BINDER_CANCELED' && (!cancelEvent || new Date(cancelEvent.occurredAt) < new Date(event.occurredAt))) {
        cancelEvent = event;
      }
    });
    //take into consideration only events after most recent cancelation.
    if(!cancelEvent) {
      events = documentEvents;
    } else {
      events = documentEvents.filter((event) => new Date(cancelEvent.occurredAt) < new Date(event.occurredAt));
    }
    // returns the most important action the party has done
    // from most important to least, one of: 'SIGNED' | 'DECLINED' | 'VIEWED' | 'INVITED'
    let partyEvents = events.filter(event => event.partyId == party.id);
    let partyInBinder = binder.parties.find(binderParty => party.id == binderParty.id);

    if (partyEvents.find((docEvent) => docEvent.type == 'BINDER_SIGNED')) return 'SIGNED';
    if (partyEvents.find((docEvent) => docEvent.type == 'SIGNER_DECLINED_TO_SIGN' && partyInBinder.id == docEvent.partyId)) return 'DECLINED';
    if (partyEvents.find((docEvent) => docEvent.type == 'BINDER_VIEWED' && partyInBinder.id == docEvent.partyId)) return 'VIEWED';
    // 'INVITED' is default/beginning status for each party
    return 'INVITED';
  }
}

export function getCurrentParty({authInfo, binder}: Pick<State, 'authInfo' | 'binder'>): Readonly<Party> | undefined {
  if (!authInfo) return;
  // serviceData has partyId for SignApp invitations
  const partyId = authInfo.serviceData.partyId || authInfo.serviceData.upid;
  return binder?.parties.find( party => party.id == partyId );
}

export function partyHasRole(party: Pick<Party, 'roles'> | undefined, role: Role): boolean {
  return (party && party.roles.includes(role)) || false;
}

/**
 * Does a party have any of the named roles?
 * If no roles are given then returns true if the party has any roles attached.
 */
export function partyHasAnyRole(party: Party, ...roles: Role[]): boolean {
  if (roles.length > 0) {
    return roles.some(role => partyHasRole(party, role));
  }
  return party.roles.length > 0;
}

/**
 * Does a party have all of these roles?
 */
export function partyHasAllRoles(party: Party, role1: Role, ...otherRoles: Role[]): boolean {
  return [role1, ...otherRoles].every(role => partyHasRole(party, role));
}

/**
 * Get the first party to have a certain role
 */
export function getPartyByRoleName(binder: Binder, role: Role): Readonly<Party> | undefined;
export function getPartyByRoleName<T extends Party>(parties: T[], role: Role): T | undefined;
export function getPartyByRoleName<T extends Party>(binderOrParties: Binder | T[], roleName: Role): Readonly<Party> | T | undefined {
  if (Array.isArray(binderOrParties)) {
    return binderOrParties.find(party => partyHasRole(party, roleName));
  }
  return getPartyByRoleName(binderOrParties.parties, roleName);
}

/**
 * Get the first party to have one of these roles in order of role importance.
 *
 * This is equivalent to <code>getPartyByRoleName(b, 'PAYER') || getPartyByRoleName(b, 'OWNER') || ...</code>.
 */
export function getPartyByRoleHierarchy(binder: Binder, mostImportantRole: Role, nextRole: Role, ...additionalRoles: Role[]): Readonly<Party> | undefined;
export function getPartyByRoleHierarchy<T extends Party>(parties: T[], mostImportantRole: Role, nextRole: Role, ...additionalRoles: Role[]): T | undefined;
export function getPartyByRoleHierarchy<T extends Party>(binderOrParties: Binder | T[], mostImportantRole: Role, nextRole: Role, ...additionalRoles: Role[]): Readonly<Party> | T | undefined {
  if (Array.isArray(binderOrParties)) {
    const roles = [mostImportantRole, nextRole, ...additionalRoles];
    for (let role of roles) {
      const party = getPartyByRoleName(binderOrParties, role);
      if (party) {
        return party;
      }
    }
    return undefined;
  }
  return getPartyByRoleHierarchy(binderOrParties.parties, mostImportantRole, nextRole, ...additionalRoles);
}

/**
 * Get all parties who have at least one of the named roles.
 * If no roles are given then all parties with at least 1 role are returned.
 *
 * The result will be in order of parties, not the order of roles. If you need a collection of parties ordered by role
 * (eg. to get a payer or, if no payers, an owner) you need to run two separate queries.
 */
export function getPartiesWithAnyRole(binder: Binder | Partial<Binder>, ...roles: Role[]): Array<Readonly<Party>>;
export function getPartiesWithAnyRole<T extends Party>(parties: T[], ...roles: Role[]): T[];
export function getPartiesWithAnyRole<T extends Party>(
  binderOrParties: Binder | T[] | Partial<Binder>,
  ...roleNames: Role[]
): Array<Readonly<Party>> | T[] {
  if (Array.isArray(binderOrParties)) {
    // party.roles.length === 0 means party is freshly added by user
    return binderOrParties.filter((party) => partyHasAnyRole(party, ...roleNames));
  }
  return getPartiesWithAnyRole(binderOrParties.parties, ...roleNames);
}

/**
 * Get all parties who have all of the named roles.
 *
 * The result will be in order of parties, not the order of roles.
 */
export function getPartiesWithAllRoles(binder: Binder, role1: Role, ...otherRoles: Role[]): Array<Readonly<Party>>;
export function getPartiesWithAllRoles<T extends Party>(parties: T[], role1: Role, ...otherRoles: Role[]): T[];
export function getPartiesWithAllRoles<T extends Party>(binderOrParties: Binder | T[], role1: Role, ...otherRoles: Role[]): Array<Readonly<Party>> | T[] {
  if (Array.isArray(binderOrParties)) {
    return binderOrParties.filter(party => partyHasAllRoles(party, role1, ...otherRoles));
  }
  return getPartiesWithAllRoles(binderOrParties.parties, role1, ...otherRoles);
}

/**
 * Get all parties who are without at least one of the named roles (this inverse group of parties with all of these roles).
 * If no roles are given then all parties with exactly 0 roles are returned.
 *
 * The result will be in order of parties, not the order of roles.
 */
export function getPartiesWithoutAnyRoles(binder: Binder, ...roles: Role[]): Array<Readonly<Party>>;
export function getPartiesWithoutAnyRoles<T extends Party>(parties: T[], ...roles: Role[]): T[];
export function getPartiesWithoutAnyRoles<T extends Party>(binderOrParties: Binder | T[], ...roleNames: Role[]): Array<Readonly<Party>> | T[] {
  if (Array.isArray(binderOrParties)) {
    const filter = roleNames && roleNames.length > 0 ?
        (party: Party) => roleNames.some((role) => !partyHasRole(party, role)) :
        (party: Party) => party.roles.length === 0;
    return binderOrParties.filter(filter);
  }
  return getPartiesWithoutAnyRoles(binderOrParties.parties, ...roleNames);
}

export function getCurrentPartyRef(state: Pick<State, 'authInfo' | 'binder'>): string {
  // for SignApp users, we need to find the party in the binder
  const currentParty = getCurrentParty(state);
  return (currentParty && currentParty.reference) || '';
}

export function currentUserHasRole(state: Pick<State, 'authInfo' | 'binder'>, role: Role): boolean {
  const party = getCurrentParty(state);
  return partyHasRole(party, role);
}

export function isCurrentUserOwner(state: Pick<State, 'authInfo' | 'binder'>): boolean {
  return currentUserHasRole(state, RoleEnum.Owner);
}

export function isNonOwnerCustomTextIncomplete(state: Pick<State, 'authInfo' | 'binder'>): boolean {
  let currentPartyReference = getCurrentPartyRef(state);
  return isCurrentUserOwner(state) && getAllInputs(state)
      .filter((input)=> input.type == 'CUSTOM_TEXT')
      .filter((input)=> input.status != 'COMPLETED')
      .filter((input)=> input.partyReference != currentPartyReference).length > 0;
}

// a display name is the name used when signing up (for an account)
export function getCurrentUserDisplayName(state: Pick<State, 'authInfo' | 'binder'>): string {
  // for SignApp
  const currentParty = getCurrentParty(state);
  return (currentParty && currentParty.legalName) || '';
}

export function getAllInputs({binder}: Pick<State | {binder: Partial<Binder>}, 'binder'>): Array<SignatureInput> {
  return binder.documents.reduce((accumulator, document) => [...accumulator, ...document.inputs], [] as SignatureInput[]);
}

export function getAllInputsFromTopToBottom(state: Pick<State, 'binder'>): Array<SignatureInput> {
  return getAllInputs(state).sort((a, b) => sortInputsFromTopToBottom(a, b, state.binder));
}

export function getEditableInputs(state: Pick<State, 'authInfo' | 'binder'>): Array<SignatureInput> {
  const partyRef = getCurrentPartyRef(state);
  return getAllInputs(state)
    .filter( input => input.partyReference == partyRef )
    .filter( input => input.position.xOffset != undefined )
    .filter( input => input.status == 'PENDING' || input.status == 'DECLINED' );
    // show inputs even when signer has declined to sign
}

export function getAllInputsFromPage(state: Pick<State, 'binder'>, pageId: string): SignatureInput[] {
  return getAllInputs(state)
    .filter(input => input.position.pageId == pageId);
}

export function getAllPendingInputsFromPage(state: Pick<State, 'binder'>, pageId: string): SignatureInput[] {
  return getAllInputs(state)
  .filter(input => input.position)
  .filter(input => input.position.pageId == pageId)
  .filter(input => input.status == 'PENDING' || input.status == 'DECLINED' );
}

export function getEditableInputsFromPage(state: Pick<State, 'authInfo' | 'binder'>, pageId: string): SignatureInput[] {
  return getEditableInputs(state)
  .filter(input => input.position)
  .filter(input => input.position.pageId == pageId);
}

export function getRecordedSignaturesInBinder(state: Pick<State, 'binder'>): Array<SignatureInput> {
  return getAllInputs(state)
    .filter( input => input.status == 'COMPLETED');
}

// signatures rendered on screen but not in API
export function getActiveSignaturesInSession(state: Pick<State, 'binder'>): Array<SignatureInput> {
  return getAllInputs(state)
    .filter( input => !!input.value);
}

// get doc pages that have signatures recorded in API
export function getDocumentPagesWithApiSignatures(state: Pick<State, 'binder'>): Array<string> {
  return getRecordedSignaturesInBinder(state).map(input => input.position.pageId);
}

// get doc pages that only have signatures locally but not in API
export function getDocumentPagesWithSessionSignatures(state: Pick<State, 'binder'>): Array<string> {
  return getActiveSignaturesInSession(state).map(input => input.position.pageId);
}

export function getPartyAssignedToInput({binder}: Pick<State, 'binder'>, input: SignatureInput): Readonly<Party> {
  let partyAssignedToInput = binder.parties.find(party => party.reference == input.partyReference);
  let ownerParty = binder.parties.find(party => partyHasRole(party, RoleEnum.Owner));
  return partyAssignedToInput || ownerParty;
}

export function partyHasInputs(partyReference: string, state: Pick<State, 'binder'>): boolean {
  let inputs = getAllInputs(state);
  return !!inputs.find(input => input.partyReference == partyReference);
}

export function getActiveInput(state: Pick<State, 'binder'>): SignatureInput | null {
  return getAllInputs(state).find(input => input.active) || null;
}

export function getInputById(state: Pick<State, 'binder'>, id: string): SignatureInput | null {
  return getAllInputs(state).find(input => input.id === id) || null;
}

export function isSignerDataMissing(state: Pick<State, 'binder'>): boolean {
  return state.binder.parties
    .filter((party) => {
      return !partyHasRole(party, RoleEnum.Notary);
    })
    .some((party) => {
      return !party.legalName || !party.email;
    });
}

export function isNotaryDocument(state: Pick<State, 'binder'>): boolean {
  return state.binder.parties.some((party) => partyHasRole(party, RoleEnum.Notary));
}

export function sortInputsFromTopToBottom(inputA: SignatureInput, inputB: SignatureInput, binder: Binder) {
  const indexOfPageA = binder.documents[0].pages.findIndex(p => p.id == inputA.position.pageId);
  const indexOfPageB = binder.documents[0].pages.findIndex(p => p.id == inputB.position.pageId);
  const inputATopOffset = inputA.position.yOffset;
  const inputBTopOffset = inputB.position.yOffset;
  if(indexOfPageA < indexOfPageB) {
    return -1;
  }
  if(indexOfPageA > indexOfPageB) {
    return 1;
  }
  if(inputATopOffset < inputBTopOffset) return -1;
  else if(inputATopOffset > inputBTopOffset) return 1;
  else return 0;
}

export function getMissingSignerInfoForm(state: State): Array<SignerInfo> | null {
  return state.missingSignerInfo !== null ? state.missingSignerInfo.form : null;
}

export function otherSignersHaveInputs(state: State, partyReference: string): boolean {
  return getAllInputs(state)
    .filter(i => !i.optional)
    .some(i => i.partyReference != partyReference);
}

export function getMandatoryUserInputs(state: State, partyReference: string) {
  return getAllInputs(state)
    .filter(i => i.partyReference == partyReference)
    .filter(i => !i.optional);
}

export function getCompletedUserInputs(state, partyReference: string) {
  return getAllInputs(state)
    .filter(i => i.partyReference == partyReference)
    .filter(i => !i.optional)
    .filter(i => i.status == 'COMPLETED')
}