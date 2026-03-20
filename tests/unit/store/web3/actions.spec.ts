import { FPNumber } from '@sora-substrate/math';
import { api as walletApi, accountUtils } from '@wallet';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ethersUtilMock = vi.hoisted(() => ({
  getSelectedBridgeType: vi.fn(),
  getSelectedNetwork: vi.fn(),
}));

// Mock soraneo wallet api to control getDenominator (avoid hoisting issues)
vi.mock('@wallet', async () => {
  const { createWalletMock, withWalletMock } = await import('@tests/stubs/createWalletMock');
  const wallet = await createWalletMock();

  return withWalletMock(wallet, {
    api: {
      ...wallet.api,
      system: {
        ...(wallet.api.system ?? {}),
        getDenominator: vi.fn(),
      },
    },
    accountUtils: wallet.accountUtils ?? {},
    WALLET_TYPES: wallet.WALLET_TYPES ?? {},
  });
});
// Stub heavy SDK subpaths referenced by web3 actions module
vi.mock('@sora-substrate/sdk/build/bridgeProxy/consts', () => ({
  BridgeNetworkType: { Eth: 'Eth', Evm: 'Evm', Sub: 'Sub' },
  BridgeTxDirection: { Outgoing: 'Outgoing', Incoming: 'Incoming' },
  BridgeTxStatus: { Pending: 'Pending', Ready: 'Ready', Failed: 'Failed' },
}));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/types', () => ({ BridgeNetworkId: {} }));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/sub/consts', () => ({ SubNetworkId: {} }));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/sub/types', () => ({}));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/eth/types', () => ({}));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/evm/types', () => ({}));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/evm/consts', () => ({
  EvmNetworkId: {
    EthereumMainnet: 1,
    EthereumRopsten: 3,
    EthereumRinkeby: 4,
    EthereumGoerli: 5,
    EthereumKovan: 42,
    EthereumSepolia: 11155111,
    BinanceSmartChainMainnet: 56,
    BinanceSmartChainTestnet: 97,
    EthereumClassicMainnet: 61,
    EthereumClassicTestnetMordor: 63,
    PolygonMainnet: 137,
    PolygonTestnetMumbai: 80001,
    KlaytnTestnetBaobab: 1001,
    KlaytnMainnet: 8217,
    AvalancheMainnet: 43114,
    AvalancheTestnetFuji: 43113,
    ArbitrumMainnet: 42161,
    ArbitrumSepoliaTestnet: 421614,
    FantomMainnet: 250,
    FantomTestnet: 4002,
  },
}));
// Avoid importing app utils that pull element-ui and sdk
vi.mock('@/utils', () => ({}));
vi.mock('@/utils/bridge/sub/classes/adapter', () => ({ SubNetworksConnector: class {} }));
vi.mock('@/utils/connection/evm/providers', () => ({ getProvidersList: () => () => {} }));
vi.mock('@/utils/ethers-util', () => ({
  default: ethersUtilMock,
  PROVIDER_ERROR: { DisconnectedFromChain: 4901 },
}));
vi.mock('@/consts/evm', () => ({
  KnownEthBridgeAsset: { Other: 'Other', XOR: 'XOR', VAL: 'VAL' },
  SmartContractType: { EthBridge: 'ETH_BRIDGE', ERC20: 'ERC20' },
  SmartContracts: { ETH_BRIDGE: {}, ERC20: {} },
}));

// Make web3ActionContext act as identity – return provided context
vi.mock('@/store/web3', () => ({
  web3ActionContext: (ctx: any) => ctx,
}));

import actions from '@/store/web3/actions';

describe('web3 actions - fetchDenominatorCoefficient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ethersUtilMock.getSelectedBridgeType.mockReset();
    ethersUtilMock.getSelectedNetwork.mockReset();
  });

  const makeCtx = () => ({
    commit: {
      setDenominator: vi.fn(),
    },
  });

  it('stores valid chain denominator', async () => {
    const ctx = makeCtx();
    const getDenominatorMock = vi.mocked(walletApi.system.getDenominator as any);
    getDenominatorMock.mockResolvedValueOnce(new FPNumber('1000000'));

    await (actions as any).fetchDenominatorCoefficient(ctx);

    const calledWith = (ctx.commit.setDenominator as any).mock.calls[0][0];
    expect(calledWith).toBeInstanceOf(FPNumber);
    expect(calledWith.toString()).toBe('1000000');
  });

  it('falls back to 1 when denominator is zero or invalid', async () => {
    const ctx = makeCtx();
    const getDenominatorMock = vi.mocked(walletApi.system.getDenominator as any);
    getDenominatorMock.mockResolvedValueOnce(FPNumber.ZERO);

    await (actions as any).fetchDenominatorCoefficient(ctx);

    const calledWith = (ctx.commit.setDenominator as any).mock.calls[0][0];
    expect(calledWith.eq(FPNumber.ONE)).toBe(true);
  });

  it('falls back to 1 on error', async () => {
    const ctx = makeCtx();
    const getDenominatorMock = vi.mocked(walletApi.system.getDenominator as any);
    getDenominatorMock.mockRejectedValueOnce(new Error('network error'));

    await (actions as any).fetchDenominatorCoefficient(ctx);

    const calledWith = (ctx.commit.setDenominator as any).mock.calls[0][0];
    expect(calledWith.eq(FPNumber.ONE)).toBe(true);
  });
});

