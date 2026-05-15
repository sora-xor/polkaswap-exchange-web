import { FPNumber } from '@sora-substrate/sdk';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    fiatPriceObject: {
      asset: '2',
      '0xasset': '3',
    },
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useNumberFormatter', () => ({
  useNumberFormatter: () => ({
    getFPNumber: (value: string | number, decimals = 18) => FPNumber.fromNatural(value || '0', decimals),
    getFPNumberFromCodec: (value: string | number, decimals = 18) =>
      FPNumber.fromCodecValue(String(value || '0'), decimals),
  }),
}));

import { useFormattedAmount } from '@/lib/soraneo-wallet/src/composables/useFormattedAmount';

describe('wallet lib useFormattedAmount', () => {
  it('reads fiat prices from the Pinia wallet store', () => {
    const { getAssetFiatPrice, getFiatAmountByCodecString } = useFormattedAmount();

    expect(getAssetFiatPrice(null as never)).toBeNull();
    expect(
      getFiatAmountByCodecString('1000000000000000000', {
        address: 'asset',
        decimals: 18,
      } as never)
    ).not.toBeNull();
  });

  it('matches fiat prices case-insensitively for hex asset addresses', () => {
    const { getAssetFiatPrice } = useFormattedAmount();

    expect(getAssetFiatPrice({ address: '0xASSET', decimals: 18 } as never)).toBe('3');
  });
});
