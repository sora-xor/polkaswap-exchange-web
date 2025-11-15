import { Options, Prop, mixins } from 'vue-property-decorator';

import { useRouterStore } from '@/stores/router';

import { RouteNames } from '../../consts';
import { state, getter, action } from '../../store/decorators';

import LoadingMixin from './LoadingMixin';
import NotificationMixin from './NotificationMixin';

import type { Route } from '../../store/router/types';
import type { AccountAssetsTable } from '../../types/common';
import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';

@Options({})
export default class AddAssetMixin extends mixins(NotificationMixin, LoadingMixin) {
  @state.account.assets assets!: Array<Asset>;
  @state.account.accountAssets accountAssets!: Array<AccountAsset>;

  @getter.account.accountAssetsAddressTable accountAssetsAddressTable!: AccountAssetsTable;

  @action.account.addAsset private addAsset!: (address?: string) => Promise<void>;

  @Prop({ default: false, type: Boolean }) tokenDetailsPageOpened!: boolean;

  selectedAsset: Nullable<Asset> = null;
  selectedAssets: Array<Asset> = [];
  search = '';

  private navigate(options: Route): void {
    this.routerStore.navigate(options);
  }

  private get routerStore() {
    return useRouterStore((this as any).$pinia);
  }

  get searchValue(): string {
    return this.search ? this.search.trim().toLowerCase() : '';
  }

  getSoughtAssets(assets: Array<Asset>): Array<Asset> {
    return assets.filter(
      ({ name, symbol, address }) =>
        address.toLowerCase() === this.searchValue ||
        symbol.toLowerCase().includes(this.searchValue) ||
        name.toLowerCase().includes(this.searchValue)
    );
  }

  resetSearch(): void {
    this.search = '';
  }

  async addAccountAsset(addedAsset): Promise<void> {
    const asset: Partial<Asset> = addedAsset || {};
    await this.withLoading(async () => await this.addAsset(asset.address));
    this.navigate({ name: RouteNames.Wallet, params: { asset: addedAsset } });
    this.showAppNotification(this.t('addAsset.success', { symbol: asset.symbol || '' }), 'success');
  }

  handleSelectAsset(asset: Asset): void {
    if (asset) {
      const assetIndex = this.selectedAssets.findIndex((a) => a.address === asset.address);
      if (assetIndex >= 0) {
        this.selectedAssets.splice(assetIndex, 1);
      } else {
        this.selectedAssets.push(asset);
      }
    }
  }
}
