import type { VaultState } from './types';

function initialState(): VaultState {
  return {
    collaterals: {},
    collateralsInterval: null,
    accountVaultIdsSubscription: null,
    accountVaults: [],
    accountVaultsSubscription: null,
    selectedVault: null,
  };
}

const state = initialState();

export default state;
