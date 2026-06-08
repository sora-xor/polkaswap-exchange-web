import { FPNumber, Operation } from '@sora-substrate/sdk';
import { DAI, ETH, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { EvmNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/evm/consts';
import { EthAssetKind } from '@sora-substrate/sdk/build/bridgeProxy/eth/consts';
import { createPinia, setActivePinia } from 'pinia';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { beforeTransactionSign } from '@/lib/soraneo-wallet/src/util';
import { api } from '@/lib/soraneo-wallet/src/api';

import { useBridgeStore } from '@/stores/bridge';
import { useMoonpayStore } from '@/stores/moonpay';
import { BridgeFocusedField } from '@/stores/bridge/types';
import { BridgeTransactionSignDialogMode } from '@/utils/bridge/common/types';

const walletStoreMock = vi.hoisted(() => ({
  address: 'sora-address',
  soraAddress: 'sora-address',
  apiKeys: {
    etherscan: 'etherscan-key',
  },
  networkFees: {},
  isSignTxDialogDisabled: true,
  account: {
    name: 'Sora User',
  },
  assets: [
    { address: '0x01', symbol: 'AAA' },
    { address: '0x02', symbol: 'BBB' },
  ],
  assetsDataTable: {
    '0x01': {
      address: '0x01',
      symbol: 'AAA',
      decimals: 18,
      externalAddress: '0xexternal-asset',
      externalDecimals: 18,
      externalBalance: '0',
      balance: { transferable: '0' },
    },
    '0x02': {
      address: '0x02',
      symbol: 'BBB',
      decimals: 18,
      externalAddress: '0xexternal-native',
      externalDecimals: 18,
      externalBalance: '0',
      balance: { transferable: '0' },
    },
  },
  getPassword: vi.fn(() => 'secret'),
}));

const resetWalletAssetsMock = () => {
  walletStoreMock.assets = [
    { address: '0x01', symbol: 'AAA' },
    { address: '0x02', symbol: 'BBB' },
  ];
  walletStoreMock.assetsDataTable = {
    '0x01': {
      address: '0x01',
      symbol: 'AAA',
      decimals: 18,
      externalAddress: '0xexternal-asset',
      externalDecimals: 18,
      externalBalance: '0',
      balance: { transferable: '0' },
    },
    '0x02': {
      address: '0x02',
      symbol: 'BBB',
      decimals: 18,
      externalAddress: '0xexternal-native',
      externalDecimals: 18,
      externalBalance: '0',
      balance: { transferable: '0' },
    },
  };
};

const assetsStoreMock = vi.hoisted(() => ({
  registeredAssets: {},
  assetDataByAddress: vi.fn(),
}));

const web3StoreMock = vi.hoisted(() => ({
  networkType: 'Eth',
  networkSelected: 'network',
  selectedNetworkData: null,
  isValidNetwork: false,
  subAddress: '',
  subAddressName: '',
  evmAddress: '',
  ethBridgeEvmNetwork: 0,
  ethBridgeContractAddress: {
    XOR: '0xcontract-xor',
    VAL: '0xcontract-val',
    OTHER: '0xcontract-other',
  },
  denominator: 1 as any,
  contractAddress: vi.fn(),
}));

const settingsStoreMock = vi.hoisted(() => ({
  featureFlags: {
    wsWorkerDataPlane: false,
    wsSharedWorker: true,
    wsProfile: 'ultra',
    wsConnectionCaps: 3,
  },
  appConnection: {
    connection: {
      endpoint: 'wss://rpc.test',
    },
    node: {
      address: 'wss://rpc.test',
    },
  },
}));

const subBridgeApiMock = vi.hoisted(() => ({
  isStandalone: vi.fn<(network: unknown) => boolean>(),
  getRelayChain: vi.fn<(network: unknown) => string>(),
  isEvmAccount: vi.fn<(network: unknown) => boolean>(),
  history: {} as Record<string, any>,
  getLockedAssets: vi.fn(async () => FPNumber.fromNatural(5).toCodecString()),
  getNetworkFee: vi.fn(async () => '7'),
  generateHistoryItem: vi.fn(),
  removeHistory: vi.fn<(id: string) => void>(),
}));

const ethBridgeApiMock = vi.hoisted(() => ({
  history: {} as Record<string, any>,
  getHistory: vi.fn<(id: string) => any>(),
  getLockedAssets: vi.fn(async () => FPNumber.fromNatural(5).toCodecString()),
  generateHistoryItem: vi.fn(),
  removeHistory: vi.fn<(id: string) => void>(),
}));

const evmBridgeApiMock = vi.hoisted(() => ({
  history: {} as Record<string, any>,
  generateHistoryItem: vi.fn(),
  removeHistory: vi.fn<(id: string) => void>(),
}));

const ethBridgeMock = vi.hoisted(() => ({
  handleTransaction: vi.fn(async () => undefined),
}));

const evmBridgeMock = vi.hoisted(() => ({
  handleTransaction: vi.fn(async () => undefined),
}));

const subBridgeMock = vi.hoisted(() => ({
  handleTransaction: vi.fn(async () => undefined),
}));

const getEthBridgeHistoryInstanceMock = vi.hoisted(() => vi.fn(async () => ({ id: 'eth-history-instance' })));
const updateEthBridgeHistoryMock = vi.hoisted(() => vi.fn());
const updateEvmBridgeHistoryMock = vi.hoisted(() => vi.fn());
const updateSubBridgeHistoryMock = vi.hoisted(() => vi.fn());

const waitForApprovedRequestMock = vi.hoisted(() =>
  vi.fn(async () => ({
    to: '0xrecipient',
  }))
);

const getOutgoingEvmTransactionDataMock = vi.hoisted(() =>
  vi.fn(async () => ({
    contract: {
      bridgeTransfer: vi.fn(async () => ({ hash: '0xoutgoing-tx' })),
    },
    method: 'bridgeTransfer',
    args: ['arg-1', 'arg-2'],
  }))
);

const getIncomingEvmTransactionDataMock = vi.hoisted(() =>
  vi.fn(async () => ({
    contract: {
      sendERC20ToSidechain: vi.fn(async () => ({ hash: '0xincoming-tx' })),
    },
    method: 'sendERC20ToSidechain',
    args: ['incoming-arg-1', 'incoming-arg-2'],
  }))
);

const getEthNetworkFeeMock = vi.hoisted(() => vi.fn(async () => '9'));
const waitForEvmTransactionMinedMock = vi.hoisted(() => vi.fn(async () => undefined));
const getSoraAssetBalanceMock = vi.hoisted(() => vi.fn(async () => ({ transferable: '33' })));
const dataPlaneClientMock = vi.hoisted(() => ({
  start: vi.fn(async () => true),
  disconnect: vi.fn(async () => undefined),
  subscribeSubstrateFinalizedHeads: vi.fn(async () => async () => undefined),
}));
const normalizeRealtimeProfileMock = vi.hoisted(() => vi.fn((value: unknown) => value || 'balanced'));
const parseSubstrateHeaderNumberMock = vi.hoisted(() => vi.fn(() => 321));

const ethersUtilMock = vi.hoisted(() => ({
  addressesAreEqual: vi.fn((left?: string, right?: string) => left?.toLowerCase() === right?.toLowerCase()),
  checkAccountIsConnected: vi.fn(async () => true),
  getAccountAssetBalance: vi.fn(async () => '7'),
  getBlockNumber: vi.fn(async () => 777),
  getAllowance: vi.fn(async () => '0'),
  getErc20BalancesBatch: vi.fn(async (pairs: Array<{ token: string; account: string }>) =>
    pairs.map((pair) => ({
      ...pair,
      balance: pair.account === '0xsender' ? '11' : pair.account === '0xrecipient' ? '22' : '0',
    }))
  ),
  isNativeEvmTokenAddress: vi.fn(() => false),
  getTokenContract: vi.fn(async () => ({
    approve: vi.fn(async () => ({ hash: '0xapprove-tx' })),
  })),
}));

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');

  return createWalletMock({});
});

vi.mock('@/lib/soraneo-wallet/src/util', async () => {
  const actual = await vi.importActual<typeof import('@/lib/soraneo-wallet/src/util')>('@/lib/soraneo-wallet/src/util');

  return {
    ...actual,
    beforeTransactionSign: vi.fn(),
  };
});

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStoreMock,
}));

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => assetsStoreMock,
}));

vi.mock('@/stores/web3', () => ({
  useWeb3Store: () => web3StoreMock,
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/utils/bridge/sub/api', () => ({
  subBridgeApi: subBridgeApiMock,
}));

vi.mock('@/utils/bridge/eth/api', () => ({
  ethBridgeApi: ethBridgeApiMock,
}));

vi.mock('@/utils/bridge/evm/api', () => ({
  evmBridgeApi: evmBridgeApiMock,
}));

vi.mock('@/utils/bridge/eth', () => ({
  default: ethBridgeMock,
}));

vi.mock('@/utils/bridge/evm', () => ({
  default: evmBridgeMock,
}));

vi.mock('@/utils/bridge/sub', () => ({
  default: subBridgeMock,
}));

vi.mock('@/utils/bridge/eth/classes/history', () => ({
  getEthBridgeHistoryInstance: getEthBridgeHistoryInstanceMock,
  updateEthBridgeHistory: updateEthBridgeHistoryMock,
}));

vi.mock('@/utils/bridge/evm/classes/history', () => ({
  updateEvmBridgeHistory: updateEvmBridgeHistoryMock,
}));

vi.mock('@/utils/bridge/eth/utils', () => ({
  getEthNetworkFee: getEthNetworkFeeMock,
  waitForApprovedRequest: waitForApprovedRequestMock,
  getIncomingEvmTransactionData: getIncomingEvmTransactionDataMock,
  getOutgoingEvmTransactionData: getOutgoingEvmTransactionDataMock,
}));

vi.mock('@/utils/bridge/common/utils', async () => {
  const actual = await vi.importActual<typeof import('@/utils/bridge/common/utils')>('@/utils/bridge/common/utils');

  return {
    ...actual,
    waitForEvmTransactionMined: waitForEvmTransactionMinedMock,
  };
});

vi.mock('@sora-substrate/sdk/build/assets', async () => {
  const actual = await vi.importActual<typeof import('@sora-substrate/sdk/build/assets')>(
    '@sora-substrate/sdk/build/assets'
  );

  return {
    ...actual,
    getAssetBalance: getSoraAssetBalanceMock,
  };
});

vi.mock('@/utils/ethers-util', () => ({
  default: ethersUtilMock,
}));

vi.mock('@/utils/bridge/sub/classes/history', () => ({
  updateSubBridgeHistory: updateSubBridgeHistoryMock,
}));

vi.mock('@/services/realtime', () => ({
  getDataPlaneClient: () => dataPlaneClientMock,
  normalizeRealtimeProfile: normalizeRealtimeProfileMock,
  parseSubstrateHeaderNumber: parseSubstrateHeaderNumberMock,
}));

const createConnectorMock = () => ({
  network: {
    connection: {
      api: {
        registry: {
          chainSS58: 42,
        },
      },
    },
    subNetworkConnection: {
      connection: {
        endpoint: 'wss://rpc.test',
      },
      node: {
        address: 'wss://rpc.test',
      },
      nodeIsConnected: true,
    },
    getBlockNumber: vi.fn(async () => 777),
    getAssetMinDeposit: vi.fn(async () => '13'),
    getNetworkFee: vi.fn(async () => '7'),
    getTokenBalance: vi.fn(async () => '0'),
    getTokenBalancesBatch: vi.fn(async () => ['11', '22', '7']),
    formatAddress: vi.fn((address: string) => `formatted-${address}`),
  },
});

