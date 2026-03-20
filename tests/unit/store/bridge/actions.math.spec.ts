import { FPNumber } from '@sora-substrate/math';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const piniaStub = vi.hoisted(() => ({
  getActivePinia: vi.fn(),
  setActivePinia: vi.fn(),
  createPinia: vi.fn(() => ({})),
  defineStore: vi.fn(),
}));

vi.mock('pinia', () => piniaStub);

const dataPlaneClientMock = vi.hoisted(() => ({
  start: vi.fn(async () => true),
  disconnect: vi.fn(async () => undefined),
  subscribeSubstrateFinalizedHeads: vi.fn(async () => async () => undefined),
}));

const normalizeRealtimeProfileMock = vi.hoisted(() => vi.fn((value: unknown) => value || 'balanced'));
const parseSubstrateHeaderNumberMock = vi.hoisted(() => vi.fn(() => 321));

vi.mock('@/services/realtime', () => ({
  getDataPlaneClient: () => dataPlaneClientMock,
  normalizeRealtimeProfile: normalizeRealtimeProfileMock,
  parseSubstrateHeaderNumber: parseSubstrateHeaderNumberMock,
}));

// Make bridgeActionContext a passthrough and stub default module to avoid importing the full store
vi.mock('@/store/bridge', () => ({ bridgeActionContext: (ctx: any) => ctx, default: {} }));
vi.mock('@/store/bridge/types', () => ({ FocusedField: { Sended: 'Sended', Received: 'Received' } }));
// Stub heavy SDK subpaths required by actions module
vi.mock('@sora-substrate/sdk/build/assets', () => ({
  getAssetBalance: vi.fn(),
  AssetsModule: class {},
  ExtendedAssetsModule: class {},
}));
vi.mock('@sora-substrate/sdk/build/dex/consts', () => ({ DexId: {} }));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/consts', () => ({
  BridgeTxStatus: { Pending: 'Pending' },
  BridgeTxDirection: { Outgoing: 0, Incoming: 1 },
  BridgeNetworkType: { Eth: 'Eth', Evm: 'Evm', Sub: 'Sub' },
}));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/types', () => ({}));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/sub/consts', () => ({ SubNetworkId: {} }));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/sub/types', () => ({}));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/eth/types', () => ({}));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/evm/types', () => ({}));
vi.mock('@sora-substrate/sdk/build/bridgeProxy/eth/consts', () => ({
  BridgeTxDirection: {
    Incoming: 'Incoming',
    Outgoing: 'Outgoing',
  },
  EthNetwork: {
    Ethereum: 0,
  },
}));
vi.mock('@sora-substrate/liquidity-proxy/build/consts', () => ({ LiquiditySourceTypes: {} }));
vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock();
});
vi.mock('@sora-substrate/sdk/build/assets/consts', async () => {
  const assets = await import('@stubs/sdk-assets-consts');

  return {
    ...assets,
    MaxRustNumber: '0xffffffffffffffff',
  };
});
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
vi.mock('@sora-substrate/sdk/build/kensetsu/consts', () => ({ VaultTypes: { V1: 'V1', V2: 'V2' } }));
// Avoid importing app utils that pull element-ui and sdk
vi.mock('@/utils', () => ({}));
vi.mock('@/utils/bridge/sub/classes/adapter', () => ({ SubNetworksConnector: class {} }));
vi.mock('@/utils/connection/evm/providers', () => ({ getProvidersList: () => () => {} }));
vi.mock('@/utils/ethers-util', () => ({ default: {} }));
vi.mock('@/utils/bridge/eth', () => ({ default: { handleTransaction: vi.fn() } }));
vi.mock('@/utils/bridge/eth/api', () => ({ ethBridgeApi: {} }));
vi.mock('@/utils/bridge/evm', () => ({ default: { handleTransaction: vi.fn() } }));
vi.mock('@/utils/bridge/evm/api', () => ({ evmBridgeApi: {} }));
vi.mock('@/utils/bridge/sub', () => ({ default: { handleTransaction: vi.fn() } }));
vi.mock('@/utils/bridge/sub/api', () => ({ subBridgeApi: {} }));
vi.mock('@/utils/bridge/sub/classes/history', () => ({ updateSubBridgeHistory: vi.fn() }));
vi.mock('@/utils/bridge/eth/classes/history', () => ({
  getEthBridgeHistoryInstance: vi.fn(),
  updateEthBridgeHistory: vi.fn(),
}));
vi.mock('@/consts/evm', () => ({
  KnownEthBridgeAsset: { Other: 'Other', XOR: 'XOR', VAL: 'VAL' },
  SmartContractType: { EthBridge: 'ETH_BRIDGE', ERC20: 'ERC20' },
  SmartContracts: { ETH_BRIDGE: {}, ERC20: {} },
}));
vi.mock('@/api', () => ({
  axiosInstance: { defaults: { headers: { common: {} } } },
  default: { defaults: { headers: { common: {} } } },
}));
vi.mock('@/utils/moonpay', () => ({ MoonpayApi: class {} }));

