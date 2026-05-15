import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Operation } from '@sora-substrate/sdk';
import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';

const historyElementsFilterMock = vi.hoisted(() => vi.fn((value) => value));
const getHistoryPagedMock = vi.hoisted(() => vi.fn());
const createTypeMock = vi.hoisted(() => vi.fn());
const getEvmTransactionReceiptByHashMock = vi.hoisted(() => vi.fn());

const ethBridgeApiMock = vi.hoisted(() => {
  const state = {
    history: {} as Record<string, any>,
    storage: {} as Record<string, string>,
  };

  return {
    state,
    get history() {
      return state.history;
    },
    set history(value: Record<string, any>) {
      state.history = value;
    },
    get historyList() {
      return Object.values(state.history);
    },
    accountStorage: {
      get: vi.fn((key: string) => state.storage[key]),
      set: vi.fn((key: string, value: number) => {
        state.storage[key] = String(value);
      }),
    },
    generateHistoryItem: vi.fn((params: Record<string, any>) => {
      const item = { ...params, id: `generated-${Object.keys(state.history).length + 1}` };
      state.history[item.id] = item;
      return item;
    }),
    saveHistory: vi.fn((item: Record<string, any>) => {
      state.history[item.id] = item;
    }),
    removeHistory: vi.fn((...ids: string[]) => {
      ids.forEach((id) => {
        delete state.history[id];
      });
    }),
    getSoraHashByEthereumHash: vi.fn(async (hash: string) => `sora:${hash}`),
    getRequestStatus: vi.fn(),
  };
});

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => ({
    historyElementsFilter: historyElementsFilterMock,
    services: {
      explorer: {
        account: {
          getHistoryPaged: getHistoryPagedMock,
        },
      },
    },
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    connection: {
      api: {
        registry: {
          createType: createTypeMock,
        },
      },
    },
  },
}));

vi.mock('@/utils/bridge/eth/api', () => ({
  ethBridgeApi: ethBridgeApiMock,
}));

vi.mock('@/utils/bridge/common/utils', () => ({
  getEvmTransactionReceiptByHash: getEvmTransactionReceiptByHashMock,
  isOutgoingTransaction: (item: { type?: unknown }) => item.type === Operation.EthBridgeOutgoing,
}));

vi.mock('@/consts/evm', () => ({
  KnownEthBridgeAsset: {
    Other: 'Other',
    XOR: 'XOR',
  },
  SmartContractType: {
    EthBridge: 'EthBridge',
  },
  SmartContracts: {
    EthBridge: {
      Other: [],
      XOR: [],
    },
  },
}));

import { EthBridgeHistory } from '@/utils/bridge/eth/classes/history';
import { ETH_BRIDGE_STATES } from '@/utils/bridge/eth/constants';

const createIncomingHistoryElement = (id: string, timestamp: number) => ({
  id,
  module: 'bridgeMultisig',
  method: 'asMulti',
  address: 'bridge-peer',
  blockHash: `block-${id}`,
  blockHeight: '100',
  timestamp,
  networkFee: '0',
  execution: { success: true },
  data: { call: `call-${id}` },
  calls: [],
});

const createOutgoingHistoryElement = (id: string, timestamp: number) => ({
  id,
  module: 'ethBridge',
  method: 'transferToSidechain',
  address: 'sora-address',
  blockHash: `block-${id}`,
  blockHeight: '99',
  timestamp,
  networkFee: '0',
  execution: { success: true },
  data: {
    amount: '1',
    assetId: XOR.address,
    requestHash: `request-${id}`,
    sidechainAddress: '0xrecipient',
  },
  calls: [],
});

const createOutgoingHistoryElementWithoutRequestHash = (id: string, timestamp: number) => ({
  ...createOutgoingHistoryElement(id, timestamp),
  data: {
    amount: '1',
    assetId: XOR.address,
    sidechainAddress: '0xrecipient',
  },
});

