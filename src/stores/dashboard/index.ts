import { FPNumber } from '@sora-substrate/math';
import { defineStore } from 'pinia';

import { api } from '@/lib/soraneo-wallet/src/api';
import { useWalletStore } from '@/stores/wallet';
import type { OwnedAsset } from '@/modules/dashboard/types';
import type { DashboardState } from '@/stores/dashboard/types';

const INTERVAL = 2 * 60_000;

const buildInitialState = (): DashboardState => ({
  ownedAssetIds: [],
  ownedAssetIdsInterval: null,
});

const clearOwnedAssetsInterval = (store: DashboardState): void => {
  if (store.ownedAssetIdsInterval) {
    clearInterval(store.ownedAssetIdsInterval);
  }

  store.ownedAssetIdsInterval = null;
};

export const useDashboardStore = defineStore('dashboard', {
  state: (): DashboardState => buildInitialState(),
  getters: {
    ownedAssets(state): Array<OwnedAsset> {
      const walletStore = useWalletStore();

      return state.ownedAssetIds.reduce<Array<OwnedAsset>>((assets, id) => {
        const asset = walletStore.assetsDataTable?.[id];

        if (!asset) return assets;

        const fiatObj = walletStore.fiatPriceObject?.[id];
        const fiat = fiatObj ? FPNumber.fromCodecValue(fiatObj).toString() : fiatObj;

        assets.push({ ...asset, fiat });
        return assets;
      }, []);
    },
  },
  actions: {
    async requestOwnedAssetIds(): Promise<void> {
      const walletStore = useWalletStore();
      const accountId = walletStore.account?.address ?? walletStore.address;

      if (!walletStore.isLoggedIn || !accountId) {
        this.ownedAssetIds = [];
        return;
      }

      try {
        this.ownedAssetIds = await api.assets.getOwnedAssetIds(accountId);
      } catch (error) {
        console.error(error);
        this.ownedAssetIds = [];
      }
    },
    async subscribeOnOwnedAssets(): Promise<void> {
      clearOwnedAssetsInterval(this);
      await this.requestOwnedAssetIds();

      this.ownedAssetIdsInterval = setInterval(() => {
        void this.requestOwnedAssetIds();
      }, INTERVAL);
    },
    async reset(): Promise<void> {
      clearOwnedAssetsInterval(this);
      this.ownedAssetIds = [];
    },
  },
});

export type DashboardStore = ReturnType<typeof useDashboardStore>;
