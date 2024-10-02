import type { Party } from '../../services/sign-app/party.interface';
import { createAction, withPayloadType } from './action';
import type { ModalType } from '../../modules/sign-app/sign-app-dashboard/modal-type.enum';

export const clearPartyForEdit = createAction('party-route/clearParty');
export type ClearPartyAction = ReturnType<typeof clearPartyForEdit>;

// ideally we'd have a router handle this, but until then we use the store
export const selectPartyForEdit = createAction(
  'party-route/selectParty',
  withPayloadType<{
    party?: Party;
    returnRoute: ModalType;
  }>()
);
export type SelectPartyAction = ReturnType<typeof selectPartyForEdit>;

export type PartyRouteAction = ClearPartyAction | SelectPartyAction;
