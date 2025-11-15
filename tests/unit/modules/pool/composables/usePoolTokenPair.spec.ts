import { Operation } from '@sora-substrate/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePoolTokenPair } from '@/modules/pool/composables/usePoolTokenPair';

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock();
});
vi.mock('@wallet/core', () => createWalletMock());

const formatCodecNumber = vi.hoisted(() => vi.fn((value: string) => `formatted:${value}`));
const formatStringValue = vi.hoisted(() => vi.fn((value: string) => `string:${value}`));

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    formatCodecNumber,
    formatStringValue,
  }),
}));

const storeMock = vi.hoisted(() => ({
  state: {
    wallet: {
      settings: {
        networkFees: {},
      },
    },
    addLiquidity: {
      firstTokenValue: '1',
      secondTokenValue: '2',
      isAvailable: true,
    },
  },
  getters: {
    addLiquidity: {
      firstToken: { symbol: 'A' },
      secondToken: { symbol: 'B' },
      price: '3',
      priceReversed: '4',
    },
  },
}));

const initialNetworkFees = {
  [Operation.AddLiquidity]: '10',
  [Operation.CreatePair]: '20',
};

vi.mock('@/store', () => ({
  default: storeMock,
}));

const settingsStoreMock = {
  get networkFees() {
    return storeMock.state.wallet.settings.networkFees;
  },
};

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

describe('usePoolTokenPair', () => {
  beforeEach(() => {
    formatCodecNumber.mockClear();
    formatStringValue.mockClear();

    storeMock.state.addLiquidity.firstTokenValue = '1';
    storeMock.state.addLiquidity.secondTokenValue = '2';
    storeMock.state.addLiquidity.isAvailable = true;
    storeMock.state.wallet.settings.networkFees = { ...initialNetworkFees };
  });

  it('provides formatted values and detects empty assets', () => {
    const { formattedPrice, formattedPriceReversed, emptyAssets } = usePoolTokenPair();
    expect(formattedPrice.value).toBe('string:3');
    expect(formattedPriceReversed.value).toBe('string:4');
    expect(emptyAssets.value).toBe(false);
  });

  it('falls back to create pair fee when liquidity is unavailable and detects empty assets', () => {
    storeMock.state.addLiquidity.isAvailable = false;
    storeMock.state.addLiquidity.firstTokenValue = '';
    storeMock.state.addLiquidity.secondTokenValue = '';

    const { emptyAssets } = usePoolTokenPair();
    expect(emptyAssets.value).toBe(true);
  });
});
