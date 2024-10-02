import { Reducer } from 'redux';
import { addAlert, Alert, AlertsAction, clearAlerts, removeAlert } from '../actions/alerts';

export interface AlertState {
  alerts: ReadonlyArray<Readonly<Alert>>;
}

export const defaultState: Readonly<AlertState> = Object.freeze({
  alerts: Object.freeze([]),
});

export const reducer: Reducer<AlertState> = (state, action: AlertsAction) => {
  switch (action.type) {
    case addAlert.type:
      return {
        ...state,
        alerts: [...state.alerts, action.payload],
      };
    case removeAlert.type:
      return {
        ...state,
        alerts: state.alerts.filter((alert) => alert !== action.payload),
      };
    case clearAlerts.type:
      return {
        ...state,
        alerts: defaultState.alerts,
      };
    default:
      return state || defaultState;
  }
};
