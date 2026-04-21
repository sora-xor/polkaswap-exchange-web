import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountActionTypes, AppWallet } from '@/lib/soraneo-wallet/src/consts';

const accountActionsMocks = vi.hoisted(() => {
  const apiMock = { name: 'sdk-api' };

  return {
    apiMock,
    renameAccountMock: vi.fn(),
    logoutMock: vi.fn(async () => undefined),
    isConnectedAccountMock: vi.fn(),
    withLoadingMock: vi.fn(async (fn: () => unknown) => await fn()),
    withAppNotificationMock: vi.fn(async (fn: () => unknown) => await fn()),
    changeNameMock: vi.fn(),
    getAccountMock: vi.fn(),
    deleteGDriveAccountMock: vi.fn(),
    verifyAccountJsonMock: vi.fn(),
    exportAccountJsonMock: vi.fn(),
    exportAccountMock: vi.fn(),
    deleteAccountMock: vi.fn(),
    settingsGetMock: vi.fn(),
    settingsSetMock: vi.fn(),
    delayMock: vi.fn(async () => undefined),
  };
});

const loadAccountActions = async () => {
  vi.resetModules();

  vi.doMock('@/stores/wallet', () => ({
    useWalletStore: () => ({
      renameAccount: accountActionsMocks.renameAccountMock,
      logout: accountActionsMocks.logoutMock,
      isConnectedAccount: accountActionsMocks.isConnectedAccountMock,
    }),
  }));

  vi.doMock('@/lib/soraneo-wallet/src/api', () => ({
    api: accountActionsMocks.apiMock,
  }));

  vi.doMock('@/lib/soraneo-wallet/src/services/google/wallet', () => ({
    GDriveWallet: {
      accounts: {
        changeName: accountActionsMocks.changeNameMock,
        getAccount: accountActionsMocks.getAccountMock,
        delete: accountActionsMocks.deleteGDriveAccountMock,
      },
    },
  }));

  vi.doMock('@/lib/soraneo-wallet/src/util', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/soraneo-wallet/src/util')>();

    return {
      ...actual,
      delay: accountActionsMocks.delayMock,
    };
  });

  vi.doMock('@/lib/soraneo-wallet/src/util/account', () => ({
    verifyAccountJson: accountActionsMocks.verifyAccountJsonMock,
    exportAccountJson: accountActionsMocks.exportAccountJsonMock,
    exportAccount: accountActionsMocks.exportAccountMock,
    deleteAccount: accountActionsMocks.deleteAccountMock,
  }));

  vi.doMock('@/lib/soraneo-wallet/src/util/storage', () => ({
    settingsStorage: {
      get: accountActionsMocks.settingsGetMock,
      set: accountActionsMocks.settingsSetMock,
    },
  }));

  vi.doMock('@/lib/soraneo-wallet/src/composables/useLoading', () => ({
    useLoading: () => ({
      loading: { value: false },
      withLoading: accountActionsMocks.withLoadingMock,
    }),
  }));

  vi.doMock('@/lib/soraneo-wallet/src/composables/useNotification', () => ({
    useNotification: () => ({
      withAppNotification: accountActionsMocks.withAppNotificationMock,
    }),
  }));

  return import('@/lib/soraneo-wallet/src/composables/useAccountActions');
};

