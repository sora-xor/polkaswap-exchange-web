import { FPNumber } from '@sora-substrate/sdk';
import { Vue } from 'vue-property-decorator';
import type { CodecString } from '@sora-substrate/sdk';
export default class NumberFormatterMixin extends Vue {
  readonly Zero: FPNumber;
  readonly Hundred: FPNumber;
  readonly MaxInputNumber = '100000000000000000000';
  getFPNumber(value: string | number, decimals?: number): FPNumber;
  getFPNumberFromCodec(value: CodecString, decimals?: number): FPNumber;
  formatCodecNumber(value: CodecString, decimals?: number): string;
  formatStringValue(value: string, decimals?: number): string;
  getStringFromCodec(value: CodecString, decimals?: number): string;
  isCodecZero(value: CodecString, decimals?: number): boolean;
  getCorrectSupply(tokenSupply: string, decimals: number): string;
}
