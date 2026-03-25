import { describe, expect, it, beforeEach, vi } from 'vitest';

const settingsStoreMock = {
  isWalletLoaded: false,
};

const delayMock = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('@/lib/soraneo-wallet/src/util', () => ({
  delay: delayMock,
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/plugins/pinia', () => ({
  __esModule: true,
  default: {},
}));

import { useLoading } from '@/composables/useLoading';

describe('useLoading', () => {
  beforeEach(() => {
    settingsStoreMock.isWalletLoaded = false;
    delayMock.mockClear();
  });

  it('uses the settings store wallet-loaded flag before running api handlers', async () => {
    settingsStoreMock.isWalletLoaded = true;
    const { withApi } = useLoading();
    const handler = vi.fn(async () => 'ok');

    await withApi(handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(delayMock).not.toHaveBeenCalled();
  });

  it('continues after wallet-load timeout when forced in tests', async () => {
    settingsStoreMock.isWalletLoaded = false;

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { withApi } = useLoading({
      forceWalletReadinessWaitInTests: true,
      walletLoadTimeoutMs: 0,
      walletLoadPollMs: 0,
    });
    const handler = vi.fn(async () => 'ok');

    await withApi(handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[useLoading] wallet readiness wait timed out'));

    warnSpy.mockRestore();
  });

  it('retries withChainApi when api getter throws before connection is attached', async () => {
    let calls = 0;
    const chainApi = {
      get api() {
        calls += 1;
        if (calls === 1) {
          throw new TypeError("Cannot read properties of undefined (reading 'api')");
        }

        return {
          isReady: Promise.resolve(),
        };
      },
    } as any;

    const { withChainApi } = useLoading();
    const handler = vi.fn(async () => 'ok');

    await withChainApi(chainApi, handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(delayMock).toHaveBeenCalledTimes(1);
    expect(calls).toBeGreaterThanOrEqual(2);
  });
});