const createSeededBridgeState = () => {
  const connector = createConnectorMock();

  return {
    connector,
    state: {
      form: {
        isSoraToEvm: true,
        assetAddress: '0x01',
        amountSend: '',
        amountReceived: '',
        focusedField: null,
      },
      balances: {
        assetSenderBalance: '100',
        assetRecipientBalance: '50',
        assetLockedBalance: null,
        assetExternalMinBalance: '1',
        incomingMinLimit: FPNumber.ZERO,
        outgoingMinLimit: null,
        outgoingMaxLimit: null,
      },
      fees: {
        soraNetworkFee: '2',
        externalTransferFee: '3',
        externalNetworkFee: '4',
        externalNativeBalance: '5',
        externalBlockNumber: 10,
      },
      flags: {
        balancesFetching: false,
        feesAndLockedFundsFetching: false,
        isSignTxDialogVisible: false,
      },
      history: {
        internal: {
          'tx-legacy': {
            id: 'tx-legacy',
            type: Operation.EthBridgeOutgoing,
          },
        },
        page: 1,
        id: 'tx-legacy',
        loading: {},
        waitingForApprove: {},
        inProgressIds: {},
        notificationData: null,
      },
      subscriptions: {
        outgoingMaxLimit: null,
        blockUpdates: null,
      },
      connector: connector as any,
    },
  };
};

