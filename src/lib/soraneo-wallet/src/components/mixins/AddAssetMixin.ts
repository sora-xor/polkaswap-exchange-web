import { defineComponent } from 'vue';

import { useRouterStore } from '@/stores/router';
import { useWalletStore } from '@/stores/wallet';

import { RouteNames } from '../../consts';

import LoadingMixin from './LoadingMixin';
import NotificationMixin from './NotificationMixin';

import type { Route } from '@/stores/router/types';
import type { AccountAssetsTable } from '../../types/common';
import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';

export default defineComponent({
  mixins: [NotificationMixin, LoadingMixin],
  props: {
    tokenDetailsPageOpened: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      selectedAsset: null as Nullable<Asset>,
      selectedAssets: [] as Asset[],
      search: '',
    };
  },
  computed: {
    assets(this: any) {
      return useWalletStore(this.$pinia).assets;
    },
    accountAssets(this: any) {
      return useWalletStore(this.$pinia).accountAssets;
    },
    accountAssetsAddressTable(this: any) {
      return useWalletStore(this.$pinia).accountAssetsAddressTable;
    },
    searchValue(this: any): string {
      return this.search ? this.search.trim().toLowerCase() : '';
    },
  },
  methods: {
    addAsset(this: any, address: string) {
      return useWalletStore(this.$pinia).addAsset(address);
    },
    navigate(this: any, options: Route): void {
      useRouterStore((this as any).$pinia).navigate(options);
    },
    getSoughtAssets(this: any, assets: Array<Asset>): Array<Asset> {
      return assets.filter(
        ({ name, symbol, address }) =>
          address.toLowerCase() === this.searchValue ||
          symbol.toLowerCase().includes(this.searchValue) ||
          name.toLowerCase().includes(this.searchValue)
      );
    },
    resetSearch(this: any): void {
      this.search = '';
    },
    async addAccountAsset(this: any, addedAsset: Nullable<Asset>): Promise<void> {
      const asset: Partial<Asset> = addedAsset || {};
      await this.withLoading(async () => await this.addAsset(asset.address));
      this.navigate({ name: RouteNames.Wallet, params: { asset: addedAsset } });
      this.showAppNotification(this.t('addAsset.success', { symbol: asset.symbol || '' }), 'success');
    },
    handleSelectAsset(this: any, asset: Asset): void {
      if (asset) {
        const assetIndex = this.selectedAssets.findIndex((a: Asset) => a.address === asset.address);
        if (assetIndex >= 0) {
          this.selectedAssets.splice(assetIndex, 1);
        } else {
          this.selectedAssets.push(asset);
        }
      }
    },
  },
});
