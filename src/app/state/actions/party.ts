import { Party } from '../../services/sign-app/party.interface';
import { createAction, withPayloadType } from './action';

export const addParty = createAction('party/addParty', withPayloadType<Party>());
export type AddPartyAction = ReturnType<typeof addParty>;

export const updateParty = createAction('party/updateParty', withPayloadType<Partial<Party>>());
export type UpdatePartyAction = ReturnType<typeof updateParty>;

/**
 * Remove a party by either a Party's ID string or a Party instance.
 */
export const removeParty = createAction(
  'party/removeParty',
  withPayloadType<Pick<Party, 'id' | 'reference'> | string>()
);
export type RemovePartyAction = ReturnType<typeof removeParty>;

export const removeTemporaryParties = createAction('party/removeTemporaryParties');
export type RemoveTemporaryPartiesAction = ReturnType<typeof removeTemporaryParties>;

export const ensurePartyRoleIntegrity = createAction('party/ensurePartyRoleIntegrity');
export type EnsurePartyRoleIntegrityAction = ReturnType<typeof ensurePartyRoleIntegrity>;

// swaps party refs of given two parties
export const swapPartyReferences = createAction('party/swapPartyReferences', withPayloadType<[Party, Party]>());
export type SwapPartyReferencesAction = ReturnType<typeof swapPartyReferences>;

export type PartyAction =
  | AddPartyAction
  | UpdatePartyAction
  | RemovePartyAction
  | RemoveTemporaryPartiesAction
  | EnsurePartyRoleIntegrityAction
  | SwapPartyReferencesAction;
// who doesn't love some PartyAction!
