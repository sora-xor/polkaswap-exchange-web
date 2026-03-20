import { FPNumber } from '@sora-substrate/sdk';
import { MaxTotalSupply } from '@sora-substrate/sdk/build/assets/consts';
import { defineComponent } from 'vue';

import type { CodecString } from '@sora-substrate/sdk';

export default defineComponent({
  data() {
    return {
      Zero: FPNumber.ZERO,
      Hundred: FPNumber.HUNDRED,
      MaxInputNumber: MaxTotalSupply,
    };
  },
  methods: {
    getFPNumber(value: string | number, decimals?: number): FPNumber {
      return new FPNumber(value, decimals);
    },
    getFPNumberFromCodec(value: CodecString, decimals?: number): FPNumber {
      return FPNumber.fromCodecValue(value, decimals);
    },
    formatCodecNumber(this: any, value: CodecString, decimals?: number): string {
      return this.getFPNumberFromCodec(value, decimals).toLocaleString();
    },
    formatStringValue(this: any, value: string, decimals?: number): string {
      return this.getFPNumber(value, decimals).toLocaleString();
    },
    getStringFromCodec(value: CodecString, decimals?: number): string {
      return FPNumber.fromCodecValue(value, decimals).toString();
    },
    isCodecZero(this: any, value: CodecString, decimals?: number): boolean {
      return this.getFPNumberFromCodec(value, decimals).isZero();
    },
    getCorrectSupply(this: any, tokenSupply: string, decimals: number): string {
      const fpnTokenSupply = this.getFPNumber(tokenSupply, decimals);
      const fpnMaxTokenSupply = this.getFPNumber(MaxTotalSupply, decimals);

      if (FPNumber.gt(fpnTokenSupply, fpnMaxTokenSupply)) {
        return fpnMaxTokenSupply.toString();
      }

      return fpnTokenSupply.toString();
    },
  },
});
