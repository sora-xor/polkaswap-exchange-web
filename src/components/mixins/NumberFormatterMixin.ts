import { Vue, Component } from 'vue-property-decorator'
import { FPNumber, CodecString } from '@sora-substrate/util'

@Component
export default class NumberFormatterMixin extends Vue {
  getFPNumber (value: string | number, decimals?: number): FPNumber {
    return new FPNumber(value, decimals)
  }

  getFPNumberFromCodec (value: CodecString, decimals?: number): FPNumber {
    return FPNumber.fromCodecValue(value, decimals)
  }

  formatCodecNumber (value: CodecString, decimals?: number): string {
    return this.getFPNumberFromCodec(value, decimals).format()
  }

  formatStringValue (value: string, decimals?: number): string {
    return this.getFPNumber(value, decimals).format()
  }

  getStringFromCodec (value: CodecString, decimals?: number): string {
    return FPNumber.fromCodecValue(value, decimals).toString()
  }

  isCodecZero (value: CodecString, decimals?: number): boolean {
    return this.getFPNumberFromCodec(value, decimals).isZero()
  }
}
