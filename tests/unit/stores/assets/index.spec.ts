import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { EvmNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/evm/consts';
import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';

import { ZeroStringValue } from '@/consts';
import type { Nullable } from '@/types/common';
import type { useAssetsStore as UseAssetsStore } from '@/stores/assets';

let useAssetsStore: UseAssetsStore;

beforeAll(async () => {
  const assetsModule = await vi.importActual<typeof import('@/stores/assets')>('@/stores/assets');
  useAssetsStore = assetsModule.useAssetsStore;
});

const piniaStub = vi.hoisted(() => ({
  createPinia: vi.fn(() => ({})),
  setActivePinia: vi.fn(),
  defineStore: (_id: string, options: any) => {
    return () => {
      const state = typeof options.state === 'function' ? options.state() : {};
      const store: Record<string, any> = {
        $state: state,
      };

      Object.keys(state).forEach((key) => {
        Object.defineProperty(store, key, {
          enumerable: true,
          get: () => store.$state[key],
          set: (value) => {
            store.$state[key] = value;
          },
        });
      });

      if (options.getters) {
        Object.entries(options.getters).forEach(([name, getter]) => {
          if (Object.prototype.hasOwnProperty.call(store, name)) return;
          Object.defineProperty(store, name, {
            enumerable: true,
            get: () => getter.call(store, store.$state),
          });
        });
      }

      store.$patch = (patch: any) => {
        if (typeof patch === 'function') {
          patch(store.$state);
        } else {
          Object.assign(store.$state, patch);
        }
      };

      if (options.actions) {
        Object.entries(options.actions).forEach(([name, action]) => {
          store[name] = (...args: unknown[]) => action.apply(store, args);
        });
      }

      return store;
    };
  },
}));

vi.mock('pinia', () => ({
  createPinia: piniaStub.createPinia,
  setActivePinia: piniaStub.setActivePinia,
  defineStore: piniaStub.defineStore,
}));

type WalletStoreStub = {
  assets: Array<Record<string, unknown>>;
  whitelist: Array<string> | Record<string, unknown>;
  assetsDataTable: Record<string, Record<string, unknown>>;
  accountAssetsAddressTable: Record<string, Record<string, unknown>>;
};

const walletStoreStub: WalletStoreStub = vi.hoisted(() => ({
  assets: [],
  whitelist: [],
  assetsDataTable: {},
  accountAssetsAddressTable: {},
}));

const resetWalletStoreStub = () => {
  walletStoreStub.assets = [];
  walletStoreStub.whitelist = [];
  walletStoreStub.assetsDataTable = {};
  walletStoreStub.accountAssetsAddressTable = {};
};

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStoreStub,
}));

const web3StoreMock = vi.hoisted(() => ({
  networkType: null as Nullable<BridgeNetworkType>,
  networkSelected: null as Nullable<string | number>,
  ethBridgeEvmNetwork: null as Nullable<number>,
  isValidNetwork: true,
  getEvmTokenAddressByAssetId: vi.fn(),
}));

vi.mock('@/stores/web3', () => ({
  useWeb3Store: () => web3StoreMock,
}));

const bridgeStoreMock = vi.hoisted(() => ({
  subBridgeConnector: {
    destinationNetwork: null as Nullable<string | number>,
    soraParachain: null as any,
    parachain: null as any,
  },
}));

vi.mock('@/stores/bridge', () => ({
  useBridgeStore: () => bridgeStoreMock,
}));

const ethRegisteredAssetsMock = vi.hoisted(() => vi.fn());
vi.mock('@/utils/bridge/eth/api', () => ({
  ethBridgeApi: {
    getRegisteredAssets: ethRegisteredAssetsMock,
  },
}));

const evmRegisteredAssetsMock = vi.hoisted(() => vi.fn());
vi.mock('@/utils/bridge/evm/api', () => ({
  evmBridgeApi: {
    getRegisteredAssets: evmRegisteredAssetsMock,
  },
}));

