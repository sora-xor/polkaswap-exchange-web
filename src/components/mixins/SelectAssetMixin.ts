import isNil from 'lodash/fp/isNil';
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import type { Asset, AccountAsset } from '@sora-substrate/util/build/assets/types';

import AssetsSearchMixin from '@/components/mixins/AssetsSearchMixin';

import { getter } from '@/store/decorators';

import type { RegisteredAccountAssetWithDecimals } from '@/store/assets/types';

@Component
export default class SelectAsset extends Mixins(mixins.DialogMixin, AssetsSearchMixin) {
  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<RegisteredAccountAssetWithDecimals>;

  @Watch('visible')
  async handleVisibleChangeToFocusSearch(value: boolean): Promise<void> {
    await this.$nextTick();

    if (!value) return;
    this.clearAndFocusSearch();
  }

  query = '';

  get searchQuery(): string {
    return this.query.trim().toLowerCase();
  }

  public handleClearSearch(): void {
    this.query = '';
  }

  public clearAndFocusSearch(): void {
    this.handleClearSearch();
    this.focusSearchInput();
  }

  public sortByBalance(external = false) {
    const isEmpty = (a): boolean => (external ? !+a.externalBalance : isNil(a.balance) || !+a.balance.transferable);

    return (
      a: AccountAsset | RegisteredAccountAssetWithDecimals,
      b: AccountAsset | RegisteredAccountAssetWithDecimals
    ): number => {
      const emptyABalance = isEmpty(a);
      const emptyBBalance = isEmpty(b);

      if (emptyABalance === emptyBBalance) return 0;

      return emptyABalance && !emptyBBalance ? 1 : -1;
    };
  }

  public getAssetsWithBalances(addresses: string[], excludeAddress = ''): Array<RegisteredAccountAssetWithDecimals> {
    return addresses.reduce<RegisteredAccountAssetWithDecimals[]>((buffer, address) => {
      if (address !== excludeAddress) {
        const asset = this.getAsset(address);

        if (asset) {
          buffer.push(asset);
        }
      }
      return buffer;
    }, []);
  }

  public selectAsset(asset: RegisteredAccountAssetWithDecimals | AccountAsset | Asset): void {
    this.handleClearSearch();
    this.$emit('select', asset);
    this.closeDialog();
  }
}
