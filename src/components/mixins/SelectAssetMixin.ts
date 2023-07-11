import { mixins } from '@soramitsu/soraneo-wallet-web';
import isNil from 'lodash/fp/isNil';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import AssetsSearchMixin from '@/components/mixins/AssetsSearchMixin';
import { getter } from '@/store/decorators';

import type { Asset, AccountAsset, RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';

@Component
export default class SelectAsset extends Mixins(mixins.DialogMixin, AssetsSearchMixin) {
  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<RegisteredAccountAsset>;

  @Watch('visible')
  async handleVisibleChangeToFocusSearch(value: boolean): Promise<void> {
    await this.$nextTick();

    if (!value) return;
    this.clearAndFocusSearch();
  }

  public sortByBalance(external = false) {
    const isEmpty = (a): boolean => (external ? !+a.externalBalance : isNil(a.balance) || !+a.balance.transferable);

    return (a: AccountAsset | RegisteredAccountAsset, b: AccountAsset | RegisteredAccountAsset): number => {
      const emptyABalance = isEmpty(a);
      const emptyBBalance = isEmpty(b);

      if (emptyABalance === emptyBBalance) return 0;

      return emptyABalance && !emptyBBalance ? 1 : -1;
    };
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
