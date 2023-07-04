import { Component, Mixins, Ref } from 'vue-property-decorator';

@Component
export default class SearchInputMixin extends Mixins() {
  @Ref('search') readonly search!: any;

  query = '';

  get searchQuery(): string {
    return this.query.trim().toLowerCase();
  }

  public handleClearSearch(): void {
    this.query = '';
  }

  public focusSearchInput(): void {
    this.search?.focus();
  }

  public clearAndFocusSearch(): void {
    this.handleClearSearch();
    this.focusSearchInput();
  }
}
