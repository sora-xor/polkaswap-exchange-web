import isNil from 'lodash/fp/isNil'
import { Component, Mixins } from 'vue-property-decorator'
import { Asset, AccountAsset, RegisteredAccountAsset } from '@sora-substrate/util'

import DialogMixin from '@/components/mixins/DialogMixin'
import AssetsSearchMixin from '@/components/mixins/AssetsSearchMixin'

import { asZeroValue, getAssetBalance } from '@/utils'

@Component
export default class SelectAsset extends Mixins(DialogMixin, AssetsSearchMixin) {
  public sortByBalance (external = false) {
    const isEmpty = (a): boolean => external
      ? !+a.externalBalance
      : isNil(a.balance) || !+a.balance.transferable

    return (a: AccountAsset | RegisteredAccountAsset, b: AccountAsset | RegisteredAccountAsset): number => {
      const emptyABalance = isEmpty(a)
      const emptyBBalance = isEmpty(b)

      if (emptyABalance === emptyBBalance) return 0

      return emptyABalance && !emptyBBalance ? 1 : -1
    }
  }

  public getAssetsWithBalances ({
    assets,
    accountAssetsAddressTable,
    notNullBalanceOnly = false,
    accountAssetsOnly = false,
    excludeAsset
  }: {
    assets: Array<Asset | RegisteredAccountAsset>;
    accountAssetsAddressTable: any;
    notNullBalanceOnly?: boolean;
    accountAssetsOnly?: boolean;
    excludeAsset?: Asset | AccountAsset;
  }): Array<AccountAsset | RegisteredAccountAsset> {
    return assets.reduce((result: Array<AccountAsset>, item) => {
      if (!item || (excludeAsset && item.address === excludeAsset.address)) return result

      const accountAsset = accountAssetsAddressTable[item.address]

      if (accountAssetsOnly && !accountAsset) return result

      const balance = accountAsset?.balance

      if (notNullBalanceOnly && asZeroValue(getAssetBalance(accountAsset))) return result

      const prepared = {
        ...item,
        balance
      }

      return [...result, prepared]
    }, [])
  }
}
