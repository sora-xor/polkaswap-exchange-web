import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppWallet, LoginStep } from '@/lib/soraneo-wallet/src/consts';

import { mountSetup } from '@stubs/mountSetup';

const walletStore = vi.hoisted(() => ({
  availableWallets: [],
  isMST: false,
  isSignTxDialogDisabled: false,
  isMSTAvailable: false,
  setIsMstAvailable: vi.fn(),
  initMultisigAddress: vi.fn(),
  updateAvailableWallets: vi.fn(async () => undefined),
  setAccountPassphrase: vi.fn(),
}));
const baseProps = {
  chainApi: {
    api: { genesisHash: { toString: () => 'hash' } },
  },
  checkConnectedAccountSource: vi.fn(async () => undefined),
};

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStore,
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useNotification', () => ({
  useNotification: () => ({
    t: (key: string) => key,
    withAppNotification: vi.fn((handler: () => Promise<unknown>) => handler()),
    withAppAlert: vi.fn((handler: () => Promise<unknown>) => handler()),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useLoading', () => ({
  useLoading: () => ({
    loading: ref(false),
    withLoading: vi.fn((handler: () => Promise<unknown>) => handler()),
    withChainApi: vi.fn((_api: unknown, handler: () => Promise<unknown>) => handler()),
  }),
}));

const accountUtils = vi.hoisted(() => ({
  verifyAccountJson: vi.fn(),
  subscribeToWalletAccounts: vi.fn(),
  exportAccount: vi.fn(),
  deleteAccount: vi.fn(),
  createAccount: vi.fn(),
  restoreAccount: vi.fn(),
  checkExternalAccount: vi.fn(async () => undefined),
}));

vi.mock('@/lib/soraneo-wallet/src/util/account', () => accountUtils);

const getWalletMock = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('@/lib/soraneo-wallet/src/services/wallet', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/soraneo-wallet/src/services/wallet')>();

  return {
    ...actual,
    getWallet: getWalletMock,
  };
});

const gdriveAccounts = vi.hoisted(() => ({
  getAccount: vi.fn(async () => ({
    address: 'cn-demo-address',
    meta: { name: 'Drive Account' },
  })),
  add: vi.fn(),
  changeName: vi.fn(),
}));
const prepareGoogleDriveWalletMock = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('@/lib/soraneo-wallet/src/services/google/wallet', () => ({
  GDriveWallet: {
    accounts: gdriveAccounts,
    prepare: prepareGoogleDriveWalletMock,
  },
}));

import ConnectionView, {
  getPreviousLoginStep,
} from '@/lib/soraneo-wallet/src/components/Connection/ConnectionView.vue';

