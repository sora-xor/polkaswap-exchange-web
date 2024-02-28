import { api } from '@soramitsu/soraneo-wallet-web';

import type { AccountBalance, AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { Subscription } from 'rxjs';

type UpdateBalance = (balance: Nullable<AccountBalance>) => void;

type SubscriptionPayload = {
  updateBalance: UpdateBalance;
  token: AccountAsset;
};

type TokenSubscription = {
  subscription: Subscription;
  updateBalance: UpdateBalance;
};

export class TokenBalanceSubscriptions {
  private subscriptions: Map<string, TokenSubscription>;

  constructor() {
    this.subscriptions = new Map();
  }

  add(key: string, { updateBalance, token }: SubscriptionPayload): void {
    const subscription = api.assets.getAssetBalanceObservable(token).subscribe((balance) => updateBalance(balance));

    this.subscriptions.set(key, { updateBalance, subscription });
  }

  remove(key: string): void {
    const item = this.subscriptions.get(key);

    item?.subscription?.unsubscribe();
    item?.updateBalance?.(null);

    this.subscriptions.delete(key);
  }

  resetSubscriptions(): void {
    for (const [key, item] of this.subscriptions.entries()) {
      item?.subscription?.unsubscribe();
      item?.updateBalance?.(null);

      this.subscriptions.delete(key);
    }
  }
}
