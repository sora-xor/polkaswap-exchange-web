import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getWalletPiniaStoreMock, useWalletStoreMock, resolveGlobalPiniaMock, sharedPinia } = vi.hoisted(() => ({
  getWalletPiniaStoreMock: vi.fn(() => null),
  useWalletStoreMock: vi.fn(),
  resolveGlobalPiniaMock: vi.fn(),
  sharedPinia: { id: 'shared-pinia' },
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: useWalletStoreMock,
}));

vi.mock('@/plugins/pinia', () => ({
  resolveGlobalPinia: resolveGlobalPiniaMock,
}));

import { beforeTransactionSign, type TransactionSignVisibilityController } from '@/lib/soraneo-wallet/src/util';

type StoreLike = {
  commit: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
};

const createStore = (): StoreLike => ({
  commit: vi.fn(),
  subscribe: vi.fn(),
});

describe('beforeTransactionSign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveGlobalPiniaMock.mockReturnValue(sharedPinia);
    useWalletStoreMock.mockImplementation(() => getWalletPiniaStoreMock());
    getWalletPiniaStoreMock.mockReturnValue(null);
  });

  it('opens and resolves through a mutation visibility target', async () => {
    const unsubscribe = vi.fn();
    const store = createStore();

    store.subscribe.mockImplementation((handler: (mutation: { type: string; payload: boolean }) => void) => {
      queueMicrotask(() => handler({ type: 'bridge/setSignTxDialogVisibility', payload: false }));
      return unsubscribe;
    });

    const signerApi = {
      address: 'alice',
      unlockPair: vi.fn(),
      accountPair: { isLocked: false },
    };

    await beforeTransactionSign(store as any, signerApi as any, 'bridge/setSignTxDialogVisibility');

    expect(store.commit).toHaveBeenCalledWith('bridge/setSignTxDialogVisibility', true);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('supports direct visibility controllers for non-Vuex dialog state', async () => {
    const unsubscribe = vi.fn();
    const store = createStore();
    const controller: TransactionSignVisibilityController = {
      setVisibility: vi.fn(),
      subscribe: vi.fn((handler: (visible: boolean) => void) => {
        queueMicrotask(() => handler(false));
        return unsubscribe;
      }),
    };
    const signerApi = {
      address: 'alice',
      unlockPair: vi.fn(),
      accountPair: { isLocked: false },
    };

    await beforeTransactionSign(store as any, signerApi as any, controller);

    expect(controller.setVisibility).toHaveBeenCalledWith(true);
    expect(controller.subscribe).toHaveBeenCalledTimes(1);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(store.commit).not.toHaveBeenCalled();
  });

  it('unlocks the account when password confirmation is disabled', async () => {
    const store = createStore();
    const controller: TransactionSignVisibilityController = {
      setVisibility: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
    };
    const walletState = {
      getPassword: vi.fn(() => 'secret'),
      isSignTxDialogDisabled: true,
    };
    const signerApi = {
      address: 'alice',
      unlockPair: vi.fn(),
      accountPair: { isLocked: false },
    };

    await beforeTransactionSign(store as any, signerApi as any, controller, walletState);

    expect(walletState.getPassword).toHaveBeenCalledWith('alice');
    expect(signerApi.unlockPair).toHaveBeenCalledWith('secret');
    expect(controller.setVisibility).not.toHaveBeenCalled();
    expect(controller.subscribe).not.toHaveBeenCalled();
  });

  it('prefers the Pinia wallet store for wallet password and dialog state', async () => {
    const store = createStore();
    const controller: TransactionSignVisibilityController = {
      setVisibility: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
    };
    const walletStore = {
      getPassword: vi.fn(() => 'secret'),
      isSignTxDialogDisabled: true,
    };
    const signerApi = {
      address: 'alice',
      unlockPair: vi.fn(),
      accountPair: { isLocked: false },
    };

    getWalletPiniaStoreMock.mockReturnValue(walletStore);

    await beforeTransactionSign(store as any, signerApi as any, controller);

    expect(walletStore.getPassword).toHaveBeenCalledWith('alice');
    expect(signerApi.unlockPair).toHaveBeenCalledWith('secret');
    expect(controller.setVisibility).not.toHaveBeenCalled();
  });
});
