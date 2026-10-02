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
  ownedAssetIdsSubscriptionGeneration: 0,
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
    /**
     * Refreshes the assets owned by the current account, discarding a response when
     * its subscription lifecycle has already been reset or replaced.
     */
    async requestOwnedAssetIds(): Promise<void> {
      const walletStore = useWalletStore();
      const accountId = walletStore.account?.address ?? walletStore.address;
      const subscriptionGeneration = this.ownedAssetIdsSubscriptionGeneration;

      if (!walletStore.isLoggedIn || !accountId) {
        this.ownedAssetIds = [];
        return;
      }

      try {
        const ownedAssetIds = await api.assets.getOwnedAssetIds(accountId);

        if (subscriptionGeneration === this.ownedAssetIdsSubscriptionGeneration) {
          this.ownedAssetIds = ownedAssetIds;
        }
      } catch (error) {
        console.error(error);
        if (subscriptionGeneration === this.ownedAssetIdsSubscriptionGeneration) {
          this.ownedAssetIds = [];
        }
      }
    },
    /** Starts owned-asset polling unless this subscription is reset while its initial request is pending. */
    async subscribeOnOwnedAssets(): Promise<void> {
      clearOwnedAssetsInterval(this);
      const subscriptionGeneration = ++this.ownedAssetIdsSubscriptionGeneration;
      await this.requestOwnedAssetIds();

      if (subscriptionGeneration !== this.ownedAssetIdsSubscriptionGeneration) return;

      this.ownedAssetIdsInterval = setInterval(() => {
        if (subscriptionGeneration !== this.ownedAssetIdsSubscriptionGeneration) return;
        void this.requestOwnedAssetIds();
      }, INTERVAL);
    },
    /** Stops polling and invalidates any owned-asset request still in flight. */
    async reset(): Promise<void> {
      this.ownedAssetIdsSubscriptionGeneration += 1;
      clearOwnedAssetsInterval(this);
      this.ownedAssetIds = [];
    },
  },
});

export type DashboardStore = ReturnType<typeof useDashboardStore>;
