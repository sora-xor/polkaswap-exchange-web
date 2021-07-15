import { Component, Vue } from 'vue-property-decorator'
import { Asset, AccountAsset, RegisteredAccountAsset } from '@sora-substrate/util'

@Component
export default class AssetsSearchMixin extends Vue {
  public focusSearchInput (): void {
    const input = this.$refs.search as any

    if (input && typeof input.focus === 'function') {
      input.focus()
    }
  }

  public filterAssetsByQuery (assets: Array<Asset | AccountAsset | RegisteredAccountAsset>, isRegisteredAssets = false) {
    const addressField = isRegisteredAssets ? 'externalAddress' : 'address'

    return (query: string): Array<Asset | AccountAsset | RegisteredAccountAsset> => {
      if (!query) return assets

      const search = query.toLowerCase().trim()

      return assets.filter(asset =>
        asset.name?.toLowerCase?.()?.includes?.(search) ||
        asset.symbol?.toLowerCase?.()?.includes?.(search) ||
        asset[addressField]?.toLowerCase?.() === search
      )
    }
  }
}
