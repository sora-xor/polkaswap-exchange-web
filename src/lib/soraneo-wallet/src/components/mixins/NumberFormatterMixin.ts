import { FPNumber } from '@sora-substrate/sdk';
import { MaxTotalSupply } from '@sora-substrate/sdk/build/assets/consts';
import { Options, Vue } from 'vue-property-decorator';

import type { CodecString } from '@sora-substrate/sdk';

@Options({})
export default class NumberFormatterMixin extends Vue {
  readonly Zero = FPNumber.ZERO;
  readonly Hundred = FPNumber.HUNDRED;
  readonly MaxInputNumber = MaxTotalSupply;

  getFPNumber(value: string | number, decimals?: number): FPNumber {
    return new FPNumber(value, decimals);
  }

  getFPNumberFromCodec(value: CodecString, decimals?: number): FPNumber {
    return FPNumber.fromCodecValue(value, decimals);
  }

  formatCodecNumber(value: CodecString, decimals?: number): string {
    return this.getFPNumberFromCodec(value, decimals).toLocaleString();
  }

  formatStringValue(value: string, decimals?: number): string {
    return this.getFPNumber(value, decimals).toLocaleString();
  }

  getStringFromCodec(value: CodecString, decimals?: number): string {
    return FPNumber.fromCodecValue(value, decimals).toString();
  }

  isCodecZero(value: CodecString, decimals?: number): boolean {
    return this.getFPNumberFromCodec(value, decimals).isZero();
  }

  getCorrectSupply(tokenSupply: string, decimals: number): string {
    const fpnTokenSupply = this.getFPNumber(tokenSupply, decimals);
    const fpnMaxTokenSupply = this.getFPNumber(MaxTotalSupply, decimals);

    if (FPNumber.gt(fpnTokenSupply, fpnMaxTokenSupply)) {
      return fpnMaxTokenSupply.toString();
    }

    return fpnTokenSupply.toString();
  }
}
