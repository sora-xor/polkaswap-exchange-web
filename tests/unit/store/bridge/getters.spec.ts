import { beforeEach, describe, expect, it, vi } from 'vitest';

const piniaStub = vi.hoisted(() => ({
  getActivePinia: vi.fn(),
  setActivePinia: vi.fn(),
  createPinia: vi.fn(() => ({})),
  defineStore: vi.fn(),
}));

vi.mock('pinia', () => piniaStub);

vi.mock('@/store', () => import('@stubs/store'));

vi.mock('@/store/bridge', () => ({
  __esModule: true,
  default: {},
  bridgeGetterContext: vi.fn(),
}));

vi.mock('@/stores/assets', () => ({
  useAssetsStore: vi.fn(),
}));

import { getActivePinia } from 'pinia';
import getters from '@/store/bridge/getters';
import { bridgeGetterContext } from '@/store/bridge';
import { useAssetsStore } from '@/stores/assets';

vi.mock('@/utils/bridge/common/utils', () => ({
  isWaitingForAction: () => false,
}));
vi.mock('@/utils/bridge/sub/api', () => ({
  subBridgeApi: {
    isEvmAccount: () => false,
  },
}));

const bridgeGetterContextMock = vi.mocked(bridgeGetterContext);
const useAssetsStoreMock = vi.mocked(useAssetsStore);
const getActivePiniaMock = vi.mocked(getActivePinia);

describe('store/bridge/getters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getActivePiniaMock.mockReturnValue({} as any);
  });

  it('fetches registered assets from pinia store when legacy module is missing', () => {
    const assetLookup = vi.fn(() => ({ address: '0x1' }));

    bridgeGetterContextMock.mockReturnValue({
      state: {},
      getters: {},
      rootState: {
        wallet: {
          account: {
            assets: [{ address: '0x1', symbol: 'VAL', balance: { transferable: '0' }, externalBalance: '0' }],
          },
        },
        assets: { registeredAssets: {} },
      },
      rootGetters: {
        web3: { selectedNetwork: { nativeCurrency: { symbol: 'VAL' } } },
        assets: { assetDataByAddress: assetLookup },
      },
    } as any);

    useAssetsStoreMock.mockReturnValue({
      registeredAssets: {
        '0x1': { address: '0x1', decimals: 18, kind: 'Sidechain' },
      },
    } as any);

    const result = getters.nativeToken({} as any);

    expect(result).toEqual({ address: '0x1' });
    expect(assetLookup).toHaveBeenCalledWith('0x1');
    expect(useAssetsStoreMock).toHaveBeenCalledTimes(1);
  });

  it('prefers legacy module when registered assets are available on root state', () => {
    const assetLookup = vi.fn(() => ({ address: '0x2' }));
    const registeredAssets = {
      '0x2': { address: '0x2', decimals: 18, kind: 'Sidechain' },
    };

    bridgeGetterContextMock.mockReturnValue({
      state: {},
      getters: {},
      rootState: {
        assets: { registeredAssets },
        wallet: {
          account: {
            assets: [{ address: '0x2', symbol: 'XOR', balance: { transferable: '0' }, externalBalance: '0' }],
          },
        },
      },
      rootGetters: {
        web3: { selectedNetwork: { nativeCurrency: { symbol: 'XOR' } } },
        assets: { assetDataByAddress: assetLookup },
      },
    } as any);

    const result = getters.nativeToken({} as any);

    expect(result).toEqual({ address: '0x2' });
    expect(assetLookup).toHaveBeenCalledWith('0x2');
    expect(useAssetsStoreMock).not.toHaveBeenCalled();
  });

  it('handles missing history gracefully in hasWaitingForActionTx', () => {
    bridgeGetterContextMock.mockReturnValue({
      state: { historyInternal: {} },
      getters: { history: undefined },
      rootState: {
        assets: {},
        wallet: { account: { assets: [] } },
        web3: { networkType: null, networkSelected: null },
      },
      rootGetters: {
        web3: { selectedNetwork: null },
        assets: { assetDataByAddress: vi.fn() },
      },
    } as any);

    expect(getters.hasWaitingForActionTx({} as any)).toBe(false);
  });
});
