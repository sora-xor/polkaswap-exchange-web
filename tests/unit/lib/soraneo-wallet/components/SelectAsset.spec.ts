import { describe, expect, it, vi } from 'vitest';

const navigateWallet = vi.hoisted(() => vi.fn());

vi.mock('@/platform/wallet/navigation', () => ({
  getWalletCurrentParams: () => ({ address: 'cnRecipient' }),
  navigateWallet,
}));

vi.mock('@/composables/useAssets', () => ({
  useAssets: () => ({
    sortedAccountAssets: {
      value: [{ address: 'xor', symbol: 'XOR', decimals: 18 }],
    },
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import SelectAsset from '@/lib/soraneo-wallet/src/components/SelectAsset.vue';
import { RouteNames } from '@/consts';

describe('Wallet SelectAsset', () => {
  it('routes selected assets through the wallet navigation boundary', () => {
    const state = (SelectAsset as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    state.selectAsset({ address: 'xor', symbol: 'XOR', decimals: 18 });

    expect(navigateWallet).toHaveBeenCalledWith({
      name: RouteNames.WalletSend,
      params: {
        asset: { address: 'xor', symbol: 'XOR', decimals: 18 },
        address: 'cnRecipient',
      },
    });
  });
});
