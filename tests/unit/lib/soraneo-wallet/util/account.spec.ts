import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const accountUtilMocks = vi.hoisted(() => ({
  saveAsMock: vi.fn(),
  isInternalSourceMock: vi.fn(),
  getWalletMock: vi.fn(),
  checkWalletMock: vi.fn(),
  formatAccountAddressMock: vi.fn((address: string) => address.trim().toLowerCase()),
}));

type ApiLike = {
  address?: string;
  lockPair: ReturnType<typeof vi.fn>;
  unlockPair: ReturnType<typeof vi.fn>;
  formatAddress: ReturnType<typeof vi.fn>;
  forgetAccount: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  setSigner: ReturnType<typeof vi.fn>;
  loginAccount: ReturnType<typeof vi.fn>;
  createAccountPairFromJson: ReturnType<typeof vi.fn>;
  createAccountPair: ReturnType<typeof vi.fn>;
  addAccountPair: ReturnType<typeof vi.fn>;
  getAccountPair: ReturnType<typeof vi.fn>;
  restoreAccountFromJson: ReturnType<typeof vi.fn>;
};

const createApi = (): ApiLike => ({
  address: 'fmt:existing',
  lockPair: vi.fn(),
  unlockPair: vi.fn(),
  formatAddress: vi.fn((address: string, raw?: boolean) => (raw === false ? `raw:${address}` : `fmt:${address}`)),
  forgetAccount: vi.fn(),
  logout: vi.fn(),
  setSigner: vi.fn(),
  loginAccount: vi.fn(),
  createAccountPairFromJson: vi.fn(),
  createAccountPair: vi.fn(),
  addAccountPair: vi.fn(),
  getAccountPair: vi.fn(),
  restoreAccountFromJson: vi.fn(),
});

const loadAccountModule = async () => {
  vi.resetModules();
  vi.doUnmock('@/lib/soraneo-wallet/src/util/account');

  vi.doMock('file-saver', () => ({
    saveAs: accountUtilMocks.saveAsMock,
  }));

  vi.doMock('@/lib/soraneo-wallet/src/services/wallet', () => ({
    isInternalSource: accountUtilMocks.isInternalSourceMock,
    getWallet: accountUtilMocks.getWalletMock,
    checkWallet: accountUtilMocks.checkWalletMock,
    isAppStorageSource: vi.fn(),
  }));

  vi.doMock('@/lib/soraneo-wallet/src/util', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/soraneo-wallet/src/util/index')>();

    return {
      ...actual,
      formatAccountAddress: accountUtilMocks.formatAccountAddressMock,
    };
  });

  return import('@/lib/soraneo-wallet/src/util/account');
};

