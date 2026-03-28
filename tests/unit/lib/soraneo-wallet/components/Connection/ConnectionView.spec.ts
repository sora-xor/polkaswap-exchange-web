import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

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

import ConnectionView, {
  getPreviousLoginStep,
} from '@/lib/soraneo-wallet/src/components/Connection/ConnectionView.vue';
import { LoginStep } from '@/lib/soraneo-wallet/src/consts';

describe('Wallet ConnectionView', () => {
  it('treats missing wallet availability data as an empty list instead of crashing the logged-out view', () => {
    walletStore.availableWallets = undefined as unknown as [];

    const state = (ConnectionView as any).setup(
      {
        chainApi: {
          api: { genesisHash: { toString: () => 'hash' } },
        },
      },
      { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} }
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
    const state = (ConnectionView as any).setup(
      {
        chainApi: {
          api: { genesisHash: { toString: () => 'hash' } },
        },
        closeView,
      },
      { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} }
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
    const state = (ConnectionView as any).setup(
      {
        chainApi: {
          api: { genesisHash: { toString: () => 'hash' } },
        },
        closeView,
      },
      { attrs: {}, emit: vi.fn(), expose: vi.fn(), slots: {} }
    );

    state.step.value = LoginStep.ExtensionList;
    state.handleBack();

    expect(closeView).toHaveBeenCalledTimes(1);
  });
});
