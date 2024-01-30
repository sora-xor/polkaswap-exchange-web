import { KnownAssets } from '@sora-substrate/util/build/assets/consts';
import { SortDirection } from '@soramitsu/soramitsu-js-ui/lib/components/Table/consts';
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';

import { getter } from '@/store/decorators';

import ScrollableTableMixin from './ScrollableTableMixin';

import type { Asset, RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';

@Component
export default class ExplorePageMixin extends Mixins(ScrollableTableMixin) {
  @Prop({ default: '', type: String }) readonly exploreQuery!: string;
  @Prop({ default: false, type: Boolean }) readonly isAccountItemsOnly!: boolean;
  @Watch('exploreQuery')
  private resetCurrentPage(): void {
    this.currentPage = 1;
  }

  @getter.wallet.account.isLoggedIn public isLoggedIn!: boolean;
  @getter.assets.assetDataByAddress public getAsset!: (addr?: string) => Nullable<RegisteredAccountAsset>;
  @getter.assets.whitelistAssets public whitelistAssets!: Array<Asset>;

  order = '';
  property = '';

  get loadingState(): boolean {
    return this.parentLoading || this.loading;
  }

  get allowedAssets(): Array<Asset> {
    // if whitelist is not available, use KnownAssets
    if (!this.whitelistAssets.length) {
      return [...KnownAssets];
    }
    return this.whitelistAssets;
  }

  get pricesAvailable(): boolean {
    return Object.keys(this.fiatPriceObject).length > 0;
  }

  get isDefaultSort(): boolean {
    return !(this.order && this.property);
  }

  // items -> prefilteredItems -> filteredItems -> preparedItems
  get prefilteredItems(): any[] {
    console.warn('[ExplorePageMixin]: "prefilteredItems" computed property is not implemented');
    return [];
  }

  get filteredItems() {
    const search = this.exploreQuery.toLowerCase().trim();

    if (!search) return this.prefilteredItems;

    const filterAsset = (asset): boolean =>
      asset?.name?.toLowerCase?.()?.includes?.(search) ||
      asset?.symbol?.toLowerCase?.()?.includes?.(search) ||
      asset?.address?.toLowerCase?.() === search;

    return this.prefilteredItems.filter(
      (item: any) =>
        filterAsset(item) ||
        filterAsset(item.poolAsset) ||
        filterAsset(item.rewardAsset) ||
        filterAsset(item.baseAsset) ||
        filterAsset(item.targetAsset)
    );
  }

  get preparedItems() {
    if (this.isDefaultSort) return this.filteredItems;

    const isAscending = this.order === SortDirection.ASC;

    return [...this.filteredItems].sort((a, b) => {
      const aValue = a[this.property];
      const bValue = b[this.property];

      if (aValue === bValue) return 0;

      return (isAscending ? aValue > bValue : aValue < bValue) ? 1 : -1;
    });
  }

  async mounted(): Promise<void> {
    await this.updateExploreData();
  }

  changeSort({ order = '', property = '' } = {}): void {
    this.order = order;
    this.property = property;
  }

  handleResetSort(): void {
    this.changeSort();
  }

  async updateExploreData(): Promise<void> {
    console.warn('[ExplorePageMixin]: "updateExploreData" method is not implemented');
  }
}
