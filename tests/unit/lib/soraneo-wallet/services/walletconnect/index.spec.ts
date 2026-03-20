import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  addWalletLocally: vi.fn(),
  checkWallet: vi.fn(),
  createdProviders: [] as unknown[],
  createdWallets: [] as unknown[],
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: { id: 'main-api' },
}));

vi.mock('@/lib/soraneo-wallet/src/services/wallet', () => ({
  addWalletLocally: mocks.addWalletLocally,
  checkWallet: mocks.checkWallet,
}));

vi.mock('@/lib/soraneo-wallet/src/services/walletconnect/provider/substrate', () => ({
  WcSubProvider: class MockWcSubProvider {
    public readonly options;
    constructor(options: unknown) {
      this.options = options;
      mocks.createdProviders.push(this);
    }
  },
}));

vi.mock('@/lib/soraneo-wallet/src/services/walletconnect/wallet', () => ({
  WcWallet: class MockWcWallet {
    public readonly provider;
    constructor(provider: unknown) {
      this.provider = provider;
      mocks.createdWallets.push(this);
    }
  },
}));

import { AppWallet } from '@/lib/soraneo-wallet/src/consts';
import { addWcSubWalletLocally, WcProvider } from '@/lib/soraneo-wallet/src/services/walletconnect';

describe('walletconnect registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createdProviders.length = 0;
    mocks.createdWallets.length = 0;
    WcProvider.projectId = '';
  });

  it('returns empty source when projectId is missing', () => {
    const source = addWcSubWalletLocally({ api: { genesisHash: { toString: () => '0xabc' } } } as any, vi.fn());

    expect(source).toBe('');
    expect(mocks.addWalletLocally).not.toHaveBeenCalled();
  });

  it('returns empty source when chain genesis hash is not available', () => {
    WcProvider.projectId = 'project-id';

    const source = addWcSubWalletLocally({ api: {} } as any, vi.fn());

    expect(source).toBe('');
    expect(mocks.addWalletLocally).not.toHaveBeenCalled();
  });

  it('registers walletconnect wallet when genesis hash is present', () => {
    WcProvider.projectId = 'project-id';
    mocks.checkWallet.mockImplementation(() => {
      throw new Error('wallet not found');
    });

    const source = addWcSubWalletLocally(
      {
        api: {
          genesisHash: {
            toString: () => '0x1234',
          },
        },
      } as any,
      vi.fn()
    );

    expect(source).toBe(`${AppWallet.WalletConnect}:0x1234`);
    expect(mocks.addWalletLocally).toHaveBeenCalledTimes(1);
    expect(mocks.addWalletLocally).toHaveBeenCalledWith(
      expect.any(Object),
      AppWallet.WalletConnect,
      'Polkaswap',
      `${AppWallet.WalletConnect}:0x1234`
    );
  });
});
