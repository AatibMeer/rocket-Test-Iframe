import { Injectable } from '@angular/core';
import { Store } from '../../state/store';
import { addAlert, Alert, clearAlerts, removeAlert } from '../../state/actions/alerts';

type AlertWithOptionalType = Omit<Alert, 'type'> & {
  type?: Alert['type'];
};

export type LegacyAlert = Omit<Alert, 'message'> & {
  message: string;
  params?: Record<string, unknown>;
};

type CloseAlert = () => void;

@Injectable()
export class AlertService {
  private static isLegacyAlert(alert: unknown): alert is LegacyAlert {
    return !!(alert as LegacyAlert)?.params;
  }

  constructor(private readonly store: Store) {}

  /**
   * Add an alert to the collection.
   *
   * The returned function can be executed to remove the alert from the collection without needing to know the alert's
   * ID. This can be useful if you aren't specifying an ID as it will have a random ID.
   */
  addAlert(alert: Alert): CloseAlert;
  /** @deprecated Use Alert without params property (params is now in the message property) */
  addAlert(alert: LegacyAlert): CloseAlert;
  addAlert(alert: Alert | LegacyAlert): CloseAlert {
    if (AlertService.isLegacyAlert(alert)) {
      return this.addAlert({
        ...alert,
        message: {
          key: alert.message,
          params: alert.params,
        },
        params: undefined,
      } as Alert);
    }
    this.store.dispatch(addAlert(alert));
    return () => this.deleteAlert(alert);
  }

  /** @deprecated Use addAlert */
  setAlertMessage(alert: LegacyAlert): CloseAlert {
    return this.addAlert(alert);
  }

  /** Add an alert with the type <code>danger</code> to the collection */
  addDangerAlert(alert: AlertWithOptionalType): CloseAlert {
    return this.addAlert({
      ...alert,
      type: 'danger',
    });
  }

  /** Add an alert with the type <code>notification</code> to the collection */
  addNotification(alert: AlertWithOptionalType): CloseAlert {
    return this.addAlert({
      ...alert,
      type: 'notification',
    });
  }

  /** Add an alert with the type <code>success</code> to the collection */
  addSuccessAlert(alert: AlertWithOptionalType): CloseAlert {
    return this.addAlert({
      ...alert,
      type: 'success',
    });
  }

  clearAlerts(): void {
    this.store.dispatch(clearAlerts());
  }

  deleteAlert(alert: Alert): void {
    this.store.dispatch(removeAlert(alert));
  }
}
