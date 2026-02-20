import { describe, expect, it, beforeEach, vi } from 'vitest';

let rootSettingsAccesses = 0;
let walletModuleAccesses = 0;

let walletDefined = true;
let walletLoadedValue: unknown = false;
let rootLoadedValue: unknown = true;
const delayMock = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('@wallet/src/util', () => ({
  delay: delayMock,
}));

vi.mock('@/store', () => {
  const state = new Proxy(
    {},
    {
      get(_target, prop: string | symbol) {
        if (prop === 'wallet') {
          walletModuleAccesses += 1;
          if (!walletDefined) return undefined;
          return {
            settings: {
              isWalletLoaded: walletLoadedValue,
            },
          };
        }

        if (prop === 'settings') {
          rootSettingsAccesses += 1;
          return {
            isWalletLoaded: rootLoadedValue,
          };
        }

        return undefined;
      },
    }
  );

  return {
    __esModule: true,
    default: { state },
  };
});

import { useLoading } from '@/composables/useLoading';

describe('useLoading', () => {
  beforeEach(() => {
    rootSettingsAccesses = 0;
    walletModuleAccesses = 0;
    walletDefined = true;
    walletLoadedValue = false;
    rootLoadedValue = true;
    delayMock.mockClear();
  });

  it('prefers wallet.settings.isWalletLoaded over root settings flag', async () => {
    const { withApi } = useLoading();
    const handler = vi.fn(async () => 'ok');

    await withApi(handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(walletModuleAccesses).toBeGreaterThan(0);
    expect(rootSettingsAccesses).toBe(0);
  });

  it('falls back to root settings flag when wallet module value is missing', async () => {
    walletDefined = false;
    rootLoadedValue = false;

    const { withApi } = useLoading();
    const handler = vi.fn(async () => 'ok');

    await withApi(handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(walletModuleAccesses).toBeGreaterThan(0);
    expect(rootSettingsAccesses).toBeGreaterThan(0);
  });

  it('continues after wallet-load timeout when forced in tests', async () => {
    walletLoadedValue = false;
    rootLoadedValue = false;

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
