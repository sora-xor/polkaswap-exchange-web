import { FPNumber } from '@sora-substrate/sdk';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    fiatPriceObject: {
      asset: '2',
    },
  }),
}));

vi.mock('@/composables/useNumberFormatter', () => ({
  useNumberFormatter: () => ({
    getFPNumber: (value: string | number, decimals = 18) => FPNumber.fromNatural(value || '0', decimals),
    getFPNumberFromCodec: (value: string | number, decimals = 18) =>
      FPNumber.fromCodecValue(String(value || '0'), decimals),
  }),
}));

import { useFormattedAmount } from '@/composables/useFormattedAmount';

describe('useFormattedAmount', () => {
  it('returns null for fiat helpers when asset is missing', () => {
    const { getAssetFiatPrice, getFiatAmountByCodecString, getFiatAmountByString } = useFormattedAmount();

    expect(getAssetFiatPrice(null)).toBeNull();
    expect(getFiatAmountByCodecString('1000000000000000000', null)).toBeNull();
    expect(getFiatAmountByString('1', null)).toBeNull();
  });

  it('keeps fiat conversion working for valid assets', () => {
    const { getFiatAmountByCodecString } = useFormattedAmount();

    const result = getFiatAmountByCodecString('1000000000000000000', {
      address: 'asset',
      decimals: 18,
    } as any);

    expect(result).not.toBeNull();
  });
});
