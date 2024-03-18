import type { Collateral, Vault } from '@sora-substrate/util/build/kensetsu/types';
import type { Subscription } from 'rxjs';

export type VaultState = {
  collaterals: Record<string, Collateral>;
  collateralsInterval: Nullable<ReturnType<typeof setInterval>>;
  accountVaultIdsSubscription: Nullable<Subscription>;
  accountVaults: Vault[];
  accountVaultsSubscription: Nullable<Subscription>;
};