const subRegisteredAssetsMock = vi.hoisted(() => vi.fn());
const subIsParachainMock = vi.hoisted(() => vi.fn(() => false));
const subGetAssetMulilocationMock = vi.hoisted(() => vi.fn());
vi.mock('@/utils/bridge/sub/api', () => ({
  subBridgeApi: {
    getRegisteredAssets: subRegisteredAssetsMock,
    isParachain: subIsParachainMock,
    soraParachainApi: {
      getAssetMulilocation: subGetAssetMulilocationMock,
    },
  },
}));

const getTokenDecimalsMock = vi.hoisted(() => vi.fn());
vi.mock('@/utils/ethers-util', () => ({
  __esModule: true,
  default: {
    getTokenDecimals: getTokenDecimalsMock,
  },
}));

const resetLegacyStoreStub = () => {
  web3StoreMock.networkType = BridgeNetworkType.Eth;
  web3StoreMock.networkSelected = null;
  web3StoreMock.ethBridgeEvmNetwork = null;
  web3StoreMock.isValidNetwork = true;
  web3StoreMock.getEvmTokenAddressByAssetId.mockReset();
  bridgeStoreMock.subBridgeConnector = {
    destinationNetwork: null,
    soraParachain: null,
    parachain: null,
  };
  getTokenDecimalsMock.mockReset();
};

const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

beforeEach(() => {
  piniaStub.setActivePinia(piniaStub.createPinia());
  resetWalletStoreStub();
  resetLegacyStoreStub();
  ethRegisteredAssetsMock.mockReset();
  evmRegisteredAssetsMock.mockReset();
  subRegisteredAssetsMock.mockReset();
  subIsParachainMock.mockReset();
  subIsParachainMock.mockReturnValue(false);
  subGetAssetMulilocationMock.mockReset();
  consoleErrorSpy.mockClear();
});

afterEach(() => {});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

describe('useAssetsStore getters', () => {
  it('filters whitelist assets based on wallet store data', () => {
    walletStoreStub.assets = [
      { address: '0x01', symbol: 'AAA' },
      { address: '0x02', symbol: 'BBB' },
    ];
    walletStoreStub.whitelist = ['0x02'];

    const store = useAssetsStore();

    expect(store.whitelistAssets).toEqual([walletStoreStub.assets[1]]);
  });

  it('supports legacy whitelist map format', () => {
    walletStoreStub.assets = [
      { address: '0x01', symbol: 'AAA' },
      { address: '0x02', symbol: 'BBB' },
    ];
    walletStoreStub.whitelist = {
      '0x02': { symbol: 'BBB', name: 'B', decimals: 18, icon: '' },
    };

    const store = useAssetsStore();

    expect(store.whitelistAssets).toEqual([walletStoreStub.assets[1]]);
  });

  it('returns merged account and bridge data for a known asset address', () => {
    const store = useAssetsStore();
    walletStoreStub.assetsDataTable = {
      '0x01': {
        address: '0x01',
        symbol: 'AAA',
        decimals: 18,
      },
    };
    walletStoreStub.accountAssetsAddressTable = {
      '0x01': {
        balance: '123',
      },
    } as WalletStoreStub['accountAssetsAddressTable'];

    store.setRegisteredAssets({
      '0x01': {
        address: '0xExternal',
        decimals: 12,
        kind: 'erc20',
      },
    });

    const asset = store.assetDataByAddress('0x01');

    expect(asset).toMatchObject({
      address: '0x01',
      balance: '123',
      externalAddress: '0xExternal',
      externalDecimals: 12,
      externalBalance: ZeroStringValue,
      symbol: 'AAA',
    });
    expect(store.assetDataByAddress('0x02')).toBeNull();
    expect(store.assetDataByAddress()).toBeUndefined();
  });

  it('resolves asset metadata from wallet assets when assets table is not ready', () => {
    const store = useAssetsStore();
    walletStoreStub.assets = [
      {
        address: '0xFallback',
        symbol: 'XOR',
        decimals: 18,
      },
    ];
    walletStoreStub.accountAssetsAddressTable = {
      '0xFallback': {
        balance: '42',
      },
    } as WalletStoreStub['accountAssetsAddressTable'];

    const asset = store.assetDataByAddress('0xFallback');

    expect(asset).toMatchObject({
      address: '0xFallback',
      symbol: 'XOR',
      decimals: 18,
      balance: '42',
      externalBalance: ZeroStringValue,
    });
  });

  it('resolves account asset metadata when global asset lists are not ready', () => {
    const store = useAssetsStore();
    walletStoreStub.accountAssetsAddressTable = {
      '0xOwned': {
        address: '0xOwned',
        symbol: 'OWN',
        name: 'Owned token',
        decimals: 18,
        balance: {
          transferable: '7000000000000000000',
        },
      },
    };

    const asset = store.assetDataByAddress('0xOwned');

    expect(asset).toMatchObject({
      address: '0xOwned',
      symbol: 'OWN',
      name: 'Owned token',
      decimals: 18,
      balance: {
        transferable: '7000000000000000000',
      },
      externalBalance: ZeroStringValue,
    });
  });

  it('falls back to known assets when wallet assets are not ready', () => {
    const store = useAssetsStore();

    const asset = store.assetDataByAddress(XOR.address);

    expect(asset).toMatchObject({
      address: XOR.address,
      symbol: XOR.symbol,
      decimals: XOR.decimals,
      externalBalance: ZeroStringValue,
    });
  });
});

