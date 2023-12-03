import SScrollbar from '@soramitsu/soramitsu-js-ui/lib/components/Scrollbar';
import { mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import Vue from 'vue';
import { Component, Mixins, Ref } from 'vue-property-decorator';

@Component
export default class ScrollableTableMixin extends Mixins(
  mixins.LoadingMixin,
  mixins.PaginationSearchMixin,
  mixins.FormattedAmountMixin
) {
  readonly FontSizeRate = WALLET_CONSTS.FontSizeRate;
  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;

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
    await this.$nextTick();
    this.initScrollbar();
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
      case WALLET_CONSTS.PaginationButton.First:
        current = 1;
        break;
      case WALLET_CONSTS.PaginationButton.Last:
        current = this.lastPage;
    }

    this.currentPage = current;
  }

  public initScrollbar(): void {
    if (!this.tableComponent) return;

    const Scrollbar = Vue.extend(SScrollbar);
    const scrollbar = new Scrollbar();
    scrollbar.$mount();

    const elTable = this.tableComponent.$refs.table;
    const elTableBodyWrapper = elTable.$refs.bodyWrapper;
    const elTableHeaderWrapper = elTable.$refs.headerWrapper;
    const elTableNativeTable = elTableBodyWrapper.getElementsByTagName('table')[0];
    const scrollbarContainer = scrollbar.$el;
    const scrollbarWrap = scrollbar.$el.getElementsByClassName('el-scrollbar__wrap')[0];
    const scrollbarView = scrollbar.$el.getElementsByClassName('el-scrollbar__view')[0];

    scrollbarContainer.classList.add('scrollable-table');
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
