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

import {
  beforeTransactionSign,
  confirmTransactionSign,
  getTransactionSignRequest,
  type TransactionSignVisibilityController,
} from '@/lib/soraneo-wallet/src/util';

type StoreLike = {
  commit: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
};

const createStore = (): StoreLike => ({
  commit: vi.fn(),
  subscribe: vi.fn(),
});

/** Local signing API with observable lock transitions and a stable connection identity. */
function createSignerApi() {
  const pair = {
    isLocked: false,
    lock: vi.fn(() => {
      pair.isLocked = true;
    }),
  };
  return {
    address: 'alice',
    signer: undefined,
    connection: { api: { genesisHash: { toString: () => 'genesis-a' } } },
    accountPair: pair,
    unlockPair: vi.fn(() => {
      pair.isLocked = false;
    }),
  };
}

/** Allows tests to separately model confirmation, cancellation and synchronous closure. */
function createController() {
  let notify: (visible: boolean) => void = () => undefined;
  const unsubscribe = vi.fn();
  return {
    setVisibility: vi.fn(),
    subscribe: vi.fn((handler: (visible: boolean) => void) => {
      notify = handler;
      return unsubscribe;
    }),
    close: () => notify(false),
    unsubscribe,
  };
}

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
      queueMicrotask(() => {
        confirmTransactionSign(signerApi as never, 'secret', getTransactionSignRequest(signerApi as never));
        handler({ type: 'bridge/setSignTxDialogVisibility', payload: false });
      });
      return unsubscribe;
    });

    const signerApi = createSignerApi();

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
        queueMicrotask(() => {
          confirmTransactionSign(signerApi as never, 'secret', getTransactionSignRequest(signerApi as never));
          handler(false);
        });
        return unsubscribe;
      }),
    };
    const signerApi = createSignerApi();

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
    const signerApi = createSignerApi();

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
    const signerApi = createSignerApi();

    getWalletPiniaStoreMock.mockReturnValue(walletStore);

    await beforeTransactionSign(store as any, signerApi as any, controller);

    expect(walletStore.getPassword).toHaveBeenCalledWith('alice');
    expect(signerApi.unlockPair).toHaveBeenCalledWith('secret');
    expect(controller.setVisibility).not.toHaveBeenCalled();
  });
});

describe('explicit transaction signing consent', () => {
  const walletState = { getPassword: () => null, isSignTxDialogDisabled: false };
  it.each([true, false])('rejects cancellation when the previous pair lock state was %s', async (locked) => {
    const api = createSignerApi();
    api.accountPair.isLocked = locked;
    const controller = createController();
    const pending = beforeTransactionSign(null, api as never, controller, walletState);
    const rejected = expect(pending).rejects.toThrow('Cancelled');
    controller.close();
    await rejected;
    expect(api.accountPair.isLocked).toBe(true);
    expect(controller.unsubscribe).toHaveBeenCalledOnce();
  });
  it('does not confuse an unrelated unlock with confirmation', async () => {
    const api = createSignerApi();
    const controller = createController();
    const pending = beforeTransactionSign(null, api as never, controller, walletState);
    const rejected = expect(pending).rejects.toThrow('Cancelled');
    api.unlockPair();
    controller.close();
    await rejected;
    expect(api.accountPair.isLocked).toBe(true);
  });
  it.each(['account', 'connection', 'pair', 'missingPair'])(
    'rejects a changed %s after explicit confirmation',
    async (change) => {
      const api = createSignerApi();
      const pair = api.accountPair;
      const controller = createController();
      const pending = beforeTransactionSign(null, api as never, controller, walletState);
      const rejected = expect(pending).rejects.toThrow('Signing context changed');
      confirmTransactionSign(api as never, 'secret', getTransactionSignRequest(api as never));
      if (change === 'account') api.address = 'bob';
      if (change === 'connection') api.connection = { api: { genesisHash: { toString: () => 'genesis-b' } } };
      if (change === 'pair') api.accountPair = createSignerApi().accountPair;
      if (change === 'missingPair') api.accountPair = null as never;
      controller.close();
      await rejected;
      expect(pair.isLocked).toBe(true);
    }
  );
  it('accepts a root dialog confirming a child bridge API with the exact same pair', async () => {
    const child = createSignerApi();
    const root = { ...child };
    const controller = createController();
    const pending = beforeTransactionSign(null, child as never, controller, walletState);
    confirmTransactionSign(root as never, 'secret', getTransactionSignRequest(root as never));
    controller.close();
    await pending;
    expect(child.accountPair.isLocked).toBe(false);
    expect(getTransactionSignRequest(root as never)).toBeUndefined();
  });
  it('rejects overlapping requests and a delayed confirmation from an earlier prompt', async () => {
    const api = createSignerApi();
    const first = createController();
    const old = beforeTransactionSign(null, api as never, first, walletState);
    const oldToken = getTransactionSignRequest(api as never);
    await expect(beforeTransactionSign(null, api as never, createController(), walletState)).rejects.toThrow(
      'already pending'
    );
    const rejected = expect(old).rejects.toThrow('Cancelled');
    first.close();
    await rejected;
    const next = createController();
    const current = beforeTransactionSign(null, api as never, next, walletState);
    expect(() => confirmTransactionSign(api as never, 'secret', oldToken)).toThrow('expired');
    confirmTransactionSign(api as never, 'secret', getTransactionSignRequest(api as never));
    next.close();
    await current;
  });
  it('subscribes before a controller synchronously closes during opening', async () => {
    const api = createSignerApi();
    const controller = createController();
    controller.setVisibility.mockImplementation(() => controller.close());
    await expect(beforeTransactionSign(null, api as never, controller, walletState)).rejects.toThrow('Cancelled');
    expect(controller.unsubscribe).toHaveBeenCalledOnce();
  });
  it('preserves external signer and missing-address bypasses', async () => {
    const api = createSignerApi();
    const controller = createController();
    await beforeTransactionSign(null, { ...api, signer: {} } as never, controller, walletState);
    await beforeTransactionSign(null, { ...api, address: '' } as never, controller, walletState);
    expect(controller.setVisibility).not.toHaveBeenCalled();
  });
});
