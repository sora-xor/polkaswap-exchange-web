import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import SearchInputMixin from '@/components/mixins/SearchInputMixin';
import { getter } from '@/store/decorators';

import type { Asset, AccountAsset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

@Component
export default class SelectAssetMixin extends Mixins(mixins.DialogMixin, SearchInputMixin) {
  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<RegisteredAccountAsset>;

  @Watch('visible')
  async handleVisibleChangeToFocusSearch(value: boolean): Promise<void> {
    await this.$nextTick();

    if (!value) return;
    this.clearAndFocusSearch();
  }

  public getAssetsWithBalances(addresses: string[], excludeAddress = ''): Array<RegisteredAccountAsset> {
    return addresses.reduce<RegisteredAccountAsset[]>((buffer, address) => {
      if (address !== excludeAddress) {
        const asset = this.getAsset(address);

        if (asset) {
          buffer.push(asset);
        }
      }
      return buffer;
    }, []);
  }

  public selectAsset(asset: RegisteredAccountAsset | AccountAsset | Asset): void {
    this.handleClearSearch();
    this.$emit('select', asset);
    this.closeDialog();
  }
}
