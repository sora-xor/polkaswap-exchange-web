import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  universalProviderInit: vi.fn(),
  ensureWalletConnectModal: vi.fn(),
}));

vi.mock('@walletconnect/universal-provider', () => ({
  default: {
    init: mocks.universalProviderInit,
  },
}));

vi.mock('@/lib/soraneo-wallet/src/services/walletconnect/appkit', () => ({
  ensureWalletConnectModal: mocks.ensureWalletConnectModal,
}));

import {
  WC_MODAL_OPEN_TIMEOUT_MS,
  WC_SIGN_CONNECT_TIMEOUT_MS,
  WcProvider,
} from '@/lib/soraneo-wallet/src/services/walletconnect/provider/base';

type ModalState = { open: boolean };

class TestWcProvider extends WcProvider {
  protected namespace = 'polkadot' as const;

  protected override getConnectParams() {
    return {};
  }

  protected override formatChainId(chainId: string | number): string {
    return `polkadot:${chainId}`;
  }
}

const createClientStubs = () => {
  const connect = vi.fn();
  const on = vi.fn();
  const disconnect = vi.fn();
  const request = vi.fn();
  const pairingActivate = vi.fn();

  const client = {
    connect,
    on,
    disconnect,
    request,
    core: {
      pairing: {
        activate: pairingActivate,
      },
    },
    session: {
      values: [] as unknown[],
    },
  };

  const provider = {
    client,
    cleanupPendingPairings: vi.fn(),
    abortPairingAttempt: vi.fn(),
    logger: {
      error: vi.fn(),
    },
    on: vi.fn(),
    once: vi.fn(),
    removeListener: vi.fn(),
    off: vi.fn(),
  };

  return { provider, client };
};

const createModalStubs = () => {
  const listeners: Array<(state: ModalState) => void> = [];

  return {
    listeners,
    modal: {
      openModal: vi.fn(),
      closeModal: vi.fn(async () => undefined),
      subscribeModal: vi.fn((callback: (state: ModalState) => void) => {
        listeners.push(callback);
        return () => {
          const index = listeners.indexOf(callback);
          if (index >= 0) listeners.splice(index, 1);
        };
      }),
    },
  };
};

describe('walletconnect provider modal guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    WcProvider.projectId = 'test-project';
  });

  it('connects when the modal opens and approval resolves', async () => {
    const { provider, client } = createClientStubs();
    const { listeners, modal } = createModalStubs();
    const session = { topic: 'topic-1', namespaces: {} } as unknown;

    mocks.universalProviderInit.mockResolvedValue(provider);
    mocks.ensureWalletConnectModal.mockResolvedValue(modal);

    client.connect.mockResolvedValue({
      uri: 'wc:test',
      approval: vi.fn(async () => session),
    });

    modal.openModal.mockImplementation(async () => {
      listeners.forEach((callback) => callback({ open: true }));
    });

    const wc = new TestWcProvider({ chains: ['0x01'] });

    await expect(wc.connect()).resolves.toBeUndefined();
    expect(modal.openModal).toHaveBeenCalledWith({ uri: 'wc:test' });
    expect(modal.closeModal).toHaveBeenCalledTimes(1);
    expect((wc as unknown as { session?: unknown }).session).toBe(session);
  });

  it('fails fast when the modal does not open', async () => {
    vi.useFakeTimers();

    const { provider, client } = createClientStubs();
    const { modal } = createModalStubs();

    mocks.universalProviderInit.mockResolvedValue(provider);
    mocks.ensureWalletConnectModal.mockResolvedValue(modal);

    client.connect.mockResolvedValue({
      uri: 'wc:test',
      approval: vi.fn(() => new Promise(() => undefined)),
    });

    modal.openModal.mockResolvedValue(undefined);

    const wc = new TestWcProvider({ chains: ['0x01'] });
    const connectPromise = wc.connect();
    const rejectedConnect = expect(connectPromise).rejects.toThrow(/modal failed to open/i);

    await vi.advanceTimersByTimeAsync(WC_MODAL_OPEN_TIMEOUT_MS + 1);

    await rejectedConnect;
    expect(provider.abortPairingAttempt).toHaveBeenCalledTimes(1);
    expect(modal.closeModal).toHaveBeenCalledTimes(1);
  });

  it('fails fast when signer connect never resolves', async () => {
    vi.useFakeTimers();

    const { provider, client } = createClientStubs();
    const { modal } = createModalStubs();

    mocks.universalProviderInit.mockResolvedValue(provider);
    mocks.ensureWalletConnectModal.mockResolvedValue(modal);

    client.connect.mockImplementation(() => new Promise(() => undefined));

    const wc = new TestWcProvider({ chains: ['0x01'] });
    const connectPromise = wc.connect();
    const rejectedConnect = expect(connectPromise).rejects.toThrow(/request timed out/i);

    await vi.advanceTimersByTimeAsync(WC_SIGN_CONNECT_TIMEOUT_MS + 1);

    await rejectedConnect;
    expect(provider.abortPairingAttempt).toHaveBeenCalledTimes(1);
    expect(modal.closeModal).toHaveBeenCalledTimes(1);
  });
});
