import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setAppStoreOverride } from '@/utils/app-store';

import type { AssetsState, BridgeRegisteredAsset } from '@/store/assets/types';

type AssetsModule = typeof import('@/store/assets/index').default;

const piniaStub = {};

vi.mock('pinia', () => ({
  getActivePinia: () => piniaStub,
}));

const assetsStoreMock = {
  registeredAssets: {} as Record<string, BridgeRegisteredAsset>,
  registeredAssetsFetching: false,
  setRegisteredAssets: vi.fn((assets: Record<string, BridgeRegisteredAsset> = {}) => {
    assetsStoreMock.registeredAssets = { ...assets };
  }),
  setRegisteredAssetsFetching: vi.fn((value: boolean) => {
    assetsStoreMock.registeredAssetsFetching = value;
  }),
  reset: vi.fn(() => {
    assetsStoreMock.registeredAssets = {};
    assetsStoreMock.registeredAssetsFetching = false;
  }),
  getRegisteredAssets: vi.fn(async () => undefined),
  updateRegisteredAssets: vi.fn(async () => undefined),
};

const localActionContextMock = vi.fn((_context, _moduleName, module: AssetsModule) => ({
  state: module.state,
}));

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => assetsStoreMock,
}));

vi.mock('@/store/context', () => ({
  __esModule: true,
  localActionContext: localActionContextMock,
  localGetterContext: vi.fn(),
}));

vi.mock('@wallet/vuex', () => ({
  vuex: {
    WalletModules: [],
    walletModules: { wallet: {} },
    VuexOperation: {},
    attachDecorator: vi.fn(),
    createDecoratorsObject: vi.fn(),
  },
}));

describe('Vuex assets facade', () => {
  let assetsModule: AssetsModule;
  let moduleState: AssetsState;

  beforeAll(async () => {
    setAppStoreOverride({
      state: {
        settings: {},
        wallet: {},
      },
      getters: {},
      commit: {},
      dispatch: {},
    } as any);
    assetsModule = (await import('@/store/assets/index')).default;
    moduleState = assetsModule.state;
  });

  beforeEach(() => {
    assetsStoreMock.registeredAssets = {};
    assetsStoreMock.registeredAssetsFetching = false;
    assetsStoreMock.setRegisteredAssets.mockClear();
    assetsStoreMock.setRegisteredAssetsFetching.mockClear();
    assetsStoreMock.reset.mockClear();
    assetsStoreMock.getRegisteredAssets.mockClear();
    assetsStoreMock.updateRegisteredAssets.mockClear();
    localActionContextMock.mockClear();
    assetsModule.mutations.reset(moduleState);
  });

  it('delegates setRegisteredAssets mutation to Pinia store and syncs state', () => {
    const payload: Record<string, BridgeRegisteredAsset> = {
      foo: { address: 'foo', decimals: 18, kind: 'evm' },
    };

    assetsModule.mutations.setRegisteredAssets(moduleState, payload);

    expect(assetsStoreMock.setRegisteredAssets).toHaveBeenCalledWith(payload);
    expect(moduleState.registeredAssets).toEqual(payload);
  });

  it('delegates setRegisteredAssetsFetching mutation to Pinia store', () => {
    assetsModule.mutations.setRegisteredAssetsFetching(moduleState, true);

    expect(assetsStoreMock.setRegisteredAssetsFetching).toHaveBeenCalledWith(true);
    expect(moduleState.registeredAssetsFetching).toBe(true);
  });

  it('synchronises state after getRegisteredAssets action', async () => {
    const fetched: Record<string, BridgeRegisteredAsset> = {
      bar: { address: 'bar', decimals: 12, kind: 'sub' },
    };

    assetsStoreMock.getRegisteredAssets.mockImplementationOnce(async () => {
      assetsStoreMock.registeredAssetsFetching = false;
      assetsStoreMock.registeredAssets = fetched;
    });

    await assetsModule.actions.getRegisteredAssets({});

    expect(assetsStoreMock.getRegisteredAssets).toHaveBeenCalledTimes(1);
    expect(moduleState.registeredAssets).toEqual(fetched);
    expect(moduleState.registeredAssetsFetching).toBe(false);
  });

  it('accepts explicit assets in updateRegisteredAssets action', async () => {
    const incoming: Record<string, BridgeRegisteredAsset> = {
      baz: { address: 'baz', decimals: 10, kind: 'eth' },
    };
    const updated: Record<string, BridgeRegisteredAsset> = {
      baz: { address: 'updated-baz', decimals: 10, kind: 'eth' },
    };

    assetsStoreMock.updateRegisteredAssets.mockImplementationOnce(async () => {
      assetsStoreMock.registeredAssetsFetching = false;
      assetsStoreMock.registeredAssets = updated;
    });

    await assetsModule.actions.updateRegisteredAssets({}, incoming);

    expect(assetsStoreMock.setRegisteredAssets).toHaveBeenCalledWith(incoming);
    expect(assetsStoreMock.updateRegisteredAssets).toHaveBeenCalledTimes(1);
    expect(moduleState.registeredAssets).toEqual(updated);
  });
});