const mockIncomingCall = (recipient = 'sora-address') => ({
  section: 'ethBridge',
  method: 'importIncomingRequest',
  toJSON: () => ({
    args: {
      load_incoming_request: {
        transaction: {
          hash: '0xincoming-request',
        },
      },
      incoming_request_result: {
        ok: {
          transfer: {
            txHash: '0xincoming-request',
            amount: '2000000000000000000',
            assetId: { code: XOR.address },
            from: '0xeth-sender',
            to: recipient,
          },
        },
      },
    },
  }),
});

const setPagedHistory = (incoming: any[] = [], outgoing: any[] = []) => {
  getHistoryPagedMock.mockImplementation(async ({ filter }) => {
    const operation = filter.operations?.[0];
    const nodes = operation === Operation.EthBridgeIncoming ? incoming : outgoing;

    return {
      edges: nodes.map((node) => ({ node })),
      pageInfo: { hasNextPage: false, endCursor: '' },
    };
  });
};

describe('EthBridgeHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ethBridgeApiMock.history = {};
    ethBridgeApiMock.state.storage = {};
    createTypeMock.mockImplementation(() => mockIncomingCall());
    getEvmTransactionReceiptByHashMock.mockResolvedValue({
      from: '0xeth-sender',
      fee: '0.01',
    });
  });

  it('fetches outgoing ETH bridge history by account and incoming multisig history without account filtering', async () => {
    const incoming = createIncomingHistoryElement('incoming', 20);
    const outgoing = createOutgoingHistoryElement('outgoing', 10);
    setPagedHistory([incoming], [outgoing]);

    const history = await new EthBridgeHistory('etherscan-key').fetchHistoryElements('sora-address', 7);

    expect(historyElementsFilterMock).toHaveBeenNthCalledWith(1, {
      address: 'sora-address',
      operations: [Operation.EthBridgeOutgoing],
      timestamp: 7,
      ids: undefined,
    });
    expect(historyElementsFilterMock).toHaveBeenNthCalledWith(2, {
      operations: [Operation.EthBridgeIncoming],
      timestamp: 7,
      ids: undefined,
    });
    expect(history.map((item) => item.id)).toEqual(['incoming', 'outgoing']);
  });

  it('restores raw incoming ETH multisig history for the selected SORA recipient only', async () => {
    const updateCallback = vi.fn();
    const history = new EthBridgeHistory('etherscan-key');
    const incoming = createIncomingHistoryElement('incoming', 20);
    const duplicate = createIncomingHistoryElement('duplicate', 19);
    const otherRecipient = createIncomingHistoryElement('other-recipient', 18);

    (history as any).externalNetwork = 1;
    vi.spyOn(history, 'findEthTxByEthereumHash').mockResolvedValue({
      hash: '0xincoming-request',
    } as any);
    createTypeMock
      .mockReturnValueOnce(mockIncomingCall('sora-address'))
      .mockReturnValueOnce(mockIncomingCall('sora-address'))
      .mockReturnValueOnce(mockIncomingCall('other-sora-address'));
    setPagedHistory([incoming, duplicate, otherRecipient]);

    await history.updateAccountHistory(
      'sora-address',
      { [Operation.EthBridgeOutgoing]: '0' } as any,
      {},
      () => ({ ...XOR, decimals: 18 } as any),
      updateCallback
    );

    expect(ethBridgeApiMock.generateHistoryItem).toHaveBeenCalledTimes(1);
    expect(ethBridgeApiMock.generateHistoryItem).toHaveBeenCalledWith(
      expect.objectContaining({
        txId: 'incoming',
        type: Operation.EthBridgeIncoming,
        from: 'sora-address',
        amount: '2',
        assetAddress: XOR.address,
        symbol: XOR.symbol,
        hash: 'sora:0xincoming-request',
        externalHash: '0xincoming-request',
        externalNetwork: 1,
        externalNetworkType: BridgeNetworkType.Eth,
        externalNetworkFee: '0.01',
        transactionState: ETH_BRIDGE_STATES.SORA_COMMITED,
        to: '0xeth-sender',
      })
    );
    expect(updateCallback).toHaveBeenCalledTimes(1);
    expect(ethBridgeApiMock.accountStorage.set).toHaveBeenCalledWith('ethBridgeHistorySyncTimestamp', 20);
  });

  it('does not advance the sync timestamp from unrelated global incoming rows', async () => {
    const history = new EthBridgeHistory('etherscan-key');
    const otherRecipient = createIncomingHistoryElement('other-recipient', 20);

    ethBridgeApiMock.state.storage.ethBridgeHistorySyncTimestamp = '7';
    (history as any).externalNetwork = 1;
    createTypeMock.mockImplementation(() => mockIncomingCall('other-sora-address'));
    setPagedHistory([otherRecipient]);

    await history.updateAccountHistory(
      'sora-address',
      { [Operation.EthBridgeOutgoing]: '0' } as any,
      {},
      () => ({ ...XOR, decimals: 18 } as any)
    );

    expect(ethBridgeApiMock.generateHistoryItem).not.toHaveBeenCalled();
    expect(ethBridgeApiMock.accountStorage.set).toHaveBeenCalledWith('ethBridgeHistorySyncTimestamp', 7);
  });

  it('retries from the beginning when a stale sync timestamp only returns unrelated incoming rows', async () => {
    const history = new EthBridgeHistory('etherscan-key');
    const otherRecipient = createIncomingHistoryElement('other-recipient', 50);
    const outgoing = createOutgoingHistoryElementWithoutRequestHash('restored-after-fallback', 22);

    ethBridgeApiMock.state.storage.ethBridgeHistorySyncTimestamp = '40';
    ethBridgeApiMock.history = {
      'local-unrelated': {
        id: 'local-unrelated',
        type: Operation.EthBridgeOutgoing,
        hash: 'local-unrelated-hash',
        transactionState: ETH_BRIDGE_STATES.SORA_PENDING,
      },
    };
    (history as any).externalNetwork = 1;
    vi.spyOn(history, 'findEthTxBySoraHash').mockResolvedValue(null);
    createTypeMock.mockReturnValue(mockIncomingCall('other-sora-address'));
    getHistoryPagedMock.mockImplementation(async ({ filter }) => {
      const operation = filter.operations?.[0];
      const nodes =
        filter.timestamp === 40
          ? operation === Operation.EthBridgeIncoming
            ? [otherRecipient]
            : []
          : operation === Operation.EthBridgeOutgoing
            ? [outgoing]
            : [];

      return {
        edges: nodes.map((node) => ({ node })),
        pageInfo: { hasNextPage: false, endCursor: '' },
      };
    });

    await history.updateAccountHistory(
      'sora-address',
      { [Operation.EthBridgeOutgoing]: '0' } as any,
      {},
      () => ({ ...XOR, decimals: 18 } as any)
    );

    expect(ethBridgeApiMock.generateHistoryItem).toHaveBeenCalledWith(
      expect.objectContaining({
        txId: 'restored-after-fallback',
        hash: 'restored-after-fallback',
      })
    );
    expect(ethBridgeApiMock.accountStorage.set).toHaveBeenCalledWith('ethBridgeHistorySyncTimestamp', 22);
  });

  it('restores outgoing ETH rows that no longer include an indexer requestHash field', async () => {
    const history = new EthBridgeHistory('etherscan-key');
    const outgoing = createOutgoingHistoryElementWithoutRequestHash('outgoing-no-request-hash', 22);

    (history as any).externalNetwork = 1;
    vi.spyOn(history, 'findEthTxBySoraHash').mockResolvedValue(null);
    setPagedHistory([], [outgoing]);

    await history.updateAccountHistory(
      'sora-address',
      { [Operation.EthBridgeOutgoing]: '0' } as any,
      {},
      () => ({ ...XOR, decimals: 18 } as any)
    );

    expect(ethBridgeApiMock.generateHistoryItem).toHaveBeenCalledWith(
      expect.objectContaining({
        txId: 'outgoing-no-request-hash',
        type: Operation.EthBridgeOutgoing,
        from: 'sora-address',
        amount: '1',
        assetAddress: XOR.address,
        hash: 'outgoing-no-request-hash',
        transactionState: ETH_BRIDGE_STATES.SORA_PENDING,
        to: '0xrecipient',
      })
    );
    expect(ethBridgeApiMock.accountStorage.set).toHaveBeenCalledWith('ethBridgeHistorySyncTimestamp', 22);
  });
});
