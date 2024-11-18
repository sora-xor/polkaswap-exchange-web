import { mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import isEqual from 'lodash/fp/isEqual';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import { type FetchVariables } from '@/types/indexers';
import { debouncedInputHandler } from '@/utils';

@Component
export default class IndexerDataFetchMixin extends Mixins(mixins.LoadingMixin, mixins.PaginationSearchMixin) {
  totalCount = 0;
  items: readonly any[] = [];

  pageAmount = 5;
  fetchAmount = 5;

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

  get fetchPage(): number {
    return Math.ceil((this.pageAmount * this.currentPage) / this.fetchAmount);
  }

  get visibleItems(): any[] {
    const offset = this.fetchAmount * (this.fetchPage - 1);
    const start = this.pageAmount * (this.currentPage - 1) - offset;
    const end = start + this.pageAmount;

    return this.items.slice(start, end);
  }

  @Watch('fetchPage')
  private checkPageToLoad(): void {
    this.updateItems();
  }

  checkTriggerUpdate(current: any, prev: any) {
    if (!isEqual(current)(prev)) {
      this.resetPage();
      this.resetItems();
      this.updateItems();
    }
  }

  async requestData(variables: FetchVariables): Promise<{ items: any[]; totalCount: number }> {
    console.info('[IndexerDataFetchMixin]: requestData is not implemented');
    return { items: [], totalCount: 0 };
  }

  getItemTimestamp(item: any): number {
    console.info('[IndexerDataFetchMixin]: getItemTimestamp is not implemented');
    return 0;
  }

  public handlePaginationClick(button: WALLET_CONSTS.PaginationButton): void {
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

    if (this.fetchPage === 1) {
      this.updateIntervalTimestamp();
      this.subscribeOnData();
    }
  }

  private resetItems(): void {
    this.items = [];
    this.totalCount = 0;
  }

  private async fetchData(): Promise<void> {
    await this.withLoading(async () => {
      await this.withParentLoading(async () => {
        const { totalCount, items } = await this.requestData(this.dataVariables);
        this.totalCount = totalCount;
        this.items = Object.freeze([...items]);
      });
    });
  }

  private async fetchDataUpdates(): Promise<void> {
    const { items, totalCount } = await this.requestData(this.updateVariables);
    this.items = Object.freeze([...items, ...this.items].slice(0, this.fetchAmount));
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