describe('wallet util/account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accountUtilMocks.isInternalSourceMock.mockImplementation((source: string) => source === 'app');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock('@/lib/soraneo-wallet/src/util/account');
    vi.doUnmock('file-saver');
    vi.doUnmock('@/lib/soraneo-wallet/src/services/wallet');
    vi.doUnmock('@/lib/soraneo-wallet/src/util');
  });

  it('locks and unlocks account pairs through the SDK api', async () => {
    const { lockAccountPair, unlockAccountPair } = await loadAccountModule();
    const api = createApi();

    lockAccountPair(api as any);
    unlockAccountPair(api as any, 'secret');

    expect(api.lockPair).toHaveBeenCalledTimes(1);
    expect(api.unlockPair).toHaveBeenCalledWith('secret');
  });

  it('logs into external accounts by clearing stale sessions and updating the signer', async () => {
    const { loginApi } = await loadAccountModule();
    const api = createApi();
    api.address = 'fmt:stale';
    accountUtilMocks.getWalletMock.mockResolvedValue({ signer: 'external-signer' });

    await loginApi(api as any, { address: 'Alice', name: 'Alice', source: 'extension' } as any, false);

    expect(api.forgetAccount).toHaveBeenCalledTimes(1);
    expect(api.logout).toHaveBeenCalledTimes(1);
    expect(api.setSigner).toHaveBeenCalledWith('external-signer');
    expect(api.loginAccount).toHaveBeenCalledWith('raw:Alice', 'Alice', 'extension', true);
  });

  it('skips signer updates and forgetting when logging into the current internal account', async () => {
    const { loginApi } = await loadAccountModule();
    const api = createApi();
    api.address = 'fmt:raw:Alice';

    await loginApi(api as any, { address: 'Alice', name: 'Alice', source: 'app' } as any, true);

    expect(accountUtilMocks.getWalletMock).not.toHaveBeenCalled();
    expect(api.forgetAccount).not.toHaveBeenCalled();
    expect(api.logout).toHaveBeenCalledTimes(1);
    expect(api.loginAccount).toHaveBeenCalledWith('raw:Alice', 'Alice', 'app', false);
  });

  it('supports explicit logout with and without forgetting the account', async () => {
    const { logoutApi } = await loadAccountModule();
    const api = createApi();

    logoutApi(api as any, false);
    logoutApi(api as any, true);

    expect(api.forgetAccount).toHaveBeenCalledTimes(1);
    expect(api.logout).toHaveBeenCalledTimes(2);
  });

  it('injects the selected wallet signer into the SDK api', async () => {
    const { updateApiSigner } = await loadAccountModule();
    const api = createApi();
    accountUtilMocks.getWalletMock.mockResolvedValue({ signer: 'wallet-signer' });

    await updateApiSigner(api as any, 'extension' as any);

    expect(api.setSigner).toHaveBeenCalledWith('wallet-signer');
  });

  it('validates external accounts against the current extension accounts list', async () => {
    const { checkExternalAccount } = await loadAccountModule();
    accountUtilMocks.checkWalletMock.mockReturnValue({
      getAccounts: vi.fn().mockResolvedValue([{ address: '0xabc' }]),
    });

    await expect(checkExternalAccount({ address: '0xabc', source: 'extension' } as any)).resolves.toBeUndefined();
  });

  it('throws when the external account is missing or the wallet reports no accounts', async () => {
    const { checkExternalAccount } = await loadAccountModule();
    accountUtilMocks.checkWalletMock
      .mockReturnValueOnce({ getAccounts: vi.fn().mockResolvedValue([{ address: '0xdef' }]) })
      .mockReturnValueOnce({ getAccounts: vi.fn().mockResolvedValue(null) });

    await expect(checkExternalAccount({ address: '0xabc', source: 'extension' } as any)).rejects.toThrow(
      'Account not found: 0xabc'
    );
    await expect(checkExternalAccount({ address: '0xabc', source: 'extension' } as any)).rejects.toThrow('No accounts');
  });

  it('subscribes to wallet accounts and normalizes the initial and streamed values', async () => {
    const { subscribeToWalletAccounts } = await loadAccountModule();
    const unsubscribe = vi.fn();
    const callback = vi.fn();

    accountUtilMocks.getWalletMock.mockResolvedValue({
      getAccounts: vi.fn().mockResolvedValue([{ address: '0x1', name: 'Alice', source: 'extension' }]),
      subscribeAccounts: vi.fn((handler: (accounts: unknown[]) => void) => {
        handler([{ address: '0x2', name: 'Bob', source: 'extension' }]);
        return unsubscribe;
      }),
    });

    const result = await subscribeToWalletAccounts({} as any, 'extension' as any, callback);

    expect(callback).toHaveBeenNthCalledWith(1, [{ address: '0x1', name: 'Alice', source: 'extension' }]);
    expect(callback).toHaveBeenNthCalledWith(2, [{ address: '0x2', name: 'Bob', source: 'extension' }]);
    expect(result).toBe(unsubscribe);
  });

  it('parses account JSON files and propagates file reader errors', async () => {
    const { parseAccountJson } = await loadAccountModule();

    const successReader = class {
      public result: string | null = null;
      public onload: null | (() => void) = null;
      public onerror: null | ((error: Error) => void) = null;

      readAsText(): void {
        queueMicrotask(() => {
          this.result = '{"address":"0xabc"}';
          this.onload?.();
        });
      }
    };

    vi.stubGlobal('FileReader', successReader);
    await expect(parseAccountJson(new File(['{}'], 'account.json'))).resolves.toEqual({ address: '0xabc' });

    const failure = new Error('reader failed');
    const errorReader = class {
      public result: string | null = null;
      public onload: null | (() => void) = null;
      public onerror: null | ((error: Error) => void) = null;

      readAsText(): void {
        queueMicrotask(() => this.onerror?.(failure));
      }
    };

    vi.stubGlobal('FileReader', errorReader);
    await expect(parseAccountJson(new File(['{}'], 'account.json'))).rejects.toBe(failure);
  });

  it('exports, verifies, restores, and deletes account json through the SDK api', async () => {
    const { exportAccount, exportAccountJson, restoreAccount, deleteAccount, verifyAccountJson } =
      await loadAccountModule();
    const api = createApi();
    const pairJson = { address: '0xabc', encoded: 'json' };
    const exportedJson = { address: '0xabc', encoded: 'verified' };

    api.createAccountPairFromJson.mockReturnValue({ toJson: vi.fn().mockReturnValue(exportedJson) });
    api.getAccountPair.mockReturnValue({ toJson: vi.fn().mockReturnValue(pairJson) });

    expect(verifyAccountJson(api as any, pairJson as any, 'secret')).toBe(exportedJson);

    exportAccountJson(pairJson as any);
    exportAccount(api as any, { address: '0xabc', password: 'secret' });
    restoreAccount(api as any, { json: pairJson as any, password: 'secret' });
    deleteAccount(api as any, '0xabc');

    expect(accountUtilMocks.saveAsMock).toHaveBeenCalledTimes(2);
    const exportedBlob = accountUtilMocks.saveAsMock.mock.calls[0]?.[0] as Blob;
    expect(exportedBlob.type).toBe('application/json');
    expect(exportedBlob.size).toBe(JSON.stringify(pairJson).length);
    expect(accountUtilMocks.saveAsMock).toHaveBeenNthCalledWith(1, expect.any(Blob), '0xabc');
    expect(accountUtilMocks.saveAsMock).toHaveBeenNthCalledWith(2, expect.any(Blob), '0xabc');
    expect(api.restoreAccountFromJson).toHaveBeenCalledWith(pairJson, 'secret');
    expect(api.forgetAccount).toHaveBeenCalledWith('0xabc');
  });

  it('creates accounts, exporting and saving them when requested', async () => {
    const { createAccount } = await loadAccountModule();
    const api = createApi();
    const pair = { toJson: vi.fn().mockReturnValue({ address: '0xabc', encoded: 'json' }) };
    api.createAccountPair.mockReturnValue(pair);

    const created = createAccount(api as any, {
      seed: 'seed phrase',
      name: 'Alice',
      password: 'secret',
      saveAccount: true,
      exportAccount: true,
    });

    expect(created).toEqual({ address: '0xabc', encoded: 'json' });
    expect(api.createAccountPair).toHaveBeenCalledWith('seed phrase', 'Alice');
    expect(api.addAccountPair).toHaveBeenCalledWith(pair, 'secret');
    expect(accountUtilMocks.saveAsMock).toHaveBeenCalledWith(expect.any(Blob), '0xabc');
  });

  it('throws an AppHandledError when the password confirmation does not match', async () => {
    const { createAccount } = await loadAccountModule();
    const api = createApi();

    try {
      createAccount(api as any, {
        seed: 'seed phrase',
        name: 'Alice',
        password: 'secret',
        passwordConfirm: 'different',
      });
      throw new Error('expected createAccount to throw');
    } catch (error) {
      expect((error as Error).name).toBe('AppHandledError');
      expect(api.createAccountPair).not.toHaveBeenCalled();
    }
  });
});