describe('useAssetsStore bridge fetchers', () => {
  it('fetches ETH registered assets when network type is Eth', async () => {
    const ethPayload = {
      '0x01': {
        address: '0xExternal',
        decimals: 18,
        assetKind: 'evm',
      },
    };
    web3StoreMock.networkType = BridgeNetworkType.Eth;
    ethRegisteredAssetsMock.mockResolvedValue(ethPayload);

    const store = useAssetsStore();
    const result = await store.fetchRegisteredAssetsFromNetwork();

    expect(result).toEqual([
      {
        '0x01': {
          address: '0xExternal',
          decimals: 18,
          kind: 'evm',
        },
      },
    ]);
    expect(ethRegisteredAssetsMock).toHaveBeenCalledTimes(1);
  });

  it('keeps XOR selectable for Hashi assets on Ethereum Mainnet', async () => {
    const ethPayload = {
      [XOR.address]: {
        address: '0xXorContract',
        decimals: 18,
        assetKind: 'xor',
      },
      '0x01': {
        address: '0xExternal',
        decimals: 18,
        assetKind: 'evm',
      },
    };
    web3StoreMock.networkType = BridgeNetworkType.Eth;
    web3StoreMock.networkSelected = EvmNetworkId.EthereumMainnet;
    ethRegisteredAssetsMock.mockResolvedValue(ethPayload);

    const store = useAssetsStore();
    const result = await store.fetchRegisteredAssetsFromNetwork();

    expect(result).toEqual([
      {
        [XOR.address]: {
          address: '0xXorContract',
          decimals: 18,
          kind: 'xor',
        },
      },
      {
        '0x01': {
          address: '0xExternal',
          decimals: 18,
          kind: 'evm',
        },
      },
    ]);
  });

  it('keeps XOR selectable for Hashi assets on other networks', async () => {
    const ethPayload = {
      [XOR.address]: {
        address: '0xXorContract',
        decimals: 18,
        assetKind: 'xor',
      },
    };
    web3StoreMock.networkType = BridgeNetworkType.Eth;
    web3StoreMock.networkSelected = EvmNetworkId.BinanceSmartChainMainnet;
    ethRegisteredAssetsMock.mockResolvedValue(ethPayload);

    const store = useAssetsStore();
    const result = await store.fetchRegisteredAssetsFromNetwork();

    expect(result).toEqual([
      {
        [XOR.address]: {
          address: '0xXorContract',
          decimals: 18,
          kind: 'xor',
        },
      },
    ]);
  });

  it('fetches EVM registered assets when network type is Evm', async () => {
    const evmPayload = {
      '0x02': {
        address: '0xMapped',
        decimals: 12,
        appKind: 'evm-app',
      },
    };
    web3StoreMock.networkType = BridgeNetworkType.Evm;
    web3StoreMock.networkSelected = 'moonriver';
    evmRegisteredAssetsMock.mockResolvedValue(evmPayload);

    const store = useAssetsStore();
    const result = await store.fetchRegisteredAssetsFromNetwork();

    expect(result).toEqual([
      {
        '0x02': {
          address: '0xMapped',
          decimals: 12,
          kind: 'evm-app',
        },
      },
    ]);
    expect(evmRegisteredAssetsMock).toHaveBeenCalledWith('moonriver');
  });

  it('fetches Sub registered assets when network type is Sub', async () => {
    const subPayload = {
      '0x03': {
        address: {
          Asset: {
            toString: () => '5678',
          },
        },
        decimals: 10,
        assetKind: 'sub',
      },
    };
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = SubNetworkId.Liberland;
    subRegisteredAssetsMock.mockResolvedValue(subPayload);

    const store = useAssetsStore();
    const result = await store.fetchRegisteredAssetsFromNetwork();

    expect(result).toEqual([
      {
        '0x03': {
          address: '5678',
          decimals: 10,
          kind: 'sub',
        },
      },
    ]);
    expect(subRegisteredAssetsMock).toHaveBeenCalledWith(SubNetworkId.Liberland);
  });
});

