import { defineStore } from 'pinia';
import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';

import type { Nullable } from '@/types/common';
import { requireLegacyStore, withLegacyStore } from '@/utils/legacy-store';

import type { NetworkData } from '@/types/bridge';
import type { AvailableNetwork } from '@/store/web3/types';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';
import type { WALLET_TYPES } from '@wallet';
import type { SubNetwork } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';

type ExternalNetworkSelection = {
  id: BridgeNetworkId | SubNetwork;
  type: BridgeNetworkType;
};

const warn = (message: string): void => {
  console.warn(`[web3-store] ${message}`);
};

/**
 * Transitional Pinia facade for the legacy web3 Vuex module.
 * Provides read-only accessors for network selection data until
 * the underlying store is migrated.
 */
export const useWeb3Store = defineStore('web3-legacy', {
  getters: {
    networkSelected(): Nullable<BridgeNetworkId> {
      const legacyStore = requireLegacyStore();
      return (legacyStore?.state?.web3?.networkSelected as Nullable<BridgeNetworkId>) ?? null;
    },
    networkType(): Nullable<BridgeNetworkType> {
      const legacyStore = requireLegacyStore();
      return (legacyStore?.state?.web3?.networkType as Nullable<BridgeNetworkType>) ?? null;
    },
    selectSubNodeDialogVisibility(): boolean {
      const legacyStore = requireLegacyStore();
      return Boolean(legacyStore?.state?.web3?.selectSubNodeDialogVisibility);
    },
    selectNetworkDialogVisibility(): boolean {
      const legacyStore = requireLegacyStore();
      return Boolean(legacyStore?.state?.web3?.selectNetworkDialogVisibility);
    },
    selectProviderDialogVisibility(): boolean {
      const legacyStore = requireLegacyStore();
      return Boolean(legacyStore?.state?.web3?.selectProviderDialogVisibility);
    },
    subAccountDialogVisibility(): boolean {
      const legacyStore = requireLegacyStore();
      return Boolean(legacyStore?.state?.web3?.subAccountDialogVisibility);
    },
    soraAccountDialogVisibility(): boolean {
      const legacyStore = requireLegacyStore();
      return Boolean(legacyStore?.state?.web3?.soraAccountDialogVisibility);
    },
    evmProvider(): Nullable<Record<string, unknown>> {
      const legacyStore = requireLegacyStore();
      return (legacyStore?.state?.web3?.evmProvider as Nullable<Record<string, unknown>>) ?? null;
    },
    evmProviderLoading(): Nullable<{ name?: string }> {
      const legacyStore = requireLegacyStore();
      return (legacyStore?.state?.web3?.evmProviderLoading as Nullable<{ name?: string }>) ?? null;
    },
    evmAddress(): string {
      const legacyStore = requireLegacyStore();
      return (legacyStore?.state?.web3?.evmAddress as string) ?? '';
    },
    selectedNetworkData(): Nullable<NetworkData> {
      const legacyStore = requireLegacyStore();
      return (legacyStore?.getters?.web3?.selectedNetwork as Nullable<NetworkData>) ?? null;
    },
    availableNetworks(): Record<BridgeNetworkType, Partial<Record<BridgeNetworkId, AvailableNetwork>>> {
      const legacyStore = requireLegacyStore();
      const data = legacyStore?.getters?.web3?.availableNetworks as Record<
        BridgeNetworkType,
        Partial<Record<BridgeNetworkId, AvailableNetwork>>
      >;
      return data ?? ({} as Record<BridgeNetworkType, Partial<Record<BridgeNetworkId, AvailableNetwork>>>);
    },
    subAccount(): Nullable<WALLET_TYPES.PolkadotJsAccount> {
      const legacyStore = requireLegacyStore();
      return (legacyStore?.getters?.web3?.subAccount as Nullable<WALLET_TYPES.PolkadotJsAccount>) ?? null;
    },
  },
  actions: {
    /**
     * Mirrors the legacy mutation to toggle the select-network dialog visibility.
     */
    setSelectNetworkDialogVisibility(flag: boolean): void {
      const committed = withLegacyStore((store) => {
        const mutation = store?.commit?.web3?.setSelectNetworkDialogVisibility;
        if (typeof mutation !== 'function') {
          return false;
        }
        mutation(flag);
        return true;
      });

      if (!committed) {
        warn('setSelectNetworkDialogVisibility mutation missing on legacy store');
      }
    },
    /**
     * Proxies the legacy action used to switch between bridge networks.
     */
    async selectExternalNetwork(payload: ExternalNetworkSelection): Promise<void> {
      const dispatched = await withLegacyStore(async (store) => {
        const action = store?.dispatch?.web3?.selectExternalNetwork;
        if (typeof action !== 'function') {
          return false;
        }
        await action(payload);
        return true;
      });

      if (!dispatched) {
        warn('selectExternalNetwork action missing on legacy store');
      }
    },
  },
});
