import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { ZeroStringValue } from '@/consts';
import { useWalletStore } from '@/stores/wallet';

const XOR_ADDRESS = '0x0200000000000000000000000000000000000000000000000000000000000000';

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    assets: [],
    whitelist: [],
    assetsDataTable: {
      [XOR_ADDRESS]: {
        address: XOR_ADDRESS,
        symbol: 'XOR',
        decimals: 18,
      },
    },
    accountAssetsAddressTable: {
      [XOR_ADDRESS]: {
        balance: '0',
      },
    },
  }),
}));

vi.mock('@/stores/web3', () => ({
  useWeb3Store: () => ({ networkType: null, networkSelected: null }),
}));

vi.mock('@/utils/bridge/eth/api', () => ({ ethBridgeApi: null }));
vi.mock('@/utils/bridge/evm/api', () => ({ evmBridgeApi: null }));
vi.mock('@/utils/bridge/sub/api', () => ({ subBridgeApi: null }));

vi.mock('@/utils/ethers-util', () => ({
  __esModule: true,
  default: { getTokenDecimals: vi.fn() },
}));

let useAssetsStore: typeof import('@/stores/assets').useAssetsStore;

describe('useAssetsStore (real Pinia runtime)', () => {
  beforeAll(async () => {
    const module = await vi.importActual<typeof import('@/stores/assets')>('@/stores/assets');
    useAssetsStore = module.useAssetsStore;
  });

  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('exposes registeredAssets state and resolves asset data without throwing', () => {
    const store = useAssetsStore();

    const walletStore = useWalletStore() as any;
    expect(walletStore.assetsDataTable[XOR_ADDRESS]?.symbol).toBe('XOR');

    expect(store.registeredAssets).toEqual({});
    expect(() => store.assetDataByAddress(XOR_ADDRESS)).not.toThrow();

    const asset = store.assetDataByAddress(XOR_ADDRESS);
    expect(asset).toMatchObject({
      address: XOR_ADDRESS,
      symbol: 'XOR',
      externalBalance: ZeroStringValue,
    });
  });
});