describe('useAccountActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accountActionsMocks.settingsGetMock.mockReturnValue('true');
    accountActionsMocks.isConnectedAccountMock.mockReturnValue(false);
    accountActionsMocks.verifyAccountJsonMock.mockImplementation((_, json) => json);
  });

  it('opens account dialogs and delegates logout directly from account actions', async () => {
    const { useAccountActions } = await loadAccountActions();
    const actions = useAccountActions();
    const account = { address: '0x1', name: 'Alice', source: AppWallet.Sora } as any;

    actions.handleAccountAction(AccountActionTypes.Rename, account);
    expect(actions.selectedAccount.value).toEqual(account);
    expect(actions.accountRenameVisibility.value).toBe(true);

    actions.handleAccountAction(AccountActionTypes.Export, account);
    expect(actions.accountExportVisibility.value).toBe(true);

    actions.handleAccountAction(AccountActionTypes.Logout, account);
    expect(accountActionsMocks.logoutMock).toHaveBeenCalledTimes(1);

    actions.handleAccountAction(AccountActionTypes.Delete, account);
    expect(actions.accountDeleteVisibility.value).toBe(true);
  });

  it('deletes local accounts immediately when the delete popup is disabled', async () => {
    const { useAccountActions } = await loadAccountActions();
    const actions = useAccountActions();
    const account = { address: '0x2', source: AppWallet.PolkadotJS } as any;

    accountActionsMocks.settingsGetMock.mockReturnValue('false');

    actions.handleAccountAction(AccountActionTypes.Delete, account);
    await Promise.resolve();
    await Promise.resolve();

    expect(accountActionsMocks.deleteAccountMock).toHaveBeenCalledWith(accountActionsMocks.apiMock, '0x2');
    expect(actions.accountDeleteVisibility.value).toBe(false);
  });

  it('renames Google Drive accounts and updates the connected wallet label', async () => {
    const { useAccountActions } = await loadAccountActions();
    const actions = useAccountActions();
    const account = { address: '0x3', name: 'Alice', source: AppWallet.GoogleDrive } as any;

    accountActionsMocks.isConnectedAccountMock.mockReturnValue(true);
    actions.handleAccountAction(AccountActionTypes.Rename, account);

    await actions.handleAccountRename('Bob');

    expect(accountActionsMocks.changeNameMock).toHaveBeenCalledWith('0x3', 'Bob');
    expect(accountActionsMocks.renameAccountMock).toHaveBeenCalledWith({ address: '0x3', name: 'Bob' });
    expect(actions.accountRenameVisibility.value).toBe(false);
  });

  it('exports Google Drive accounts by verifying and downloading the restored json', async () => {
    const { useAccountActions } = await loadAccountActions();
    const actions = useAccountActions();
    const account = { address: '0x4', source: AppWallet.GoogleDrive } as any;
    const accountJson = { address: '0x4', encoded: 'raw' };
    const verifiedJson = { address: '0x4', encoded: 'verified' };

    accountActionsMocks.getAccountMock.mockResolvedValue(accountJson);
    accountActionsMocks.verifyAccountJsonMock.mockReturnValue(verifiedJson);
    actions.handleAccountAction(AccountActionTypes.Export, account);

    await actions.handleAccountExport('secret');

    expect(accountActionsMocks.delayMock).toHaveBeenCalledWith(250);
    expect(accountActionsMocks.verifyAccountJsonMock).toHaveBeenCalledWith(
      accountActionsMocks.apiMock,
      accountJson,
      'secret'
    );
    expect(accountActionsMocks.exportAccountJsonMock).toHaveBeenCalledWith(verifiedJson);
    expect(actions.accountExportVisibility.value).toBe(false);
  });

  it('persists delete-popup preferences and removes connected Google Drive accounts', async () => {
    const { useAccountActions } = await loadAccountActions();
    const actions = useAccountActions();
    const account = { address: '0x5', source: AppWallet.GoogleDrive } as any;

    accountActionsMocks.isConnectedAccountMock.mockReturnValue(true);
    actions.handleAccountAction(AccountActionTypes.Delete, account);

    await actions.handleAccountDelete(false);

    expect(accountActionsMocks.settingsSetMock).toHaveBeenCalledWith('allowAccountDeletePopup', false);
    expect(accountActionsMocks.logoutMock).toHaveBeenCalledTimes(1);
    expect(accountActionsMocks.deleteGDriveAccountMock).toHaveBeenCalledWith('0x5');
    expect(actions.accountDeleteVisibility.value).toBe(false);
  });

  it('exports non-Google accounts through the sdk export helper', async () => {
    const { useAccountActions } = await loadAccountActions();
    const actions = useAccountActions();
    const account = { address: '0x6', source: AppWallet.PolkadotJS } as any;

    actions.handleAccountAction(AccountActionTypes.Export, account);
    await actions.handleAccountExport('password');

    expect(accountActionsMocks.exportAccountMock).toHaveBeenCalledWith(accountActionsMocks.apiMock, {
      address: '0x6',
      password: 'password',
    });
    expect(actions.accountExportVisibility.value).toBe(false);
  });
});