// Mock denomination detection to avoid pulling full SDK
vi.mock('@/utils/bridge/common/utils', () => ({
  isDenominatedAsset: (addr: string) => addr === 'xor',
}));
import actions from '@/store/bridge/actions';
import { api } from '@wallet';

// Helper to build a minimal action context for setSendedAmount/setReceivedAmount
function makeCtx({ isSoraToEvm }: { isSoraToEvm: boolean }) {
  const commits = {
    setFocusedField: vi.fn(),
    setAmountSend: vi.fn(),
    setAmountReceived: vi.fn(),
  };

  const ctx: any = {
    commit: commits,
    state: {
      isSoraToEvm,
      externalTransferFee: '0',
      assetAddress: 'xor', // denominated by default (mocked)
    },
    getters: {
      asset: { externalDecimals: 18, decimals: 18, address: 'xor' },
      isRegisteredAsset: true,
      isEthBridge: true, // we test ETH bridge path
    },
    rootState: {
      web3: { denominator: new FPNumber('1000000') },
    },
  };

  return { ctx, commits };
}

describe('bridge/actions amount math with denomination', () => {
  beforeEach(() => vi.clearAllMocks());

  it('setSendedAmount: SORA -> EVM multiplies by denominator', () => {
    const { ctx, commits } = makeCtx({ isSoraToEvm: true });
    (actions as any).setSendedAmount(ctx, '2');

    // 2 * 1_000_000 => 2,000,000
    expect(commits.setAmountReceived).toHaveBeenCalledTimes(1);
    expect(commits.setAmountReceived.mock.calls[0][0]).toBe('2000000');
  });

  it('setSendedAmount: EVM -> SORA divides by denominator', () => {
    const { ctx, commits } = makeCtx({ isSoraToEvm: false });
    (actions as any).setSendedAmount(ctx, '2000000');

    // 2,000,000 / 1_000_000 => 2
    expect(commits.setAmountReceived).toHaveBeenCalledTimes(1);
    expect(commits.setAmountReceived.mock.calls[0][0]).toBe('2');
  });

  it('setReceivedAmount: SORA -> EVM divides by denominator', () => {
    const { ctx, commits } = makeCtx({ isSoraToEvm: true });
    (actions as any).setReceivedAmount(ctx, '2000000');

    // reverse calc: sended = received / denom => 2
    expect(commits.setAmountSend).toHaveBeenCalledTimes(1);
    expect(commits.setAmountSend.mock.calls[0][0]).toBe('2');
  });

  it('setReceivedAmount: EVM -> SORA multiplies by denominator', () => {
    const { ctx, commits } = makeCtx({ isSoraToEvm: false });
    (actions as any).setReceivedAmount(ctx, '2');

    // reverse calc: sended = received * denom => 2,000,000
    expect(commits.setAmountSend).toHaveBeenCalledTimes(1);
    expect(commits.setAmountSend.mock.calls[0][0]).toBe('2000000');
  });

  it('non-denominated asset: SORA -> EVM applies only fee', () => {
    const { ctx, commits } = makeCtx({ isSoraToEvm: true });
    // set asset as non-denominated
    ctx.state.assetAddress = 'other';
    ctx.getters.asset.address = 'other';
    // set external transfer fee to 1 token (with 18 decimals)
    ctx.state.externalTransferFee = '1000000000000000000';
    (actions as any).setSendedAmount(ctx, '2');
    // 2 - 1 = 1 (no denomination applied)
    expect(commits.setAmountReceived).toHaveBeenCalledTimes(1);
    expect(commits.setAmountReceived.mock.calls[0][0]).toBe('1');
  });

  it('non-denominated asset: EVM -> SORA adds fee on reverse calc', () => {
    const { ctx, commits } = makeCtx({ isSoraToEvm: false });
    ctx.state.assetAddress = 'other';
    ctx.getters.asset.address = 'other';
    ctx.state.externalTransferFee = '1000000000000000000'; // 1
    (actions as any).setReceivedAmount(ctx, '2');
    // reverse calc: sended = received + fee => 3
    expect(commits.setAmountSend).toHaveBeenCalledTimes(1);
    expect(commits.setAmountSend.mock.calls[0][0]).toBe('3');
  });

  it('applies fee and denomination using FPNumber precision for SORA -> EVM', () => {
    const { ctx, commits } = makeCtx({ isSoraToEvm: true });
    ctx.state.externalTransferFee = FPNumber.fromNatural(0.125).toCodecString();
    ctx.rootState.web3.denominator = new FPNumber('1000000');

    (actions as any).setSendedAmount(ctx, '10.5');

    const result = new FPNumber(commits.setAmountReceived.mock.calls[0][0]);
    const fee = FPNumber.fromCodecValue(ctx.state.externalTransferFee, ctx.getters.asset.externalDecimals);
    const expected = new FPNumber('10.5').sub(fee).mul(ctx.rootState.web3.denominator);

    expect(FPNumber.eq(result, expected)).toBe(true);
  });
});

