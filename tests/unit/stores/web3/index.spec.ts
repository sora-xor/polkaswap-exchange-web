import { FPNumber } from '@sora-substrate/math';
import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { EvmNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/evm/consts';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const shared = vi.hoisted(() => ({
  assetsStoreState: {
    getRegisteredAssets: vi.fn(async () => undefined),
    updateRegisteredAssets: vi.fn(async () => undefined),
  },
  bridgeStoreState: {
    autoselectedAssetAddress: null as string | null,
    setAssetAddress: vi.fn(async () => undefined),
    subBridgeConnector: null as any,
  },
  connectEvmProviderMock: vi.fn(),
  disconnectEvmProviderMock: vi.fn(),
  getContractMock: vi.fn(),
  getDenominatorMock: vi.fn(),
  getEvmNetworkIdMock: vi.fn(),
  getListAppsMock: vi.fn(),
  getProvidersListMock: vi.fn(),
  getSelectedBridgeTypeMock: vi.fn(),
  getSelectedNetworkMock: vi.fn(),
  hexToNumberMock: vi.fn((value: string) => Number.parseInt(value, 16)),
  isAppStorageSourceMock: vi.fn(() => false),
  isNativeEvmTokenAddressMock: vi.fn(() => false),
  loginApiMock: vi.fn(async () => undefined),
  logoutApiMock: vi.fn(),
  storeSelectedBridgeTypeMock: vi.fn(),
  storeSelectedNetworkMock: vi.fn(),
  switchOrAddChainMock: vi.fn(),
  walletStoreState: {
    isDesktop: false,
  },
  watchEthereumMock: vi.fn(),
}));

vi.mock('@wallet', async () => {
  const { createWalletMock, withWalletMock } = await import('@tests/stubs/createWalletMock');
  const wallet = await createWalletMock();

  return withWalletMock(wallet, {
    api: {
      ...wallet.api,
      bridgeProxy: {
        ...(wallet.api?.bridgeProxy ?? {}),
        getListApps: shared.getListAppsMock,
      },
      system: {
        ...(wallet.api?.system ?? {}),
        getDenominator: shared.getDenominatorMock,
      },
    },
    accountUtils: {
      ...(wallet.accountUtils ?? {}),
      isAppStorageSource: shared.isAppStorageSourceMock,
      loginApi: shared.loginApiMock,
      logoutApi: shared.logoutApiMock,
    },
  });
});

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => shared.assetsStoreState,
}));

vi.mock('@/stores/bridge', () => ({
  useBridgeStore: () => shared.bridgeStoreState,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => shared.walletStoreState,
}));

vi.mock('@/utils/bridge/sub/classes/adapter', () => ({
  SubNetworksConnector: class {
    static nodes = {};
  },
}));

vi.mock('@/utils/connection/evm/providers', () => ({
  FearlessWalletProvider: { uuid: 'Fearless Wallet', name: 'Fearless Wallet', icon: 'fearless.svg' },
  MetamaskProvider: { uuid: 'MetaMask', name: 'MetaMask', icon: 'metamask.svg' },
  WalletConnectProvider: { uuid: 'WalletConnect', name: 'WalletConnect', icon: 'wc.svg' },
  getProvidersList: shared.getProvidersListMock,
}));

vi.mock('@/utils/ethers-util', () => ({
  __esModule: true,
  default: {
    connectEvmProvider: shared.connectEvmProviderMock,
    disconnectEvmProvider: shared.disconnectEvmProviderMock,
    getContract: shared.getContractMock,
    getEvmNetworkId: shared.getEvmNetworkIdMock,
    getSelectedBridgeType: shared.getSelectedBridgeTypeMock,
    getSelectedNetwork: shared.getSelectedNetworkMock,
    hexToNumber: shared.hexToNumberMock,
    isNativeEvmTokenAddress: shared.isNativeEvmTokenAddressMock,
    storeSelectedBridgeType: shared.storeSelectedBridgeTypeMock,
    storeSelectedNetwork: shared.storeSelectedNetworkMock,
    switchOrAddChain: shared.switchOrAddChainMock,
    watchEthereum: shared.watchEthereumMock,
  },
  PROVIDER_ERROR: { DisconnectedFromChain: 4901 },
}));

