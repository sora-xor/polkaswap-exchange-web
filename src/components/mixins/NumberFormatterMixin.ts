import { Vue, Component } from 'vue-property-decorator'
import { FPNumber, CodecString, MaxTotalSupply, KnownAssets } from '@sora-substrate/util'

@Component
export default class NumberFormatterMixin extends Vue {
  getFPNumber (value: string | number, decimals?: number): FPNumber {
    return new FPNumber(value, decimals)
  }

  getFPNumberFromCodec (value: CodecString, decimals?: number): FPNumber {
    return FPNumber.fromCodecValue(value, decimals)
  }

  formatCodecNumber (value: CodecString, decimals?: number): string {
    return this.getFPNumberFromCodec(value, decimals).toLocaleString()
  }

  formatStringValue (value: string, decimals?: number): string {
    return this.getFPNumber(value, decimals).toLocaleString()
  }

  getStringFromCodec (value: CodecString, decimals?: number): string {
    return FPNumber.fromCodecValue(value, decimals).toString()
  }

  isCodecZero (value: CodecString, decimals?: number): boolean {
    return this.getFPNumberFromCodec(value, decimals).isZero()
  }

  getMax (address: string): string {
    if (!address) {
      return MaxTotalSupply
    }
    const knownAsset = KnownAssets.get(address)
    if (!knownAsset) {
      return MaxTotalSupply
    }
    return knownAsset.totalSupply || MaxTotalSupply
  }
}
