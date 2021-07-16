import { Component, Mixins } from 'vue-property-decorator'
import { Whitelist, Asset, AccountAsset, FPNumber, CodecString } from '@sora-substrate/util'
import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'

@Component
export default class FiatValueMixin extends Mixins(NumberFormatterMixin) {
  getAssetFiatPrice (whitelist: Whitelist, accountAsset: Asset | AccountAsset): null | CodecString {
    const asset = whitelist[accountAsset.address]
    return !asset || !asset.price ? null : asset.price
  }

  getFiatAmount (amount: string, price: null | string): null | string {
    if (!price) {
      return null
    }
    return new FPNumber(amount).mul(FPNumber.fromCodecValue(price)).toString()
  }

  formatFiatPrice (price: CodecString, decimals?: number): string {
    return this.formatCodecNumber(price, decimals)
  }
}
