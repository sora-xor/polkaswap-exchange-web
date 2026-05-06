import { describe, expect, it, beforeEach, vi } from 'vitest';
import { reactive, ref } from 'vue';

const settingsStoreMock = reactive({
  isWalletLoaded: false,
});

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
    delayMock.mockReset();
    delayMock.mockImplementation(async () => undefined);
    delete process.env.VITE_WALLET_LOAD_POLL_MS;
  });

  it('uses the settings store wallet-loaded flag before running api handlers', async () => {
    settingsStoreMock.isWalletLoaded = true;
    const { withApi } = useLoading();
    const handler = vi.fn(async () => 'ok');

    await withApi(handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(delayMock).not.toHaveBeenCalled();
  });

  it('bypasses wallet readiness waits in tests by default', async () => {
    const { withApi } = useLoading();
    const handler = vi.fn(async () => 'ok');

    await expect(withApi(handler)).resolves.toBe('ok');

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
    await withApi(handler);

    expect(handler).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[useLoading] wallet readiness wait timed out'));

    warnSpy.mockRestore();
  });

  it('polls wallet readiness and clears the timeout warning after the wallet loads', async () => {
    settingsStoreMock.isWalletLoaded = false;
    process.env.VITE_WALLET_LOAD_POLL_MS = 'invalid';
    delayMock.mockImplementationOnce(async () => {
      settingsStoreMock.isWalletLoaded = true;
    });

    const { withApi } = useLoading({
      forceWalletReadinessWaitInTests: true,
      walletLoadTimeoutMs: 10_000,
    });
    const handler = vi.fn(() => 'ready');

    await expect(withApi(handler)).resolves.toBe('ready');

    expect(delayMock).toHaveBeenCalledWith(100);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('logs and rethrows handler errors while resetting the loading flag', async () => {
    const { loading, withLoading } = useLoading();
    const error = new Error('handler failed');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(withLoading(() => Promise.reject(error))).rejects.toBe(error);

    expect(errorSpy).toHaveBeenCalledWith(error);
    expect(loading.value).toBe(false);

    errorSpy.mockRestore();
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

  it('waits for parent loading refs before running a handler', async () => {
    const parentLoading = ref(true);
    delayMock.mockImplementationOnce(async () => {
      parentLoading.value = false;
    });
    const { withParentLoading } = useLoading({ parentLoading });
    const handler = vi.fn(() => 'done');

    await expect(withParentLoading(handler)).resolves.toBe('done');

    expect(delayMock).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('runs parent-loading handlers immediately when no parent loading source is configured', async () => {
    const { withParentLoading } = useLoading();
    const handler = vi.fn(() => 'done');

    await expect(withParentLoading(handler)).resolves.toBe('done');

    expect(delayMock).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('waits for parent loading getters before running a handler', async () => {
    let parentLoading = true;
    delayMock.mockImplementationOnce(async () => {
      parentLoading = false;
    });
    const { withParentLoading } = useLoading({ parentLoading: () => parentLoading });
    const handler = vi.fn(() => 'done');

    await expect(withParentLoading(handler)).resolves.toBe('done');

    expect(delayMock).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
