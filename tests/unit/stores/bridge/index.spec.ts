import { FPNumber, Operation } from '@sora-substrate/sdk';
import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { EvmNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/evm/consts';
import { EthAssetKind } from '@sora-substrate/sdk/build/bridgeProxy/eth/consts';
import { createPinia, setActivePinia } from 'pinia';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { beforeTransactionSign } from '@/lib/soraneo-wallet/src/util';
import { api } from '@/shims/wallet-api';

import { useBridgeStore } from '@/stores/bridge';
import { useBridgeHistoryStore } from '@/stores/bridge/history';
import { useBridgeTransactionsStore } from '@/stores/bridge/transactions';
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
  getErc20BalancesBatch: vi.fn(async () => [
    { token: '0xexternal-asset', account: 'sora-address', balance: '11' },
    { token: '0xexternal-asset', account: '0xrecipient', balance: '22' },
  ]),
  isNativeEvmTokenAddress: vi.fn(() => false),
  getTokenContract: vi.fn(async () => ({
    approve: vi.fn(async () => ({ hash: '0xapprove-tx' })),
  })),
}));

vi.mock('@wallet', async () => {
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
    useBridgeHistoryStore().syncHistoryPageFromLegacy(store.history.page);
    useBridgeHistoryStore().syncHistoryIdFromLegacy(store.history.id);
    useBridgeTransactionsStore().syncHistoryInternalFromLegacy(store.history.internal);
    useBridgeTransactionsStore().syncHistoryLoadingFromLegacy(store.history.loading);
    useBridgeTransactionsStore().syncWaitingForApproveFromLegacy(store.history.waitingForApprove);
    useBridgeTransactionsStore().syncInProgressIdsFromLegacy(store.history.inProgressIds);
    useBridgeTransactionsStore().syncNotificationDataFromLegacy(store.history.notificationData);
    useBridgeTransactionsStore().syncSignDialogVisibilityFromLegacy(store.flags.isSignTxDialogVisible);
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

  it('syncs history page and history id through the bridge Pinia facade', () => {
    const bridgeHistoryStore = useBridgeHistoryStore();

    store.setHistoryPage(3.7);
    store.setHistoryId('tx-updated');

    expect(store.history.page).toBe(3);
    expect(store.history.id).toBe('tx-updated');
    expect(bridgeHistoryStore.historyPage).toBe(3);
    expect(bridgeHistoryStore.historyId).toBe('tx-updated');
  });

  it('syncs notification and sign dialog visibility into the transactions facade', () => {
    const bridgeTransactionsStore = useBridgeTransactionsStore();
    const tx = { id: 'tx-note' } as any;

    store.setNotificationData(tx);
    store.addTransactionToProgress('tx-progress');
    store.removeTransactionFromProgress('tx-progress');
    store.setSignTxDialogVisibility(true);

    expect(store.history.notificationData).toEqual(tx);
    expect(bridgeTransactionsStore.notificationData).toEqual(tx);
    expect(store.history.inProgressIds['tx-progress']).toBeUndefined();
    expect(store.flags.isSignTxDialogVisible).toBe(true);
    expect(bridgeTransactionsStore.isSignTxDialogVisible).toBe(true);
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

    await store.updateBridgeHistory();

    expect(updateEthBridgeHistoryMock).toHaveBeenCalled();
    expect(store.historyRecord).toEqual({
      'tx-eth': {
        id: 'tx-eth',
        type: Operation.EthBridgeOutgoing,
        externalNetwork: EvmNetworkId.EthereumSepolia,
      },
    });
    expect(useBridgeTransactionsStore().historyInternal).toEqual(store.history.internal);
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
    const bridgeTransactionsStore = useBridgeTransactionsStore();
    const approvalTx = { hash: '0xapprove-tx' };
    const approveMock = vi.fn(async () => {
      expect(bridgeTransactionsStore.waitingForApprove['tx-sign-incoming']).toBe(true);
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
    expect(bridgeTransactionsStore.waitingForApprove['tx-sign-incoming']).toBeUndefined();
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

    expect(store.balances.assetSenderBalance).toBe('11');
    expect(store.balances.assetRecipientBalance).toBe('22');
    expect(store.fees.externalNativeBalance).toBe('7');
    expect(store.balances.outgoingMaxLimit?.toString()).toBe('20');
    expect(store.subscriptions.outgoingMaxLimit).not.toBeNull();
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

  it('uses Pinia wallet state for before-sign hooks while keeping moonpay records on the root store', async () => {
    const bridgeTransactionsStore = useBridgeTransactionsStore();
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
    bridgeTransactionsStore.setSignTxDialogVisibility(false);
    unsubscribe();

    expect(visibilityChanges).toEqual([true, false]);
    expect(bridgeTransactionsStore.isSignTxDialogVisible).toBe(false);
  });
});
