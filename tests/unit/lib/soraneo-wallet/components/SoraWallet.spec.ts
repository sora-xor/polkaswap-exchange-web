import { describe, expect, it, vi } from 'vitest';

const routerStore = vi.hoisted(() => ({
  current: null as null | string,
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useLoading', () => ({
  useLoading: () => ({
    loading: { value: false },
    withApi: vi.fn((handler: () => Promise<unknown>) => handler()),
  }),
}));

vi.mock('@/stores/router', () => ({
  useRouterStore: () => routerStore,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    isWalletLoaded: true,
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/components/AddAsset/AddAsset.vue', () => ({
  default: { name: 'AddAssetStub' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/CreateToken.vue', () => ({
  default: { name: 'CreateTokenStub' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/ReceiveToken.vue', () => ({
  default: { name: 'ReceiveTokenStub' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/SelectAsset.vue', () => ({
  default: { name: 'SelectAssetStub' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/Wallet.vue', () => ({
  default: { name: 'WalletStub' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/WalletAssetDetails.vue', () => ({
  default: { name: 'WalletAssetDetailsStub' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/WalletConnection.vue', () => ({
  default: { name: 'WalletConnectionStub' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/WalletProviders.vue', () => ({
  default: { name: 'WalletProvidersStub' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/WalletSend.vue', () => ({
  default: { name: 'WalletSendStub' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/WalletTransactionDetails.vue', () => ({
  default: { name: 'WalletTransactionDetailsStub' },
}));

import SoraWallet from '@/lib/soraneo-wallet/src/SoraWallet.vue';
import { RouteNames } from '@/lib/soraneo-wallet/src/consts';
import { Operations } from '@/lib/soraneo-wallet/src/types/common';

describe('Wallet SoraWallet', () => {
  it('resolves the current wallet route to a component instead of a raw string tag', () => {
    routerStore.current = RouteNames.WalletConnection;

    const state = (SoraWallet as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    expect(state.currentRoute.value).toMatchObject({ name: 'WalletConnectionStub' });
  });

  it('falls back to the wallet connection component when no wallet route is selected', () => {
    routerStore.current = null;

    const state = (SoraWallet as any).setup({}, { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} });

    expect(state.currentRoute.value).toMatchObject({ name: 'WalletConnectionStub' });
  });

  it('re-emits wallet operations with their asset payload', () => {
    routerStore.current = null;
    const emit = vi.fn();
    const asset = { address: 'asset-1' };
    const state = (SoraWallet as any).setup({}, { attrs: {}, emit, expose: vi.fn(), slots: {} });

    state.handleOperation(Operations.Swap, asset);

    expect(emit).toHaveBeenCalledWith(Operations.Swap, asset);
  });

  it('re-emits close and learn-more events', () => {
    routerStore.current = null;
    const emit = vi.fn();
    const state = (SoraWallet as any).setup({}, { attrs: {}, emit, expose: vi.fn(), slots: {} });

    state.handleClose();
    state.handleLearnMore();

    expect(emit).toHaveBeenNthCalledWith(1, 'close');
    expect(emit).toHaveBeenNthCalledWith(2, 'learn-more');
  });
});
