import { FPNumber } from '@sora-substrate/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getFPNumberFromCodecMock = vi.hoisted(() =>
  vi.fn((value: string | number, decimals = 18) => FPNumber.fromCodecValue(String(value || '0'), decimals))
);

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
    getFPNumberFromCodec: getFPNumberFromCodecMock,
  }),
}));

import { useFormattedAmount } from '@/lib/soraneo-wallet/src/composables/useFormattedAmount';

describe('wallet lib useFormattedAmount', () => {
  beforeEach(() => {
    getFPNumberFromCodecMock.mockClear();
  });

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

  it('normalizes hex account balances before fiat conversion', () => {
    const { getFiatBalance } = useFormattedAmount();
    const transferable = '218116474998731886993';

    expect(
      getFiatBalance(
        {
          address: 'asset',
          decimals: 18,
          balance: { transferable: `0x${BigInt(transferable).toString(16)}` },
        } as never,
        'transferable' as never
      )
    ).not.toBeNull();
    expect(getFPNumberFromCodecMock).toHaveBeenCalledWith(transferable, 18);
  });

  it('does not invent fiat values for invalid codec amounts', () => {
    const { getFiatAmountByCodecString } = useFormattedAmount();

    expect(getFiatAmountByCodecString('1.5', { address: 'asset', decimals: 18 } as never)).toBeNull();
  });
});
