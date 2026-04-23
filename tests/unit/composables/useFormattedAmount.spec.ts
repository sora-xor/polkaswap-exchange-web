import { FPNumber } from '@sora-substrate/sdk';
import { BalanceType, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { describe, expect, it, vi } from 'vitest';

const walletStoreMock = vi.hoisted(() => ({
  fiatPriceObject: {
    asset: '2',
  } as Record<string, string>,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStoreMock,
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
    const { getAssetFiatPrice, getFiatAmount, getFiatAmountByCodecString, getFiatAmountByString, getFiatBalance } =
      useFormattedAmount();

    expect(getAssetFiatPrice(null)).toBeNull();
    expect(getFiatBalance(null)).toBeNull();
    expect(getFiatAmount('1', null)).toBeNull();
    expect(getFiatAmountByCodecString('1000000000000000000', null)).toBeNull();
    expect(getFiatAmountByString('1', null)).toBeNull();
  });

  it('returns null when price data or balance data is unavailable', () => {
    const { getAssetFiatPrice, getFiatAmount, getFiatAmountByString, getFiatBalance } = useFormattedAmount();

    const unpricedAsset = {
      address: 'unpriced',
      decimals: 18,
      balance: { transferable: '1000000000000000000' },
    } as any;

    expect(getAssetFiatPrice({ decimals: 18 } as any)).toBeNull();
    expect(getAssetFiatPrice(unpricedAsset)).toBeNull();
    expect(getFiatAmount('1', unpricedAsset)).toBeNull();
    expect(getFiatAmountByString('1', unpricedAsset)).toBeNull();
    expect(getFiatBalance(unpricedAsset)).toBeNull();
    expect(getFiatBalance({ address: 'asset', decimals: 18 } as any)).toBeNull();
  });

  it('returns null for undefined amounts while treating empty strings as zero', () => {
    const { getFiatAmount, getFiatAmountByString } = useFormattedAmount();
    const asset = { address: 'asset', decimals: 18 } as any;
    const zeroFiat = FPNumber.fromNatural('0', 18).mul(FPNumber.fromCodecValue('2')).toLocaleString();

    expect(getFiatAmount(undefined as any, asset)).toBeNull();
    expect(getFiatAmountByString(undefined as any, asset)).toBeNull();
    expect(getFiatAmount('', asset)).toBe(zeroFiat);
    expect(getFiatAmountByString('', asset)).toBe(zeroFiat);
  });

  it('keeps fiat conversion working for valid assets', () => {
    const { getFiatAmount, getFiatAmountByCodecString, getFiatAmountByString } = useFormattedAmount();
    const asset = {
      address: 'asset',
      decimals: 18,
    } as any;
    const codecValue = '1000000000000000000';
    const expectedNatural = FPNumber.fromNatural('1', 18).mul(FPNumber.fromCodecValue('2')).toLocaleString();
    const expectedCodec = FPNumber.fromCodecValue(codecValue, 18).mul(FPNumber.fromCodecValue('2')).toLocaleString();

    expect(getFiatAmount('1', asset)).toBe(expectedNatural);
    expect(getFiatAmountByString('1', asset)).toBe(expectedNatural);
    expect(getFiatAmountByCodecString(codecValue, asset)).toBe(expectedCodec);
  });

  it('converts account balances using the requested balance type', () => {
    const { getFiatBalance } = useFormattedAmount();
    const asset = {
      address: 'asset',
      decimals: 18,
      balance: {
        [BalanceType.Transferable]: '1000000000000000000',
        [BalanceType.Locked]: '2000000000000000000',
      },
    } as any;

    expect(getFiatBalance(asset)).toBe(
      FPNumber.fromCodecValue(asset.balance[BalanceType.Transferable], 18)
        .mul(FPNumber.fromCodecValue('2'))
        .toLocaleString()
    );
    expect(getFiatBalance(asset, BalanceType.Locked)).toBe(
      FPNumber.fromCodecValue(asset.balance[BalanceType.Locked], 18).mul(FPNumber.fromCodecValue('2')).toLocaleString()
    );
  });

  it('converts FPNumber amounts and supports the default XOR asset', () => {
    walletStoreMock.fiatPriceObject[XOR.address] = '3';

    const { getFiatAmountByFPNumber, getFPNumberFiatAmountByFPNumber } = useFormattedAmount();
    const amount = FPNumber.fromNatural('4', XOR.decimals);
    const expected = amount.mul(FPNumber.fromCodecValue('3'));

    expect(getFPNumberFiatAmountByFPNumber(amount)?.toString()).toBe(expected.toString());
    expect(getFiatAmountByFPNumber(amount)).toBe(expected.toLocaleString());
    expect(getFPNumberFiatAmountByFPNumber(amount, { address: 'unpriced', decimals: 18 } as any)).toBeNull();
    expect(getFiatAmountByFPNumber(amount, { address: 'unpriced', decimals: 18 } as any)).toBeNull();
    expect(getFPNumberFiatAmountByFPNumber(amount, null)).toBeNull();
    expect(getFiatAmountByFPNumber(amount, null)).toBeNull();
  });
});
