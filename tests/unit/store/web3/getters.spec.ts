import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/store/web3', () => ({
  __esModule: true,
  web3GetterContext: vi.fn(),
}));

import getters from '@/store/web3/getters';
import { web3GetterContext } from '@/store/web3';
import { initialState } from '@/store/web3/state';
import { FearlessWalletProvider, MetamaskProvider, WalletConnectProvider } from '@/utils/connection/evm/providers';

const web3GetterContextMock = vi.mocked(web3GetterContext);

describe('store/web3/getters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns predefined providers when wallet module is unavailable', () => {
    web3GetterContextMock.mockReturnValue({
      state: { ...initialState() },
      rootState: {},
      getters: {},
      rootGetters: {},
    } as any);

    const result = getters.appEvmProviders({} as any);

    expect(result.map((provider) => provider.name)).toEqual([
      FearlessWalletProvider.name,
      MetamaskProvider.name,
      WalletConnectProvider.name,
    ]);
  });

  it('forces WalletConnect on desktop environments', () => {
    web3GetterContextMock.mockReturnValue({
      state: { ...initialState(), evmProviders: [] },
      rootState: { wallet: { account: { isDesktop: true } } },
      getters: {},
      rootGetters: {},
    } as any);

    const result = getters.appEvmProviders({} as any);

    expect(result).toEqual([WalletConnectProvider]);
  });
});
