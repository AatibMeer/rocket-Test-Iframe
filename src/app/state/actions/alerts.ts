import { createAction, withPayloadType } from './action';

export interface Alert {
  message: string | Readonly<{ key: string; params?: Record<string, unknown> }>;
  type: 'danger' | 'success' | 'notification';
  /** Only if this is explicitly false will the alert remain open until manually closed. */
  autoClose?: boolean;
}

export const addAlert = createAction('alerts/addAlert', withPayloadType<Alert>());
export type AddAlertAction = ReturnType<typeof addAlert>;

export const removeAlert = createAction('alerts/removeAlert', withPayloadType<Alert>());
export type RemoveAlertAction = ReturnType<typeof removeAlert>;

export const clearAlerts = createAction('alerts/clearAlerts');
export type ClearAlertsAction = ReturnType<typeof clearAlerts>;

export type AlertsAction = AddAlertAction | RemoveAlertAction | ClearAlertsAction;
