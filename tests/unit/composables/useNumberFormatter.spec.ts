import { FPNumber } from '@sora-substrate/sdk';
import { MaxTotalSupply } from '@sora-substrate/sdk/build/assets/consts';
import { describe, expect, it } from 'vitest';

import { useNumberFormatter } from '@/composables/useNumberFormatter';

describe('useNumberFormatter', () => {
  it('exposes shared numeric constants', () => {
    const formatter = useNumberFormatter();

    expect(formatter.Zero.toString()).toBe(FPNumber.ZERO.toString());
    expect(formatter.Hundred.toString()).toBe(FPNumber.HUNDRED.toString());
    expect(formatter.MaxInputNumber).toBe(MaxTotalSupply);
  });

  it('creates and formats numbers from natural and codec values', () => {
    const formatter = useNumberFormatter();
    const codecValue = FPNumber.fromNatural(12.34, 2).codec;

    expect(formatter.getFPNumber('12.34', 2).toString()).toBe(new FPNumber('12.34', 2).toString());
    expect(formatter.getFPNumberFromCodec(codecValue, 2).toString()).toBe(FPNumber.fromCodecValue(codecValue, 2).toString());
    expect(formatter.formatCodecNumber(codecValue, 2)).toBe(FPNumber.fromCodecValue(codecValue, 2).toLocaleString());
    expect(formatter.formatStringValue('12.34', 2)).toBe(new FPNumber('12.34', 2).toLocaleString());
    expect(formatter.getStringFromCodec(codecValue, 2)).toBe(FPNumber.fromCodecValue(codecValue, 2).toString());
  });

  it('detects zero codec values', () => {
    const formatter = useNumberFormatter();

    expect(formatter.isCodecZero('0', 18)).toBe(true);
    expect(formatter.isCodecZero(FPNumber.fromNatural(1, 18).codec, 18)).toBe(false);
  });

  it('clamps the supply to the configured maximum', () => {
    const formatter = useNumberFormatter();
    const expectedMax = new FPNumber(MaxTotalSupply, 18).toString();
    const aboveMaxSupply = String(BigInt(MaxTotalSupply) + 1n);

    expect(formatter.getCorrectSupply(MaxTotalSupply, 18)).toBe(expectedMax);
    expect(formatter.getCorrectSupply(aboveMaxSupply, 18)).toBe(expectedMax);
  });
});