describe('Wallet ConnectionView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    walletStore.availableWallets = [];
    walletStore.isMST = false;
    walletStore.isSignTxDialogDisabled = false;
    walletStore.isMSTAvailable = false;
    getWalletMock.mockResolvedValue(undefined);
    accountUtils.subscribeToWalletAccounts.mockResolvedValue(() => undefined);
    prepareGoogleDriveWalletMock.mockResolvedValue(undefined);
  });

  it('treats missing wallet availability data as an empty list instead of crashing the logged-out view', () => {
    walletStore.availableWallets = undefined as unknown as [];

    const { state } = mountSetup(
      ConnectionView as any,
      {
        ...baseProps,
      },
      { emit: vi.fn() }
    );

    expect(state.wallets.value).toEqual({ internal: [], external: [] });

    walletStore.availableWallets = [];
  });

  it('computes the previous step for create, import, and select flows', () => {
    expect(getPreviousLoginStep()).toBe(LoginStep.ExtensionList);
    expect(getPreviousLoginStep(LoginStep.AccountList)).toBe(LoginStep.ExtensionList);
    expect(getPreviousLoginStep(LoginStep.ConfirmSeedPhrase)).toBe(LoginStep.SeedPhrase);
    expect(getPreviousLoginStep(LoginStep.CreateCredentials)).toBe(LoginStep.ConfirmSeedPhrase);
    expect(getPreviousLoginStep(LoginStep.ImportCredentials)).toBe(LoginStep.Import);
  });

  it('resets the selected wallet when navigating back to extension list', () => {
    const closeView = vi.fn();
    const { state } = mountSetup(
      ConnectionView as any,
      {
        ...baseProps,
        closeView,
      },
      { emit: vi.fn() }
    );

    state.step.value = LoginStep.AccountList;
    state.selectedWallet.value = 'sora';
    state.selectedWalletLoading.value = true;
    state.handleBack();

    expect(state.step.value).toBe(LoginStep.ExtensionList);
    expect(state.selectedWallet.value).toBeNull();
    expect(state.selectedWalletLoading.value).toBe(false);
    expect(closeView).not.toHaveBeenCalled();
  });

  it('closes the view when already at the root step', () => {
    const closeView = vi.fn();
    const { state } = mountSetup(
      ConnectionView as any,
      {
        ...baseProps,
        closeView,
      },
      { emit: vi.fn() }
    );

    state.step.value = LoginStep.ExtensionList;
    state.handleBack();

    expect(closeView).toHaveBeenCalledTimes(1);
  });

  it('closes the view after selecting an external account and completing login', async () => {
    const closeView = vi.fn();
    const loginAccount = vi.fn(async () => undefined);
    const { state } = mountSetup(
      ConnectionView as any,
      {
        ...baseProps,
        closeView,
        loginAccount,
      },
      { emit: vi.fn() }
    );

    await state.handleAccountSelect({ address: 'cn-ext', name: 'External', source: AppWallet.Polkadotjs }, false);

    expect(accountUtils.checkExternalAccount).toHaveBeenCalledWith({
      address: 'cn-ext',
      name: 'External',
      source: AppWallet.Polkadotjs,
    });
    expect(loginAccount).toHaveBeenCalledWith({
      address: 'cn-ext',
      name: 'External',
      source: AppWallet.Polkadotjs,
    });
    expect(walletStore.initMultisigAddress).toHaveBeenCalledTimes(1);
    expect(closeView).toHaveBeenCalledTimes(1);
  });

  it('keeps the selected wallet spinner active until the account subscription is ready', async () => {
    let resolveSubscription!: (unsubscribe: VoidFunction) => void;
    accountUtils.subscribeToWalletAccounts.mockImplementationOnce(
      async () =>
        new Promise<VoidFunction>((resolve) => {
          resolveSubscription = resolve;
        })
    );

    const { state } = mountSetup(
      ConnectionView as any,
      {
        ...baseProps,
      },
      { emit: vi.fn() }
    );

    const selectPromise = state.handleWalletSelect({
      extensionName: AppWallet.PolkadotJS,
      title: 'Polkadot.js',
      installed: true,
      logo: { src: '', alt: '' },
    });

    expect(state.selectedWallet.value).toBe(AppWallet.PolkadotJS);
    expect(state.selectedWalletLoading.value).toBe(true);

    await Promise.resolve();

    resolveSubscription(() => undefined);
    await selectPromise;

    expect(state.selectedWalletLoading.value).toBe(false);
    expect(state.step.value).toBe(LoginStep.AccountList);
  });

  it('prepares Google Drive OAuth silently while the wallet list is opening', async () => {
    prepareGoogleDriveWalletMock.mockResolvedValueOnce(undefined);
    walletStore.availableWallets = [
      {
        extensionName: AppWallet.GoogleDrive,
        title: 'Google',
        installed: true,
        logo: { src: '', alt: '' },
      },
    ] as any;

    const { state } = mountSetup(
      ConnectionView as any,
      {
        ...baseProps,
      },
      { emit: vi.fn() }
    );

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(prepareGoogleDriveWalletMock).toHaveBeenCalledTimes(1);
    expect(state.selectedWallet.value).toBeNull();
    expect(state.selectedWalletLoading.value).toBe(false);
  });

  it('closes the view after confirming an internal account login', async () => {
    const closeView = vi.fn();
    const loginAccount = vi.fn(async () => undefined);
    const { state } = mountSetup(
      ConnectionView as any,
      {
        ...baseProps,
        closeView,
        loginAccount,
      },
      { emit: vi.fn() }
    );

    state.selectedWallet.value = AppWallet.GoogleDrive;
    state.accountLoginData.value = {
      address: 'cn-demo-address',
      name: 'Drive Account',
      source: AppWallet.GoogleDrive,
    };
    state.accountLoginVisibility.value = true;

    await state.handleAccountLogin('Password123!');

    expect(gdriveAccounts.getAccount).toHaveBeenCalledWith('cn-demo-address', 'Password123!');
    expect(accountUtils.restoreAccount).toHaveBeenCalled();
    expect(loginAccount).toHaveBeenCalledWith({
      address: 'cn-demo-address',
      name: 'Drive Account',
      source: AppWallet.GoogleDrive,
    });
    expect(walletStore.initMultisigAddress).toHaveBeenCalledTimes(1);
    expect(state.accountLoginVisibility.value).toBe(false);
    expect(state.accountLoginData.value).toBeNull();
    expect(closeView).toHaveBeenCalledTimes(1);
  });
});
