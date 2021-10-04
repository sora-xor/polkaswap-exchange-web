import { Component, Vue } from 'vue-property-decorator';

@Component
export default class PaginationSearchMixin extends Vue {
  currentPage = 1;
  pageAmount = 10;
  query = '';

  get startIndex(): number {
    return (this.currentPage - 1) * this.pageAmount;
  }

  get lastIndex(): number {
    return this.currentPage * this.pageAmount;
  }

  handlePrevClick(current: number): void {
    this.currentPage = current;
  }

  handleNextClick(current: number): void {
    this.currentPage = current;
  }

  handleResetSearch(): void {
    this.query = '';
    this.currentPage = 1;
  }

  getPageItems(items: Array<any>): Array<any> {
    return items.slice(this.startIndex, this.lastIndex);
  }
}
