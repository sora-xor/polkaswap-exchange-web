import { FPNumber } from '@sora-substrate/sdk';
import { MaxTotalSupply } from '@sora-substrate/sdk/build/assets/consts';

import type { CodecString } from '@sora-substrate/sdk';

/**
 * Numeric helpers extracted from the wallet's `NumberFormatterMixin`.
 */
export function useNumberFormatter() {
  const getFPNumber = (value: string | number, decimals?: number) => new FPNumber(value, decimals);
  const getFPNumberFromCodec = (value: CodecString, decimals?: number) => FPNumber.fromCodecValue(value, decimals);

  const formatCodecNumber = (value: CodecString, decimals?: number) =>
    getFPNumberFromCodec(value, decimals).toLocaleString();
  const formatStringValue = (value: string, decimals?: number) => getFPNumber(value, decimals).toLocaleString();
  const getStringFromCodec = (value: CodecString, decimals?: number) =>
    getFPNumberFromCodec(value, decimals).toString();
  const isCodecZero = (value: CodecString, decimals?: number) => getFPNumberFromCodec(value, decimals).isZero();
  const getCorrectSupply = (tokenSupply: string, decimals: number) => {
    const fpnTokenSupply = getFPNumber(tokenSupply, decimals);
    const fpnMaxTokenSupply = getFPNumber(MaxTotalSupply, decimals);

    if (FPNumber.gt(fpnTokenSupply, fpnMaxTokenSupply)) {
      return fpnMaxTokenSupply.toString();
    }

    return fpnTokenSupply.toString();
  };

  return {
    Zero: FPNumber.ZERO,
    Hundred: FPNumber.HUNDRED,
    MaxInputNumber: MaxTotalSupply,
    getFPNumber,
    getFPNumberFromCodec,
    formatCodecNumber,
    formatStringValue,
    getStringFromCodec,
    isCodecZero,
    getCorrectSupply,
  };
}

export type NumberFormatterComposable = ReturnType<typeof useNumberFormatter>;
