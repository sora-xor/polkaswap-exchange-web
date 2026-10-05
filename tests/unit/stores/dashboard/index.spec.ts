import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const shared = vi.hoisted(() => {
  const walletStore = {
    isLoggedIn: true,
    address: '5wallet',
    account: { address: '5wallet' },
    assetsDataTable: {
      '0x01': { address: '0x01', symbol: 'AAA', decimals: 18 },
    } as Record<string, Record<string, unknown>>,
    fiatPriceObject: {
      '0x01': '12.34',
    } as Record<string, string>,
  };
  const getOwnedAssetIds = vi.fn(async () => ['0x01']);

  return {
    walletStore,
    getOwnedAssetIds,
  };
});

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => shared.walletStore,
}));

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    api: {
      assets: {
        getOwnedAssetIds: shared.getOwnedAssetIds,
      },
    },
  });
});

import { useDashboardStore } from '@/stores/dashboard';

describe('dashboard store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    shared.walletStore.isLoggedIn = true;
    shared.walletStore.address = '5wallet';
    shared.walletStore.account = { address: '5wallet' };
    shared.walletStore.assetsDataTable = {
      '0x01': { address: '0x01', symbol: 'AAA', decimals: 18 },
    };
    shared.walletStore.fiatPriceObject = {
      '0x01': '12.34',
    };
    shared.getOwnedAssetIds.mockReset();
    shared.getOwnedAssetIds.mockResolvedValue(['0x01']);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects an old account response before its lifecycle reset runs', async () => {
    let resolveIds!: (value: string[]) => void;
    shared.getOwnedAssetIds.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveIds = resolve;
        })
    );
    const store = useDashboardStore();
    const request = store.requestOwnedAssetIds();
    shared.walletStore.account = { address: '5other' };
    shared.walletStore.address = '5other';
    await store.requestOwnedAssetIds();
    resolveIds(['old-asset']);
    await request;
    expect(store.ownedAssetIds).toEqual(['0x01']);
  });

  it('does not start polling after the initiating account disconnects', async () => {
    let resolveIds!: (value: string[]) => void;
    shared.getOwnedAssetIds.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveIds = resolve;
        })
    );
    const store = useDashboardStore();
    const request = store.subscribeOnOwnedAssets();
    shared.walletStore.isLoggedIn = false;
    resolveIds(['old-asset']);
    await request;
    expect(store.ownedAssetIds).toEqual([]);
    expect(store.ownedAssetIdsInterval).toBeNull();
  });

  it('derives owned assets from wallet pinia data', () => {
    const store = useDashboardStore();
    store.ownedAssetIds = ['0x01'];

    expect(store.ownedAssets).toEqual([
      {
        address: '0x01',
        symbol: 'AAA',
        decimals: 18,
        fiat: '0.000000000000001234',
      },
    ]);
  });

  it('loads owned asset ids directly from wallet api', async () => {
    const store = useDashboardStore();

    await store.requestOwnedAssetIds();

    expect(shared.getOwnedAssetIds).toHaveBeenCalledWith('5wallet');
    expect(store.ownedAssetIds).toEqual(['0x01']);
  });

  it('resets ids when wallet is unavailable', async () => {
    const store = useDashboardStore();
    store.ownedAssetIds = ['0x01'];
    shared.walletStore.isLoggedIn = false;

    await store.requestOwnedAssetIds();

    expect(shared.getOwnedAssetIds).not.toHaveBeenCalled();
    expect(store.ownedAssetIds).toEqual([]);
  });

  it('starts polling owned assets and clears the interval on reset', async () => {
    vi.useFakeTimers();
    const store = useDashboardStore();
    const requestSpy = vi.spyOn(store, 'requestOwnedAssetIds').mockResolvedValue(undefined);

    await store.subscribeOnOwnedAssets();

    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(store.ownedAssetIdsInterval).not.toBeNull();

    vi.advanceTimersByTime(120000);
    await Promise.resolve();

    expect(requestSpy).toHaveBeenCalledTimes(2);

    await store.reset();

    expect(store.ownedAssetIds).toEqual([]);
    expect(store.ownedAssetIdsInterval).toBeNull();
  });

  it('does not restore assets or polling when reset interrupts subscription startup', async () => {
    vi.useFakeTimers();
    let resolveOwnedAssetIds!: (assetIds: string[]) => void;
    shared.getOwnedAssetIds.mockImplementationOnce(
      () =>
        new Promise<string[]>((resolve) => {
          resolveOwnedAssetIds = resolve;
        })
    );
    const store = useDashboardStore();

    const subscription = store.subscribeOnOwnedAssets();
    await Promise.resolve();
    await store.reset();
    resolveOwnedAssetIds(['0x02']);
    await subscription;

    expect(store.ownedAssetIds).toEqual([]);
    expect(store.ownedAssetIdsInterval).toBeNull();

    vi.advanceTimersByTime(120000);
    await Promise.resolve();
    expect(shared.getOwnedAssetIds).toHaveBeenCalledTimes(1);
  });
});
