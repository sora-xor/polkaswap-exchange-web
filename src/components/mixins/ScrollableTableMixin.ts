import { mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Ref } from 'vue-property-decorator';

@Component
export default class ScrollableTableMixin extends Mixins(
  mixins.LoadingMixin,
  mixins.PaginationSearchMixin,
  mixins.FormattedAmountMixin
) {
  readonly FontSizeRate = WALLET_CONSTS.FontSizeRate;
  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;

  private teardownScrollSync: Nullable<FnWithoutArgs> = null;

  @Ref('table') readonly tableComponent!: any;

  get loadingState(): boolean {
    return this.parentLoading || this.loading;
  }

  // should be already filtered & sorted
  get preparedItems(): any[] {
    console.warn('[ScrollableTableMixin]: "preparedItems" computed property is not implemented');
    return [];
  }

  get total(): number {
    return this.preparedItems.length;
  }

  get tableItems() {
    return this.getPageItems(this.preparedItems);
  }

  async mounted(): Promise<void> {
    await this.withParentLoading(async () => {
      await this.$nextTick();
      this.initScrollbarSync();
    });
  }

  beforeUnmount(): void {
    this.resetScrollbarSync();
  }

  public handlePaginationClick(button: WALLET_CONSTS.PaginationButton): void {
    let current = 1; // First by default (instead of case WALLET_CONSTS.PaginationButton.First)

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

  public initScrollbarSync(): void {
    if (!this.tableComponent) return;

    const elTable = this.tableComponent.$refs.table;
    const elTableBodyWrapper = elTable?.$refs?.bodyWrapper as HTMLElement | undefined;
    const elTableHeaderWrapper = elTable?.$refs?.headerWrapper as HTMLElement | undefined;

    if (!elTableBodyWrapper || !elTableHeaderWrapper) return;

    const syncScroll = () => {
      const scrollLeft = elTableBodyWrapper.scrollLeft;
      elTableHeaderWrapper.scrollLeft = scrollLeft;
      elTable.scrollPosition = scrollLeft === 0 ? 'left' : 'right';
    };

    elTableBodyWrapper.addEventListener('scroll', syncScroll, { passive: true });
    syncScroll();

    this.teardownScrollSync = () => {
      elTableBodyWrapper.removeEventListener('scroll', syncScroll);
    };
  }

  private resetScrollbarSync(): void {
    this.teardownScrollSync?.();
    this.teardownScrollSync = null;
  }
}