function makeSubscribeContext({
  workerDataPlane = true,
  isSubBridge = false,
  endpoint = 'wss://rpc.test',
}: {
  workerDataPlane?: boolean;
  isSubBridge?: boolean;
  endpoint?: string;
}) {
  let currentBlockUpdatesSubscription: { unsubscribe: () => void } | null = null;
  const setBlockUpdatesSubscription = vi.fn((subscription: { unsubscribe: () => void }) => {
    currentBlockUpdatesSubscription = subscription;
  });
  const resetBlockUpdatesSubscription = vi.fn(() => {
    currentBlockUpdatesSubscription?.unsubscribe();
    currentBlockUpdatesSubscription = null;
  });

  const commit = {
    resetBlockUpdatesSubscription,
    setBlockUpdatesSubscription,
    setExternalBlockNumber: vi.fn(),
    setBalancesFetching: vi.fn(),
    setBalancesBatch: vi.fn(),
    setExternalMinBalance: vi.fn(),
    setFeesAndLockedFundsFetching: vi.fn(),
    setAssetLockedBalance: vi.fn(),
    setExternalNetworkFee: vi.fn(),
    setExternalTransferFee: vi.fn(),
    setSoraNetworkFee: vi.fn(),
  };

  const dispatch = {
    updateExternalBalance: vi.fn().mockResolvedValue(undefined),
  };

  const subNetwork = {
    getBlockNumber: vi.fn().mockResolvedValue(777),
    getNetworkFee: vi.fn().mockResolvedValue('0'),
    getAssetMinDeposit: vi.fn().mockResolvedValue('0'),
    getTokenBalance: vi.fn().mockResolvedValue('0'),
    getTokenBalancesBatch: vi.fn().mockResolvedValue(['0', '0', '0']),
    subNetworkConnection: {
      connection: { endpoint },
      node: { address: endpoint },
    },
  };

  const context: any = {
    commit,
    dispatch,
    getters: {
      isSubBridge,
      isEvmBridge: false,
      isEthBridge: !isSubBridge,
      asset: null,
      isRegisteredAsset: false,
    },
    state: {
      isSoraToEvm: true,
      subBridgeConnector: {
        network: subNetwork,
      },
    },
    rootState: {
      settings: {
        featureFlags: {
          wsWorkerDataPlane: workerDataPlane,
          wsSharedWorker: true,
          wsProfile: 'ultra',
          wsConnectionCaps: 3,
        },
        appConnection: {
          connection: { endpoint },
          node: { address: endpoint },
        },
      },
      web3: {
        networkSelected: null,
        denominator: new FPNumber('1'),
      },
      wallet: {
        account: { address: '' },
        settings: { networkFees: {} },
      },
      assets: {},
    },
    rootGetters: {
      web3: {
        isValidNetwork: false,
        contractAddress: vi.fn(() => ''),
      },
    },
  };

  return {
    context,
    commit,
    dispatch,
    subNetwork,
    getCurrentBlockUpdatesSubscription: () => currentBlockUpdatesSubscription,
  };
}

