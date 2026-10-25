import { useWalletStore } from '@/stores/wallet';
import type { Nullable } from '@/types/common';
import { TokenBalanceSubscriptions } from '@/utils/subscriptions';

import type { AccountBalance, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

type Direction = 'from' | 'to';

type UpdateBalance = (balance: Nullable<AccountBalance>) => void;

/** Maintains live balances for the selected swap tokens and the active wallet. */
export const useSwapBalanceSubscriptions = () => {
  const walletStore = useWalletStore();
  const manager = new TokenBalanceSubscriptions();

  /** Rebinds an account-bound stream, hydrating only from a settled wallet snapshot. */
  const updateSubscription = (
    key: Direction,
    token: Nullable<RegisteredAccountAsset>,
    updateBalance: UpdateBalance
  ): void => {
    manager.remove(key);

    if (!walletStore.isLoggedIn || !token?.address) {
      return;
    }

    const accountAssets = walletStore.accountAssetsAddressTable ?? {};
    if (walletStore.accountAssetsLoaded !== false && token.address in accountAssets) {
      updateBalance(accountAssets[token.address]?.balance ?? null);
    }

    manager.add(key, { token, updateBalance });
  };

  const resetSubscriptions = (): void => {
    manager.resetSubscriptions();
  };

  const removeSubscription = (key: Direction): void => {
    manager.remove(key);
  };

  return {
    updateSubscription,
    resetSubscriptions,
    removeSubscription,
  };
};
