import { beforeEach, describe, expect, it, vi } from 'vitest';

const addWalletLocallyMock = vi.hoisted(() => vi.fn());
const authMock = vi.hoisted(() => vi.fn());
const AccountsMock = vi.hoisted(() =>
  vi.fn(function AccountsMock() {
    return { kind: 'accounts' };
  })
);

vi.mock('@/lib/soraneo-wallet/src/services/wallet', () => ({
  addWalletLocally: addWalletLocallyMock,
}));

vi.mock('@/lib/soraneo-wallet/src/services/google/index', () => ({
  GDriveStorage: {
    get hasKey() {
      return (globalThis as any).__gdriveHasKey ?? false;
    },
    auth: authMock,
  },
}));

vi.mock('@/lib/soraneo-wallet/src/services/google/wallet/accounts', () => ({
  default: AccountsMock,
}));

const loadGoogleWalletRuntime = async () => {
  vi.resetModules();
  return await import('@/lib/soraneo-wallet/src/services/google/wallet');
};

describe('GoogleDriveWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__gdriveHasKey = false;
  });

  it('enables the wallet when Drive auth succeeds', async () => {
    authMock.mockResolvedValue(undefined);

    const { GDriveWallet } = await loadGoogleWalletRuntime();

    await expect(GDriveWallet.enable()).resolves.toEqual({
      accounts: { kind: 'accounts' },
      metadata: undefined,
      provider: undefined,
      signer: null,
    });
    expect(authMock).toHaveBeenCalledTimes(1);
    expect(AccountsMock).toHaveBeenCalledTimes(1);
    expect((GDriveWallet as any).access).toBe(true);
    expect((GDriveWallet.constructor as any).version).toBe('0.0.1');
  });

  it('returns an unavailable signer when Drive auth fails', async () => {
    authMock.mockRejectedValue(new Error('denied'));

    const { GDriveWallet } = await loadGoogleWalletRuntime();

    await expect(GDriveWallet.enable()).resolves.toEqual({
      accounts: { kind: 'accounts' },
      metadata: undefined,
      provider: undefined,
      signer: undefined,
    });
    expect((GDriveWallet as any).access).toBe(false);
  });

  it('registers the wallet locally only when Drive keys are configured', async () => {
    (globalThis as any).__gdriveHasKey = true;

    const { GDriveWallet, addGDriveWalletLocally } = await loadGoogleWalletRuntime();

    addGDriveWalletLocally('Polkaswap');

    const { AppWallet } = await import('@/lib/soraneo-wallet/src/consts');

    expect(addWalletLocallyMock).toHaveBeenCalledWith(GDriveWallet, AppWallet.GoogleDrive, 'Polkaswap');
  });

  it('skips local registration when Drive keys are missing', async () => {
    const { addGDriveWalletLocally } = await loadGoogleWalletRuntime();

    addGDriveWalletLocally('Polkaswap');

    expect(addWalletLocallyMock).not.toHaveBeenCalled();
  });
});
