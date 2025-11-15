import { Subject } from 'rxjs';
import { Alert } from '../../types/common';
import { FiatPriceObject } from '../indexer/subsquid/types';
import { WhitelistArrayItem } from '@sora-substrate/sdk/build/assets/types';

/**
 * Coordinates token price alerts by tracking the configured thresholds and
 * dispatching browser notifications when conditions are met.
 */
export declare class AlertsApiService {
  private fiatPriceObject;
  alerts: Array<Alert>;
  baseRoute: string;
  private isAlertSetByUser;
  /**
   * Triggers a browser notification for the provided asset. Errors are
   * swallowed because notification support varies across browsers.
   */
  pushNotification(asset: WhitelistArrayItem, message: string): Promise<void>;
  /**
   * Checks every configured alert against the latest fiat price snapshot and
   * sends notifications for matches.
   */
  private checkAlerts;
  /**
   * Resets one-shot alerts once the asset price moves away from the threshold
   * so they can fire again later.
   */
  private resetPriceAlerts;
  /** Removes the alert at the given index from Vuex. */
  removeAlert(position: number): void;
  /** Flags the alert as already notified so the UI can reflect the state. */
  setAlertAsNotified(position: number, value: boolean): void;
  /**
   * Returns an RxJS subject that accepts fiat price payloads and takes care of
   * checking alert conditions.
   */
  createPriceAlertSubscription(): Subject<FiatPriceObject>;
}
declare const _default: AlertsApiService;
export default _default;
