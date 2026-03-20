import { defineComponent } from 'vue';

import LoadingMixin from './LoadingMixin';
import TranslationMixin from './TranslationMixin';

export default defineComponent({
  mixins: [LoadingMixin, TranslationMixin],
  data() {
    return {
      currentPage: 1,
      pageAmount: 10,
      query: '',
      /** Change pagination number from left to right */
      isLtrDirection: true,
    };
  },
  computed: {
    startIndex(this: any): number {
      return (this.currentPage - 1) * this.pageAmount;
    },
    lastIndex(this: any): number {
      return this.currentPage * this.pageAmount;
    },
    searchQuery(this: any): string {
      return this.query.trim();
    },
    total(): number {
      return 0;
    },
    lastPage(this: any): number {
      return this.total ? Math.ceil(this.total / this.pageAmount) : 1;
    },
    directionShift(this: any): number {
      const lastPageAmount = this.total % this.pageAmount || this.pageAmount;
      return this.isLtrDirection ? 0 : this.pageAmount - lastPageAmount;
    },
  },
  methods: {
    resetPage(this: any): void {
      this.currentPage = 1;
    },
    resetSearch(this: any): void {
      this.query = '';
    },
    sortTransactions(transactions: Array<any>, isAscendingOrder = false): Array<any> {
      return transactions.sort((a: any, b: any) =>
        a.startTime && b.startTime ? (isAscendingOrder ? b.startTime - a.startTime : a.startTime - b.startTime) : 0
      );
    },
    getPageItems(this: any, items: Array<any>, customStartIndex?: number, customLastIndex?: number): Array<any> {
      return items.slice(customStartIndex ?? this.startIndex, customLastIndex ?? this.lastIndex);
    },
    handlePrevClick(this: any, current: number): void {
      this.currentPage = current;
    },
    handleNextClick(this: any, current: number): void {
      this.currentPage = current;
    },
  },
});
