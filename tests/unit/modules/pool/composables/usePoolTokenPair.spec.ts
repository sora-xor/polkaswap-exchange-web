import { Operation } from '@sora-substrate/sdk';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePoolTokenPair } from '@/modules/pool/composables/usePoolTokenPair';

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock();
});
vi.mock('@/lib/soraneo-wallet/src/core', () => createWalletMock());

const formatCodecNumber = vi.hoisted(() => vi.fn((value: string) => `formatted:${value}`));
const formatStringValue = vi.hoisted(() => vi.fn((value: string) => `string:${value}`));

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    formatCodecNumber,
    formatStringValue,
  }),
}));

const settingsStateMock = vi.hoisted(() => ({
  networkFees: {},
}));

const poolStoreMock = vi.hoisted(() => ({
  addLiquidityFirstTokenValue: '1',
  addLiquiditySecondTokenValue: '2',
  addLiquidityIsAvailable: true,
  addLiquidityFirstToken: { symbol: 'A' },
  addLiquiditySecondToken: { symbol: 'B' },
  addLiquidityPrice: '3',
  addLiquidityPriceReversed: '4',
}));

const initialNetworkFees = {
  [Operation.AddLiquidity]: '10',
  [Operation.CreatePair]: '20',
};

const settingsStoreMock = {
  get networkFees() {
    return settingsStateMock.networkFees;
  },
};

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/stores/pool', () => ({
  usePoolStore: () => poolStoreMock,
}));

describe('usePoolTokenPair', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    formatCodecNumber.mockClear();
    formatStringValue.mockClear();

    poolStoreMock.addLiquidityFirstTokenValue = '1';
    poolStoreMock.addLiquiditySecondTokenValue = '2';
    poolStoreMock.addLiquidityIsAvailable = true;
    poolStoreMock.addLiquidityPrice = '3';
    poolStoreMock.addLiquidityPriceReversed = '4';
    settingsStateMock.networkFees = { ...initialNetworkFees };
  });

  it('provides formatted values and detects empty assets', () => {
    const { formattedPrice, formattedPriceReversed, emptyAssets } = usePoolTokenPair();
    expect(formattedPrice.value).toBe('string:3');
    expect(formattedPriceReversed.value).toBe('string:4');
    expect(emptyAssets.value).toBe(false);
  });

  it('falls back to create pair fee when liquidity is unavailable and detects empty assets', () => {
    poolStoreMock.addLiquidityIsAvailable = false;
    poolStoreMock.addLiquidityFirstTokenValue = '';
    poolStoreMock.addLiquiditySecondTokenValue = '';

    const { emptyAssets } = usePoolTokenPair();
    expect(emptyAssets.value).toBe(true);
  });
});
