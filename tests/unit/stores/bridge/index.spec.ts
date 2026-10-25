import { FPNumber, Operation } from '@sora-substrate/sdk';
import { DAI, ETH, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { BridgeNetworkType, BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { EvmNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/evm/consts';
import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';
import { EthAssetKind } from '@sora-substrate/sdk/build/bridgeProxy/eth/consts';
import { createPinia, setActivePinia } from 'pinia';
import { of } from 'rxjs';
import { computed, markRaw, shallowRef } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { beforeTransactionSign } from '@/lib/soraneo-wallet/src/util';
import { api } from '@/lib/soraneo-wallet/src/api';
import { TONSWAP_MAINNET_GENESIS } from '@/indexer/queries/tonswapBurn';
import { TONSWAP_BRIDGE_FUNDING_TAG } from '@/features/misc/lib/tonswapBridgeLiquidity';

import { useBridgeStore } from '@/stores/bridge';
import { useMoonpayStore } from '@/stores/moonpay';
import { BridgeFocusedField } from '@/stores/bridge/types';
import { BridgeTransactionSignDialogMode } from '@/utils/bridge/common/types';
import { SUB_BRIDGE_DISPLAY_ONLY_HISTORY_RECOVERY } from '@/utils/bridge/sub/reconciliation';

const walletStoreMock = vi.hoisted(() => ({
  address: 'sora-address',
  soraAddress: 'sora-address',
  apiKeys: {
    etherscan: 'etherscan-key',
  },
  networkFees: {},
  sorametricsApiEndpoint: 'https://sorametrics.org',
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
  $subscribe: vi.fn((_callback: (...args: unknown[]) => void) => vi.fn()),
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
  registeredAssetsFetching: false,
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
  networkFees: {} as Record<string, string>,
  slippageTolerance: '1',
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
  saveHistory: vi.fn(),
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
    hash: '0xapproved-request',
    amount: '10000000000000000000',
  }))
);

const outgoingPopulateTransactionMock = vi.hoisted(() => vi.fn());
const outgoingSignerMock = vi.hoisted(() => ({
  getAddress: vi.fn(),
  getNonce: vi.fn(),
  sendTransaction: vi.fn(),
}));
const getOutgoingEvmTransactionDataMock = vi.hoisted(() =>
  vi.fn(async () => ({
    contract: {
      runner: outgoingSignerMock,
      bridgeTransfer: {
        populateTransaction: outgoingPopulateTransactionMock,
      },
    },
    method: 'bridgeTransfer',
    args: ['arg-1', 'arg-2'],
  }))
);

const incomingPopulateTransactionMock = vi.hoisted(() => vi.fn());
const incomingSignerMock = vi.hoisted(() => ({
  getAddress: vi.fn(),
  getNonce: vi.fn(),
  sendTransaction: vi.fn(),
}));
const getIncomingEvmTransactionDataMock = vi.hoisted(() =>
  vi.fn(async () => ({
    contract: {
      runner: incomingSignerMock,
      sendERC20ToSidechain: {
        populateTransaction: incomingPopulateTransactionMock,
      },
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

const webLockTails = new Map<string, Promise<void>>();
const webLocksMock = {
  request: vi.fn(
    async <T>(name: string, _options: LockOptions, callback: (lock: Lock | null) => Promise<T>): Promise<T> => {
      const previous = webLockTails.get(name) ?? Promise.resolve();
      let release!: () => void;
      const current = new Promise<void>((resolve) => {
        release = resolve;
      });
      const tail = previous.catch(() => undefined).then(() => current);

      webLockTails.set(name, tail);
      await previous.catch(() => undefined);

      try {
        return await callback({ name, mode: 'exclusive' } as Lock);
      } finally {
        release();
        if (webLockTails.get(name) === tail) webLockTails.delete(name);
      }
    }
  ),
};

const ethersUtilMock = vi.hoisted(() => ({
  addressesAreEqual: vi.fn((left?: string, right?: string) => left?.toLowerCase() === right?.toLowerCase()),
  checkAccountIsConnected: vi.fn(async () => true),
  getEvmNetworkId: vi.fn<() => Promise<number>>(),
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

const createConnectorMock = () => {
  const network = {
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
    getTokenBalancesBatch: vi.fn(async () => ['11', '7']),
    formatAddress: vi.fn((address: string) => `formatted-${address}`),
  };

  return {
    network,
    get connectionState() {
      return {
        network: SubNetworkId.Liberland,
        connection: network.subNetworkConnection,
        connecting: Boolean((network.subNetworkConnection as any).nodeAddressConnecting),
        ready: Boolean(network.subNetworkConnection.nodeIsConnected && network.connection.api.registry),
      };
    },
  };
};

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
  let walletStoreSubscription!: (...args: unknown[]) => void;

  beforeEach(() => {
    setActivePinia(createPinia());
    webLockTails.clear();
    webLocksMock.request.mockClear();
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: webLocksMock,
    });

    resetWalletAssetsMock();
    walletStoreMock.address = 'sora-address';
    walletStoreMock.soraAddress = 'sora-address';
    walletStoreMock.sorametricsApiEndpoint = 'https://sorametrics.org';
    walletStoreMock.$subscribe.mockReset();
    walletStoreMock.$subscribe.mockImplementation((callback: (...args: unknown[]) => void) => {
      walletStoreSubscription = callback;
      return vi.fn();
    });
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
    assetsStoreMock.registeredAssetsFetching = false;
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
    ethBridgeApiMock.saveHistory.mockReset();
    ethBridgeApiMock.saveHistory.mockImplementation((tx) => {
      ethBridgeApiMock.history[tx.id] = tx;
    });
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
    outgoingPopulateTransactionMock.mockReset();
    outgoingPopulateTransactionMock.mockResolvedValue({
      to: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      data: '0xAABB',
      value: 42n,
    });
    outgoingSignerMock.getAddress.mockReset();
    outgoingSignerMock.getAddress.mockResolvedValue('0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    outgoingSignerMock.getNonce.mockReset();
    outgoingSignerMock.getNonce.mockResolvedValue(7);
    outgoingSignerMock.sendTransaction.mockReset();
    outgoingSignerMock.sendTransaction.mockResolvedValue({ hash: '0xoutgoing-tx' });
    incomingPopulateTransactionMock.mockReset();
    incomingPopulateTransactionMock.mockResolvedValue({
      to: '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
      data: '0xCCDD',
    });
    incomingSignerMock.getAddress.mockReset();
    incomingSignerMock.getAddress.mockResolvedValue('0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    incomingSignerMock.getNonce.mockReset();
    incomingSignerMock.getNonce.mockResolvedValue(8);
    incomingSignerMock.sendTransaction.mockReset();
    incomingSignerMock.sendTransaction.mockResolvedValue({ hash: '0xincoming-tx' });
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
    ethersUtilMock.getEvmNetworkId.mockReset();
    ethersUtilMock.getEvmNetworkId.mockResolvedValue(EvmNetworkId.EthereumSepolia);
    ethersUtilMock.getAccountAssetBalance.mockClear();
    ethersUtilMock.getBlockNumber.mockClear();
    ethersUtilMock.getAllowance.mockClear();
    ethersUtilMock.getErc20BalancesBatch.mockClear();
    ethersUtilMock.isNativeEvmTokenAddress.mockClear();
    ethersUtilMock.getTokenContract.mockClear();

    walletStoreMock.networkFees = {};
    settingsStoreMock.networkFees = {};
    settingsStoreMock.slippageTolerance = '1';
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

  it('exposes revision-backed Sub network state from the raw connector', () => {
    const revision = shallowRef(0);
    const connection = markRaw({ status: { connected: false } });
    let ready = false;
    const connector = markRaw({
      get connectionState() {
        void revision.value;

        return Object.freeze({
          network: SubNetworkId.Liberland,
          connection,
          connecting: !ready,
          ready,
        });
      },
    });

    store.$patch((state) => {
      state.connector = connector as never;
    });

    const observedState = computed(() => store.subNetworkConnectionState);
    const connectingState = observedState.value;

    expect(connectingState).toEqual({
      network: SubNetworkId.Liberland,
      connection,
      connecting: true,
      ready: false,
    });

    ready = true;
    revision.value += 1;

    expect(observedState.value).not.toBe(connectingState);
    expect(observedState.value).toEqual({
      network: SubNetworkId.Liberland,
      connection,
      connecting: false,
      ready: true,
    });
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
      { accountAddress: 'sub-address', asset: expect.objectContaining({ address: '0x01' }) },
      { accountAddress: 'sub-address', asset: expect.objectContaining({ address: '0x02' }) },
    ]);
    expect(getSoraAssetBalanceMock).toHaveBeenCalledWith(api.api, 'sora-address', '0x01', 18);
    expect(store.balances.assetSenderBalance).toBe('33');
    expect(store.balances.assetRecipientBalance).toBe('11');
    expect(store.fees.externalNativeBalance).toBe('7');
    expect(store.flags.balancesFetching).toBe(false);
  });

  it('reads incoming Sub balances from the selected Sub chain and the recipient balance from SORA', async () => {
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = 'Liberland' as any;
    getSoraAssetBalanceMock.mockResolvedValueOnce({ transferable: '44' });
    store.updateForm({ isSoraToEvm: false, assetAddress: '0x01' });

    await store.updateExternalBalance();

    expect(seededConnector.network.getTokenBalancesBatch).toHaveBeenCalledWith([
      { accountAddress: 'formatted-sub-address', asset: expect.objectContaining({ address: '0x01' }) },
      { accountAddress: 'formatted-sub-address', asset: expect.objectContaining({ address: '0x02' }) },
    ]);
    expect(getSoraAssetBalanceMock).toHaveBeenCalledWith(api.api, 'sora-address', '0x01', 18);
    expect(store.balances.assetSenderBalance).toBe('11');
    expect(store.balances.assetRecipientBalance).toBe('44');
    expect(store.fees.externalNativeBalance).toBe('7');
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

  it('refreshes a pinned Sub transaction from persisted history while the Eth form is selected', async () => {
    const stale = {
      id: 'tx-sub-recovery',
      type: Operation.SubstrateIncoming,
      externalNetwork: SubNetworkId.Liberland,
      transactionState: BridgeTxStatus.Failed,
    } as any;
    const recovered = {
      ...stale,
      transactionState: BridgeTxStatus.Done,
      hash: '0xsora-request',
    } as any;

    web3StoreMock.networkType = BridgeNetworkType.Eth;
    web3StoreMock.networkSelected = EvmNetworkId.EthereumSepolia;
    store.history.internal = { 'stale-storage-key': stale };
    store.setHistoryId(stale.id);
    subBridgeApiMock.history = { 'sub-storage-key': recovered };

    await store.updateInternalHistory();

    expect(store.activeTransaction).toBe(recovered);
    expect(store.history.internal['sub-storage-key']).toBe(recovered);
    expect(store.history.internal['stale-storage-key']).toBeUndefined();
    expect(web3StoreMock.networkType).toBe(BridgeNetworkType.Eth);
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
              sorametricsApiEndpoint: 'https://sorametrics.org',
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

  it('lets completed Sub asset discovery supersede an active boot history request', async () => {
    let resolveBootHistory!: () => void;
    const bootHistoryGate = new Promise<void>((resolve) => {
      resolveBootHistory = resolve;
    });

    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = SubNetworkId.Liberland;
    subBridgeApiMock.isStandalone.mockReturnValue(true);
    assetsStoreMock.registeredAssets = {};
    assetsStoreMock.registeredAssetsFetching = true;
    updateSubBridgeHistoryMock
      .mockImplementationOnce(() => async () => {
        await bootHistoryGate;
      })
      .mockImplementationOnce(() => async (_clearHistory = false, updateCallback?: VoidFunction) => {
        subBridgeApiMock.history = {
          '0xliberland-request': {
            id: '0xliberland-request',
            type: Operation.SubstrateIncoming,
            externalNetwork: SubNetworkId.Liberland,
          },
        };
        await updateCallback?.();
      });

    const bootUpdate = store.updateExternalHistory();
    await Promise.resolve();

    assetsStoreMock.registeredAssets = {
      '0xlld': {
        address: '',
        decimals: 12,
        kind: 'Sidechain',
      },
    };
    assetsStoreMock.registeredAssetsFetching = false;
    await store.updateExternalHistory();

    expect(updateSubBridgeHistoryMock).toHaveBeenCalledTimes(2);
    expect(store.historyRecord['0xliberland-request']).toEqual(
      expect.objectContaining({
        id: '0xliberland-request',
        externalNetwork: SubNetworkId.Liberland,
      })
    );

    resolveBootHistory();
    await bootUpdate;

    expect(store.historyRecord['0xliberland-request']).toBeDefined();
  });

  it('aborts in-flight Sub history discovery when the connected account changes', async () => {
    let firstSignal!: AbortSignal;

    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = SubNetworkId.Liberland;
    subBridgeApiMock.isStandalone.mockReturnValue(true);
    updateSubBridgeHistoryMock
      .mockImplementationOnce(
        () =>
          async (
            _clearHistory = false,
            _updateCallback?: VoidFunction,
            _isCurrent?: () => boolean,
            signal?: AbortSignal
          ) => {
            firstSignal = signal as AbortSignal;
            await new Promise<void>((resolve) =>
              firstSignal.addEventListener('abort', () => resolve(), { once: true })
            );
          }
      )
      .mockImplementationOnce(() => async () => undefined);

    const previousAccountUpdate = store.updateExternalHistory();
    await vi.waitFor(() => expect(firstSignal).toBeInstanceOf(AbortSignal));

    walletStoreMock.address = 'next-sora-account';
    await store.updateExternalHistory();
    await previousAccountUpdate;

    expect(firstSignal.aborted).toBe(true);
    expect(updateSubBridgeHistoryMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the latest network history when external requests resolve in reverse order', async () => {
    let resolvePreviousHistory!: () => void;
    let resolveCurrentHistory!: () => void;
    const previousHistoryGate = new Promise<void>((resolve) => {
      resolvePreviousHistory = resolve;
    });
    const currentHistoryGate = new Promise<void>((resolve) => {
      resolveCurrentHistory = resolve;
    });
    const currentNetwork = EvmNetworkId.BinanceSmartChainMainnet;

    web3StoreMock.networkType = BridgeNetworkType.Evm;
    web3StoreMock.networkSelected = EvmNetworkId.EthereumSepolia;
    store.setHistoryId();
    updateEvmBridgeHistoryMock
      .mockImplementationOnce(() => async (_clearHistory = false, updateCallback?: VoidFunction) => {
        await previousHistoryGate;
        evmBridgeApiMock.history = {
          'tx-previous-network': {
            id: 'tx-previous-network',
            type: Operation.EvmOutgoing,
            externalNetwork: EvmNetworkId.EthereumSepolia,
          },
        };
        await updateCallback?.();
      })
      .mockImplementationOnce(() => async (_clearHistory = false, updateCallback?: VoidFunction) => {
        await currentHistoryGate;
        evmBridgeApiMock.history = {
          'tx-current-network': {
            id: 'tx-current-network',
            type: Operation.EvmOutgoing,
            externalNetwork: currentNetwork,
          },
        };
        await updateCallback?.();
      });

    const previousUpdate = store.updateExternalHistory(true);
    await Promise.resolve();

    web3StoreMock.networkSelected = currentNetwork;
    const currentUpdate = store.updateExternalHistory(true);
    await Promise.resolve();

    expect(updateEvmBridgeHistoryMock).toHaveBeenCalledTimes(2);

    resolveCurrentHistory();
    await currentUpdate;

    expect(store.historyRecord).toEqual({
      'tx-current-network': expect.objectContaining({ id: 'tx-current-network', externalNetwork: currentNetwork }),
    });

    resolvePreviousHistory();
    await previousUpdate;

    expect(store.historyRecord).toEqual({
      'tx-current-network': expect.objectContaining({ id: 'tx-current-network', externalNetwork: currentNetwork }),
    });
  });

  it('allows a new account to supersede an active history request on the same network', async () => {
    let resolvePreviousHistory!: () => void;
    let resolveCurrentHistory!: () => void;
    const previousHistoryGate = new Promise<void>((resolve) => {
      resolvePreviousHistory = resolve;
    });
    const currentHistoryGate = new Promise<void>((resolve) => {
      resolveCurrentHistory = resolve;
    });

    web3StoreMock.networkType = BridgeNetworkType.Evm;
    web3StoreMock.networkSelected = EvmNetworkId.EthereumSepolia;
    walletStoreMock.address = 'sora-account-1';
    store.setHistoryId();
    updateEvmBridgeHistoryMock
      .mockImplementationOnce(() => async (_clearHistory = false, updateCallback?: VoidFunction) => {
        await previousHistoryGate;
        evmBridgeApiMock.history = {
          'tx-previous-account': {
            id: 'tx-previous-account',
            type: Operation.EvmOutgoing,
            externalNetwork: EvmNetworkId.EthereumSepolia,
          },
        };
        await updateCallback?.();
      })
      .mockImplementationOnce(() => async (_clearHistory = false, updateCallback?: VoidFunction) => {
        await currentHistoryGate;
        evmBridgeApiMock.history = {
          'tx-current-account': {
            id: 'tx-current-account',
            type: Operation.EvmOutgoing,
            externalNetwork: EvmNetworkId.EthereumSepolia,
          },
        };
        await updateCallback?.();
      });

    const previousUpdate = store.updateExternalHistory(true);
    await Promise.resolve();

    walletStoreMock.address = 'sora-account-2';
    const currentUpdate = store.updateExternalHistory(true);
    await Promise.resolve();

    expect(updateEvmBridgeHistoryMock).toHaveBeenCalledTimes(2);

    resolveCurrentHistory();
    await currentUpdate;

    resolvePreviousHistory();
    await previousUpdate;

    expect(store.historyRecord).toEqual({
      'tx-current-account': expect.objectContaining({ id: 'tx-current-account' }),
    });
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
    const transaction = await store.signEthBridgeOutgoingEvm('tx-sign', vi.fn());

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
    expect(ethBridgeMock.handleTransaction).toHaveBeenCalledWith('tx-sign', expect.any(AbortSignal));
    expect(evmBridgeMock.handleTransaction).not.toHaveBeenCalled();
    expect(subBridgeMock.handleTransaction).not.toHaveBeenCalled();
  });

  it('records the exact nonce-pinned outgoing EVM request before wallet broadcast', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_777_777_777_000);
    const recordSubmission = vi.fn();

    ethBridgeApiMock.history['tx-prepared-outgoing'] = {
      id: 'tx-prepared-outgoing',
      type: Operation.EthBridgeOutgoing,
      amount: '10',
      assetAddress: '0x01',
      to: '0xrecipient',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    outgoingPopulateTransactionMock.mockResolvedValueOnce({
      to: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      data: '0xAABB',
      value: '0x00002a',
    });

    try {
      await expect(store.signEthBridgeOutgoingEvm('tx-prepared-outgoing', recordSubmission)).resolves.toEqual({
        hash: '0xoutgoing-tx',
      });
    } finally {
      now.mockRestore();
    }

    expect(outgoingPopulateTransactionMock).toHaveBeenCalledWith('arg-1', 'arg-2');
    expect(outgoingSignerMock.getNonce).toHaveBeenCalledWith('pending');
    expect(recordSubmission).toHaveBeenCalledWith({
      from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      to: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      nonce: 7,
      data: '0xAABB',
      value: '42',
      startTimestamp: 1_777_777_777_000,
    });
    expect(outgoingSignerMock.sendTransaction).toHaveBeenCalledWith({
      to: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      data: '0xAABB',
      value: '0x00002a',
      from: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      nonce: 7,
    });
    expect(recordSubmission.mock.invocationCallOrder[0]).toBeLessThan(
      outgoingSignerMock.sendTransaction.mock.invocationCallOrder[0]
    );
  });

  it('serializes independent store instances and refuses a duplicate EVM broadcast after evidence is persisted', async () => {
    let finishFirstBroadcast!: (transaction: { hash: string }) => void;
    const firstBroadcast = new Promise<{ hash: string }>((resolve) => {
      finishFirstBroadcast = resolve;
    });
    const transaction = {
      id: 'tx-cross-tab-outgoing',
      type: Operation.EthBridgeOutgoing,
      amount: '10',
      assetAddress: '0x01',
      to: '0xrecipient',
      externalNetwork: EvmNetworkId.EthereumSepolia,
      payload: {},
    };
    const recordFirstSubmission = vi.fn((evidence: Record<string, unknown>) => {
      const current = ethBridgeApiMock.history[transaction.id];
      ethBridgeApiMock.saveHistory({ ...current, payload: { ...current.payload, evmSubmission: evidence } });
    });
    const recordSecondSubmission = vi.fn();
    const secondStore = useBridgeStore(createPinia());

    ethBridgeApiMock.history[transaction.id] = transaction;
    outgoingSignerMock.sendTransaction.mockReturnValueOnce(firstBroadcast as never);

    const first = store.signEthBridgeOutgoingEvm(transaction.id, recordFirstSubmission as never);
    await vi.waitFor(() => expect(recordFirstSubmission).toHaveBeenCalledOnce());

    const duplicate = secondStore.signEthBridgeOutgoingEvm(transaction.id, recordSecondSubmission);
    const duplicateExpectation = expect(duplicate).rejects.toMatchObject({
      code: 'BRIDGE_EVM_SUBMISSION_ALREADY_RECORDED',
    });

    await Promise.resolve();
    expect(outgoingSignerMock.getNonce).toHaveBeenCalledTimes(1);
    expect(outgoingSignerMock.sendTransaction).toHaveBeenCalledTimes(1);

    finishFirstBroadcast({ hash: '0xfirst-cross-tab-broadcast' });

    await expect(first).resolves.toEqual({ hash: '0xfirst-cross-tab-broadcast' });
    await duplicateExpectation;
    expect(recordSecondSubmission).not.toHaveBeenCalled();
    expect(outgoingSignerMock.getNonce).toHaveBeenCalledTimes(1);
    expect(outgoingSignerMock.sendTransaction).toHaveBeenCalledTimes(1);
    expect(webLocksMock.request).toHaveBeenCalledTimes(2);
  });

  it('rejects an unsafe pending EVM nonce before recording evidence or broadcasting', async () => {
    const recordSubmission = vi.fn();

    ethBridgeApiMock.history['tx-unsafe-nonce'] = {
      id: 'tx-unsafe-nonce',
      type: Operation.EthBridgeOutgoing,
      amount: '10',
      assetAddress: '0x01',
      to: '0xrecipient',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    outgoingSignerMock.getNonce.mockResolvedValueOnce(Number.MAX_SAFE_INTEGER + 1);

    await expect(store.signEthBridgeOutgoingEvm('tx-unsafe-nonce', recordSubmission)).rejects.toThrow(
      '[Bridge]: EVM pending nonce is invalid'
    );

    expect(recordSubmission).not.toHaveBeenCalled();
    expect(outgoingSignerMock.sendTransaction).not.toHaveBeenCalled();
  });

  it('routes persisted transactions by their operation instead of the selected UI network', async () => {
    subBridgeApiMock.history['tx-sub'] = {
      id: 'tx-sub',
      type: Operation.SubstrateIncoming,
      externalNetwork: SubNetworkId.Liberland,
    };
    evmBridgeApiMock.history['tx-evm'] = {
      id: 'tx-evm',
      type: Operation.EvmOutgoing,
      externalNetwork: EvmNetworkId.BinanceSmartChainMainnet,
    };
    ethBridgeApiMock.history['tx-eth'] = {
      id: 'tx-eth',
      type: Operation.EthBridgeIncoming,
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };

    web3StoreMock.networkType = BridgeNetworkType.Eth;
    await store.handleBridgeTransaction('tx-sub');
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    await store.handleBridgeTransaction('tx-evm');
    web3StoreMock.networkType = BridgeNetworkType.Evm;
    await store.handleBridgeTransaction('tx-eth');

    expect(subBridgeMock.handleTransaction).toHaveBeenCalledTimes(1);
    expect(subBridgeMock.handleTransaction).toHaveBeenCalledWith('tx-sub', expect.any(AbortSignal));
    expect(evmBridgeMock.handleTransaction).toHaveBeenCalledTimes(1);
    expect(evmBridgeMock.handleTransaction).toHaveBeenCalledWith('tx-evm', expect.any(AbortSignal));
    expect(ethBridgeMock.handleTransaction).toHaveBeenCalledTimes(1);
    expect(ethBridgeMock.handleTransaction).toHaveBeenCalledWith('tx-eth', expect.any(AbortSignal));
  });

  it('does not route display-only recovered Liberland history into a bridge reducer', async () => {
    subBridgeApiMock.history.settlement = {
      id: 'settlement',
      txId: 'settlement',
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Failed,
      externalNetwork: SubNetworkId.Liberland,
      externalNetworkType: BridgeNetworkType.Sub,
      payload: {
        startBlock: 1,
        submissionState: 'broadcast',
        subBridgeHistoryRecovery: SUB_BRIDGE_DISPLAY_ONLY_HISTORY_RECOVERY,
      },
    };

    await expect(store.handleBridgeTransaction('settlement')).resolves.toBeUndefined();

    expect(subBridgeMock.handleTransaction).not.toHaveBeenCalled();
    expect(store.history.inProgressIds.settlement).toBeUndefined();
  });

  it('coalesces rapid handling requests that identify the same transaction by different aliases', async () => {
    let finishProcessing!: () => void;
    const processing = new Promise<void>((resolve) => {
      finishProcessing = resolve;
    });
    const transaction = {
      id: 'tx-sub-alias',
      hash: '0xrequest',
      type: Operation.SubstrateIncoming,
      externalNetwork: SubNetworkId.Liberland,
    };

    store.setHistoryTransaction('local-storage-key', transaction as any);
    subBridgeMock.handleTransaction.mockReturnValueOnce(processing);

    const firstRequest = store.handleBridgeTransaction(transaction.id);
    const duplicateRequest = store.handleBridgeTransaction(transaction.hash);

    await Promise.resolve();

    expect(subBridgeMock.handleTransaction).toHaveBeenCalledTimes(1);
    expect(subBridgeMock.handleTransaction).toHaveBeenCalledWith(transaction.id, expect.any(AbortSignal));

    finishProcessing();
    await Promise.all([firstRequest, duplicateRequest]);

    await store.handleBridgeTransaction(transaction.hash);

    expect(subBridgeMock.handleTransaction).toHaveBeenCalledTimes(2);
  });

  it('allows a later retry after a coalesced transaction handler rejects', async () => {
    const transaction = {
      id: 'tx-sub-retry',
      type: Operation.SubstrateIncoming,
      externalNetwork: SubNetworkId.Liberland,
    };

    store.setHistoryTransaction(transaction.id, transaction as any);
    subBridgeMock.handleTransaction.mockRejectedValueOnce(new Error('temporary tracker failure'));

    await expect(store.handleBridgeTransaction(transaction.id)).rejects.toThrow('temporary tracker failure');
    await expect(store.handleBridgeTransaction(transaction.id)).resolves.toBeUndefined();

    expect(subBridgeMock.handleTransaction).toHaveBeenCalledTimes(2);
  });

  it('cancels a managed bridge tracker before forced history removal', async () => {
    const transaction = {
      id: 'tx-cancel-on-remove',
      type: Operation.EthBridgeIncoming,
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    let capturedSignal: AbortSignal | undefined;

    ethBridgeApiMock.history[transaction.id] = transaction;
    await store.updateInternalHistory();
    ethBridgeMock.handleTransaction.mockImplementationOnce(
      (_id: string, signal?: AbortSignal) =>
        new Promise<void>((_resolve, reject) => {
          capturedSignal = signal;
          signal?.addEventListener(
            'abort',
            () => {
              const error = new Error('canceled');
              error.name = 'AbortError';
              reject(error);
            },
            { once: true }
          );
        })
    );

    const tracking = store.handleBridgeTransaction(transaction.id);
    await Promise.resolve();

    await store.removeHistory({ tx: transaction, force: true });
    await expect(tracking).resolves.toBeUndefined();

    expect(capturedSignal?.aborted).toBe(true);
    expect(ethBridgeApiMock.removeHistory).toHaveBeenCalledWith(transaction.id);
  });

  it('cancels managed bridge trackers during a store reset', async () => {
    const transaction = {
      id: 'tx-cancel-on-reset',
      type: Operation.EthBridgeIncoming,
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    let capturedSignal: AbortSignal | undefined;

    ethBridgeApiMock.history[transaction.id] = transaction;
    await store.updateInternalHistory();
    ethBridgeMock.handleTransaction.mockImplementationOnce(
      (_id: string, signal?: AbortSignal) =>
        new Promise<void>((_resolve, reject) => {
          capturedSignal = signal;
          signal?.addEventListener(
            'abort',
            () => {
              const error = new Error('canceled');
              error.name = 'AbortError';
              reject(error);
            },
            { once: true }
          );
        })
    );

    const tracking = store.handleBridgeTransaction(transaction.id);
    await Promise.resolve();

    store.reset();
    await expect(tracking).resolves.toBeUndefined();

    expect(capturedSignal?.aborted).toBe(true);
  });

  it('cancels a managed bridge tracker when the SORA account identity changes', async () => {
    const transaction = {
      id: 'tx-cancel-on-account-change',
      type: Operation.EthBridgeIncoming,
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    let capturedSignal: AbortSignal | undefined;

    ethBridgeApiMock.history[transaction.id] = transaction;
    await store.updateInternalHistory();
    ethBridgeMock.handleTransaction.mockImplementationOnce(
      (_id: string, signal?: AbortSignal) =>
        new Promise<void>((_resolve, reject) => {
          capturedSignal = signal;
          signal?.addEventListener(
            'abort',
            () => {
              const error = new Error('canceled');
              error.name = 'AbortError';
              reject(error);
            },
            { once: true }
          );
        })
    );

    const tracking = store.handleBridgeTransaction(transaction.id);
    await Promise.resolve();

    walletStoreMock.address = 'next-sora-address';
    walletStoreSubscription();

    await expect(tracking).resolves.toBeUndefined();
    expect(capturedSignal?.aborted).toBe(true);
  });

  it('clears account-owned bridge state without replacing network subscriptions or connector', async () => {
    const connector = store.connector;
    const outgoingMaxLimit = { unsubscribe: vi.fn() } as any;
    const blockUpdates = { unsubscribe: vi.fn() } as any;

    store.subscriptions.outgoingMaxLimit = outgoingMaxLimit;
    store.subscriptions.blockUpdates = blockUpdates;
    const storedOutgoingMaxLimit = store.subscriptions.outgoingMaxLimit;
    const storedBlockUpdates = store.subscriptions.blockUpdates;
    store.history.id = 'tx-old-account';
    store.history.internal = { 'tx-old-account': { id: 'tx-old-account' } } as any;
    store.history.loading = { [EvmNetworkId.EthereumSepolia]: true };
    store.history.waitingForApprove = { 'tx-old-account': true };
    store.history.inProgressIds = { 'tx-old-account': true };
    store.history.notificationData = { id: 'tx-old-account' } as any;
    store.flags.isSignTxDialogVisible = true;
    store.flags.balancesFetching = true;
    store.flags.feesAndLockedFundsFetching = true;
    store.balances.assetSenderBalance = '99';
    store.fees.externalBlockNumber = 999;

    await store.cancelAccountBoundTasks();

    expect(store.connector).toBe(connector);
    expect(store.subscriptions.outgoingMaxLimit).toBe(storedOutgoingMaxLimit);
    expect(store.subscriptions.blockUpdates).toBe(storedBlockUpdates);
    expect(store.history).toMatchObject({
      id: '',
      internal: {},
      loading: {},
      waitingForApprove: {},
      inProgressIds: {},
      notificationData: null,
    });
    expect(store.flags.isSignTxDialogVisible).toBe(false);
    expect(store.flags.balancesFetching).toBe(false);
    expect(store.flags.feesAndLockedFundsFetching).toBe(false);
    expect(store.balances.assetSenderBalance).toBeNull();
    expect(store.fees.externalBlockNumber).toBe(0);
    expect(outgoingMaxLimit.unsubscribe).not.toHaveBeenCalled();
    expect(blockUpdates.unsubscribe).not.toHaveBeenCalled();
  });

  it('signs incoming eth bridge transfers directly while syncing approval state', async () => {
    const approvalTx = { hash: '0xapprove-tx' };
    web3StoreMock.evmAddress = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const recordSubmission = vi.fn();
    const approveMock = vi.fn(async () => {
      expect(store.history.waitingForApprove['tx-sign-incoming']).toBe(true);
      return approvalTx;
    });

    ethBridgeApiMock.history['tx-sign-incoming'] = {
      id: 'tx-sign-incoming',
      type: Operation.EthBridgeIncoming,
      amount: '10',
      assetAddress: '0x01',
      to: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      from: 'sora-address',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    ethersUtilMock.getAllowance.mockResolvedValueOnce('1');
    ethersUtilMock.getTokenContract.mockResolvedValueOnce({
      approve: approveMock,
    });

    const transaction = await store.signEthBridgeIncomingEvm('tx-sign-incoming', recordSubmission);

    expect(ethersUtilMock.checkAccountIsConnected).toHaveBeenCalledWith('0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    expect(ethersUtilMock.getAllowance).toHaveBeenCalledWith(
      '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      '0xcontract-other',
      '0xexternal-asset'
    );
    expect(waitForEvmTransactionMinedMock).toHaveBeenCalledWith(approvalTx);
    expect(approveMock).toHaveBeenCalledWith('0xcontract-other', expect.anything(), {
      from: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      chainId: EvmNetworkId.EthereumSepolia,
    });
    expect(getIncomingEvmTransactionDataMock).toHaveBeenCalledWith(
      expect.objectContaining({
        asset: expect.objectContaining({
          address: '0x01',
        }),
        value: '10',
        recipient: 'sora-address',
      })
    );
    expect(incomingPopulateTransactionMock).toHaveBeenCalledWith('incoming-arg-1', 'incoming-arg-2');
    expect(incomingSignerMock.getNonce).toHaveBeenCalledWith('pending');
    expect(recordSubmission).toHaveBeenCalledWith({
      from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      to: '0xcccccccccccccccccccccccccccccccccccccccc',
      nonce: 8,
      data: '0xCCDD',
      value: '0',
      startTimestamp: expect.any(Number),
    });
    expect(incomingSignerMock.sendTransaction).toHaveBeenCalledWith({
      to: '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
      data: '0xCCDD',
      from: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      nonce: 8,
      chainId: EvmNetworkId.EthereumSepolia,
    });
    expect(waitForEvmTransactionMinedMock.mock.invocationCallOrder[0]).toBeLessThan(
      recordSubmission.mock.invocationCallOrder[0]
    );
    expect(recordSubmission.mock.invocationCallOrder[0]).toBeLessThan(
      incomingSignerMock.sendTransaction.mock.invocationCallOrder[0]
    );
    expect(transaction).toEqual({ hash: '0xincoming-tx' });
    expect(store.history.waitingForApprove['tx-sign-incoming']).toBeUndefined();
  });

  it('signs an incoming transfer using direction-independent generated history addresses', async () => {
    web3StoreMock.evmAddress = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const generated = (await store.generateHistoryItem({
      type: Operation.EthBridgeIncoming,
      amount: '10',
      assetAddress: '0x01',
    })) as { id: string; from: string; to: string };
    expect(generated.from).toBe('sora-address');
    expect(generated.to).toBe(web3StoreMock.evmAddress);
    await store.signEthBridgeIncomingEvm(generated.id, vi.fn());
    expect(getIncomingEvmTransactionDataMock).toHaveBeenCalledWith(
      expect.objectContaining({ recipient: 'sora-address' })
    );
    expect(incomingSignerMock.sendTransaction).toHaveBeenCalledOnce();
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

  it.each(['unchanged', 'xor-unchanged', 'approval-impact', 'disconnect', 'genesis', 'fees', 'slippage'] as const)(
    'keeps a guided incoming history bound to fresh funding evidence: %s',
    async (change) => {
      web3StoreMock.evmAddress = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      web3StoreMock.networkSelected = 1 as never;
      web3StoreMock.ethBridgeEvmNetwork = 1;
      ethersUtilMock.getEvmNetworkId.mockResolvedValue(1);
      settingsStoreMock.networkFees = {
        [Operation.Swap]: '200000000000000',
        [Operation.BurnWithRemark]: change === 'xor-unchanged' ? '0' : '100000000000000',
      };
      assetsStoreMock.registeredAssets = {
        [DAI.address]: { address: '0xdai', decimals: 18, kind: EthAssetKind.Sidechain },
      };
      assetsStoreMock.assetDataByAddress.mockReturnValue({ ...DAI, externalAddress: '0xdai', externalDecimals: 18 });
      const quote = vi.fn(async () => ({
        unwrap: () => ({ amount: '1800000000000000000', amountWithoutImpact: '1810000000000000000' }),
      }));
      const chain = { isConnected: true, genesisHash: TONSWAP_MAINNET_GENESIS, rpc: { liquidityProxy: { quote } } };
      const previousConnection = Object.getOwnPropertyDescriptor(api, 'connection');
      Object.defineProperty(api, 'connection', { configurable: true, value: { api: chain } });
      const fundingPayload =
        change === 'xor-unchanged'
          ? { buyXorFunding: 'ethereum-dai-v1', other: 'kept' }
          : { tonswapFunding: TONSWAP_BRIDGE_FUNDING_TAG, other: 'kept' };
      try {
        const generated = (await store.generateHistoryItem({
          type: Operation.EthBridgeIncoming,
          amount: '10',
          assetAddress: DAI.address,
          payload: fundingPayload,
        })) as { id: string };
        ethersUtilMock.getAllowance.mockResolvedValueOnce('1');
        if (change === 'approval-impact') {
          waitForEvmTransactionMinedMock.mockImplementationOnce(async () => {
            quote.mockResolvedValue({
              unwrap: () => ({ amount: '1000000000000000000', amountWithoutImpact: '2000000000000000000' }),
            });
          });
        } else if (change !== 'unchanged' && change !== 'xor-unchanged') {
          ethersUtilMock.checkAccountIsConnected.mockImplementationOnce(async () => {
            await Promise.resolve();
            if (change === 'disconnect') chain.isConnected = false;
            if (change === 'genesis') chain.genesisHash = 'other';
            if (change === 'fees') settingsStoreMock.networkFees[Operation.Swap] = '300000000000000';
            if (change === 'slippage') settingsStoreMock.slippageTolerance = '5';
            return true;
          });
        }
        const recordSubmission = vi.fn();
        const execution = store.signEthBridgeIncomingEvm(generated.id, recordSubmission);
        if (change === 'unchanged' || change === 'xor-unchanged') {
          await expect(execution).resolves.toEqual({ hash: '0xincoming-tx' });
          expect(quote).toHaveBeenCalledTimes(4);
          expect(recordSubmission).toHaveBeenCalledOnce();
        } else {
          await expect(execution).rejects.toThrow('GET_TS_BRIDGE_');
          expect(recordSubmission).not.toHaveBeenCalled();
          expect(incomingSignerMock.sendTransaction).not.toHaveBeenCalled();
        }
        expect(ethBridgeApiMock.history[generated.id].payload).toEqual(fundingPayload);
      } finally {
        if (previousConnection) Object.defineProperty(api, 'connection', previousConnection);
        else Reflect.deleteProperty(api, 'connection');
      }
    }
  );

  it('rejects incoming signing before allowance checks when the EVM wallet is disconnected', async () => {
    ethBridgeApiMock.history['tx-disconnected-incoming'] = {
      id: 'tx-disconnected-incoming',
      type: Operation.EthBridgeIncoming,
      amount: '10',
      assetAddress: '0x01',
      to: '0xrecipient',
      from: 'sora-address',
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
      from: 'sora-address',
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
      from: 'sora-address',
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
      from: 'sora-address',
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

  it.each(['recipient', 'sender', 'provider-chain', 'app-chain'] as const)(
    'stops an incoming transfer when %s changes while ERC20 approval is mining',
    async (change) => {
      ethBridgeApiMock.history['tx-context-change'] = {
        id: 'tx-context-change',
        type: Operation.EthBridgeIncoming,
        amount: '10',
        assetAddress: '0x01',
        to: '0xrecipient',
        from: 'sora-address',
        externalNetwork: EvmNetworkId.EthereumSepolia,
      };
      ethersUtilMock.getAllowance.mockResolvedValueOnce('1');
      waitForEvmTransactionMinedMock.mockImplementationOnce(async () => {
        if (change === 'recipient') walletStoreMock.address = 'another-sora-account';
        if (change === 'sender') web3StoreMock.evmAddress = '0xanother-account';
        if (change === 'provider-chain') ethersUtilMock.getEvmNetworkId.mockResolvedValue(1);
        if (change === 'app-chain') web3StoreMock.networkSelected = 1 as never;
      });
      const recordSubmission = vi.fn();
      await expect(store.signEthBridgeIncomingEvm('tx-context-change', recordSubmission)).rejects.toThrow();
      expect(getIncomingEvmTransactionDataMock).not.toHaveBeenCalled();
      expect(incomingSignerMock.sendTransaction).not.toHaveBeenCalled();
      expect(recordSubmission).not.toHaveBeenCalled();
      expect(store.history.waitingForApprove['tx-context-change']).toBeUndefined();
    }
  );

  it('rechecks the captured recipient and signer after async transaction preparation', async () => {
    ethBridgeApiMock.history['tx-late-recipient-change'] = {
      id: 'tx-late-recipient-change',
      type: Operation.EthBridgeIncoming,
      amount: '10',
      assetAddress: '0x01',
      to: '0xrecipient',
      from: 'sora-address',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    incomingSignerMock.getAddress.mockResolvedValue('0xrecipient');
    incomingSignerMock.getNonce.mockImplementationOnce(async () => {
      walletStoreMock.address = 'another-sora-account';
      return 8;
    });
    const recordSubmission = vi.fn();
    await expect(store.signEthBridgeIncomingEvm('tx-late-recipient-change', recordSubmission)).rejects.toThrow(
      'SORA recipient changed'
    );
    expect(getIncomingEvmTransactionDataMock).toHaveBeenCalledWith(
      expect.objectContaining({ recipient: 'sora-address' })
    );
    expect(recordSubmission).not.toHaveBeenCalled();
    expect(incomingSignerMock.sendTransaction).not.toHaveBeenCalled();
  });

  it('rejects a different bridge signer even when the displayed wallet account is unchanged', async () => {
    ethBridgeApiMock.history['tx-wrong-incoming-signer'] = {
      id: 'tx-wrong-incoming-signer',
      type: Operation.EthBridgeIncoming,
      amount: '10',
      assetAddress: '0x01',
      to: '0xrecipient',
      from: 'sora-address',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    const recordSubmission = vi.fn();
    await expect(store.signEthBridgeIncomingEvm('tx-wrong-incoming-signer', recordSubmission)).rejects.toThrow(
      'Ethereum account changed'
    );
    expect(recordSubmission).not.toHaveBeenCalled();
    expect(incomingSignerMock.sendTransaction).not.toHaveBeenCalled();
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
      expect(store.balances.assetRecipientBalance).toBe('33');
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
      expect(store.balances.assetRecipientBalance).toBe('33');
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

  it('keeps balances for the latest asset when the previous asset provider resolves last', async () => {
    let resolvePreviousBalance!: (value: { transferable: string }) => void;
    let resolveCurrentBalance!: (value: { transferable: string }) => void;
    const previousBalance = new Promise<{ transferable: string }>((resolve) => {
      resolvePreviousBalance = resolve;
    });
    const currentBalance = new Promise<{ transferable: string }>((resolve) => {
      resolveCurrentBalance = resolve;
    });
    getSoraAssetBalanceMock.mockReturnValueOnce(previousBalance).mockReturnValueOnce(currentBalance);

    const previousRefresh = store.updateExternalBalance();
    store.updateForm({ assetAddress: '0x02' });
    const currentRefresh = store.updateExternalBalance();

    resolveCurrentBalance({ transferable: '202' });
    await currentRefresh;
    expect(store.balances.assetSenderBalance).toBe('202');

    resolvePreviousBalance({ transferable: '101' });
    await previousRefresh;

    expect(store.form.assetAddress).toBe('0x02');
    expect(store.balances.assetSenderBalance).toBe('202');
    expect(store.flags.balancesFetching).toBe(false);
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

  it('does not subscribe to limits for a previous asset whose provider resolves last', async () => {
    let resolvePreviousLimit!: (value: boolean) => void;
    let resolveCurrentLimit!: (value: boolean) => void;
    const previousLimit = new Promise<boolean>((resolve) => {
      resolvePreviousLimit = resolve;
    });
    const currentLimit = new Promise<boolean>((resolve) => {
      resolveCurrentLimit = resolve;
    });
    (api.bridgeProxy as any).isAssetTransferLimited = vi
      .fn()
      .mockReturnValueOnce(previousLimit)
      .mockReturnValueOnce(currentLimit);

    const previousRefresh = store.updateOutgoingMaxLimit();
    store.updateForm({ assetAddress: '0x02' });
    const currentRefresh = store.updateOutgoingMaxLimit();

    resolveCurrentLimit(true);
    await currentRefresh;
    const latestMaxLimit = store.balances.outgoingMaxLimit?.toString();

    resolvePreviousLimit(true);
    await previousRefresh;

    expect(api.swap.getSwapQuoteObservable).toHaveBeenCalledTimes(1);
    expect(api.swap.getSwapQuoteObservable).toHaveBeenCalledWith(
      DAI.address,
      '0x02',
      expect.any(Array),
      expect.anything()
    );
    expect(store.balances.outgoingMaxLimit?.toString()).toBe(latestMaxLimit);
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
      'formatted-sub-address',
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
      { accountAddress: 'formatted-sub-address', asset: expect.objectContaining({ address: '0x01' }) },
      { accountAddress: 'formatted-sub-address', asset: expect.objectContaining({ address: '0x02' }) },
    ]);
    expect(getSoraAssetBalanceMock).toHaveBeenCalledWith(api.api, 'sora-address', '0x01', 18);
    expect(seededConnector.network.getTokenBalance).toHaveBeenNthCalledWith(
      1,
      'formatted-sub-address',
      expect.objectContaining({ address: '0x01' })
    );
    expect(seededConnector.network.getTokenBalance).toHaveBeenNthCalledWith(
      2,
      'formatted-sub-address',
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
      'formatted-sub-address',
      expect.objectContaining({ address: '0x02' })
    );
    expect(store.balances.assetSenderBalance).toBe('33');
    expect(store.balances.assetRecipientBalance).toBe('222');
    expect(store.fees.externalNativeBalance).toBe('777');
    expect(store.flags.balancesFetching).toBe(false);
  });

  it('keeps the SORA balance and clears omitted Sub batch response slots', async () => {
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
    expect(store.balances.assetSenderBalance).toBe('33');
    expect(store.balances.assetRecipientBalance).toBe('444');
    expect(store.fees.externalNativeBalance).toBe('0');
    expect(store.flags.balancesFetching).toBe(false);
  });

  it('keeps the SORA balance and clears non-codec Sub batch response slots', async () => {
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = 'kusama' as any;
    store.updateForm({ isSoraToEvm: true, assetAddress: '0x01' });
    store.balances.assetSenderBalance = '999';
    store.balances.assetRecipientBalance = '888';
    store.fees.externalNativeBalance = '777';
    seededConnector.network.getTokenBalancesBatch.mockResolvedValueOnce([{ toString: () => '444' }, 'NaN'] as any);

    await store.updateExternalBalance();

    expect(seededConnector.network.getTokenBalancesBatch).toHaveBeenCalledTimes(1);
    expect(seededConnector.network.getTokenBalance).not.toHaveBeenCalled();
    expect(store.balances.assetSenderBalance).toBe('33');
    expect(store.balances.assetRecipientBalance).toBe('0');
    expect(store.fees.externalNativeBalance).toBe('0');
    expect(store.flags.balancesFetching).toBe(false);
  });

  it('keeps the SORA balance and clears hostile Sub batch response strings', async () => {
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = 'kusama' as any;
    store.updateForm({ isSoraToEvm: true, assetAddress: '0x01' });
    store.balances.assetSenderBalance = '999';
    store.balances.assetRecipientBalance = '888';
    store.fees.externalNativeBalance = '777';
    seededConnector.network.getTokenBalancesBatch.mockResolvedValueOnce(['.5', '1.']);

    await store.updateExternalBalance();

    expect(seededConnector.network.getTokenBalancesBatch).toHaveBeenCalledTimes(1);
    expect(seededConnector.network.getTokenBalance).not.toHaveBeenCalled();
    expect(store.balances.assetSenderBalance).toBe('33');
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

  it('keeps the latest asset minimum when the previous minimum provider resolves last', async () => {
    let resolvePreviousMinimum!: (value: string) => void;
    let resolveCurrentMinimum!: (value: string) => void;
    const previousMinimum = new Promise<string>((resolve) => {
      resolvePreviousMinimum = resolve;
    });
    const currentMinimum = new Promise<string>((resolve) => {
      resolveCurrentMinimum = resolve;
    });

    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = 'kusama' as any;
    store.updateForm({ isSoraToEvm: false, assetAddress: '0x01' });
    seededConnector.network.getAssetMinDeposit.mockReturnValueOnce(previousMinimum).mockReturnValueOnce(currentMinimum);

    const previousRefresh = store.updateExternalMinBalance();
    store.updateForm({ assetAddress: '0x02' });
    const currentRefresh = store.updateExternalMinBalance();

    resolveCurrentMinimum('202');
    await currentRefresh;
    expect(store.balances.assetExternalMinBalance).toBe('202');

    resolvePreviousMinimum('101');
    await previousRefresh;

    expect(store.balances.assetExternalMinBalance).toBe('202');
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

  it('supplies the contract resolver required by incoming Ethereum fee estimation', async () => {
    store.updateForm({ isSoraToEvm: false, assetAddress: '0x02', amountSend: '3' });
    store.balances.assetSenderBalance = FPNumber.fromNatural(10).toCodecString();
    getEthNetworkFeeMock.mockImplementationOnce(async (...args: unknown[]) => {
      const resolveContract = args[2] as (symbol: string) => string;
      expect(typeof resolveContract).toBe('function');
      expect(resolveContract('OTHER')).toBe('0xcontract-other');
      return '42';
    });

    await store.updateExternalNetworkFee();

    expect(getEthNetworkFeeMock).toHaveBeenCalledOnce();
    expect(store.fees.externalNetworkFee).toBe('42');
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

  it('does not query or charge a Sub network fee for an outgoing SORA transfer', async () => {
    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = 'Liberland' as any;
    store.updateForm({ isSoraToEvm: true, assetAddress: '0x01' });
    store.fees.externalNetworkFee = '123';

    await store.updateExternalNetworkFee();

    expect(seededConnector.network.getNetworkFee).not.toHaveBeenCalled();
    expect(store.fees.externalNetworkFee).toBe('0');
  });

  it('keeps the latest asset network fee when the previous fee provider resolves last', async () => {
    let resolvePreviousFee!: (value: string) => void;
    let resolveCurrentFee!: (value: string) => void;
    const previousFee = new Promise<string>((resolve) => {
      resolvePreviousFee = resolve;
    });
    const currentFee = new Promise<string>((resolve) => {
      resolveCurrentFee = resolve;
    });

    web3StoreMock.networkType = BridgeNetworkType.Sub;
    web3StoreMock.networkSelected = 'kusama' as any;
    store.updateForm({ isSoraToEvm: false, assetAddress: '0x01' });
    seededConnector.network.getNetworkFee.mockReturnValueOnce(previousFee).mockReturnValueOnce(currentFee);

    const previousRefresh = store.updateExternalNetworkFee();
    store.updateForm({ assetAddress: '0x02' });
    const currentRefresh = store.updateExternalNetworkFee();

    resolveCurrentFee('202');
    await currentRefresh;
    expect(seededConnector.network.getNetworkFee).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ address: '0x01' }),
      'formatted-sub-address',
      'sora-address'
    );
    expect(seededConnector.network.getNetworkFee).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ address: '0x02' }),
      'formatted-sub-address',
      'sora-address'
    );
    expect(store.fees.externalNetworkFee).toBe('202');

    resolvePreviousFee('101');
    await previousRefresh;

    expect(store.fees.externalNetworkFee).toBe('202');
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

  it.each(['-1', `5${'0'.repeat(38)}`])(
    'repairs stale destination amount %s from the approved proof before wallet review',
    async (staleAmount) => {
      ethBridgeApiMock.history['tx-invalid-amount2'] = {
        id: 'tx-invalid-amount2',
        type: Operation.EthBridgeOutgoing,
        amount: '10',
        amount2: staleAmount,
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

      waitForApprovedRequestMock.mockResolvedValueOnce({
        to: '0xrecipient',
        hash: '0xapproved-request',
        amount: '5000000000000000000',
      });
      outgoingSignerMock.sendTransaction.mockImplementationOnce(async () => {
        expect(ethBridgeApiMock.history['tx-invalid-amount2'].amount2).toBe('5');
        expect(store.historyRecord['tx-invalid-amount2'].amount2).toBe('5');
        return { hash: '0xoutgoing-tx' };
      });

      await expect(store.signEthBridgeOutgoingEvm('tx-invalid-amount2', vi.fn())).resolves.toEqual({
        hash: '0xoutgoing-tx',
      });
      expect(getOutgoingEvmTransactionDataMock).toHaveBeenCalledWith(expect.objectContaining({ value: '5' }));
      expect(ethBridgeApiMock.saveHistory).toHaveBeenCalledWith(
        expect.objectContaining({ amount: '10', amount2: '5' })
      );
    }
  );

  it('rejects an approval for a different request before preparing the wallet or replacing history', async () => {
    ethBridgeApiMock.history['tx-wrong-proof'] = {
      id: 'tx-wrong-proof',
      type: Operation.EthBridgeOutgoing,
      amount: '10',
      assetAddress: '0x01',
      to: '0xrecipient',
      hash: '0xexpected-request',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };

    await expect(store.signEthBridgeOutgoingEvm('tx-wrong-proof')).rejects.toThrow('request does not match');
    expect(getOutgoingEvmTransactionDataMock).not.toHaveBeenCalled();
    expect(ethBridgeApiMock.saveHistory).not.toHaveBeenCalled();
    expect(outgoingSignerMock.sendTransaction).not.toHaveBeenCalled();
  });

  it('does not replace history or send when signed-payload validation fails', async () => {
    ethBridgeApiMock.history['tx-invalid-proof'] = {
      id: 'tx-invalid-proof',
      type: Operation.EthBridgeOutgoing,
      amount: '10',
      amount2: 'old-estimate',
      assetAddress: '0x01',
      to: '0xrecipient',
      externalNetwork: EvmNetworkId.EthereumSepolia,
    };
    getOutgoingEvmTransactionDataMock.mockRejectedValueOnce(new Error('Approved currency does not match'));

    await expect(store.signEthBridgeOutgoingEvm('tx-invalid-proof')).rejects.toThrow('currency does not match');
    expect(ethBridgeApiMock.history['tx-invalid-proof'].amount2).toBe('old-estimate');
    expect(ethBridgeApiMock.saveHistory).not.toHaveBeenCalled();
    expect(outgoingSignerMock.sendTransaction).not.toHaveBeenCalled();
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
