import { Vue, Component } from 'vue-property-decorator';

@Component
export default class TokenSelectMixin extends Vue {
  isSelectAssetLoading = false;

  async withSelectAssetLoading(func: AsyncVoidFn | VoidFunction): Promise<any> {
    this.isSelectAssetLoading = true;

    try {
      return await func();
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      this.isSelectAssetLoading = false;
    }
  }
}
