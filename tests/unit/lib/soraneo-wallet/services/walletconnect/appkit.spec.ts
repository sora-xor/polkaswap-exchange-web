import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const state = {
    ctorConfigs: [] as unknown[],
    openModal: vi.fn(async () => undefined),
    closeModal: vi.fn(),
    subscribeModal: vi.fn(() => () => undefined),
  };

  class WalletConnectModalMock {
    public openModal = state.openModal;
    public closeModal = state.closeModal;
    public subscribeModal = state.subscribeModal;

    constructor(config: unknown) {
      state.ctorConfigs.push(config);
    }
  }

  return {
    state,
    WalletConnectModalMock,
  };
});

vi.mock('@walletconnect/modal', () => ({
  WalletConnectModal: mocks.WalletConnectModalMock,
}));

import {
  ensureWalletConnectModal,
  resetWalletConnectModalCache,
} from '@/lib/soraneo-wallet/src/services/walletconnect/appkit';

describe('walletconnect modal bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.ctorConfigs.length = 0;
    resetWalletConnectModalCache();
  });

  it('creates a legacy walletconnect modal with normalized chains', async () => {
    const modal = await ensureWalletConnectModal({
      projectId: 'project-a',
      namespace: 'polkadot',
      chains: ['0xabc', 1],
      optionalChains: ['0xabc'],
    });

    expect(mocks.state.ctorConfigs).toHaveLength(1);
    expect(mocks.state.ctorConfigs[0]).toEqual(
      expect.objectContaining({
        projectId: 'project-a',
        chains: ['polkadot:0xabc', 'polkadot:1'],
        enableAuthMode: false,
      })
    );

    await modal.openModal({ uri: 'wc:test-uri' });
    await modal.closeModal();
    modal.subscribeModal(() => undefined);

    expect(mocks.state.openModal).toHaveBeenCalledWith({ uri: 'wc:test-uri' });
    expect(mocks.state.closeModal).toHaveBeenCalledTimes(1);
    expect(mocks.state.subscribeModal).toHaveBeenCalledTimes(1);
  });

  it('reuses modal cache for identical config and rebuilds when key changes', async () => {
    const config = {
      projectId: 'project-a',
      namespace: 'polkadot' as const,
      chains: ['0xabc'],
      optionalChains: ['0xdef'],
    };

    await ensureWalletConnectModal(config);
    await ensureWalletConnectModal(config);

    expect(mocks.state.ctorConfigs).toHaveLength(1);

    await ensureWalletConnectModal({ ...config, projectId: 'project-b' });

    expect(mocks.state.ctorConfigs).toHaveLength(2);
  });
});
