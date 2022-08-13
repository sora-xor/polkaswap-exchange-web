import { api } from '@soramitsu/soraneo-wallet-web';
import type { Subscription } from 'rxjs';

export class TokenBalanceSubscriptions {
  private subscriptions: Map<string, Subscription>;

  constructor() {
    this.subscriptions = new Map();
  }

  add(key: string, { updateBalance, token }): void {
    const subscription = api.assets.getAssetBalanceObservable(token).subscribe((balance) => updateBalance(balance));
    this.subscriptions.set(key, subscription);
  }

  remove(key: string, { updateBalance }): void {
    if (this.subscriptions.has(key)) {
      this.subscriptions.get(key)?.unsubscribe();
      this.subscriptions.delete(key);
      updateBalance(null);
    }
  }
}