import { useWeb3Store } from '@/stores/web3';

describe('useWeb3Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    shared.assetsStoreState.getRegisteredAssets.mockResolvedValue(undefined);
    shared.assetsStoreState.updateRegisteredAssets.mockResolvedValue(undefined);
    shared.bridgeStoreState.autoselectedAssetAddress = null;
    shared.bridgeStoreState.setAssetAddress.mockResolvedValue(undefined);
    shared.bridgeStoreState.subBridgeConnector = null;
    shared.getDenominatorMock.mockResolvedValue(new FPNumber('1000000'));
    shared.getEvmNetworkIdMock.mockResolvedValue(8453);
    shared.getListAppsMock.mockResolvedValue({
      [BridgeNetworkType.Eth]: {},
      [BridgeNetworkType.Evm]: {},
      [BridgeNetworkType.Sub]: [],
    });
    shared.getSelectedBridgeTypeMock.mockReturnValue(null);
    shared.getSelectedNetworkMock.mockReturnValue(null);
    shared.isAppStorageSourceMock.mockReturnValue(false);
    shared.loginApiMock.mockResolvedValue(undefined);
    shared.logoutApiMock.mockReset();
    shared.walletStoreState.isDesktop = false;
    shared.watchEthereumMock.mockResolvedValue(vi.fn());
  });

  it('keeps mutation-backed UI and bridge config state locally', () => {
    const web3Store = useWeb3Store();

    web3Store.setSelectNetworkDialogVisibility(true);
    web3Store.setSelectProviderDialogVisibility(true);
    web3Store.setSelectSubNodeDialogVisibility(true);
    web3Store.setSubAccountDialogVisibility(true);
    web3Store.setSoraAccountDialogVisibility(true);
    web3Store.setEvmNetworksApp([EvmNetworkId.EthereumSepolia] as any);
    web3Store.setSubNetworkApps({ kusama: true } as any);
    web3Store.setEthBridgeSettings({
      evmNetwork: EvmNetworkId.EthereumSepolia,
      address: {
        XOR: '0xxor-local',
        VAL: '0xval-local',
        OTHER: '0xother-local',
      },
    } as any);

    expect(web3Store.selectNetworkDialogVisibility).toBe(true);
    expect(web3Store.selectProviderDialogVisibility).toBe(true);
    expect(web3Store.selectSubNodeDialogVisibility).toBe(true);
    expect(web3Store.subAccountDialogVisibility).toBe(true);
    expect(web3Store.soraAccountDialogVisibility).toBe(true);
    expect(web3Store.evmNetworkApps).toEqual([EvmNetworkId.EthereumSepolia]);
    expect(web3Store.subNetworkApps).toEqual({ kusama: true });
    expect(web3Store.ethBridgeSettings).toEqual({
      evmNetwork: EvmNetworkId.EthereumSepolia,
      address: {
        XOR: '0xxor-local',
        VAL: '0xval-local',
        OTHER: '0xother-local',
      },
    });
  });

  it('selects external networks locally and bootstraps bridge dependencies through Pinia stores', async () => {
    const stopMock = vi.fn(async () => undefined);
    shared.bridgeStoreState.autoselectedAssetAddress = '0xasset';
    shared.bridgeStoreState.subBridgeConnector = {
      stop: stopMock,
    };

    const web3Store = useWeb3Store();

    await web3Store.selectExternalNetwork({
      id: EvmNetworkId.EthereumSepolia,
      type: BridgeNetworkType.Eth,
    });

    expect(stopMock).toHaveBeenCalledTimes(1);
    expect(shared.storeSelectedBridgeTypeMock).toHaveBeenCalledWith(BridgeNetworkType.Eth);
    expect(shared.storeSelectedNetworkMock).toHaveBeenCalledWith(EvmNetworkId.EthereumSepolia);
    expect(shared.getDenominatorMock).toHaveBeenCalledTimes(1);
    expect(shared.assetsStoreState.getRegisteredAssets).toHaveBeenCalledTimes(1);
    expect(shared.bridgeStoreState.setAssetAddress).toHaveBeenCalledWith('0xasset');
    expect(web3Store.networkType).toBe(BridgeNetworkType.Eth);
    expect(web3Store.networkSelected).toBe(EvmNetworkId.EthereumSepolia);
    expect(web3Store.denominator.toString()).toBe('1000000');
  });

  it('connects an EVM provider locally and registers the watcher cleanup', async () => {
    const unsubscribe = vi.fn();
    const provider = { uuid: 'wallet-connect', name: 'WalletConnect', icon: 'wc.svg' };
    const web3Store = useWeb3Store();

    shared.connectEvmProviderMock.mockResolvedValue('0xABC');
    shared.getEvmNetworkIdMock.mockResolvedValue(8453);
    shared.watchEthereumMock.mockResolvedValue(unsubscribe);

    await web3Store.selectEvmProvider(provider as any);

    expect(shared.connectEvmProviderMock).toHaveBeenCalledWith(provider, {
      chains: [web3Store.ethBridgeEvmNetwork],
      optionalChains: [],
    });
    expect(shared.assetsStoreState.updateRegisteredAssets).toHaveBeenCalledTimes(1);
    expect(web3Store.evmAddress).toBe('0xabc');
    expect(web3Store.evmProvider).toEqual(provider);
    expect(web3Store.evmProviderNetwork).toBe(8453);
    expect(web3Store.evmProviderSubscription).toBe(unsubscribe);
    expect(web3Store.evmProviderLoading).toBeNull();
  });

  it('subscribes on discovered EVM providers without duplicating providers', async () => {
    const unsubscribe = vi.fn();
    const web3Store = useWeb3Store();
    let callback!: (event: {
      detail: {
        info: { uuid: string; name: string; icon: string };
        provider: unknown;
      };
    }) => void;

    shared.getProvidersListMock.mockImplementation((handler) => {
      callback = handler;
      return unsubscribe;
    });

    const result = await web3Store.subscribeOnEvmProviders();

    callback({
      detail: {
        info: { uuid: 'provider-1', name: 'Provider 1', icon: 'provider.svg' },
        provider: {},
      },
    });
    callback({
      detail: {
        info: { uuid: 'provider-1', name: 'Provider 1', icon: 'provider.svg' },
        provider: {},
      },
    });

    expect(result).toBe(unsubscribe);
    expect(web3Store.evmProviders).toHaveLength(1);
    expect(web3Store.evmProviders[0]).toEqual(
      expect.objectContaining({
        uuid: 'provider-1',
        name: 'Provider 1',
        icon: 'provider.svg',
        installed: true,
      })
    );
  });

  it('logs into the selected Sub account through the bridge Pinia connector', async () => {
    const changeAccountNameMock = vi.fn();
    const connector = {
      accountApi: {
        changeAccountName: changeAccountNameMock,
        connection: { api: {} },
        formatAddress: vi.fn((address: string, withPrefix = true) =>
          withPrefix ? `fmt:${address}` : `raw:${address}`
        ),
      },
      network: {
        subNetworkConnection: {
          nodeIsConnected: true,
        },
      },
    };

    shared.bridgeStoreState.subBridgeConnector = connector;

    const web3Store = useWeb3Store();
    const account = {
      address: '5SubAccount',
      name: 'Liberland',
      source: 'polkadot-js',
    };

    await web3Store.selectSubAccount(account as any);
    await web3Store.changeSubAccountName({ address: '5SubAccount', name: 'Renamed' });

    expect(shared.loginApiMock).toHaveBeenCalledWith(connector.accountApi, account, false);
    expect(changeAccountNameMock).toHaveBeenCalledWith('5SubAccount', 'Renamed');
    expect(web3Store.subAccount).toEqual({
      address: '5SubAccount',
      name: 'Renamed',
      source: 'polkadot-js',
    });
  });
});
