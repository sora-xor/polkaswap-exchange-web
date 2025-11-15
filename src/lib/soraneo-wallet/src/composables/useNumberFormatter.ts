import { FPNumber } from '@sora-substrate/sdk';
import { MaxTotalSupply } from '@sora-substrate/sdk/build/assets/consts';

import type { CodecString } from '@sora-substrate/sdk';

export function useNumberFormatter() {
  const Zero = FPNumber.ZERO;
  const Hundred = FPNumber.HUNDRED;
  const MaxInputNumber = MaxTotalSupply;

  const getFPNumber = (value: string | number, decimals?: number): FPNumber => {
    return new FPNumber(value, decimals);
  };

  const getFPNumberFromCodec = (value: CodecString, decimals?: number): FPNumber => {
    return FPNumber.fromCodecValue(value, decimals);
  };

  const formatCodecNumber = (value: CodecString, decimals?: number): string => {
    return getFPNumberFromCodec(value, decimals).toLocaleString();
  };

  const formatStringValue = (value: string, decimals?: number): string => {
    return getFPNumber(value, decimals).toLocaleString();
  };

  const getStringFromCodec = (value: CodecString, decimals?: number): string => {
    return FPNumber.fromCodecValue(value, decimals).toString();
  };

  const isCodecZero = (value: CodecString, decimals?: number): boolean => {
    return getFPNumberFromCodec(value, decimals).isZero();
  };

  const getCorrectSupply = (tokenSupply: string, decimals: number): string => {
    const fpnTokenSupply = getFPNumber(tokenSupply, decimals);
    const fpnMaxTokenSupply = getFPNumber(MaxTotalSupply, decimals);

    if (FPNumber.gt(fpnTokenSupply, fpnMaxTokenSupply)) {
      return fpnMaxTokenSupply.toString();
    }

    return fpnTokenSupply.toString();
  };

  return {
    Zero,
    Hundred,
    MaxInputNumber,
    getFPNumber,
    getFPNumberFromCodec,
    formatCodecNumber,
    formatStringValue,
    getStringFromCodec,
    isCodecZero,
    getCorrectSupply,
  };
}
