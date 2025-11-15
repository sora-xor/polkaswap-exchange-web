import { FPNumber } from '@sora-substrate/sdk';
import { Subject } from 'rxjs';

import { Singleton } from '../../decorators';
import { getWalletStore } from '../../store/instance';
import { getBase64Icon } from '../../util/image';

import type { Alert } from '../../types/common';
import type { FiatPriceObject } from '../indexer/subsquid/types';
import type { WhitelistArrayItem } from '@sora-substrate/sdk/build/assets/types';

/**
 * Coordinates token price alerts by tracking the configured thresholds and
 * dispatching browser notifications when conditions are met.
 */
@Singleton
export class AlertsApiService {
  private fiatPriceObject: FiatPriceObject = {};
  public alerts = [] as Array<Alert>;
  public baseRoute = 'https://polkaswap.io/#/';

  private isAlertSetByUser(): boolean {
    return !!this.store.state.wallet.settings.alerts.length;
  }

  private get store() {
    return getWalletStore();
  }

  /**
   * Triggers a browser notification for the provided asset. Errors are
   * swallowed because notification support varies across browsers.
   */
  public async pushNotification(asset: WhitelistArrayItem, message: string): Promise<void> {
    try {
      if (Notification.permission === 'granted') {
        const notification = new Notification(asset.symbol, {
          body: message,
          icon: await getBase64Icon(asset.icon),
        });

        notification.onclick = (event) => {
          event.preventDefault(); // prevent the browser from focusing the Notification's tab
          window.open(`${this.baseRoute}wallet`);
        };
      }
    } catch {
      console.warn("Your browser doesn't support Notification API");
    }
  }

  /**
   * Checks every configured alert against the latest fiat price snapshot and
   * sends notifications for matches.
   */
  private checkAlerts() {
    this.alerts.forEach((alert, position) => {
      if (alert.wasNotified) return;

      const tokenAddress = this.store.getters.wallet.account.whitelistIdsBySymbol[alert.token];

      const currentPrice = FPNumber.fromCodecValue(this.fiatPriceObject[tokenAddress]);
      const desiredPrice = FPNumber.fromNatural(alert.price);

      if (alert.type === 'drop') {
        if (FPNumber.lte(currentPrice, desiredPrice)) {
          const asset = this.store.getters.wallet.account.whitelist[tokenAddress];

          if (asset) {
            this.pushNotification(asset as WhitelistArrayItem, `Token price dropped to $${desiredPrice}`);
            alert.once ? this.removeAlert(position) : this.setAlertAsNotified(position, true);
          }
        }

        return;
      }

      if (alert.type === 'raise') {
        if (FPNumber.gte(currentPrice, desiredPrice)) {
          const asset = this.store.getters.wallet.account.whitelist[tokenAddress];

          if (asset) {
            this.pushNotification(asset as WhitelistArrayItem, `Token price raised to $${desiredPrice}`);
            alert.once ? this.removeAlert(position) : this.setAlertAsNotified(position, true);
          }
        }
      }
    });
  }

  /**
   * Resets one-shot alerts once the asset price moves away from the threshold
   * so they can fire again later.
   */
  private resetPriceAlerts(): void {
    this.alerts.forEach((alert, position) => {
      if (!alert.wasNotified) return alert;

      const tokenAddress = this.store.getters.wallet.account.whitelistIdsBySymbol[alert.token];

      const currentPrice = FPNumber.fromCodecValue(this.fiatPriceObject[tokenAddress]);
      const desiredPrice = FPNumber.fromNatural(alert.price);

      if (alert.type === 'drop') {
        if (FPNumber.gt(currentPrice, desiredPrice)) {
          this.setAlertAsNotified(position, false);
        }

        return;
      }

      if (alert.type === 'raise') {
        if (FPNumber.lt(currentPrice, desiredPrice)) {
          this.setAlertAsNotified(position, false);
        }
      }
    });
  }

  /** Removes the alert at the given index from Vuex. */
  public removeAlert(position: number): void {
    this.store.commit.wallet.settings.removePriceAlert(position);
  }

  /** Flags the alert as already notified so the UI can reflect the state. */
  public setAlertAsNotified(position: number, value: boolean): void {
    this.store.commit.wallet.settings.setPriceAlertAsNotified({ position, value });
  }

  /**
   * Returns an RxJS subject that accepts fiat price payloads and takes care of
   * checking alert conditions.
   */
  createPriceAlertSubscription(): Subject<FiatPriceObject> {
    const alertSubject = new Subject<FiatPriceObject>();

    alertSubject.subscribe({
      next: (fiatPriceObject: FiatPriceObject) => {
        if (!this.isAlertSetByUser()) return;

        this.alerts = this.store.state.wallet.settings.alerts;

        this.fiatPriceObject = fiatPriceObject;

        this.checkAlerts();
        this.resetPriceAlerts();
      },
    });

    return alertSubject;
  }
}

export default new AlertsApiService();
