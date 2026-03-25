import { BalanceType } from '@sora-substrate/sdk/build/assets/consts';
import { FPNumber } from '@sora-substrate/math';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    getAssetFiatPrice: () => '2',
    getFiatAmountByCodecString: () => '2',
    getFiatAmountByString: () => '2',
    getFiatBalance: () => '2',
    getFiatAmount: () => '2',
    formatCodecNumber: (value: string, decimals = 18) => FPNumber.fromCodecValue(value, decimals).toString(),
    getFPNumber: (value: string | number) => new FPNumber(value),
    getFPNumberFromCodec: (value: string | number, decimals?: number) =>
      FPNumber.fromCodecValue(String(value ?? '0'), decimals),
  }),
}));

vi.mock('@/composables/useNumberFormatter', () => ({
  useNumberFormatter: () => ({
    formatCodecNumber: (value: string, decimals = 18) => FPNumber.fromCodecValue(value, decimals).toString(),
  }),
}));

import { useAssetFormatting } from '@/composables/useAssetFormatting';

describe('useAssetFormatting', () => {
  const asset = {
    address: 'asset',
    symbol: 'ASSET',
    name: 'Sample',
    decimals: 18,
    balance: {
      transferable: '1000000000000000000', // 1
      [BalanceType.Locked]: '500000000000000000', // 0.5
    },
  };

  it('formats asset balances by balance type', () => {
    const { formatAssetBalance } = useAssetFormatting();

    expect(formatAssetBalance(asset)).toBe('1');
    expect(formatAssetBalance(asset, { balanceType: BalanceType.Locked })).toBe('0.5');
  });

  it('formats external balances when requested', () => {
    const registeredAsset = {
      ...asset,
      externalAddress: '0xexternal',
      externalBalance: '3000000000000000000',
      externalDecimals: 18,
    };

    const { formatAssetBalance } = useAssetFormatting();

    expect(formatAssetBalance(registeredAsset, { internal: false })).toBe('3');
  });

  it('computes fiat display helper', () => {
    const { formatAssetDisplay } = useAssetFormatting();

    const display = formatAssetDisplay(asset);

    expect(display.value).toBe('1');
    expect(display.fiat).toBe('2');
  });

  it('formats amounts with suffixes', () => {
    const { formatAmountWithSuffix, getFPNumber } = useAssetFormatting();

    const formatted = formatAmountWithSuffix(getFPNumber(1234567), 2);

    expect(formatted.suffix).toBe('M');
  });
});
