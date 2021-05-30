import isNil from 'lodash/fp/isNil'
import { Component, Mixins } from 'vue-property-decorator'
import { Asset, AccountAsset } from '@sora-substrate/util'

import DialogMixin from '@/components/mixins/DialogMixin'

import { asZeroValue, getAssetBalance } from '@/utils'

@Component
export default class SelectAsset extends Mixins(DialogMixin) {
  public focusSearchInput (): void {
    const input = this.$refs.search as any

    if (input && typeof input.focus === 'function') {
      input.focus()
    }
  }

  public sort (a: AccountAsset, b: AccountAsset): number {
    const emptyABalance = isNil(a.balance) || !+a.balance.transferable
    const emptyBBalance = isNil(b.balance) || !+b.balance.transferable
    if (emptyABalance === emptyBBalance) return 0
    return emptyABalance && !emptyBBalance ? 1 : -1
  }

  public getWhitelistAssetsWithBalances ({
    whitelistAssets,
    accountAssetsAddressTable,
    notNullBalanceOnly = false,
    accountAssetsOnly = false,
    excludeAsset
  }: {
    whitelistAssets: Array<Asset>;
    accountAssetsAddressTable: any;
    notNullBalanceOnly?: boolean;
    accountAssetsOnly?: boolean;
    excludeAsset?: Asset | AccountAsset;
  }): Array<AccountAsset> {
    return whitelistAssets.reduce((result: Array<AccountAsset>, item: Asset) => {
      if (!item || (excludeAsset && item.address === excludeAsset.address)) return result

      const accountAsset = accountAssetsAddressTable[item.address]

      if (accountAssetsOnly && !accountAsset) return result

      const balance = accountAsset?.balance

      if (notNullBalanceOnly && asZeroValue(getAssetBalance(accountAsset))) return result

      const prepared = {
        ...item,
        balance
      } as AccountAsset

      return [...result, prepared]
    }, []).sort(this.sort)
  }
}
