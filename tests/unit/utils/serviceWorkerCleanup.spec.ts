import { afterEach, describe, expect, it, vi } from 'vitest';

import { retireLegacyServiceWorkers } from '@/utils/serviceWorkerCleanup';

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
const originalCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches');
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

function restoreGlobalProperty(name: 'navigator' | 'caches' | 'window', descriptor: PropertyDescriptor | undefined) {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
  } else {
    delete (globalThis as Record<string, unknown>)[name];
  }
}

describe('utils/serviceWorkerCleanup', () => {
  afterEach(() => {
    restoreGlobalProperty('navigator', originalNavigator);
    restoreGlobalProperty('caches', originalCaches);
    restoreGlobalProperty('window', originalWindow);
    vi.restoreAllMocks();
  });

  it('returns an empty result when service workers are unavailable', async () => {
    delete (globalThis as Record<string, unknown>).navigator;

    await expect(retireLegacyServiceWorkers()).resolves.toEqual({
      cacheNames: [],
      reloaded: false,
      registrationsFound: 0,
      registrationsRetired: 0,
    });
  });

  it('unregisters legacy service workers and clears origin caches', async () => {
    const unregisterFirst = vi.fn().mockResolvedValue(true);
    const unregisterSecond = vi.fn().mockResolvedValue(false);
    const getRegistrations = vi.fn().mockResolvedValue([
      { unregister: unregisterFirst },
      { unregister: unregisterSecond },
    ]);
    const cacheKeys = vi.fn().mockResolvedValue(['ipfs-blocks', 'ipfs-metadata']);
    const deleteCache = vi.fn().mockResolvedValue(true);

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        serviceWorker: {
          controller: null,
          getRegistrations,
        },
      },
    });
    Object.defineProperty(globalThis, 'caches', {
      configurable: true,
      value: {
        keys: cacheKeys,
        delete: deleteCache,
      },
    });

    await expect(retireLegacyServiceWorkers()).resolves.toEqual({
      cacheNames: ['ipfs-blocks', 'ipfs-metadata'],
      reloaded: false,
      registrationsFound: 2,
      registrationsRetired: 1,
    });
    expect(unregisterFirst).toHaveBeenCalledTimes(1);
    expect(unregisterSecond).toHaveBeenCalledTimes(1);
    expect(deleteCache).toHaveBeenCalledWith('ipfs-blocks');
    expect(deleteCache).toHaveBeenCalledWith('ipfs-metadata');
  });

  it('reloads a controlled page once after retiring registrations', async () => {
    const reload = vi.fn();
    const sessionStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
    };

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        serviceWorker: {
          controller: {},
          getRegistrations: vi.fn().mockResolvedValue([{ unregister: vi.fn().mockResolvedValue(true) }]),
        },
      },
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: { reload },
        sessionStorage,
      },
    });

    const result = await retireLegacyServiceWorkers({ reloadControlledPage: true });

    expect(result.reloaded).toBe(true);
    expect(sessionStorage.setItem).toHaveBeenCalledWith('polkaswap:legacy-service-worker-retired', '1');
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