describe('web3 actions - restoreSelectedNetwork', () => {
  const makeCtx = () => ({
    state: {
      ethBridgeEvmNetwork: 11155111,
    },
    getters: {
      availableNetworks: {
        Eth: {
          11155111: { disabled: false },
          1: { disabled: true },
        },
        Evm: {},
        Sub: {},
      },
    },
    dispatch: {
      selectExternalNetwork: vi.fn(),
    },
  });

  it('uses persisted bridge selection when the network is enabled', async () => {
    const ctx = makeCtx();
    ethersUtilMock.getSelectedBridgeType.mockReturnValue('Eth');
    ethersUtilMock.getSelectedNetwork.mockReturnValue(11155111);

    await (actions as any).restoreSelectedNetwork(ctx);

    expect(ctx.dispatch.selectExternalNetwork).toHaveBeenCalledTimes(1);
    expect(ctx.dispatch.selectExternalNetwork).toHaveBeenCalledWith({
      id: 11155111,
      type: 'Eth',
    });
  });

  it('falls back to default ETH bridge when persisted selection is unavailable', async () => {
    const ctx = makeCtx();
    ethersUtilMock.getSelectedBridgeType.mockReturnValue('Eth');
    ethersUtilMock.getSelectedNetwork.mockReturnValue(1);

    await (actions as any).restoreSelectedNetwork(ctx);

    expect(ctx.dispatch.selectExternalNetwork).toHaveBeenCalledWith({
      id: 11155111,
      type: 'Eth',
    });
  });

  it('falls back to default ETH bridge when stored bridge type is invalid or getters are incomplete', async () => {
    const ctx = makeCtx();
    ctx.getters = {} as any;
    ethersUtilMock.getSelectedBridgeType.mockReturnValue('EVMLegacy');
    ethersUtilMock.getSelectedNetwork.mockReturnValue(1);

    await expect((actions as any).restoreSelectedNetwork(ctx)).resolves.toBeUndefined();
    expect(ctx.dispatch.selectExternalNetwork).toHaveBeenCalledWith({
      id: 11155111,
      type: 'Eth',
    });
  });
});

describe('web3 actions - selectSubAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (accountUtils as any).loginApi = vi.fn(async () => undefined);
    (accountUtils as any).isAppStorageSource = vi.fn(() => false);
  });

  const makeContext = ({ nodeIsConnected = true, hasApi = true }: { nodeIsConnected?: boolean; hasApi?: boolean }) => {
    const accountApi = {
      connection: hasApi ? { api: {} } : { api: undefined },
      formatAddress: vi.fn((address: string, withPrefix = true) => (withPrefix ? `fmt:${address}` : `raw:${address}`)),
    };

    return {
      commit: {
        setSubAccount: vi.fn(),
        setSubAccountDialogVisibility: vi.fn(),
        setSelectSubNodeDialogVisibility: vi.fn(),
      },
      state: {
        subAddressSource: 'polkadot-js',
      },
      rootState: {
        bridge: {
          subBridgeConnector: {
            accountApi,
            network: {
              subNetworkConnection: {
                nodeIsConnected,
              },
            },
          },
        },
      },
      getters: {
        subAccount: {
          address: '',
          name: '',
          source: '',
        },
      },
      accountApi,
    };
  };

  it('logs into the selected sub account when the connector is ready', async () => {
    const context = makeContext({});
    const loginApiMock = (accountUtils as any).loginApi as ReturnType<typeof vi.fn>;
    const isAppStorageSourceMock = (accountUtils as any).isAppStorageSource as ReturnType<typeof vi.fn>;
    const account = {
      address: '5SubAccount',
      name: 'Liberland',
      source: 'polkadot-js',
    };

    isAppStorageSourceMock.mockReturnValue(false);

    await (actions as any).selectSubAccount(context, account);

    expect(loginApiMock).toHaveBeenCalledWith(context.accountApi, account, false);
    expect(context.commit.setSubAccount).toHaveBeenCalledWith(account);
    expect(context.commit.setSubAccountDialogVisibility).not.toHaveBeenCalled();
    expect(context.commit.setSelectSubNodeDialogVisibility).not.toHaveBeenCalled();
  });

  it('redirects to sub node selection when the connector is not ready', async () => {
    const context = makeContext({ nodeIsConnected: false, hasApi: false });
    const loginApiMock = (accountUtils as any).loginApi as ReturnType<typeof vi.fn>;
    const account = {
      address: '5SubAccount',
      name: 'Liberland',
      source: 'polkadot-js',
    };

    await (actions as any).selectSubAccount(context, account);

    expect(loginApiMock).not.toHaveBeenCalled();
    expect(context.commit.setSubAccount).not.toHaveBeenCalled();
    expect(context.commit.setSubAccountDialogVisibility).toHaveBeenCalledWith(false);
    expect(context.commit.setSelectSubNodeDialogVisibility).toHaveBeenCalledWith(true);
  });
});
