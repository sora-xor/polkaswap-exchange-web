import { api } from '@/lib/soraneo-wallet/src/api';

import type { AccountBalance, AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Subscription } from 'rxjs';

type UpdateBalance = (balance: Nullable<AccountBalance>) => void;

type SubscriptionPayload = {
  updateBalance: UpdateBalance;
  token: AccountAsset;
};

type TokenSubscription = {
  subscription: Subscription | null;
  updateBalance: UpdateBalance;
};

export class TokenBalanceSubscriptions {
  private subscriptions: Map<string, TokenSubscription>;

  constructor() {
    this.subscriptions = new Map();
  }

  add(key: string, { updateBalance, token }: SubscriptionPayload): void {
    const getBalanceObservable = api.assets?.getAssetBalanceObservable;
    if (typeof getBalanceObservable !== 'function') {
      this.subscriptions.set(key, { updateBalance, subscription: null });
      return;
    }

    try {
      const observable = getBalanceObservable.call(api.assets, token);
      if (!observable || typeof observable.subscribe !== 'function') {
        this.subscriptions.set(key, { updateBalance, subscription: null });
        return;
      }

      const subscription = observable.subscribe((balance) => updateBalance(balance));

      this.subscriptions.set(key, { updateBalance, subscription });
    } catch {
      this.subscriptions.set(key, { updateBalance, subscription: null });
    }
  }

  remove(key: string): void {
    const item = this.subscriptions.get(key);

    item?.subscription?.unsubscribe?.();
    item?.updateBalance?.(null);

    this.subscriptions.delete(key);
  }

  resetSubscriptions(): void {
    for (const [key, item] of this.subscriptions.entries()) {
      item?.subscription?.unsubscribe?.();
      item?.updateBalance?.(null);

      this.subscriptions.delete(key);
    }
  }
}