describe('useAssetsStore actions', () => {
  it('loads registered assets and toggles fetching flag', async () => {
    const store = useAssetsStore();
    const mockedResponse = [
      {
        '0x01': {
          address: '0xExternal',
          decimals: 18,
          kind: 'evm',
        },
      },
    ];
    const fetchSpy = vi.spyOn(store, 'fetchRegisteredAssetsFromNetwork').mockResolvedValue(mockedResponse);
    const updateSpy = vi.spyOn(store, 'updateRegisteredAssets').mockImplementation(async function (this: typeof store) {
      this.setRegisteredAssets(this.registeredAssets);
    });

    const promise = store.getRegisteredAssets();
    expect(store.registeredAssetsFetching).toBe(true);

    await promise;

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(store.registeredAssets).toEqual({
      '0x01': {
        address: '0xExternal',
        decimals: 18,
        kind: 'evm',
      },
    });
    expect(store.registeredAssetsFetching).toBe(false);
  });

  it('resets registered assets when fetching fails', async () => {
    const store = useAssetsStore();
    store.setRegisteredAssets({
      '0x01': {
        address: '0xExternal',
        decimals: 18,
        kind: 'evm',
      },
    });
    const fetchSpy = vi.spyOn(store, 'fetchRegisteredAssetsFromNetwork').mockRejectedValue(new Error('boom'));

    await store.getRegisteredAssets();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(store.registeredAssets).toEqual({});
    expect(store.registeredAssetsFetching).toBe(false);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('enriches missing EVM asset metadata when updating registered assets', async () => {
    const store = useAssetsStore();
    web3StoreMock.networkType = BridgeNetworkType.Eth;
    store.setRegisteredAssets({
      '0x01': {
        address: '',
        decimals: 0,
        kind: 'evm',
      },
    });
    web3StoreMock.getEvmTokenAddressByAssetId.mockResolvedValue('0xResolved');
    getTokenDecimalsMock.mockResolvedValue(18);

    await store.updateRegisteredAssets();

    expect(web3StoreMock.getEvmTokenAddressByAssetId).toHaveBeenCalledWith('0x01');
    expect(getTokenDecimalsMock).toHaveBeenCalledWith('0xResolved');
    expect(store.registeredAssets['0x01']).toMatchObject({
      address: '0xResolved',
      decimals: 18,
      kind: 'evm',
    });
    expect(store.registeredAssetsFetching).toBe(false);
  });

  it('keeps unresolved EVM asset metadata without querying decimals for an empty address', async () => {
    const store = useAssetsStore();
    web3StoreMock.networkType = BridgeNetworkType.Eth;
    store.setRegisteredAssets({
      '0x01': {
        address: '',
        decimals: 0,
        kind: 'evm',
      },
    });
    web3StoreMock.getEvmTokenAddressByAssetId.mockResolvedValue('');

    await store.updateRegisteredAssets();

    expect(web3StoreMock.getEvmTokenAddressByAssetId).toHaveBeenCalledWith('0x01');
    expect(getTokenDecimalsMock).not.toHaveBeenCalled();
    expect(store.registeredAssets['0x01']).toMatchObject({
      address: '',
      decimals: 0,
      kind: 'evm',
    });
    expect(store.registeredAssetsFetching).toBe(false);
  });

  it('populates parachain asset IDs for Sub networks', async () => {
    const store = useAssetsStore();
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = SubNetworkId.Liberland;
    walletStoreStub.assetsDataTable = {
      '0xSub': {
        symbol: 'SUB',
      },
    };
    const soraParachain = { connect: vi.fn(), api: {} };
    const parachain = {
      connect: vi.fn(),
      getAssetIdByMultilocation: vi.fn().mockResolvedValue('para-asset'),
    };
    bridgeStoreMock.subBridgeConnector = {
      destinationNetwork: SubNetworkId.Liberland,
      soraParachain,
      parachain,
    };
    subIsParachainMock.mockReturnValue(true);
    subGetAssetMulilocationMock.mockResolvedValue('multi');
    store.setRegisteredAssets({
      '0xSub': {
        address: '',
        decimals: 12,
        kind: 'sub',
      },
    });

    await store.updateRegisteredAssets();

    expect(soraParachain.connect).toHaveBeenCalled();
    expect(parachain.connect).toHaveBeenCalled();
    expect(subGetAssetMulilocationMock).toHaveBeenCalledWith('0xSub', soraParachain.api);
    expect(parachain.getAssetIdByMultilocation).toHaveBeenCalledWith(walletStoreStub.assetsDataTable['0xSub'], 'multi');
    expect(store.registeredAssets['0xSub']).toMatchObject({
      address: 'para-asset',
      decimals: 12,
    });
    expect(store.registeredAssetsFetching).toBe(false);
  });

  it('does not crash when wallet assets table is missing while resolving Sub parachain assets', async () => {
    const store = useAssetsStore();
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = SubNetworkId.Liberland;
    walletStoreStub.assetsDataTable = undefined as any;

    const soraParachain = { connect: vi.fn(), api: {} };
    const parachain = {
      connect: vi.fn(),
      getAssetIdByMultilocation: vi.fn().mockResolvedValue('para-asset'),
    };
    bridgeStoreMock.subBridgeConnector = {
      destinationNetwork: SubNetworkId.Liberland,
      soraParachain,
      parachain,
    };
    subIsParachainMock.mockReturnValue(true);
    subGetAssetMulilocationMock.mockResolvedValue('multi');
    store.setRegisteredAssets({
      '0xSub': {
        address: '',
        decimals: 12,
        kind: 'sub',
      },
    });

    await expect(store.updateRegisteredAssets()).resolves.toBeUndefined();

    expect(soraParachain.connect).toHaveBeenCalled();
    expect(parachain.connect).toHaveBeenCalled();
    expect(subGetAssetMulilocationMock).not.toHaveBeenCalled();
    expect(parachain.getAssetIdByMultilocation).not.toHaveBeenCalled();
    expect(store.registeredAssets['0xSub']).toMatchObject({
      address: '',
      decimals: 12,
    });
    expect(store.registeredAssetsFetching).toBe(false);
  });
});
