import isNil from 'lodash/fp/isNil';
import { Component, Mixins, Watch } from 'vue-property-decorator';
import type { RegisteredAccountAsset } from '@sora-substrate/util';
import type { Asset, AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';

import DialogMixin from '@/components/mixins/DialogMixin';
import AssetsSearchMixin from '@/components/mixins/AssetsSearchMixin';

import { asZeroValue, getAssetBalance } from '@/utils';

@Component
export default class SelectAsset extends Mixins(DialogMixin, AssetsSearchMixin) {
  @Watch('visible')
  async handleVisibleChangeToFocusSearch(value: boolean): Promise<void> {
    await this.$nextTick();

    if (!value) return;

    this.handleClearSearch();
    this.focusSearchInput();
  }

  query = '';

  get searchQuery(): string {
    return this.query.trim().toLowerCase();
  }

  public handleClearSearch(): void {
    this.query = '';
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

  public getAssetsWithBalances({
    assets,
    accountAssetsAddressTable,
    notNullBalanceOnly = false,
    accountAssetsOnly = false,
    excludeAsset,
  }: {
    assets: Array<Asset | RegisteredAccountAsset>;
    accountAssetsAddressTable: WALLET_TYPES.AccountAssetsTable;
    notNullBalanceOnly?: boolean;
    accountAssetsOnly?: boolean;
    excludeAsset?: Asset | AccountAsset;
  }): Array<AccountAsset | RegisteredAccountAsset> {
    return assets.reduce((result: Array<AccountAsset>, item) => {
      if (!item || (excludeAsset && item.address === excludeAsset.address)) return result;

      const accountAsset = accountAssetsAddressTable[item.address];

      if (accountAssetsOnly && !accountAsset) return result;

      const balance = accountAsset?.balance;

      if (notNullBalanceOnly && asZeroValue(getAssetBalance(accountAsset))) return result;

      const prepared = {
        ...item,
        balance,
      };

      return [...result, prepared];
    }, []);
  }

  public selectAsset(asset: RegisteredAccountAsset | AccountAsset | Asset): void {
    this.handleClearSearch();
    this.$emit('select', asset);
    this.closeDialog();
  }
}
