import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WALLET_CONSTS } from '@wallet';
import { reactive } from 'vue';

const walletStoreMock = reactive({
  soraNetwork: null as string | null,
  shouldBalanceBeHidden: false,
});

vi.mock('@/plugins/pinia', () => ({
  __esModule: true,
  default: {},
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStoreMock,
}));

describe('waitForSoraNetworkFromEnv', () => {
  beforeEach(() => {
    vi.resetModules();
    walletStoreMock.soraNetwork = null;
  });

  it('resolves to the network emitted by the wallet facade', async () => {
    const { waitForSoraNetworkFromEnv } = await import('@/utils');

    const waitPromise = waitForSoraNetworkFromEnv();
    walletStoreMock.soraNetwork = 'Prod';

    await expect(waitPromise).resolves.toBe('Prod');
  });

  it('returns the current network immediately when it is already available', async () => {
    walletStoreMock.soraNetwork = WALLET_CONSTS.SoraNetwork.Prod;

    const { waitForSoraNetworkFromEnv } = await import('@/utils');

    await expect(waitForSoraNetworkFromEnv()).resolves.toBe(WALLET_CONSTS.SoraNetwork.Prod);
  });
});
