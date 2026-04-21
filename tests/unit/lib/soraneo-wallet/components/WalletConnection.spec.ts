import { describe, expect, it, vi } from 'vitest';

const walletNavigationState = vi.hoisted(() => ({
  current: null as null | string,
  prev: null as null | string,
  prevParams: {} as Record<string, unknown>,
  navigateWallet: vi.fn(),
}));

vi.mock('@/platform/wallet/navigation', () => ({
  getWalletCurrentRoute: () => walletNavigationState.current,
  getWalletPreviousRoute: () => walletNavigationState.prev,
  getWalletPreviousParams: () => walletNavigationState.prevParams,
  navigateWallet: walletNavigationState.navigateWallet,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    account: null,
    loginAccount: vi.fn(),
    logout: vi.fn(),
    renameAccount: vi.fn(),
    checkConnectedAccountSource: vi.fn(),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {},
}));

import WalletConnection from '@/lib/soraneo-wallet/src/components/WalletConnection.vue';
import { PageNames } from '@/consts';
import { RouteNames } from '@/lib/soraneo-wallet/src/consts';

describe('WalletConnection', () => {
  it('restores the previous app route when closing after connect', () => {
    walletNavigationState.current = RouteNames.WalletConnection;
    walletNavigationState.prev = PageNames.Pool;
    walletNavigationState.prevParams = { first: 'XOR', second: 'ETH' };
    walletNavigationState.navigateWallet.mockReset();

    const state = (WalletConnection as any).setup({}, { expose: vi.fn() });

    state.navigateToAccount();

    expect(walletNavigationState.navigateWallet).toHaveBeenCalledWith({
      name: PageNames.Pool,
      params: { first: 'XOR', second: 'ETH' },
    });
  });

  it('falls back to the wallet route when there is no previous app route', () => {
    walletNavigationState.current = RouteNames.WalletConnection;
    walletNavigationState.prev = RouteNames.WalletConnection;
    walletNavigationState.prevParams = {};
    walletNavigationState.navigateWallet.mockReset();

    const state = (WalletConnection as any).setup({}, { expose: vi.fn() });

    state.navigateToAccount();

    expect(walletNavigationState.navigateWallet).toHaveBeenCalledWith({ name: RouteNames.Wallet });
  });

  it('does not override a route already resolved by the login flow', () => {
    walletNavigationState.current = PageNames.Pool;
    walletNavigationState.prev = RouteNames.WalletConnection;
    walletNavigationState.prevParams = {};
    walletNavigationState.navigateWallet.mockReset();

    const state = (WalletConnection as any).setup({}, { expose: vi.fn() });

    state.navigateToAccount();

    expect(walletNavigationState.navigateWallet).not.toHaveBeenCalled();
  });
});
