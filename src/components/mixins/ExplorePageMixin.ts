import Vue from 'vue';
import { Component, Mixins, Prop, Ref, Watch } from 'vue-property-decorator';
import { mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SortDirection } from '@soramitsu/soramitsu-js-ui/lib/components/Table/consts';
import SScrollbar from '@soramitsu/soramitsu-js-ui/lib/components/Scrollbar';

import { getter } from '@/store/decorators';

import type { RegisteredAccountAssetWithDecimals } from '@/store/assets/types';

@Component
export default class ExplorePageMixin extends Mixins(
  mixins.LoadingMixin,
  mixins.PaginationSearchMixin,
  mixins.FormattedAmountMixin
) {
  readonly FontSizeRate = WALLET_CONSTS.FontSizeRate;
  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;

  @Ref('table') readonly tableComponent!: any;
  @Prop({ default: '', type: String }) readonly exploreQuery!: string;
  @Watch('exploreQuery')
  private resetCurrentPage(): void {
    this.currentPage = 1;
  }

  @getter.assets.assetDataByAddress public getAsset!: (addr?: string) => Nullable<RegisteredAccountAssetWithDecimals>;

  order = '';
  property = '';

  get isDefaultSort(): boolean {
    return !this.order || !this.property;
  }

  get preparedItems(): any[] {
    console.warn('[ExplorePageMixin]: "preparedItems" computed property is not implemented');
    return [];
  }

  get filteredItems() {
    const search = this.exploreQuery.toLowerCase().trim();
    const filterAsset = (asset): boolean =>
      asset.name?.toLowerCase?.()?.includes?.(search) ||
      asset.symbol?.toLowerCase?.()?.includes?.(search) ||
      asset.address?.toLowerCase?.() === search;

    return this.preparedItems.filter(
      (item: any) => filterAsset(item) || filterAsset(item.poolAsset) || filterAsset(item.rewardAsset)
    );
  }

  get sortedItems() {
    if (!this.order || !this.property) return this.filteredItems;

    const isAscending = this.order === SortDirection.ASC;

    return [...this.filteredItems].sort((a, b) => {
      const aValue = a[this.property];
      const bValue = b[this.property];

      if (aValue === bValue) return 0;

      return (isAscending ? aValue > bValue : aValue < bValue) ? 1 : -1;
    });
  }

  get tableItems() {
    return this.getPageItems(this.sortedItems);
  }

  async mounted(): Promise<void> {
    await this.$nextTick();

    this.initScrollbar();

    await this.withLoading(async () => {
      await this.withParentLoading(async () => {
        await this.updateExploreData();
      });
    });
  }

  changeSort({ order = '', property = '' } = {}): void {
    this.order = order;
    this.property = property;
  }

  handleResetSort(): void {
    this.changeSort();
  }

  updateExploreData(): void {
    console.warn('[ExplorePageMixin]: "updateExploreData" method is not implemented');
  }

  private initScrollbar(): void {
    const Scrollbar = Vue.extend(SScrollbar);
    const scrollbar = new Scrollbar();
    scrollbar.$mount();

    if (!this.tableComponent) return;

    const elTable = this.tableComponent.$refs.table;
    const elTableBodyWrapper = elTable.$refs.bodyWrapper;
    const elTableHeaderWrapper = elTable.$refs.headerWrapper;
    const elTableNativeTable = elTableBodyWrapper.getElementsByTagName('table')[0];
    const scrollbarWrap = scrollbar.$el.getElementsByClassName('el-scrollbar__wrap')[0];
    const scrollbarView = scrollbar.$el.getElementsByClassName('el-scrollbar__view')[0];

    elTableBodyWrapper.appendChild(scrollbar.$el);
    scrollbarView.appendChild(elTableNativeTable);

    this.$watch(
      () => (scrollbar.$children[0] as any).moveX,
      () => {
        const scrollLeft = scrollbarWrap.scrollLeft;
        // to scroll table content
        elTableBodyWrapper.scrollLeft = scrollLeft;
        elTableHeaderWrapper.scrollLeft = scrollLeft;
        // to render box shadow on fixed table
        elTable.scrollPosition = scrollLeft === 0 ? 'left' : 'right';
      }
    );
  }
}
