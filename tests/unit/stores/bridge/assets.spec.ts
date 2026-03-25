import { beforeEach, describe, expect, it, vi } from 'vitest';

const piniaStub = vi.hoisted(() => ({
  getActivePinia: vi.fn(),
  setActivePinia: vi.fn(),
  createPinia: vi.fn(() => ({})),
  defineStore: vi.fn(),
}));

vi.mock('pinia', () => piniaStub);

const assetStoreMock: { assetDataByAddress: any; registeredAssets: Record<string, any> } = {
  assetDataByAddress: vi.fn(),
  registeredAssets: {},
};

vi.mock('@/stores/assets', () => ({
  useAssetsStore: vi.fn(() => assetStoreMock),
}));

import { getActivePinia } from 'pinia';
import { resolveAssetLookup, resolveRegisteredAssets } from '@/stores/bridge/assets';
import { useAssetsStore } from '@/stores/assets';

const getActivePiniaMock = vi.mocked(getActivePinia);
const useAssetsStoreMock = vi.mocked(useAssetsStore);

describe('stores/bridge/assets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    assetStoreMock.assetDataByAddress = vi.fn();
    assetStoreMock.registeredAssets = {};
    useAssetsStoreMock.mockReturnValue(assetStoreMock as any);
  });

  it('returns an explicit asset lookup getter when present', () => {
    const legacyGetter = vi.fn();
    const lookup = resolveAssetLookup({ assets: { assetDataByAddress: legacyGetter } });

    expect(lookup).toBe(legacyGetter);
    expect(getActivePiniaMock).not.toHaveBeenCalled();
    expect(useAssetsStoreMock).not.toHaveBeenCalled();
  });

  it('falls back to the Pinia assets store when the lookup getter is missing', () => {
    const fallback = vi.fn();

    getActivePiniaMock.mockReturnValue({} as any);
    assetStoreMock.assetDataByAddress = fallback;

    const lookup = resolveAssetLookup({});

    expect(getActivePiniaMock).toHaveBeenCalledTimes(1);
    expect(useAssetsStoreMock).toHaveBeenCalledTimes(1);
    expect(lookup).toBe(fallback);
    lookup('0xdead');
    expect(fallback).toHaveBeenCalledWith('0xdead');
  });

  it('returns a noop lookup when no lookup sources are available', () => {
    getActivePiniaMock.mockReturnValue(undefined);

    const lookup = resolveAssetLookup({});

    expect(lookup('0x1')).toBeNull();
  });

  it('returns the provided registered assets when present', () => {
    const registry = { '0x1': { address: '0x1', decimals: 18, kind: 'Sidechain' } };
    const result = resolveRegisteredAssets({ registeredAssets: registry } as any);

    expect(result).toBe(registry);
    expect(useAssetsStoreMock).not.toHaveBeenCalled();
  });

  it('falls back to the Pinia assets registry when the provided registry is empty', () => {
    const registry = { '0x2': { address: '0x2', decimals: 12, kind: 'Sidechain' } };
    getActivePiniaMock.mockReturnValue({} as any);
    assetStoreMock.registeredAssets = registry;

    const result = resolveRegisteredAssets({ registeredAssets: {} } as any);

    expect(useAssetsStoreMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual(registry);
  });

  it('returns an empty registry when no sources are available', () => {
    getActivePiniaMock.mockReturnValue(undefined);

    const result = resolveRegisteredAssets(undefined);

    expect(result).toEqual({});
  });
});
