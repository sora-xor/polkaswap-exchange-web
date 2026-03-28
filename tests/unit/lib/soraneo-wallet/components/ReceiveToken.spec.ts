import { describe, expect, it, vi } from 'vitest';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    getPublicKeyByAddress: vi.fn(() => 'abcd'),
  },
}));

vi.mock('@/stores/router', () => ({
  useRouterStore: () => ({
    currentParams: {
      asset: {
        address: 'asset-address',
        symbol: 'XOR',
        decimals: 18,
      },
    },
    prev: 'Wallet',
    prevParams: { assetId: 'asset-address' },
    navigate,
  }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    account: {
      address: 'account-address',
      name: 'Primary',
    },
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useNotification', () => ({
  useNotification: () => ({
    t: (key: string) => key,
    withAppNotification: vi.fn((handler: () => Promise<unknown>) => handler()),
  }),
}));

import ReceiveToken from '@/lib/soraneo-wallet/src/components/ReceiveToken.vue';
import { RouteNames } from '@/lib/soraneo-wallet/src/consts';

describe('Wallet ReceiveToken', () => {
  it('builds the qr payload from the selected asset, account, and amount', () => {
    const state = (ReceiveToken as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    state.amount.value = '12.5';

    expect(state.code.value).toBe('substrate:account-address:0xabcd:Primary:asset-address:12.5');
  });

  it('navigates back to the previous wallet route', () => {
    const state = (ReceiveToken as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    state.handleBack();

    expect(navigate).toHaveBeenCalledWith({
      name: RouteNames.Wallet,
      params: { assetId: 'asset-address' },
    });
  });
});
