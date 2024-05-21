import { mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import isEqual from 'lodash/fp/isEqual';
import { Component, Mixins } from 'vue-property-decorator';

import { type FetchVariables } from '@/types/indexers';
import { debouncedInputHandler } from '@/utils';

@Component
export default class IndexerDataFetchMixin<T> extends Mixins(mixins.LoadingMixin, mixins.PaginationSearchMixin) {
  totalCount = 0;
  items: T[] = [];

  intervalTimestamp = 0;
  private interval: Nullable<ReturnType<typeof setInterval>> = null;
  private updateItems = debouncedInputHandler(this.updateData, 250, { leading: false });

  updateInterval = 24_000; // 4 blocks

  get loadingState(): boolean {
    return this.parentLoading || this.loading;
  }

  // override PaginationSearchMixin
  get total(): number {
    return this.totalCount;
  }

  get hasItems(): boolean {
    return this.total > 0;
  }

  get dataVariables(): FetchVariables {
    return {};
  }

  get updateVariables(): FetchVariables {
    return {};
  }

  checkTriggerUpdate<Value>(current: Value, prev: Value) {
    if (!isEqual(current)(prev)) {
      this.resetPage();
      this.updateItems();
    }
  }

  async requestData(variables: FetchVariables): Promise<{ items: T[]; totalCount: number }> {
    console.info('[IndexerDataFetchMixin]: requestData is not implemented');
    return { items: [], totalCount: 0 };
  }

  getItemTimestamp(item: T): number {
    console.info('[IndexerDataFetchMixin]: getItemTimestamp is not implemented');
    return 0;
  }

  async onPaginationClick(button: WALLET_CONSTS.PaginationButton): Promise<void> {
    this.handlePaginationClick(button);
    this.updateItems();
  }

  private handlePaginationClick(button: WALLET_CONSTS.PaginationButton): void {
    let current = 1;

    switch (button) {
      case WALLET_CONSTS.PaginationButton.Prev:
        current = this.currentPage - 1;
        break;
      case WALLET_CONSTS.PaginationButton.Next:
        current = this.currentPage + 1;
        break;
      case WALLET_CONSTS.PaginationButton.Last:
        current = this.lastPage;
        break;
    }

    this.currentPage = current;
  }

  private async updateData(): Promise<void> {
    this.resetDataSubscription();

    await this.fetchData();

    if (this.currentPage === 1) {
      this.updateIntervalTimestamp();
      this.subscribeOnData();
    }
  }

  private async fetchData(): Promise<void> {
    await this.withLoading(async () => {
      await this.withParentLoading(async () => {
        const { totalCount, items } = await this.requestData(this.dataVariables);
        this.totalCount = totalCount;
        this.items = items;
      });
    });
  }

  private async fetchDataUpdates(): Promise<void> {
    const { items, totalCount } = await this.requestData(this.updateVariables);
    this.items = [...items, ...this.items].slice(0, this.pageAmount);
    this.totalCount = this.totalCount + totalCount;
    this.updateIntervalTimestamp();
  }

  private updateIntervalTimestamp(): void {
    this.intervalTimestamp = Math.floor(this.getItemTimestamp(this.items[0]) / 1000);
  }

  private subscribeOnData(): void {
    this.resetDataSubscription();
    this.interval = setInterval(() => this.fetchDataUpdates(), this.updateInterval);
  }

  private resetDataSubscription(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.interval = null;
  }

  beforeDestroy(): void {
    this.resetDataSubscription();
  }
}
