import { Reducer } from 'redux';
import { Party } from '../../services/sign-app/party.interface';
import { clearPartyForEdit, PartyRouteAction, selectPartyForEdit } from '../actions/party-route';

export interface PartyRouteState {
  party?: Party;
  returnRoute: string | null; // modalShown, until we get a router
}

export const initialState = Object.freeze<PartyRouteState>({
  returnRoute: null,
});

export const partyRouteReducer: Reducer<PartyRouteState> = (state, action: PartyRouteAction) => {
  switch (action.type) {
    case clearPartyForEdit.type:
      return {
        ...initialState,
      };
    case selectPartyForEdit.type:
      return {
        ...state,
        party: action.payload.party,
        returnRoute: action.payload.returnRoute,
      };
    default:
      return state || initialState;
  }
};
