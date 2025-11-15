import { Options, mixins } from 'vue-property-decorator';

import LoadingMixin from './LoadingMixin';
import TranslationMixin from './TranslationMixin';

@Options({})
export default class PaginationSearchMixin extends mixins(LoadingMixin, TranslationMixin) {
  currentPage = 1;
  pageAmount = 10;
  query = '';
  /** Change pagination number from left to right */
  isLtrDirection = true;

  get startIndex(): number {
    return (this.currentPage - 1) * this.pageAmount;
  }

  get lastIndex(): number {
    return this.currentPage * this.pageAmount;
  }

  get searchQuery(): string {
    return this.query.trim();
  }

  get total(): number {
    return 0;
  }

  get lastPage(): number {
    return this.total ? Math.ceil(this.total / this.pageAmount) : 1;
  }

  get directionShift(): number {
    const lastPageAmount = this.total % this.pageAmount || this.pageAmount;
    return this.isLtrDirection ? 0 : this.pageAmount - lastPageAmount;
  }

  resetPage(): void {
    this.currentPage = 1;
  }

  resetSearch(): void {
    this.query = '';
  }

  sortTransactions(transactions: Array<any>, isAscendingOrder = false): Array<any> {
    return transactions.sort((a: any, b: any) =>
      a.startTime && b.startTime ? (isAscendingOrder ? b.startTime - a.startTime : a.startTime - b.startTime) : 0
    );
  }

  getPageItems(items: Array<any>, customStartIndex?: number, customLastIndex?: number): Array<any> {
    return items.slice(customStartIndex ?? this.startIndex, customLastIndex ?? this.lastIndex);
  }

  handlePrevClick(current: number): void {
    this.currentPage = current;
  }

  handleNextClick(current: number): void {
    this.currentPage = current;
  }
}