describe('bridge/actions block updates subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    (api.system as any).updated = {
      subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses worker data-plane subscription when feature flag is enabled', async () => {
    const { context, commit, dispatch } = makeSubscribeContext({ workerDataPlane: true, isSubBridge: true });

    const unsubscribeWorker = vi.fn(async () => undefined);
    let workerHandler: ((payload: unknown) => void) | undefined;
    dataPlaneClientMock.subscribeSubstrateFinalizedHeads.mockImplementationOnce(async (_options, handler) => {
      workerHandler = handler;
      return unsubscribeWorker;
    });

    await (actions as any).subscribeOnBlockUpdates(context);

    expect(dataPlaneClientMock.start).toHaveBeenCalledWith({
      preferSharedWorker: true,
      profile: 'ultra',
      maxConnections: 3,
    });
    expect(dataPlaneClientMock.subscribeSubstrateFinalizedHeads).toHaveBeenCalledTimes(1);
    expect((api.system as any).updated.subscribe).not.toHaveBeenCalled();
    expect(commit.setBlockUpdatesSubscription).toHaveBeenCalledTimes(1);

    workerHandler?.({ header: { number: '0x141' } });
    await vi.runOnlyPendingTimersAsync();

    expect(parseSubstrateHeaderNumberMock).toHaveBeenCalled();
    expect(commit.setExternalBlockNumber).toHaveBeenCalledWith(321);
    expect(dispatch.updateExternalBalance).toHaveBeenCalled();

    const blockSubscription = commit.setBlockUpdatesSubscription.mock.calls[0][0];
    blockSubscription.unsubscribe();
    await vi.runAllTimersAsync();
    await Promise.resolve();

    expect(unsubscribeWorker).toHaveBeenCalledTimes(1);
    expect(dataPlaneClientMock.disconnect).toHaveBeenCalledWith('bridge-substrate:wss://rpc.test');
  });

  it('falls back to api.system.updated when worker data-plane start fails', async () => {
    const { context, commit } = makeSubscribeContext({ workerDataPlane: true, isSubBridge: false });
    const subscribeFallback = vi.fn(() => ({ unsubscribe: vi.fn() }));
    (api.system as any).updated = { subscribe: subscribeFallback };

    dataPlaneClientMock.start.mockRejectedValueOnce(new Error('worker unavailable'));

    await (actions as any).subscribeOnBlockUpdates(context);

    expect(subscribeFallback).toHaveBeenCalledTimes(1);
    expect(commit.setBlockUpdatesSubscription).toHaveBeenCalledTimes(1);
  });

  it('uses api block polling callback for sub bridge when worker flag is disabled', async () => {
    const { context, commit, subNetwork } = makeSubscribeContext({ workerDataPlane: false, isSubBridge: true });

    let onUpdated: FnWithoutArgs | undefined;
    (api.system as any).updated = {
      subscribe: vi.fn((callback: FnWithoutArgs) => {
        onUpdated = callback;
        return { unsubscribe: vi.fn() };
      }),
    };

    await (actions as any).subscribeOnBlockUpdates(context);

    expect((api.system as any).updated.subscribe).toHaveBeenCalledTimes(1);
    expect(dataPlaneClientMock.subscribeSubstrateFinalizedHeads).not.toHaveBeenCalled();

    await onUpdated?.();
    expect(subNetwork.getBlockNumber).toHaveBeenCalledTimes(1);
    expect(commit.setExternalBlockNumber).toHaveBeenCalledWith(777);
  });

  it('serializes prior worker disconnect before starting next block subscription', async () => {
    const { context } = makeSubscribeContext({ workerDataPlane: true, isSubBridge: true });

    const unsubscribeFirst = vi.fn(async () => undefined);
    dataPlaneClientMock.subscribeSubstrateFinalizedHeads.mockImplementationOnce(async () => unsubscribeFirst);

    let resolveDisconnect!: () => void;
    const disconnectGate = new Promise<void>((resolve) => {
      resolveDisconnect = resolve;
    });
    dataPlaneClientMock.disconnect.mockImplementationOnce(() => disconnectGate);

    await (actions as any).subscribeOnBlockUpdates(context);

    const secondSubscribePromise = (actions as any).subscribeOnBlockUpdates(context);

    await Promise.resolve();
    await Promise.resolve();
    expect(dataPlaneClientMock.subscribeSubstrateFinalizedHeads).toHaveBeenCalledTimes(1);

    resolveDisconnect();
    await secondSubscribePromise;

    expect(dataPlaneClientMock.disconnect).toHaveBeenCalledTimes(1);
    expect(dataPlaneClientMock.subscribeSubstrateFinalizedHeads).toHaveBeenCalledTimes(2);
  });
});
