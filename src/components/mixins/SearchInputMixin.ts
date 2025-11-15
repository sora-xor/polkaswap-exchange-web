import { Options, Ref, Vue } from 'vue-property-decorator';

@Options({})
export default class SearchInputMixin extends Vue {
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
