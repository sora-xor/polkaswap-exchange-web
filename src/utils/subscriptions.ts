import { api } from '@soramitsu/soraneo-wallet-web';
import type { Subscription } from 'rxjs';

import type { AccountBalance, AccountAsset } from '@sora-substrate/util/build/assets/types';

export type UpdateBalance = (balance: Nullable<AccountBalance>) => void;

export class TokenBalanceSubscriptions {
  private subscriptions: Map<string, Subscription>;

  constructor() {
    this.subscriptions = new Map();
  }

  add(key: string, { updateBalance, token }: { updateBalance: UpdateBalance; token: AccountAsset }): void {
    const subscription = api.assets.getAssetBalanceObservable(token).subscribe((balance) => updateBalance(balance));
    this.subscriptions.set(key, subscription);
  }

  remove(key: string, { updateBalance }: { updateBalance: UpdateBalance }): void {
    if (this.subscriptions.has(key)) {
      this.subscriptions.get(key)?.unsubscribe();
      this.subscriptions.delete(key);
      updateBalance(null);
    }
  }
}