describe('useBridgeStore', () => {
  let store: ReturnType<typeof useBridgeStore>;
  let seededConnector: ReturnType<typeof createConnectorMock>;

  beforeEach(() => {
    setActivePinia(createPinia());

    resetWalletAssetsMock();
    assetsStoreMock.registeredAssets = {
      '0x01': {
        address: '0xexternal-asset',
        decimals: 18,
        kind: 'Other',
      },
      '0x02': {
        address: '0xexternal-native',
        decimals: 18,
        kind: EthAssetKind.Sidechain,
      },
    };
    assetsStoreMock.assetDataByAddress.mockReset();
    assetsStoreMock.assetDataByAddress.mockImplementation((address?: string | null) => {
      if (!address) return null;

      return walletStoreMock.assetsDataTable[address] ?? null;
    });

    web3StoreMock.networkType = BridgeNetworkType.Eth;
    web3StoreMock.networkSelected = EvmNetworkId.EthereumSepolia;
    web3StoreMock.selectedNetworkData = {
      nativeCurrency: {
        symbol: 'BBB',
      },
    };
    web3StoreMock.isValidNetwork = true;
    web3StoreMock.subAddress = 'sub-address';
    web3StoreMock.subAddressName = 'Sub User';
    web3StoreMock.evmAddress = '0xrecipient';
    web3StoreMock.ethBridgeEvmNetwork = EvmNetworkId.EthereumSepolia;
    web3StoreMock.denominator = 1 as any;
    web3StoreMock.ethBridgeContractAddress = {
      XOR: '0xcontract-xor',
      VAL: '0xcontract-val',
      OTHER: '0xcontract-other',
    };
    web3StoreMock.contractAddress.mockReset();
    web3StoreMock.contractAddress.mockReturnValue('0xcontract-other');

    subBridgeApiMock.isStandalone.mockReset();
    subBridgeApiMock.isStandalone.mockReturnValue(false);
    subBridgeApiMock.getRelayChain.mockReset();
    subBridgeApiMock.getRelayChain.mockReturnValue('relay-chain');
    subBridgeApiMock.isEvmAccount.mockReset();
    subBridgeApiMock.isEvmAccount.mockReturnValue(false);
    subBridgeApiMock.getLockedAssets.mockReset();
    subBridgeApiMock.getLockedAssets.mockResolvedValue(FPNumber.fromNatural(5).toCodecString());
    subBridgeApiMock.getNetworkFee.mockReset();
    subBridgeApiMock.getNetworkFee.mockResolvedValue('7');
    subBridgeApiMock.history = {};
    subBridgeApiMock.generateHistoryItem.mockReset();
    subBridgeApiMock.removeHistory.mockReset();

    ethBridgeApiMock.history = {
      'tx-legacy': {
        id: 'tx-legacy',
        type: Operation.EthBridgeOutgoing,
        externalNetwork: EvmNetworkId.EthereumSepolia,
      },
    };
    ethBridgeApiMock.getHistory.mockReset();
    ethBridgeApiMock.getHistory.mockImplementation((id: string) => ethBridgeApiMock.history[id] ?? null);
    ethBridgeApiMock.getLockedAssets.mockReset();
    ethBridgeApiMock.getLockedAssets.mockResolvedValue(FPNumber.fromNatural(5).toCodecString());
    ethBridgeApiMock.generateHistoryItem.mockReset();
    ethBridgeApiMock.generateHistoryItem.mockImplementation((data: Record<string, any>) => {
      const id = `tx-generated-${Object.keys(ethBridgeApiMock.history).length + 1}`;
      const historyItem = { id, ...data };
      ethBridgeApiMock.history[id] = historyItem;
      return historyItem;
    });
    ethBridgeApiMock.removeHistory.mockReset();
    ethBridgeApiMock.removeHistory.mockImplementation((id: string) => {
      delete ethBridgeApiMock.history[id];
    });

    evmBridgeApiMock.history = {};
    evmBridgeApiMock.generateHistoryItem.mockReset();
    evmBridgeApiMock.removeHistory.mockReset();

    ethBridgeMock.handleTransaction.mockClear();
    evmBridgeMock.handleTransaction.mockClear();
    subBridgeMock.handleTransaction.mockClear();
    getEthBridgeHistoryInstanceMock.mockClear();
    updateEthBridgeHistoryMock.mockReset();
    updateEthBridgeHistoryMock.mockImplementation(
      () =>
        async (_clearHistory = false, updateCallback?: VoidFunction) => {
          await updateCallback?.();
        }
    );
    updateEvmBridgeHistoryMock.mockReset();
    updateEvmBridgeHistoryMock.mockImplementation(
      () =>
        async (_clearHistory = false, updateCallback?: VoidFunction) => {
          await updateCallback?.();
        }
    );
    updateSubBridgeHistoryMock.mockReset();
    updateSubBridgeHistoryMock.mockImplementation(
      () =>
        async (_clearHistory = false, updateCallback?: VoidFunction) => {
          await updateCallback?.();
        }
    );
    waitForApprovedRequestMock.mockClear();
    getOutgoingEvmTransactionDataMock.mockClear();
    getIncomingEvmTransactionDataMock.mockClear();
    getEthNetworkFeeMock.mockClear();
    waitForEvmTransactionMinedMock.mockClear();
    getSoraAssetBalanceMock.mockReset();
    getSoraAssetBalanceMock.mockResolvedValue({ transferable: '33' });
    dataPlaneClientMock.start.mockClear();
    dataPlaneClientMock.disconnect.mockClear();
    dataPlaneClientMock.subscribeSubstrateFinalizedHeads.mockClear();
    normalizeRealtimeProfileMock.mockClear();
    parseSubstrateHeaderNumberMock.mockClear();
    ethersUtilMock.addressesAreEqual.mockClear();
    ethersUtilMock.checkAccountIsConnected.mockClear();
    ethersUtilMock.getAccountAssetBalance.mockClear();
    ethersUtilMock.getBlockNumber.mockClear();
    ethersUtilMock.getAllowance.mockClear();
    ethersUtilMock.getErc20BalancesBatch.mockClear();
    ethersUtilMock.isNativeEvmTokenAddress.mockClear();
    ethersUtilMock.getTokenContract.mockClear();

    walletStoreMock.networkFees = {};
    settingsStoreMock.featureFlags.wsWorkerDataPlane = false;
    settingsStoreMock.featureFlags.wsSharedWorker = true;
    settingsStoreMock.featureFlags.wsProfile = 'ultra';
    settingsStoreMock.featureFlags.wsConnectionCaps = 3;
    settingsStoreMock.appConnection.connection.endpoint = 'wss://rpc.test';
    settingsStoreMock.appConnection.node.address = 'wss://rpc.test';
    (api.system as any).updated = {
      subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    };
    (api.bridgeProxy as any).isAssetTransferLimited = vi.fn(async () => true);
    (api.bridgeProxy as any).getCurrentTransferLimitObservable = vi.fn(() => of('100'));
    (api.swap as any).getSwapQuoteObservable = vi.fn(() =>
      of({
        quote: vi.fn(() => ({
          result: {
            amount: '5',
          },
        })),
      })
    );

    vi.mocked(beforeTransactionSign).mockClear();

    store = useBridgeStore();
    const seeded = createSeededBridgeState();
    seededConnector = seeded.connector;
    store.$patch((state) => {
      state.form = seeded.state.form as any;
      state.balances = seeded.state.balances as any;
      state.fees = seeded.state.fees as any;
      state.flags = seeded.state.flags as any;
      state.history = seeded.state.history as any;
      state.subscriptions = seeded.state.subscriptions as any;
      state.connector = seeded.state.connector as any;
    });
  });

  it('derives eth-bridge metadata from wallet, assets, and web3 Pinia stores', () => {
    expect(store.form.assetAddress).toBe('0x01');
    expect(store.isSoraToEvm).toBe(true);
    expect(store.canSubmit).toBe(false);
    expect(store.asset?.symbol).toBe('AAA');
    expect(store.asset?.balance?.transferable).toBe('100');
    expect(store.asset?.externalBalance).toBe('50');
    expect(store.nativeToken?.address).toBe('0x02');
    expect(store.sender).toBe('sora-address');
    expect(store.recipient).toBe('0xrecipient');
    expect(store.externalAccount).toBe('0xrecipient');
    expect(store.isNativeTokenSelected).toBe(false);
    expect(store.isSidechainAsset).toBe(false);
    expect(store.isRegisteredAsset).toBe(true);
    expect(store.isValidNetwork).toBe(true);
    expect(store.autoselectedAssetAddress).toBeNull();
    expect(store.networkHistoryId).toBe(EvmNetworkId.EthereumSepolia);
    expect(store.operation).toBe(Operation.EthBridgeOutgoing);
    expect(store.historyRecord['tx-legacy']).toEqual({
      id: 'tx-legacy',
      type: Operation.EthBridgeOutgoing,
    });
    expect(store.activeTransaction).toEqual({
      id: 'tx-legacy',
      type: Operation.EthBridgeOutgoing,
    });
    expect(store.subBridgeConnector).toStrictEqual(seededConnector);
  });

  it('keeps DAI registered when wallet metadata lacks bridge external fields', () => {
    const daiAsset = {
      address: DAI.address,
      symbol: DAI.symbol,
      decimals: DAI.decimals,
      balance: { transferable: '0' },
    };

    walletStoreMock.assets = [...walletStoreMock.assets, daiAsset];
    walletStoreMock.assetsDataTable = {
      ...walletStoreMock.assetsDataTable,
      [DAI.address]: daiAsset,
    };
    assetsStoreMock.registeredAssets = {
      [DAI.address]: {
        address: '0xdai-external',
        decimals: 18,
        kind: EthAssetKind.Sidechain,
      },
    };
    assetsStoreMock.assetDataByAddress.mockImplementation((address?: string | null) => {
      if (address === DAI.address) {
        return {
          ...daiAsset,
          externalAddress: '0xdai-external',
          externalDecimals: 18,
          externalBalance: '0',
        };
      }

      return address ? ((walletStoreMock.assetsDataTable as Record<string, unknown>)[address] ?? null) : null;
    });

    store.updateForm({ assetAddress: DAI.address });

    expect(store.asset?.symbol).toBe('DAI');
    expect(store.asset?.externalAddress).toBe('0xdai-external');
    expect(store.isRegisteredAsset).toBe(true);
  });

  it('does not trust stale wallet bridge metadata when the registry omits DAI', () => {
    const staleDaiAsset = {
      address: DAI.address,
      symbol: DAI.symbol,
      decimals: DAI.decimals,
      externalAddress: '0xstale-dai',
      externalDecimals: 18,
      externalBalance: '0',
      balance: { transferable: '0' },
    };

    walletStoreMock.assets = [...walletStoreMock.assets, staleDaiAsset];
    walletStoreMock.assetsDataTable = {
      ...walletStoreMock.assetsDataTable,
      [DAI.address]: staleDaiAsset,
    };
    assetsStoreMock.registeredAssets = {};
    assetsStoreMock.assetDataByAddress.mockImplementation((address?: string | null) => {
      if (address === DAI.address) {
        return {
          ...staleDaiAsset,
          externalAddress: undefined,
          externalDecimals: undefined,
          externalBalance: '0',
        };
      }

      return address ? ((walletStoreMock.assetsDataTable as Record<string, unknown>)[address] ?? null) : null;
    });

    store.updateForm({ assetAddress: DAI.address });

    expect(store.asset?.symbol).toBe('DAI');
    expect(store.asset?.externalAddress).toBeUndefined();
    expect(store.isRegisteredAsset).toBe(false);
    expect(store.isSidechainAsset).toBe(false);
  });

  it('uses the live SORA account balance while bridge balance fetching is pending', () => {
    const staleWalletAsset = {
      ...walletStoreMock.assetsDataTable['0x01'],
      balance: { transferable: '0' },
    };
    const liveAccountAsset = {
      ...staleWalletAsset,
      balance: { transferable: '123000000000000000000' },
    };

    walletStoreMock.assetsDataTable = {
      ...walletStoreMock.assetsDataTable,
      '0x01': staleWalletAsset,
    };
    assetsStoreMock.assetDataByAddress.mockImplementation((address?: string | null) => {
      if (address === '0x01') return liveAccountAsset;

      return address ? ((walletStoreMock.assetsDataTable as Record<string, unknown>)[address] ?? null) : null;
    });
    store.balances.assetSenderBalance = null;
    store.updateForm({ isSoraToEvm: true, assetAddress: '0x01' });

    expect(store.asset?.balance.transferable).toBe('123000000000000000000');
  });

  it('resolves the native bridge token from registered known assets before wallet lists load', () => {
    walletStoreMock.assets = [];
    walletStoreMock.assetsDataTable = {};
    web3StoreMock.selectedNetworkData = {
      nativeCurrency: {
        symbol: ETH.symbol,
      },
    };
    assetsStoreMock.registeredAssets = {
      [ETH.address]: {
        address: '0xnative-eth',
        decimals: 18,
        kind: EthAssetKind.Sidechain,
      },
    };
    assetsStoreMock.assetDataByAddress.mockImplementation((address?: string | null) => {
      if (address === ETH.address) {
        return {
          ...ETH,
          externalAddress: '0xnative-eth',
          externalDecimals: 18,
          externalBalance: '0',
        };
      }

      return null;
    });

    expect(store.nativeToken?.address).toBe(ETH.address);
    expect(store.nativeToken?.externalAddress).toBe('0xnative-eth');
  });

  it('does not resolve a spoofed native token symbol when the asset is not registered', () => {
    walletStoreMock.assets = [{ address: '0xspoof-native', symbol: ETH.symbol }];
    walletStoreMock.assetsDataTable = {
      '0xspoof-native': {
        address: '0xspoof-native',
        symbol: ETH.symbol,
        decimals: 18,
        externalAddress: '0xspoof-external',
        externalDecimals: 18,
        externalBalance: '0',
        balance: { transferable: '0' },
      },
      '0x01': {
        address: '0x01',
        symbol: 'AAA',
        decimals: 18,
        externalAddress: '0xexternal-asset',
        externalDecimals: 18,
        externalBalance: '0',
        balance: { transferable: '0' },
      },
    };
    web3StoreMock.selectedNetworkData = {
      nativeCurrency: {
        symbol: ETH.symbol,
      },
    };
    assetsStoreMock.registeredAssets = {
      '0x01': {
        address: '0xexternal-asset',
        decimals: 18,
        kind: EthAssetKind.Sidechain,
      },
    };
    assetsStoreMock.assetDataByAddress.mockImplementation((address?: string | null) =>
      address ? ((walletStoreMock.assetsDataTable as Record<string, unknown>)[address] ?? null) : null
    );

    expect(store.nativeToken).toBeNull();
  });

  it('derives sub-bridge network/account metadata without legacy bridge state', () => {
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = 'kusama' as any;
    subBridgeApiMock.getRelayChain.mockReturnValue('polkadot');
    subBridgeApiMock.isEvmAccount.mockReturnValue(false);
    store.updateForm({ isSoraToEvm: false });

    expect(store.isSubBridge).toBe(true);
    expect(store.isSubAccountType).toBe(true);
    expect(store.sender).toBe('formatted-sub-address');
    expect(store.recipient).toBe('sora-address');
    expect(store.senderName).toBe('Sub User');
    expect(store.recipientName).toBe('Sora User');
    expect(store.networkHistoryId).toBe('polkadot');
    expect(store.operation).toBe(Operation.SubstrateIncoming);
  });

  it('formats Sub bridge accounts through the selected network instance', () => {
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = 'Liberland' as any;
    (seededConnector.network as any).formatAddress = function (this: any, address: string): string {
      return `${this.connection.api.registry.chainSS58}:${address}`;
    };

    store.updateForm({ isSoraToEvm: true });

    expect(store.sender).toBe('sora-address');
    expect(store.recipient).toBe('42:sub-address');

    store.updateForm({ isSoraToEvm: false });

    expect(store.sender).toBe('42:sub-address');
    expect(store.recipient).toBe('sora-address');
  });

  it('falls back to the raw Sub bridge account when network formatting throws', async () => {
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = 'Liberland' as any;
    (seededConnector.network as any).formatAddress = vi.fn(() => {
      throw new Error('formatter unavailable');
    });
    store.updateForm({ isSoraToEvm: true });

    expect(store.recipient).toBe('sub-address');

    await expect(store.updateExternalBalance()).resolves.toBeUndefined();

    expect(seededConnector.network.getTokenBalancesBatch).toHaveBeenCalledWith([
      { accountAddress: 'sora-address', asset: expect.objectContaining({ address: '0x01' }) },
      { accountAddress: 'sub-address', asset: expect.objectContaining({ address: '0x01' }) },
      { accountAddress: 'sora-address', asset: expect.objectContaining({ address: '0x02' }) },
    ]);
    expect(store.balances.assetSenderBalance).toBe('11');
    expect(store.balances.assetRecipientBalance).toBe('22');
    expect(store.fees.externalNativeBalance).toBe('7');
    expect(store.flags.balancesFetching).toBe(false);
  });

  it('rejects malformed Sub bridge formatter output and keeps raw account text', () => {
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = 'Liberland' as any;
    store.updateForm({ isSoraToEvm: true });

    for (const formatted of ['', null, { address: 'spoofed-address' }]) {
      (seededConnector.network as any).formatAddress = vi.fn(() => formatted);

      expect(store.recipient).toBe('sub-address');
    }
  });

  it('updates local form helpers and derived submit state', () => {
    store.updateForm({ amountSend: '10', amountReceived: '9' });
    store.setFocusedField(BridgeFocusedField.Received);
    store.toggleDirection();

    expect(store.canSubmit).toBe(true);
    expect(store.form.amountSend).toBe('10');
    expect(store.form.amountReceived).toBe('9');
    expect(store.form.focusedField).toBe(BridgeFocusedField.Received);
    expect(store.isSoraToEvm).toBe(false);
  });

  it('does not allow submit for non-positive or non-finite form amounts', () => {
    for (const amountSend of ['0', '-1', 'NaN', 'Infinity', '   ']) {
      store.updateForm({ amountSend });

      expect(store.canSubmit).toBe(false);
    }

    store.updateForm({ amountSend: '0.0000001' });
    expect(store.canSubmit).toBe(true);
  });

  it('updates history page and history id on the canonical bridge store', () => {
    store.setHistoryPage(3.7);
    store.setHistoryId('tx-updated');

    expect(store.history.page).toBe(3);
    expect(store.history.id).toBe('tx-updated');
  });

  it('keeps the active bridge transaction available when execution advances to chain identifiers', () => {
    const tx = {
      id: 'tx-local',
      type: Operation.EvmOutgoing,
      externalNetwork: EvmNetworkId.EthereumSepolia,
      hash: '0xsora-hash',
      txId: '0xsora-tx',
      externalHash: '0xexternal-hash',
    } as any;

    store.history.internal = {
      'tx-local': tx,
    };

    store.setHistoryId('0xsora-hash');

    expect(store.activeTransaction).toMatchObject(tx);
    expect(store.getHistoryTransaction('tx-local')).toMatchObject(tx);
    expect(store.getHistoryTransaction('0xsora-tx')).toMatchObject(tx);
    expect(store.getHistoryTransaction('0xexternal-hash')).toMatchObject(tx);
  });

  it('preserves the selected bridge transaction when a history refresh temporarily omits it', async () => {
    const tx = {
      id: 'tx-local',
      type: Operation.EthBridgeOutgoing,
      externalNetwork: EvmNetworkId.EthereumSepolia,
      hash: '0xsora-hash',
      transactionState: 'Pending',
    } as any;

    store.history.internal = {
      'tx-local': tx,
    };
    store.setHistoryId('0xsora-hash');
    ethBridgeApiMock.history = {};

    await store.updateInternalHistory();

    expect(store.activeTransaction).toMatchObject(tx);
    expect(store.history.internal['tx-local']).toMatchObject(tx);
  });

  it('drops stale bridge transactions on refresh when none are selected or in progress', async () => {
    store.history.internal = {
      'tx-stale': {
        id: 'tx-stale',
        type: Operation.EthBridgeOutgoing,
        externalNetwork: EvmNetworkId.EthereumSepolia,
      } as any,
    };
    store.setHistoryId();
    ethBridgeApiMock.history = {};

    await store.updateInternalHistory();

    expect(store.history.internal).toEqual({});
  });

  it('updates notification, in-progress state, and sign dialog visibility on the canonical bridge store', () => {
    const tx = { id: 'tx-note' } as any;

    store.setNotificationData(tx);
    store.addTransactionToProgress('tx-progress');
    store.removeTransactionFromProgress('tx-progress');
    store.setSignTxDialogVisibility(true);

    expect(store.history.notificationData).toEqual(tx);
    expect(store.history.inProgressIds['tx-progress']).toBeUndefined();
    expect(store.flags.isSignTxDialogVisible).toBe(true);
  });

  it('updates bridge history locally through direct bridge helpers', async () => {
    ethBridgeApiMock.history = {
      'tx-eth': {
        id: 'tx-eth',
        type: Operation.EthBridgeOutgoing,
        externalNetwork: EvmNetworkId.EthereumSepolia,
      },
      'tx-other': {
        id: 'tx-other',
        type: Operation.EthBridgeOutgoing,
        externalNetwork: 'other-network',
      },
    };
    store.setHistoryId();

    await store.updateBridgeHistory();

    expect(updateEthBridgeHistoryMock).toHaveBeenCalled();
    expect(store.historyRecord).toEqual({
      'tx-eth': {
        id: 'tx-eth',
        type: Operation.EthBridgeOutgoing,
        externalNetwork: EvmNetworkId.EthereumSepolia,
      },
    });
    expect(store.history.internal).toEqual(store.historyRecord);
  });

  it('updates external history through direct bridge helpers while syncing loading state', async () => {
    ethBridgeApiMock.history = {
      'tx-eth-history': {
        id: 'tx-eth-history',
        type: Operation.EthBridgeOutgoing,
        externalNetwork: EvmNetworkId.EthereumSepolia,
      },
    };

    await store.updateExternalHistory(true);

    expect(updateEthBridgeHistoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rootState: expect.objectContaining({
          wallet: expect.objectContaining({
            account: expect.objectContaining({
              address: 'sora-address',
            }),
            settings: expect.objectContaining({
              apiKeys: expect.objectContaining({
                etherscan: 'etherscan-key',
              }),
            }),
          }),
          web3: expect.objectContaining({
            networkSelected: EvmNetworkId.EthereumSepolia,
            ethBridgeEvmNetwork: EvmNetworkId.EthereumSepolia,
            ethBridgeContractAddress: {
              XOR: '0xcontract-xor',
              VAL: '0xcontract-val',
              OTHER: '0xcontract-other',
            },
          }),
          bridge: expect.objectContaining({
            subBridgeConnector: seededConnector,
          }),
        }),
      })
    );
    expect(store.history.loading[EvmNetworkId.EthereumSepolia]).toBeUndefined();
    expect(store.historyRecord['tx-eth-history']).toEqual({
      id: 'tx-eth-history',
      type: Operation.EthBridgeOutgoing,
      externalNetwork: EvmNetworkId.EthereumSepolia,
    });
  });

  it('restores EVM bridge history through the Polkaswap indexer helper', async () => {
    web3StoreMock.networkType = BridgeNetworkType.Evm;
    web3StoreMock.networkSelected = EvmNetworkId.EthereumSepolia;

    await store.updateExternalHistory(true);

    expect(updateEvmBridgeHistoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rootState: expect.objectContaining({
          wallet: expect.objectContaining({
            account: expect.objectContaining({
              address: 'sora-address',
            }),
          }),
          web3: expect.objectContaining({
            networkSelected: EvmNetworkId.EthereumSepolia,
          }),
          bridge: expect.objectContaining({
            inProgressIds: {},
          }),
        }),
      })
    );
    expect(store.history.loading[EvmNetworkId.EthereumSepolia]).toBeUndefined();
  });

  it('clears EVM history loading when the indexer history update fails', async () => {
    const indexerError = new Error('history indexer unavailable');

    web3StoreMock.networkType = BridgeNetworkType.Evm;
    web3StoreMock.networkSelected = EvmNetworkId.EthereumSepolia;
    updateEvmBridgeHistoryMock.mockReturnValueOnce(async () => {
      throw indexerError;
    });

    await expect(store.updateExternalHistory(true)).rejects.toThrow(indexerError);

    expect(updateEvmBridgeHistoryMock).toHaveBeenCalledTimes(1);
    expect(store.history.loading[EvmNetworkId.EthereumSepolia]).toBeUndefined();
  });

  it('does not start a duplicate EVM history fetch while one is already loading', async () => {
    let resolveHistoryUpdate!: () => void;
    const historyUpdateGate = new Promise<void>((resolve) => {
      resolveHistoryUpdate = resolve;
    });

    web3StoreMock.networkType = BridgeNetworkType.Evm;
    web3StoreMock.networkSelected = EvmNetworkId.EthereumSepolia;
    updateEvmBridgeHistoryMock.mockReturnValueOnce(async () => {
      await historyUpdateGate;
    });

    const firstUpdate = store.updateExternalHistory(true);
    await Promise.resolve();
    await store.updateExternalHistory(true);

    expect(updateEvmBridgeHistoryMock).toHaveBeenCalledTimes(1);
    expect(store.history.loading[EvmNetworkId.EthereumSepolia]).toBe(true);

    resolveHistoryUpdate();
    await firstUpdate;

    expect(store.history.loading[EvmNetworkId.EthereumSepolia]).toBeUndefined();
  });

  it('generates and removes history while keeping moonpay account records aligned', async () => {
    const moonpayStore = useMoonpayStore();
    moonpayStore.api = {
      accountRecords: {},
    } as any;

    const generated = (await store.generateHistoryItem({
      payload: {
        moonpayId: 'moonpay-1',
      },
    })) as Record<string, any>;

    expect(ethBridgeApiMock.generateHistoryItem).toHaveBeenCalled();
    expect(store.historyRecord[generated.id]).toMatchObject({
      id: generated.id,
      externalNetwork: EvmNetworkId.EthereumSepolia,
    });

    ethBridgeApiMock.history[generated.id] = {
      ...ethBridgeApiMock.history[generated.id],
      externalHash: '0xmoonpay',
    };

    store.setHistoryId(generated.id);
    store.addTransactionToProgress(generated.id);

    await store.removeHistory({
      tx: {
        id: generated.id,
        hash: 'tx-final',
      },
      force: true,
    });

    expect(ethBridgeApiMock.removeHistory).toHaveBeenCalledWith(generated.id);
    expect(moonpayStore.api.accountRecords).toEqual({
      'moonpay-1': '0xmoonpay',
    });
    expect(store.historyRecord[generated.id]).toBeUndefined();
    expect(store.history.id).toBe('tx-final');
    expect(store.history.inProgressIds['tx-final']).toBe(true);
    expect(store.history.inProgressIds[generated.id]).toBeUndefined();
  });

  it('keeps the generated transaction visible when SDK history storage is account-scoped elsewhere', async () => {
    ethBridgeApiMock.history = {};
    ethBridgeApiMock.generateHistoryItem.mockImplementationOnce((data: Record<string, any>) => ({
      id: 'tx-generated-detached-storage',
      ...data,
    }));

    const generated = (await store.generateHistoryItem({ amount: '5' })) as Record<string, any>;

    store.setHistoryId(generated.id);

    expect(store.historyRecord[generated.id]).toMatchObject({
      id: generated.id,
      amount: '5',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    });
    expect(store.activeTransaction).toMatchObject({
      id: generated.id,
      amount: '5',
    });
  });

  it('rejects failed history generation without mutating local history', async () => {
    const previousHistory = store.history.internal;

    ethBridgeApiMock.generateHistoryItem.mockReturnValueOnce(null);

    await expect(store.generateHistoryItem({ amount: '10' })).rejects.toThrow('[Bridge]: "generateHistoryItem" failed');

    expect(ethBridgeApiMock.generateHistoryItem).toHaveBeenCalledTimes(1);
    expect(store.history.internal).toBe(previousHistory);
  });

  it('does not remove an in-progress history item without force', async () => {
    const moonpayStore = useMoonpayStore();

    moonpayStore.api = {
      accountRecords: {},
    } as any;
    ethBridgeApiMock.history['tx-protected'] = {
      id: 'tx-protected',
      type: Operation.EthBridgeOutgoing,
      externalNetwork: EvmNetworkId.EthereumSepolia,
      externalHash: '0xprotected',
      payload: {
        moonpayId: 'moonpay-protected',
      },
    };

    await store.updateInternalHistory();
    store.setHistoryId('tx-protected');
    store.addTransactionToProgress('tx-protected');

    await store.removeHistory({
      tx: {
        id: 'tx-protected',
        hash: 'tx-replacement',
      },
    });

    expect(ethBridgeApiMock.removeHistory).not.toHaveBeenCalledWith('tx-protected');
    expect(store.historyRecord['tx-protected']).toEqual(
      expect.objectContaining({
        id: 'tx-protected',
      })
    );
    expect(store.history.id).toBe('tx-protected');
    expect(store.history.inProgressIds['tx-protected']).toBe(true);
    expect(store.history.inProgressIds['tx-replacement']).toBeUndefined();
    expect(moonpayStore.api.accountRecords).toEqual({});
  });

  it('resolves eth runtime helpers directly through the Pinia bridge store', async () => {
    ethBridgeApiMock.history['tx-sign'] = {
      id: 'tx-sign',
      type: Operation.EthBridgeOutgoing,
      amount: '10',
      assetAddress: '0x01',
      to: '0xrecipient',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };

    const historyInstance = await store.getEthBridgeHistoryInstance();
    const transaction = await store.signEthBridgeOutgoingEvm('tx-sign');

    await store.handleBridgeTransaction('tx-sign');
    web3StoreMock.networkType = BridgeNetworkType.Evm;
    await store.handleBridgeTransaction('tx-sign');
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    await store.handleBridgeTransaction('tx-sign');

    expect(getEthBridgeHistoryInstanceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rootState: expect.objectContaining({
          wallet: expect.objectContaining({
            settings: expect.objectContaining({
              apiKeys: expect.objectContaining({
                etherscan: 'etherscan-key',
              }),
            }),
          }),
          web3: expect.objectContaining({
            ethBridgeEvmNetwork: EvmNetworkId.EthereumSepolia,
          }),
        }),
      })
    );
    expect(waitForApprovedRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'tx-sign',
      })
    );
    expect(getOutgoingEvmTransactionDataMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: '0xrecipient',
        value: '10',
      })
    );
    expect(transaction).toEqual({ hash: '0xoutgoing-tx' });
    expect(historyInstance).toEqual({ id: 'eth-history-instance' });
    expect(ethBridgeMock.handleTransaction).toHaveBeenCalledWith('tx-sign');
    expect(evmBridgeMock.handleTransaction).toHaveBeenCalledWith('tx-sign');
    expect(subBridgeMock.handleTransaction).toHaveBeenCalledWith('tx-sign');
  });

  it('signs incoming eth bridge transfers directly while syncing approval state', async () => {
    const approvalTx = { hash: '0xapprove-tx' };
    const approveMock = vi.fn(async () => {
      expect(store.history.waitingForApprove['tx-sign-incoming']).toBe(true);
      return approvalTx;
    });

    ethBridgeApiMock.history['tx-sign-incoming'] = {
      id: 'tx-sign-incoming',
      type: Operation.EthBridgeIncoming,
      amount: '10',
      assetAddress: '0x01',
      to: '0xrecipient',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    ethersUtilMock.getAllowance.mockResolvedValueOnce('1');
    ethersUtilMock.getTokenContract.mockResolvedValueOnce({
      approve: approveMock,
    });

    const transaction = await store.signEthBridgeIncomingEvm('tx-sign-incoming');

    expect(ethersUtilMock.checkAccountIsConnected).toHaveBeenCalledWith('0xrecipient');
    expect(ethersUtilMock.getAllowance).toHaveBeenCalledWith('0xrecipient', '0xcontract-other', '0xexternal-asset');
    expect(waitForEvmTransactionMinedMock).toHaveBeenCalledWith(approvalTx);
    expect(getIncomingEvmTransactionDataMock).toHaveBeenCalledWith(
      expect.objectContaining({
        asset: expect.objectContaining({
          address: '0x01',
        }),
        value: '10',
        recipient: 'sora-address',
      })
    );
    expect(transaction).toEqual({ hash: '0xincoming-tx' });
    expect(store.history.waitingForApprove['tx-sign-incoming']).toBeUndefined();
  });

  it('rejects outgoing signing when the approved request belongs to a different EVM account', async () => {
    ethBridgeApiMock.history['tx-wrong-account'] = {
      id: 'tx-wrong-account',
      type: Operation.EthBridgeOutgoing,
      amount: '10',
      assetAddress: '0x01',
      to: '0xrecipient',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    waitForApprovedRequestMock.mockResolvedValueOnce({ to: '0xother-account' });

    await expect(store.signEthBridgeOutgoingEvm('tx-wrong-account')).rejects.toThrow(
      'Change account in ethereum wallet to 0xother-account'
    );
    expect(getOutgoingEvmTransactionDataMock).not.toHaveBeenCalled();
  });

  it('rejects incoming signing before allowance checks when the EVM wallet is disconnected', async () => {
    ethBridgeApiMock.history['tx-disconnected-incoming'] = {
      id: 'tx-disconnected-incoming',
      type: Operation.EthBridgeIncoming,
      amount: '10',
      assetAddress: '0x01',
      to: '0xrecipient',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    ethersUtilMock.checkAccountIsConnected.mockResolvedValueOnce(false);

    await expect(store.signEthBridgeIncomingEvm('tx-disconnected-incoming')).rejects.toThrow(
      'Connect account in ethereum wallet'
    );
    expect(ethersUtilMock.getAllowance).not.toHaveBeenCalled();
    expect(getIncomingEvmTransactionDataMock).not.toHaveBeenCalled();
  });

  it('clears pending approval state when incoming signing fails on an invalid EVM network', async () => {
    ethBridgeApiMock.history['tx-invalid-network-incoming'] = {
      id: 'tx-invalid-network-incoming',
      type: Operation.EthBridgeIncoming,
      amount: '10',
      assetAddress: '0x01',
      to: '0xrecipient',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    web3StoreMock.isValidNetwork = false;

    await expect(store.signEthBridgeIncomingEvm('tx-invalid-network-incoming')).rejects.toThrow(
      'Change evm network in wallet'
    );
    expect(ethersUtilMock.getAllowance).not.toHaveBeenCalled();
    expect(ethersUtilMock.getTokenContract).not.toHaveBeenCalled();
    expect(waitForEvmTransactionMinedMock).not.toHaveBeenCalled();
    expect(getIncomingEvmTransactionDataMock).not.toHaveBeenCalled();
    expect(store.history.waitingForApprove['tx-invalid-network-incoming']).toBeUndefined();
  });

  it('clears pending approval state when token approval rejects during incoming signing', async () => {
    const approvalError = new Error('approval rejected');
    const approveMock = vi.fn(async () => {
      expect(store.history.waitingForApprove['tx-rejected-approval']).toBe(true);
      throw approvalError;
    });

    ethBridgeApiMock.history['tx-rejected-approval'] = {
      id: 'tx-rejected-approval',
      type: Operation.EthBridgeIncoming,
      amount: '10',
      assetAddress: '0x01',
      to: '0xrecipient',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    ethersUtilMock.getAllowance.mockResolvedValueOnce('1');
    ethersUtilMock.getTokenContract.mockResolvedValueOnce({
      approve: approveMock,
    });

    await expect(store.signEthBridgeIncomingEvm('tx-rejected-approval')).rejects.toThrow(approvalError);
    expect(approveMock).toHaveBeenCalledTimes(1);
    expect(waitForEvmTransactionMinedMock).not.toHaveBeenCalled();
    expect(getIncomingEvmTransactionDataMock).not.toHaveBeenCalled();
    expect(store.history.waitingForApprove['tx-rejected-approval']).toBeUndefined();
  });

  it('clears pending approval state when token contract lookup fails during incoming signing', async () => {
    const tokenContractError = new Error('token contract unavailable');

    ethBridgeApiMock.history['tx-token-contract-failure'] = {
      id: 'tx-token-contract-failure',
      type: Operation.EthBridgeIncoming,
      amount: '10',
      assetAddress: '0x01',
      to: '0xrecipient',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    ethersUtilMock.getAllowance.mockResolvedValueOnce('1');
    ethersUtilMock.getTokenContract.mockImplementationOnce(async () => {
      expect(store.history.waitingForApprove['tx-token-contract-failure']).toBe(true);
      throw tokenContractError;
    });

    await expect(store.signEthBridgeIncomingEvm('tx-token-contract-failure')).rejects.toThrow(tokenContractError);
    expect(waitForEvmTransactionMinedMock).not.toHaveBeenCalled();
    expect(getIncomingEvmTransactionDataMock).not.toHaveBeenCalled();
    expect(store.history.waitingForApprove['tx-token-contract-failure']).toBeUndefined();
  });

  it('rejects outgoing signing on an invalid EVM network before transaction data is built', async () => {
    ethBridgeApiMock.history['tx-invalid-network-outgoing'] = {
      id: 'tx-invalid-network-outgoing',
      type: Operation.EthBridgeOutgoing,
      amount: '10',
      assetAddress: '0x01',
      to: '0xrecipient',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    web3StoreMock.isValidNetwork = false;

    await expect(store.signEthBridgeOutgoingEvm('tx-invalid-network-outgoing')).rejects.toThrow(
      'Change evm network in wallet'
    );
    expect(waitForApprovedRequestMock).not.toHaveBeenCalled();
    expect(getOutgoingEvmTransactionDataMock).not.toHaveBeenCalled();
  });

  it('subscribes to block updates locally through the worker data-plane runtime', async () => {
    vi.useFakeTimers();

    try {
      settingsStoreMock.featureFlags.wsWorkerDataPlane = true;
      web3StoreMock.networkType = BridgeNetworkType.Sub;
      web3StoreMock.networkSelected = 'kusama' as any;
      store.updateForm({ isSoraToEvm: false });

      let workerHandler: ((payload: unknown) => void) | undefined;
      const unsubscribeWorker = vi.fn(async () => undefined);
      dataPlaneClientMock.subscribeSubstrateFinalizedHeads.mockImplementationOnce(async (_options, handler) => {
        workerHandler = handler;
        return unsubscribeWorker;
      });

      await store.subscribeOnBlockUpdates();

      expect(dataPlaneClientMock.start).toHaveBeenCalledWith({
        preferSharedWorker: true,
        profile: 'ultra',
        maxConnections: 3,
      });
      expect(dataPlaneClientMock.subscribeSubstrateFinalizedHeads).toHaveBeenCalledTimes(1);
      expect(store.subscriptions.blockUpdates).not.toBeNull();

      workerHandler?.({ header: { number: '0x141' } });
      await vi.runOnlyPendingTimersAsync();
      await Promise.resolve();

      expect(parseSubstrateHeaderNumberMock).toHaveBeenCalled();
      expect(store.fees.externalBlockNumber).toBe(321);
      expect(store.balances.assetSenderBalance).toBe('11');
      expect(store.balances.assetRecipientBalance).toBe('22');
      expect(store.fees.externalNativeBalance).toBe('7');
      expect(store.balances.assetExternalMinBalance).toBe('13');

      const blockSubscription = store.subscriptions.blockUpdates as any;
      blockSubscription.unsubscribe();
      await Promise.resolve();
      await Promise.resolve();
      await vi.runAllTimersAsync();

      expect(unsubscribeWorker).toHaveBeenCalledTimes(1);
      expect(dataPlaneClientMock.disconnect).toHaveBeenCalledWith('bridge-substrate:wss://rpc.test');
    } finally {
      vi.useRealTimers();
    }
  });

  it('falls back to api.system.updated when worker block subscriptions are unavailable', async () => {
    vi.useFakeTimers();

    try {
      settingsStoreMock.featureFlags.wsWorkerDataPlane = true;
      web3StoreMock.networkType = BridgeNetworkType.Sub;
      web3StoreMock.networkSelected = 'kusama' as any;
      store.updateForm({ isSoraToEvm: false });

      let onUpdated: (() => void) | undefined;
      const unsubscribeFallback = vi.fn();
      const subscribeFallback = vi.fn((callback: () => void) => {
        onUpdated = callback;
        return { unsubscribe: unsubscribeFallback };
      });
      (api.system as any).updated = {
        subscribe: subscribeFallback,
      };
      dataPlaneClientMock.start.mockRejectedValueOnce(new Error('worker unavailable'));

      await store.subscribeOnBlockUpdates();

      expect(subscribeFallback).toHaveBeenCalledTimes(1);

      await onUpdated?.();
      await vi.runOnlyPendingTimersAsync();
      await Promise.resolve();

      expect(store.fees.externalBlockNumber).toBe(777);
      expect(store.balances.assetSenderBalance).toBe('11');
      expect(store.balances.assetRecipientBalance).toBe('22');
      expect(store.fees.externalNativeBalance).toBe('7');
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears the external block number when fallback sub block polling fails', async () => {
    vi.useFakeTimers();

    try {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      settingsStoreMock.featureFlags.wsWorkerDataPlane = false;
      web3StoreMock.networkType = BridgeNetworkType.Sub;
      web3StoreMock.networkSelected = 'kusama' as any;
      store.fees.externalBlockNumber = 999;

      let onUpdated: (() => void) | undefined;
      (api.system as any).updated = {
        subscribe: vi.fn((callback: () => void) => {
          onUpdated = callback;
          return { unsubscribe: vi.fn() };
        }),
      };
      seededConnector.network.getBlockNumber.mockRejectedValueOnce(new Error('block provider unavailable'));

      await store.subscribeOnBlockUpdates();

      await onUpdated?.();
      await Promise.resolve();

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(store.fees.externalBlockNumber).toBe(0);

      consoleErrorSpy.mockRestore();
    } finally {
      vi.useRealTimers();
    }
  });

  it('serializes prior worker disconnects before starting the next block subscription', async () => {
    settingsStoreMock.featureFlags.wsWorkerDataPlane = true;
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = 'kusama' as any;

    const unsubscribeWorker = vi.fn(async () => undefined);
    dataPlaneClientMock.subscribeSubstrateFinalizedHeads.mockImplementationOnce(async () => unsubscribeWorker);

    let resolveDisconnect!: () => void;
    const disconnectGate = new Promise<void>((resolve) => {
      resolveDisconnect = resolve;
    });
    dataPlaneClientMock.disconnect.mockImplementationOnce(() => disconnectGate);

    await store.subscribeOnBlockUpdates();

    const secondSubscribePromise = store.subscribeOnBlockUpdates();
    await Promise.resolve();
    await Promise.resolve();

    expect(dataPlaneClientMock.subscribeSubstrateFinalizedHeads).toHaveBeenCalledTimes(1);

    resolveDisconnect();
    await secondSubscribePromise;

    expect(unsubscribeWorker).toHaveBeenCalledTimes(1);
    expect(dataPlaneClientMock.disconnect).toHaveBeenCalledTimes(1);
    expect(dataPlaneClientMock.subscribeSubstrateFinalizedHeads).toHaveBeenCalledTimes(2);
  });

  it('updates amount fields locally and resets the bridge form', async () => {
    store.fees.externalTransferFee = '0';

    await store.setSendedAmount('12.5');
    expect(store.form.focusedField).toBe(BridgeFocusedField.Sended);
    expect(store.form.amountSend).toBe('12.5');
    expect(store.form.amountReceived).toBe('12.5');

    await store.setReceivedAmount('4');
    expect(store.form.focusedField).toBe(BridgeFocusedField.Received);
    expect(store.form.amountSend).toBe('4');
    expect(store.form.amountReceived).toBe('4');

    await store.resetBridgeForm();
    expect(store.form.assetAddress).toBe('');
    expect(store.form.amountSend).toBe('');
    expect(store.form.amountReceived).toBe('');
    expect(store.form.focusedField).toBe(BridgeFocusedField.Sended);
  });

  it('updates asset selection and direction locally through the bridge facade', async () => {
    store.fees.externalTransferFee = '0';

    await store.setSendedAmount('4');
    await store.setAssetAddress('0x02');

    expect(store.form.assetAddress).toBe('0x02');
    expect(store.form.amountSend).toBe('4');
    expect(store.form.amountReceived).toBe('4');
    expect(store.balances.incomingMinLimit).not.toBeNull();

    await store.switchDirection();

    expect(store.isSoraToEvm).toBe(false);
    expect(store.form.focusedField).toBe(BridgeFocusedField.Received);
    expect(store.form.amountSend).toBe('4');
    expect(store.form.amountReceived).toBe('4');
  });

  it('updates balances and outgoing max limit directly through the bridge runtime', async () => {
    await store.updateExternalBalance();
    await store.updateOutgoingMaxLimit();

    expect(getSoraAssetBalanceMock).toHaveBeenCalledWith(api.api, 'sora-address', '0x01', 18);
    expect(ethersUtilMock.getErc20BalancesBatch).toHaveBeenCalledWith([
      { token: '0xexternal-asset', account: '0xrecipient' },
    ]);
    expect(store.balances.assetSenderBalance).toBe('33');
    expect(store.balances.assetRecipientBalance).toBe('22');
    expect(store.fees.externalNativeBalance).toBe('7');
    expect(store.balances.outgoingMaxLimit?.toString()).toBe('20');
    expect(store.subscriptions.outgoingMaxLimit).not.toBeNull();
  });

  it('maps the SORA balance to the recipient when bridging into SORA', async () => {
    web3StoreMock.evmAddress = '0xsender';
    getSoraAssetBalanceMock.mockResolvedValueOnce({ transferable: '44' });
    store.updateForm({ isSoraToEvm: false });

    await store.updateExternalBalance();

    expect(getSoraAssetBalanceMock).toHaveBeenCalledWith(api.api, 'sora-address', '0x01', 18);
    expect(ethersUtilMock.getErc20BalancesBatch).toHaveBeenCalledWith([
      { token: '0xexternal-asset', account: '0xsender' },
    ]);
    expect(store.balances.assetSenderBalance).toBe('11');
    expect(store.balances.assetRecipientBalance).toBe('44');
  });

  it('clears stale outgoing max limit and subscription when the asset has no bridge limit', async () => {
    const unsubscribe = vi.fn();

    store.balances.outgoingMaxLimit = FPNumber.fromNatural(99);
    store.subscriptions.outgoingMaxLimit = { unsubscribe } as any;
    (api.bridgeProxy as any).isAssetTransferLimited = vi.fn(async () => false);

    await store.updateOutgoingMaxLimit();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(api.bridgeProxy.isAssetTransferLimited).toHaveBeenCalledWith('0x01');
    expect(api.swap.getSwapQuoteObservable).not.toHaveBeenCalled();
    expect(store.balances.outgoingMaxLimit).toBeNull();
    expect(store.subscriptions.outgoingMaxLimit).toBeNull();
  });

  it('clears stale outgoing max limit when the quote stream is unavailable', async () => {
    const unsubscribe = vi.fn();

    store.balances.outgoingMaxLimit = FPNumber.fromNatural(99);
    store.subscriptions.outgoingMaxLimit = { unsubscribe } as any;
    (api.swap as any).getSwapQuoteObservable = vi.fn(() => null);

    await store.updateOutgoingMaxLimit();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(api.bridgeProxy.getCurrentTransferLimitObservable).toHaveBeenCalledTimes(1);
    expect(api.swap.getSwapQuoteObservable).toHaveBeenCalled();
    expect(store.balances.outgoingMaxLimit).toBeNull();
    expect(store.subscriptions.outgoingMaxLimit).toBeNull();
  });

  it('clears stale outgoing max limit when the bridge limit provider rejects', async () => {
    const unsubscribe = vi.fn();
    const limitError = new Error('limit provider unavailable');

    store.balances.outgoingMaxLimit = FPNumber.fromNatural(99);
    store.subscriptions.outgoingMaxLimit = { unsubscribe } as any;
    (api.bridgeProxy as any).isAssetTransferLimited = vi.fn(async () => {
      throw limitError;
    });

    await expect(store.updateOutgoingMaxLimit()).rejects.toThrow(limitError);

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(api.bridgeProxy.getCurrentTransferLimitObservable).not.toHaveBeenCalled();
    expect(api.swap.getSwapQuoteObservable).not.toHaveBeenCalled();
    expect(store.balances.outgoingMaxLimit).toBeNull();
    expect(store.subscriptions.outgoingMaxLimit).toBeNull();
  });

  it('uses a null outgoing max limit when the quote provider throws', async () => {
    const quoteError = new Error('quote unavailable');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    (api.swap as any).getSwapQuoteObservable = vi.fn(() =>
      of({
        quote: vi.fn(() => {
          throw quoteError;
        }),
      })
    );

    await store.updateOutgoingMaxLimit();

    expect(consoleErrorSpy).toHaveBeenCalledWith(quoteError);
    expect(store.balances.outgoingMaxLimit).toBeNull();
    expect(store.subscriptions.outgoingMaxLimit).not.toBeNull();

    consoleErrorSpy.mockRestore();
  });

  it('uses a null outgoing max limit when the quote provider returns a zero asset price', async () => {
    (api.swap as any).getSwapQuoteObservable = vi.fn(() =>
      of({
        quote: vi.fn(() => ({
          result: {
            amount: '0',
          },
        })),
      })
    );

    await store.updateOutgoingMaxLimit();

    expect(store.balances.outgoingMaxLimit).toBeNull();
    expect(store.subscriptions.outgoingMaxLimit).not.toBeNull();
  });

  it('keeps the SORA balance and clears the loading flag when EVM balance providers fail', async () => {
    ethersUtilMock.getErc20BalancesBatch.mockRejectedValueOnce(new Error('batch unavailable'));
    ethersUtilMock.getAccountAssetBalance
      .mockRejectedValueOnce(new Error('sender unavailable'))
      .mockRejectedValueOnce(new Error('native unavailable'));

    await store.updateExternalBalance();

    expect(store.balances.assetSenderBalance).toBe('33');
    expect(store.balances.assetRecipientBalance).toBe('0');
    expect(store.fees.externalNativeBalance).toBe('0');
    expect(store.flags.balancesFetching).toBe(false);
  });

  it('uses zero balances when an ERC-20 batch provider returns malformed data', async () => {
    ethersUtilMock.getErc20BalancesBatch.mockResolvedValueOnce([]);

    await store.updateExternalBalance();

    expect(store.balances.assetSenderBalance).toBe('33');
    expect(store.balances.assetRecipientBalance).toBe('0');
    expect(store.fees.externalNativeBalance).toBe('7');
    expect(store.flags.balancesFetching).toBe(false);
  });

  it('uses zero external balance when an ERC-20 batch provider returns non-codec balance data', async () => {
    ethersUtilMock.getErc20BalancesBatch.mockResolvedValueOnce([{ balance: { toString: () => '22' } }] as any);

    await store.updateExternalBalance();

    expect(store.balances.assetSenderBalance).toBe('33');
    expect(store.balances.assetRecipientBalance).toBe('0');
    expect(store.fees.externalNativeBalance).toBe('7');
    expect(store.flags.balancesFetching).toBe(false);
  });

  it('uses zero external balance when an ERC-20 batch provider returns numeric-looking hostile strings', async () => {
    for (const balance of ['.', '.5', '1.', '+1', '1_000', '1,000', 'Infinity']) {
      ethersUtilMock.getErc20BalancesBatch.mockResolvedValueOnce([{ balance }]);

      await store.updateExternalBalance();

      expect(store.balances.assetSenderBalance).toBe('33');
      expect(store.balances.assetRecipientBalance).toBe('0');
      expect(store.fees.externalNativeBalance).toBe('7');
      expect(store.flags.balancesFetching).toBe(false);
    }
  });

  it('uses zero SORA balance when the wallet balance provider returns malformed transferable data', async () => {
    getSoraAssetBalanceMock.mockResolvedValueOnce({ transferable: '0x33' });

    await store.updateExternalBalance();

    expect(getSoraAssetBalanceMock).toHaveBeenCalledWith(api.api, 'sora-address', '0x01', 18);
    expect(store.balances.assetSenderBalance).toBe('0');
    expect(store.balances.assetRecipientBalance).toBe('22');
    expect(store.fees.externalNativeBalance).toBe('7');
    expect(store.flags.balancesFetching).toBe(false);
  });

  it('uses zero balances when EVM fallback providers return malformed balance strings', async () => {
    ethersUtilMock.getErc20BalancesBatch.mockRejectedValueOnce(new Error('batch unavailable'));
    ethersUtilMock.getAccountAssetBalance.mockResolvedValueOnce('1e3').mockResolvedValueOnce('0x7');

    await store.updateExternalBalance();

    expect(store.balances.assetSenderBalance).toBe('33');
    expect(store.balances.assetRecipientBalance).toBe('0');
    expect(store.fees.externalNativeBalance).toBe('0');
    expect(store.flags.balancesFetching).toBe(false);
  });

  it('clears Sub bridge balances when the connected network registry is not ready', async () => {
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = 'Liberland' as any;
    store.updateForm({ isSoraToEvm: true, assetAddress: '0x01' });
    store.balances.assetSenderBalance = '999';
    store.balances.assetRecipientBalance = '888';
    store.fees.externalNativeBalance = '777';
    (seededConnector.network as any).connection.api = {};
    (seededConnector.network as any).formatAddress = function (): string {
      throw new Error('registry unavailable');
    };

    await expect(store.updateExternalBalance()).resolves.toBeUndefined();

    expect(store.recipient).toBe('sub-address');
    expect(seededConnector.network.getTokenBalancesBatch).not.toHaveBeenCalled();
    expect(seededConnector.network.getTokenBalance).not.toHaveBeenCalled();
    expect(getSoraAssetBalanceMock).not.toHaveBeenCalled();
    expect(store.balances.assetSenderBalance).toBe('0');
    expect(store.balances.assetRecipientBalance).toBe('0');
    expect(store.fees.externalNativeBalance).toBe('0');
    expect(store.flags.balancesFetching).toBe(false);
  });

  it('clears Sub bridge balances when the selected node is disconnected despite registry metadata', async () => {
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = 'Liberland' as any;
    store.updateForm({ isSoraToEvm: true, assetAddress: '0x01' });
    store.balances.assetSenderBalance = '999';
    store.balances.assetRecipientBalance = '888';
    store.fees.externalNativeBalance = '777';
    seededConnector.network.subNetworkConnection.nodeIsConnected = false;

    await expect(store.updateExternalBalance()).resolves.toBeUndefined();

    expect(seededConnector.network.getTokenBalancesBatch).not.toHaveBeenCalled();
    expect(seededConnector.network.getTokenBalance).not.toHaveBeenCalled();
    expect(getSoraAssetBalanceMock).not.toHaveBeenCalled();
    expect(store.balances.assetSenderBalance).toBe('0');
    expect(store.balances.assetRecipientBalance).toBe('0');
    expect(store.fees.externalNativeBalance).toBe('0');
    expect(store.flags.balancesFetching).toBe(false);
  });

  it('falls back to individual Sub bridge balances when the batch method is absent', async () => {
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = 'Liberland' as any;
    store.updateForm({ isSoraToEvm: true, assetAddress: '0x01' });
    (seededConnector.network as any).getTokenBalancesBatch = undefined;
    seededConnector.network.getTokenBalance.mockResolvedValueOnce('222').mockResolvedValueOnce('777');

    await expect(store.updateExternalBalance()).resolves.toBeUndefined();

    expect(getSoraAssetBalanceMock).toHaveBeenCalledWith(api.api, 'sora-address', '0x01', 18);
    expect(seededConnector.network.getTokenBalance).toHaveBeenNthCalledWith(
      1,
      'formatted-sub-address',
      expect.objectContaining({ address: '0x01' })
    );
    expect(seededConnector.network.getTokenBalance).toHaveBeenNthCalledWith(
      2,
      'sora-address',
      expect.objectContaining({ address: '0x02' })
    );
    expect(store.balances.assetSenderBalance).toBe('33');
    expect(store.balances.assetRecipientBalance).toBe('222');
    expect(store.fees.externalNativeBalance).toBe('777');
    expect(store.flags.balancesFetching).toBe(false);
  });

  it('uses zero external Sub bridge balances when all Sub balance methods are absent', async () => {
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = 'Liberland' as any;
    store.updateForm({ isSoraToEvm: true, assetAddress: '0x01' });
    (seededConnector.network as any).getTokenBalancesBatch = undefined;
    (seededConnector.network as any).getTokenBalance = undefined;

    await expect(store.updateExternalBalance()).resolves.toBeUndefined();

    expect(getSoraAssetBalanceMock).toHaveBeenCalledWith(api.api, 'sora-address', '0x01', 18);
    expect(store.balances.assetSenderBalance).toBe('33');
    expect(store.balances.assetRecipientBalance).toBe('0');
    expect(store.fees.externalNativeBalance).toBe('0');
    expect(store.flags.balancesFetching).toBe(false);
  });

  it('falls back to individual Sub bridge balance queries when batch lookup fails', async () => {
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = 'kusama' as any;
    store.updateForm({ isSoraToEvm: true, assetAddress: '0x01' });
    seededConnector.network.getTokenBalancesBatch.mockRejectedValueOnce(new Error('batch unavailable'));
    seededConnector.network.getTokenBalance.mockResolvedValueOnce('222').mockResolvedValueOnce('777');

    await store.updateExternalBalance();

    expect(seededConnector.network.getTokenBalancesBatch).toHaveBeenCalledWith([
      { accountAddress: 'sora-address', asset: expect.objectContaining({ address: '0x01' }) },
      { accountAddress: 'formatted-sub-address', asset: expect.objectContaining({ address: '0x01' }) },
      { accountAddress: 'sora-address', asset: expect.objectContaining({ address: '0x02' }) },
    ]);
    expect(getSoraAssetBalanceMock).toHaveBeenCalledWith(api.api, 'sora-address', '0x01', 18);
    expect(seededConnector.network.getTokenBalance).toHaveBeenNthCalledWith(
      1,
      'formatted-sub-address',
      expect.objectContaining({ address: '0x01' })
    );
    expect(seededConnector.network.getTokenBalance).toHaveBeenNthCalledWith(
      2,
      'sora-address',
      expect.objectContaining({ address: '0x02' })
    );
    expect(store.balances.assetSenderBalance).toBe('33');
    expect(store.balances.assetRecipientBalance).toBe('222');
    expect(store.fees.externalNativeBalance).toBe('777');
    expect(store.flags.balancesFetching).toBe(false);
  });

  it('falls back to individual Sub bridge balance queries when batch lookup returns a non-array shape', async () => {
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = 'kusama' as any;
    store.updateForm({ isSoraToEvm: true, assetAddress: '0x01' });
    seededConnector.network.getTokenBalancesBatch.mockResolvedValueOnce(null as any);
    seededConnector.network.getTokenBalance.mockResolvedValueOnce('222').mockResolvedValueOnce('777');

    await store.updateExternalBalance();

    expect(seededConnector.network.getTokenBalancesBatch).toHaveBeenCalledTimes(1);
    expect(getSoraAssetBalanceMock).toHaveBeenCalledWith(api.api, 'sora-address', '0x01', 18);
    expect(seededConnector.network.getTokenBalance).toHaveBeenNthCalledWith(
      1,
      'formatted-sub-address',
      expect.objectContaining({ address: '0x01' })
    );
    expect(seededConnector.network.getTokenBalance).toHaveBeenNthCalledWith(
      2,
      'sora-address',
      expect.objectContaining({ address: '0x02' })
    );
    expect(store.balances.assetSenderBalance).toBe('33');
    expect(store.balances.assetRecipientBalance).toBe('222');
    expect(store.fees.externalNativeBalance).toBe('777');
    expect(store.flags.balancesFetching).toBe(false);
  });

  it('clears stale Sub bridge balances when batch lookup omits response slots', async () => {
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = 'kusama' as any;
    store.updateForm({ isSoraToEvm: true, assetAddress: '0x01' });
    store.balances.assetSenderBalance = '999';
    store.balances.assetRecipientBalance = '888';
    store.fees.externalNativeBalance = '777';
    seededConnector.network.getTokenBalancesBatch.mockResolvedValueOnce(['444']);

    await store.updateExternalBalance();

    expect(seededConnector.network.getTokenBalancesBatch).toHaveBeenCalledTimes(1);
    expect(seededConnector.network.getTokenBalance).not.toHaveBeenCalled();
    expect(store.balances.assetSenderBalance).toBe('444');
    expect(store.balances.assetRecipientBalance).toBe('0');
    expect(store.fees.externalNativeBalance).toBe('0');
    expect(store.flags.balancesFetching).toBe(false);
  });

  it('clears stale Sub bridge balances when batch lookup returns non-codec balance slots', async () => {
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = 'kusama' as any;
    store.updateForm({ isSoraToEvm: true, assetAddress: '0x01' });
    store.balances.assetSenderBalance = '999';
    store.balances.assetRecipientBalance = '888';
    store.fees.externalNativeBalance = '777';
    seededConnector.network.getTokenBalancesBatch.mockResolvedValueOnce([
      { toString: () => '444' },
      'NaN',
      '-1',
    ] as any);

    await store.updateExternalBalance();

    expect(seededConnector.network.getTokenBalancesBatch).toHaveBeenCalledTimes(1);
    expect(seededConnector.network.getTokenBalance).not.toHaveBeenCalled();
    expect(store.balances.assetSenderBalance).toBe('0');
    expect(store.balances.assetRecipientBalance).toBe('0');
    expect(store.fees.externalNativeBalance).toBe('0');
    expect(store.flags.balancesFetching).toBe(false);
  });

  it('clears stale Sub bridge balances when batch lookup returns numeric-looking hostile strings', async () => {
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = 'kusama' as any;
    store.updateForm({ isSoraToEvm: true, assetAddress: '0x01' });
    store.balances.assetSenderBalance = '999';
    store.balances.assetRecipientBalance = '888';
    store.fees.externalNativeBalance = '777';
    seededConnector.network.getTokenBalancesBatch.mockResolvedValueOnce(['.5', '1.', '+1']);

    await store.updateExternalBalance();

    expect(seededConnector.network.getTokenBalancesBatch).toHaveBeenCalledTimes(1);
    expect(seededConnector.network.getTokenBalance).not.toHaveBeenCalled();
    expect(store.balances.assetSenderBalance).toBe('0');
    expect(store.balances.assetRecipientBalance).toBe('0');
    expect(store.fees.externalNativeBalance).toBe('0');
    expect(store.flags.balancesFetching).toBe(false);
  });

  it('clears stale Sub bridge balances when fallback providers return malformed balances', async () => {
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = 'kusama' as any;
    store.updateForm({ isSoraToEvm: true, assetAddress: '0x01' });
    store.balances.assetSenderBalance = '999';
    store.balances.assetRecipientBalance = '888';
    store.fees.externalNativeBalance = '777';
    seededConnector.network.getTokenBalancesBatch.mockRejectedValueOnce(new Error('batch unavailable'));
    getSoraAssetBalanceMock.mockResolvedValueOnce({ transferable: ' 33 ' });
    seededConnector.network.getTokenBalance
      .mockResolvedValueOnce({ balance: '222' } as any)
      .mockResolvedValueOnce('-1');

    await store.updateExternalBalance();

    expect(seededConnector.network.getTokenBalancesBatch).toHaveBeenCalledTimes(1);
    expect(getSoraAssetBalanceMock).toHaveBeenCalledWith(api.api, 'sora-address', '0x01', 18);
    expect(seededConnector.network.getTokenBalance).toHaveBeenCalledTimes(2);
    expect(store.balances.assetSenderBalance).toBe('0');
    expect(store.balances.assetRecipientBalance).toBe('0');
    expect(store.fees.externalNativeBalance).toBe('0');
    expect(store.flags.balancesFetching).toBe(false);
  });

  it('does not query Sub bridge balances for stale unregistered external asset metadata', async () => {
    const staleAsset = {
      address: '0xstale-sub',
      symbol: 'STALE',
      decimals: 18,
      externalAddress: 'stale-sub-asset-id',
      externalDecimals: 12,
      externalBalance: '0',
      balance: { transferable: '0' },
    };

    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = 'kusama' as any;
    assetsStoreMock.registeredAssets = {};
    assetsStoreMock.assetDataByAddress.mockImplementation((address?: string | null) => {
      if (address === staleAsset.address) return staleAsset;

      return address ? ((walletStoreMock.assetsDataTable as Record<string, unknown>)[address] ?? null) : null;
    });
    store.updateForm({ isSoraToEvm: true, assetAddress: staleAsset.address });
    store.balances.assetSenderBalance = '999';
    store.balances.assetRecipientBalance = '888';
    store.fees.externalNativeBalance = '777';

    await store.updateExternalBalance();

    expect(seededConnector.network.getTokenBalancesBatch).not.toHaveBeenCalled();
    expect(seededConnector.network.getTokenBalance).not.toHaveBeenCalled();
    expect(getSoraAssetBalanceMock).not.toHaveBeenCalled();
    expect(store.balances.assetSenderBalance).toBe('0');
    expect(store.balances.assetRecipientBalance).toBe('0');
    expect(store.fees.externalNativeBalance).toBe('0');
    expect(store.flags.balancesFetching).toBe(false);
  });

  it('clears stale external minimum balance when the sub-bridge provider fails', async () => {
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = 'kusama' as any;
    store.updateForm({ isSoraToEvm: false, assetAddress: '0x01' });
    store.balances.assetExternalMinBalance = '999';
    seededConnector.network.getAssetMinDeposit.mockRejectedValueOnce(new Error('minimum unavailable'));

    await store.updateExternalMinBalance();

    expect(store.balances.assetExternalMinBalance).toBe('0');
  });

  it('clears stale incoming min limit when the SORA parachain minimum provider fails', async () => {
    const minLimitError = new Error('incoming minimum unavailable');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      web3StoreMock.networkType = BridgeNetworkType.Sub;
      web3StoreMock.networkSelected = 'kusama' as any;
      store.updateForm({ assetAddress: '0x01' });
      store.balances.incomingMinLimit = FPNumber.fromNatural(99);
      (store.connector as any).soraParachain = {
        getAssetMinimumAmount: vi.fn(async () => {
          throw minLimitError;
        }),
      };

      await store.updateIncomingMinLimit();

      expect(consoleErrorSpy).toHaveBeenCalledWith(minLimitError);
      expect(store.balances.incomingMinLimit.toString()).toBe('0');
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('clears stale outgoing min limit when the external minimum provider fails', async () => {
    const minLimitError = new Error('outgoing minimum unavailable');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      web3StoreMock.networkType = BridgeNetworkType.Sub;
      web3StoreMock.networkSelected = 'kusama' as any;
      store.updateForm({ assetAddress: '0x01' });
      store.balances.outgoingMinLimit = FPNumber.fromNatural(99);
      seededConnector.network.getAssetMinDeposit.mockRejectedValueOnce(minLimitError);

      await store.updateOutgoingMinLimit();

      expect(consoleErrorSpy).toHaveBeenCalledWith(minLimitError);
      expect(store.balances.outgoingMinLimit?.toString()).toBe('0');
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('does not query EVM balances for stale unregistered external metadata', async () => {
    const staleDaiAsset = {
      address: DAI.address,
      symbol: DAI.symbol,
      decimals: DAI.decimals,
      externalAddress: '0xstale-dai',
      externalDecimals: 18,
      externalBalance: '0',
      balance: { transferable: '0' },
    };

    assetsStoreMock.registeredAssets = {};
    assetsStoreMock.assetDataByAddress.mockImplementation((address?: string | null) => {
      if (address === DAI.address) return staleDaiAsset;

      return address ? ((walletStoreMock.assetsDataTable as Record<string, unknown>)[address] ?? null) : null;
    });
    store.updateForm({ isSoraToEvm: false, assetAddress: DAI.address });

    await store.updateExternalBalance();

    expect(ethersUtilMock.getErc20BalancesBatch).not.toHaveBeenCalled();
    expect(ethersUtilMock.getAccountAssetBalance).not.toHaveBeenCalledWith('0xrecipient', '0xstale-dai');
    expect(store.balances.assetSenderBalance).toBe('0');
  });

  it('updates fees and locked funds directly through the bridge runtime', async () => {
    store.form.assetAddress = '0x02';
    store.form.amountSend = '3';
    store.balances.assetSenderBalance = FPNumber.fromNatural(10).toCodecString();
    walletStoreMock.networkFees[Operation.EthBridgeOutgoing] = '11';
    ethersUtilMock.getAccountAssetBalance.mockResolvedValueOnce(FPNumber.fromNatural(7).toCodecString());

    await store.updateFeesAndLockedFunds();

    expect(store.balances.assetLockedBalance?.toString()).toBe('5');
    expect(store.fees.externalNetworkFee).toBe('9');
    expect(store.fees.externalTransferFee).toBe('0');
    expect(store.fees.soraNetworkFee).toBe('11');
  });

  it('clears stale EVM fee and locked-balance state when providers fail', async () => {
    store.form.assetAddress = '0x02';
    store.form.amountSend = '3';
    store.balances.assetSenderBalance = FPNumber.fromNatural(10).toCodecString();
    store.balances.assetLockedBalance = FPNumber.fromNatural(99);
    store.fees.externalNetworkFee = '123';
    ethBridgeApiMock.getLockedAssets.mockRejectedValueOnce(new Error('locked balance unavailable'));
    ethersUtilMock.getAccountAssetBalance.mockRejectedValueOnce(new Error('bridge balance unavailable'));
    getEthNetworkFeeMock.mockRejectedValueOnce(new Error('fee unavailable'));

    await store.updateFeesAndLockedFunds();

    expect(store.balances.assetLockedBalance).toBeNull();
    expect(store.fees.externalNetworkFee).toBe('0');
    expect(store.flags.feesAndLockedFundsFetching).toBe(false);
  });

  it('clears stale SORA network fee when a non-eth bridge fee provider fails', async () => {
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = 'kusama' as any;
    store.updateForm({ isSoraToEvm: true, assetAddress: '0x01' });
    store.fees.soraNetworkFee = '123';
    subBridgeApiMock.getNetworkFee.mockRejectedValueOnce(new Error('sora fee unavailable'));

    await store.updateSoraNetworkFee();

    expect(store.fees.soraNetworkFee).toBe('0');
  });

  it('clears stale locked-balance state without provider calls when external metadata is unregistered', async () => {
    const staleAsset = {
      address: '0xstale-locked',
      symbol: 'STALE',
      decimals: 18,
      externalAddress: '0xstale-locked-external',
      externalDecimals: 18,
      externalBalance: '0',
      balance: { transferable: '0' },
    };

    assetsStoreMock.registeredAssets = {};
    assetsStoreMock.assetDataByAddress.mockReturnValue(staleAsset);
    store.updateForm({ assetAddress: staleAsset.address });
    store.balances.assetLockedBalance = FPNumber.fromNatural(99);

    await store.updateExternalLockedBalance();

    expect(ethBridgeApiMock.getLockedAssets).not.toHaveBeenCalled();
    expect(ethersUtilMock.getAccountAssetBalance).not.toHaveBeenCalledWith(
      '0xcontract-other',
      '0xstale-locked-external'
    );
    expect(store.balances.assetLockedBalance).toBeNull();
  });

  it('clears stale EVM fee state without estimating when the selected network is invalid', async () => {
    web3StoreMock.isValidNetwork = false;
    store.updateForm({ assetAddress: '0x01', amountSend: '1' });
    store.balances.assetSenderBalance = FPNumber.fromNatural(10).toCodecString();
    store.fees.externalNetworkFee = '123';

    await store.updateExternalNetworkFee();

    expect(getEthNetworkFeeMock).not.toHaveBeenCalled();
    expect(store.fees.externalNetworkFee).toBe('0');
  });

  it('clears stale EVM fee state without estimating for invalid form amounts', async () => {
    store.balances.assetSenderBalance = FPNumber.fromNatural(10).toCodecString();

    for (const amountSend of ['0', '-1', 'NaN', 'Infinity', '   ']) {
      store.updateForm({ assetAddress: '0x01', amountSend });
      store.fees.externalNetworkFee = '123';

      await store.updateExternalNetworkFee();

      expect(store.fees.externalNetworkFee).toBe('0');
    }

    expect(getEthNetworkFeeMock).not.toHaveBeenCalled();
  });

  it('skips EVM fee estimation when stale wallet metadata is not registered', async () => {
    const staleAsset = {
      address: '0xstale',
      symbol: 'STALE',
      decimals: 18,
      externalAddress: '0xstale-external',
      externalDecimals: 18,
      externalBalance: '0',
      balance: { transferable: '0' },
    };

    assetsStoreMock.registeredAssets = {};
    assetsStoreMock.assetDataByAddress.mockReturnValue(staleAsset);
    store.updateForm({ assetAddress: staleAsset.address, amountSend: '1' });
    store.balances.assetSenderBalance = FPNumber.fromNatural(10).toCodecString();
    store.fees.externalNetworkFee = '123';

    await store.updateExternalNetworkFee();

    expect(getEthNetworkFeeMock).not.toHaveBeenCalled();
    expect(store.fees.externalNetworkFee).toBe('0');
  });

  it('rejects signing before approval polling when the transaction asset is unregistered', async () => {
    ethBridgeApiMock.history['tx-unregistered-dai'] = {
      id: 'tx-unregistered-dai',
      type: Operation.EthBridgeOutgoing,
      amount: '10',
      assetAddress: DAI.address,
      to: '0xrecipient',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    assetsStoreMock.registeredAssets = {};
    assetsStoreMock.assetDataByAddress.mockReturnValue({
      ...DAI,
      externalAddress: undefined,
      externalDecimals: undefined,
      externalBalance: '0',
    });

    await expect(store.signEthBridgeOutgoingEvm('tx-unregistered-dai')).rejects.toThrow(
      `Asset not registered: ${DAI.address}`
    );
    expect(waitForApprovedRequestMock).not.toHaveBeenCalled();
  });

  it('rejects malformed outgoing history before asset lookup or approval polling', async () => {
    ethBridgeApiMock.history['tx-missing-amount'] = {
      id: 'tx-missing-amount',
      type: Operation.EthBridgeOutgoing,
      amount: '',
      assetAddress: '0x01',
      to: '0xrecipient',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    assetsStoreMock.assetDataByAddress.mockClear();

    await expect(store.signEthBridgeOutgoingEvm('tx-missing-amount')).rejects.toThrow('TX amount cannot be empty!');
    expect(assetsStoreMock.assetDataByAddress).not.toHaveBeenCalled();
    expect(waitForApprovedRequestMock).not.toHaveBeenCalled();
  });

  it('rejects zero outgoing amount before asset lookup or approval polling', async () => {
    ethBridgeApiMock.history['tx-zero-amount'] = {
      id: 'tx-zero-amount',
      type: Operation.EthBridgeOutgoing,
      amount: '0',
      assetAddress: '0x01',
      to: '0xrecipient',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    assetsStoreMock.assetDataByAddress.mockClear();

    await expect(store.signEthBridgeOutgoingEvm('tx-zero-amount')).rejects.toThrow(
      'TX amount must be greater than zero!'
    );
    expect(assetsStoreMock.assetDataByAddress).not.toHaveBeenCalled();
    expect(waitForApprovedRequestMock).not.toHaveBeenCalled();
    expect(getOutgoingEvmTransactionDataMock).not.toHaveBeenCalled();
  });

  it('rejects non-finite outgoing amount before asset lookup or approval polling', async () => {
    ethBridgeApiMock.history['tx-nan-amount'] = {
      id: 'tx-nan-amount',
      type: Operation.EthBridgeOutgoing,
      amount: 'NaN',
      assetAddress: '0x01',
      to: '0xrecipient',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    assetsStoreMock.assetDataByAddress.mockClear();

    await expect(store.signEthBridgeOutgoingEvm('tx-nan-amount')).rejects.toThrow(
      'TX amount must be greater than zero!'
    );
    expect(assetsStoreMock.assetDataByAddress).not.toHaveBeenCalled();
    expect(waitForApprovedRequestMock).not.toHaveBeenCalled();
    expect(getOutgoingEvmTransactionDataMock).not.toHaveBeenCalled();
  });

  it('rejects invalid redenominated outgoing amount before approval polling', async () => {
    ethBridgeApiMock.history['tx-invalid-amount2'] = {
      id: 'tx-invalid-amount2',
      type: Operation.EthBridgeOutgoing,
      amount: '10',
      amount2: '-1',
      assetAddress: XOR.address,
      to: '0xrecipient',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    assetsStoreMock.registeredAssets = {
      [XOR.address]: {
        address: '0xxor-external',
        decimals: XOR.decimals,
        kind: EthAssetKind.Sidechain,
      },
    };
    assetsStoreMock.assetDataByAddress.mockImplementation((address?: string | null) => {
      if (address === XOR.address) {
        return {
          ...XOR,
          externalAddress: '0xxor-external',
          externalDecimals: XOR.decimals,
          externalBalance: '0',
        };
      }

      return null;
    });

    await expect(store.signEthBridgeOutgoingEvm('tx-invalid-amount2')).rejects.toThrow(
      'TX amount must be greater than zero!'
    );
    expect(waitForApprovedRequestMock).not.toHaveBeenCalled();
    expect(getOutgoingEvmTransactionDataMock).not.toHaveBeenCalled();
  });

  it('rejects outgoing signing before approval polling when the recipient is missing', async () => {
    ethBridgeApiMock.history['tx-missing-recipient'] = {
      id: 'tx-missing-recipient',
      type: Operation.EthBridgeOutgoing,
      amount: '10',
      assetAddress: '0x01',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };

    await expect(store.signEthBridgeOutgoingEvm('tx-missing-recipient')).rejects.toThrow('TX to cannot be empty!');
    expect(waitForApprovedRequestMock).not.toHaveBeenCalled();
    expect(getOutgoingEvmTransactionDataMock).not.toHaveBeenCalled();
  });

  it('rejects outgoing signing when stale wallet bridge metadata is not registered', async () => {
    ethBridgeApiMock.history['tx-stale-dai-outgoing'] = {
      id: 'tx-stale-dai-outgoing',
      type: Operation.EthBridgeOutgoing,
      amount: '10',
      assetAddress: DAI.address,
      to: '0xrecipient',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    assetsStoreMock.registeredAssets = {};
    assetsStoreMock.assetDataByAddress.mockReturnValue({
      ...DAI,
      externalAddress: '0xstale-dai',
      externalDecimals: 18,
      externalBalance: '0',
    });

    await expect(store.signEthBridgeOutgoingEvm('tx-stale-dai-outgoing')).rejects.toThrow(
      `Asset not registered: ${DAI.address}`
    );
    expect(waitForApprovedRequestMock).not.toHaveBeenCalled();
    expect(getOutgoingEvmTransactionDataMock).not.toHaveBeenCalled();
  });

  it('rejects incoming signing before wallet checks when stale wallet bridge metadata is not registered', async () => {
    ethBridgeApiMock.history['tx-stale-dai-incoming'] = {
      id: 'tx-stale-dai-incoming',
      type: Operation.EthBridgeIncoming,
      amount: '10',
      assetAddress: DAI.address,
      to: '0xrecipient',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    assetsStoreMock.registeredAssets = {};
    assetsStoreMock.assetDataByAddress.mockReturnValue({
      ...DAI,
      externalAddress: '0xstale-dai',
      externalDecimals: 18,
      externalBalance: '0',
    });

    await expect(store.signEthBridgeIncomingEvm('tx-stale-dai-incoming')).rejects.toThrow(
      `Asset not registered: ${DAI.address}`
    );
    expect(ethersUtilMock.checkAccountIsConnected).not.toHaveBeenCalled();
    expect(ethersUtilMock.getAllowance).not.toHaveBeenCalled();
    expect(getIncomingEvmTransactionDataMock).not.toHaveBeenCalled();
  });

  it('rejects incoming signing before wallet checks when the asset address is missing', async () => {
    ethBridgeApiMock.history['tx-missing-asset'] = {
      id: 'tx-missing-asset',
      type: Operation.EthBridgeIncoming,
      amount: '10',
      to: '0xrecipient',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };

    await expect(store.signEthBridgeIncomingEvm('tx-missing-asset')).rejects.toThrow(
      'TX assetAddress cannot be empty!'
    );
    expect(ethersUtilMock.checkAccountIsConnected).not.toHaveBeenCalled();
    expect(ethersUtilMock.getAllowance).not.toHaveBeenCalled();
    expect(getIncomingEvmTransactionDataMock).not.toHaveBeenCalled();
  });

  it('rejects negative incoming amount before asset lookup or wallet checks', async () => {
    ethBridgeApiMock.history['tx-negative-incoming'] = {
      id: 'tx-negative-incoming',
      type: Operation.EthBridgeIncoming,
      amount: '-1',
      assetAddress: '0x01',
      to: '0xrecipient',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    assetsStoreMock.assetDataByAddress.mockClear();

    await expect(store.signEthBridgeIncomingEvm('tx-negative-incoming')).rejects.toThrow(
      'TX amount must be greater than zero!'
    );
    expect(assetsStoreMock.assetDataByAddress).not.toHaveBeenCalled();
    expect(ethersUtilMock.checkAccountIsConnected).not.toHaveBeenCalled();
    expect(getIncomingEvmTransactionDataMock).not.toHaveBeenCalled();
  });

  it('rejects non-finite incoming amount before asset lookup or wallet checks', async () => {
    ethBridgeApiMock.history['tx-infinite-incoming'] = {
      id: 'tx-infinite-incoming',
      type: Operation.EthBridgeIncoming,
      amount: 'Infinity',
      assetAddress: '0x01',
      to: '0xrecipient',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    assetsStoreMock.assetDataByAddress.mockClear();

    await expect(store.signEthBridgeIncomingEvm('tx-infinite-incoming')).rejects.toThrow(
      'TX amount must be greater than zero!'
    );
    expect(assetsStoreMock.assetDataByAddress).not.toHaveBeenCalled();
    expect(ethersUtilMock.checkAccountIsConnected).not.toHaveBeenCalled();
    expect(getIncomingEvmTransactionDataMock).not.toHaveBeenCalled();
  });

  it('uses Pinia wallet state for before-sign hooks while keeping moonpay records on the root store', async () => {
    const visibilityChanges: boolean[] = [];

    await store.beforeTransactionSign({ address: 'alice' }, BridgeTransactionSignDialogMode.Bridge);

    const visibilityController = beforeTransactionSign.mock.calls.at(-1)?.[2];
    const walletSignState = beforeTransactionSign.mock.calls.at(-1)?.[3];

    expect(beforeTransactionSign).toHaveBeenCalledWith(
      null,
      { address: 'alice' },
      visibilityController,
      expect.objectContaining({
        getPassword: expect.any(Function),
        isSignTxDialogDisabled: true,
      })
    );
    expect(visibilityController).toEqual(
      expect.objectContaining({
        setVisibility: expect.any(Function),
        subscribe: expect.any(Function),
      })
    );
    expect(walletSignState.getPassword('alice')).toBe('secret');

    const unsubscribe = visibilityController.subscribe((visible: boolean) => {
      visibilityChanges.push(visible);
    });

    visibilityController.setVisibility(true);
    store.setSignTxDialogVisibility(false);
    unsubscribe();

    expect(visibilityChanges).toEqual([true, false]);
    expect(store.flags.isSignTxDialogVisible).toBe(false);
  });
});
