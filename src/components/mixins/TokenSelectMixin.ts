import { Vue, Options } from 'vue-property-decorator';

@Options({})
export default class TokenSelectMixin extends Vue {
  isSelectAssetLoading = false;

  async withSelectAssetLoading(func: FnWithoutArgs | AsyncFnWithoutArgs): Promise<void> {
    this.isSelectAssetLoading = true;

    try {
      await func();
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      this.isSelectAssetLoading = false;
    }
  }
}
