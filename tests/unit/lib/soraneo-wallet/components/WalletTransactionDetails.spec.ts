import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    blockNumber: 0,
    assetsDataTable: {},
    account: { address: 'sender' },
    selectedTransaction: {
      errorMessage: {
        section: 'Balances',
        name: 'UnknownError',
      },
      status: 'error',
      type: 'Transfer',
    },
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useNotification', () => ({
  useNotification: () => ({
    t: (key: string) => (key === 'historyErrorMessages.generalError' ? 'General error' : key),
    formatDate: vi.fn(() => ''),
    showAppNotification: vi.fn(),
    dayjsLocale: ref('en'),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useNumberFormatter', () => ({
  useNumberFormatter: () => ({
    getFPNumber: vi.fn(),
    getFPNumberFromCodec: vi.fn(),
    formatCodecNumber: vi.fn(),
    formatStringValue: vi.fn((value: string) => value),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useEthBridgeTransaction', () => ({
  useEthBridgeTransaction: () => ({
    isEthBridgeTxToCompleted: vi.fn(() => false),
    isEthBridgeTxFromFailed: vi.fn(() => false),
    isEthBridgeTxToFailed: vi.fn(() => false),
  }),
}));

import WalletTransactionDetails from '@/lib/soraneo-wallet/src/components/WalletTransactionDetails.vue';

describe('Wallet WalletTransactionDetails', () => {
  it('falls back to the general localized error when a specific translation is missing', () => {
    const state = (WalletTransactionDetails as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    expect(state.errorMessage.value).toBe('General error');
  });
});
