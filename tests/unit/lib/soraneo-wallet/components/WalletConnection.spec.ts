import { describe, expect, it, vi } from 'vitest';

const routerStore = vi.hoisted(() => ({
  current: null as null | string,
  prev: null as null | string,
  prevParams: {} as Record<string, unknown>,
  navigate: vi.fn(),
}));

vi.mock('@/stores/router', () => ({
  useRouterStore: () => routerStore,
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
    routerStore.current = RouteNames.WalletConnection;
    routerStore.prev = PageNames.Pool;
    routerStore.prevParams = { first: 'XOR', second: 'ETH' };
    routerStore.navigate.mockReset();

    const state = (WalletConnection as any).setup({}, { expose: vi.fn() });

    state.navigateToAccount();

    expect(routerStore.navigate).toHaveBeenCalledWith({
      name: PageNames.Pool,
      params: { first: 'XOR', second: 'ETH' },
    });
  });

  it('falls back to the wallet route when there is no previous app route', () => {
    routerStore.current = RouteNames.WalletConnection;
    routerStore.prev = RouteNames.WalletConnection;
    routerStore.prevParams = {};
    routerStore.navigate.mockReset();

    const state = (WalletConnection as any).setup({}, { expose: vi.fn() });

    state.navigateToAccount();

    expect(routerStore.navigate).toHaveBeenCalledWith({ name: RouteNames.Wallet });
  });

  it('does not override a route already resolved by the login flow', () => {
    routerStore.current = PageNames.Pool;
    routerStore.prev = RouteNames.WalletConnection;
    routerStore.prevParams = {};
    routerStore.navigate.mockReset();

    const state = (WalletConnection as any).setup({}, { expose: vi.fn() });

    state.navigateToAccount();

    expect(routerStore.navigate).not.toHaveBeenCalled();
  });
});
