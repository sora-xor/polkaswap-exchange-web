import { defineGetters } from 'direct-vuex';

import { vaultGetterContext } from '@/store/vault';

import type { VaultState } from './types';
import type { Collateral } from '@sora-substrate/util/build/kensetsu/types';

const getters = defineGetters<VaultState>()({
  selectedCollateral(...args): Nullable<Collateral> {
    const { state } = vaultGetterContext(args);
    if (!state.selectedVault) return null;

    return state.collaterals[state.selectedVault.lockedAssetId] ?? null;
  },
});

export default getters;
