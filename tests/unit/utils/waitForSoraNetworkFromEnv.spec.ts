import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WALLET_CONSTS } from '@wallet';

const legacyStoreMock = vi.fn();

vi.mock('@/utils/legacy-store', () => ({
  requireLegacyStore: () => legacyStoreMock(),
}));

describe('waitForSoraNetworkFromEnv', () => {
  beforeEach(() => {
    vi.resetModules();
    legacyStoreMock.mockReset();
  });

  it('resolves to the network emitted by the watcher', async () => {
    const unsubscribe = vi.fn();
    const watch = vi.fn((getter, callback) => {
      callback('Prod');
      return unsubscribe;
    });
    legacyStoreMock.mockReturnValue({ original: { watch } });

    const { waitForSoraNetworkFromEnv } = await import('@/utils');

    await expect(waitForSoraNetworkFromEnv()).resolves.toBe('Prod');
    expect(watch).toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('falls back to Prod when watcher is unavailable', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    legacyStoreMock.mockReturnValue({});

    const { waitForSoraNetworkFromEnv } = await import('@/utils');

    await expect(waitForSoraNetworkFromEnv()).resolves.toBe(WALLET_CONSTS.SoraNetwork.Prod);
    warnSpy.mockRestore();
  });
});
