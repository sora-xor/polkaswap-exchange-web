import isNil from 'lodash/fp/isNil'
import { Component, Mixins } from 'vue-property-decorator'
import { Asset, AccountAsset, RegisteredAccountAsset } from '@sora-substrate/util'

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

  public filteredAssetsByQuery (assets: Array<AccountAsset | RegisteredAccountAsset>, isRegisteredAssets = false) {
    const addressField = isRegisteredAssets ? 'externalAddress' : 'address'

    return (query: string): Array<AccountAsset | RegisteredAccountAsset> => {
      if (!query) return assets

      const search = query.toLowerCase().trim()

      return assets.filter(asset =>
        asset.name?.toLowerCase?.()?.includes?.(search) ||
        asset.symbol?.toLowerCase?.()?.includes?.(search) ||
        asset[addressField]?.toLowerCase?.() === search
      )
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
