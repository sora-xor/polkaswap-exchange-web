import { describe, expect, it, vi } from 'vitest';

import { mountSetup } from '@stubs/mountSetup';

const navigate = vi.hoisted(() => vi.fn());

vi.mock('@/platform/wallet/navigation', () => ({
  getWalletCurrentParams: () => ({
    asset: {
      address: 'asset-address',
      symbol: 'XOR',
      name: 'XOR',
      balance: { transferable: '1' },
      decimals: 18,
    },
  }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    permissions: {},
    accountAssets: [],
    history: {},
    selectedTransaction: null,
    navigate,
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useOperations', () => ({
  useOperations: () => ({
    t: (key: string) => key,
    getTitle: vi.fn(() => ''),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    getAssetFiatPrice: vi.fn(),
    formatCodecNumber: vi.fn((value: string) => value),
    isCodecZero: vi.fn(() => false),
    getFiatBalance: vi.fn(),
    FontSizeRate: {},
    FontWeightRate: {},
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useQrCodeParser', () => ({
  useQrCodeParser: () => ({
    parseQrCodeValue: vi.fn(),
    receiveByQrCode: vi.fn(),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    assets: {
      isNft: vi.fn(() => false),
    },
  },
}));

import WalletAssetDetails from '@/lib/soraneo-wallet/src/components/WalletAssetDetails.vue';
import { Operations } from '@/lib/soraneo-wallet/src/types/common';

describe('Wallet WalletAssetDetails', () => {
  it('navigates to send for the send action and emits the rest', () => {
    const emit = vi.fn();
    const { state } = mountSetup(WalletAssetDetails as any, {}, { emit });

    state.handleOperation(Operations.Send);
    state.handleOperation(Operations.Swap);

    expect(navigate).toHaveBeenCalledWith({ name: 'WalletSend', params: { asset: state.asset.value } });
    expect(emit).toHaveBeenCalledWith(Operations.Swap, state.asset.value);
  });
});
