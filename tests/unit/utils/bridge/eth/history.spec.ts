import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Operation } from '@sora-substrate/sdk';
import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { Interface } from 'ethers';

const historyElementsFilterMock = vi.hoisted(() => vi.fn((value) => value));
const getHistoryPagedMock = vi.hoisted(() => vi.fn());
const createTypeMock = vi.hoisted(() => vi.fn());
const getEvmTransactionReceiptByHashMock = vi.hoisted(() => vi.fn());
const getOutgoingClaimStatusMock = vi.hoisted(() => vi.fn());

vi.mock('@/utils/bridge/eth/claimStatus', () => ({
  getOutgoingClaimStatus: getOutgoingClaimStatusMock,
}));
vi.mock('@/utils/ethers-util', () => ({ default: { getEthersInstance: vi.fn(() => ({})) } }));

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
      Other: [
        'function receiveBySidechainAssetId(bytes32 sidechainAssetId,uint256 amount,address to,address from,bytes32 txHash,uint8[] v,bytes32[] r,bytes32[] s)',
      ],
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

const EVM_FROM = '0x1111111111111111111111111111111111111111';
const EVM_BRIDGE = '0x2222222222222222222222222222222222222222';
const EVM_CALLDATA = '0xabcdef12';
const EVM_HASH = `0x${'a'.repeat(64)}`;
const EVM_START_TIMESTAMP = 1_700_000_000_750;

const createEtherscanTransaction = (overrides: Record<string, unknown> = {}) => ({
  hash: EVM_HASH,
  from: EVM_FROM,
  to: EVM_BRIDGE,
  nonce: '7',
  input: EVM_CALLDATA,
  value: '42',
  timeStamp: '1700000001',
  ...overrides,
});

const createSubmissionFingerprint = (overrides: Record<string, unknown> = {}) => ({
  from: EVM_FROM,
  to: EVM_BRIDGE,
  nonce: 7,
  data: EVM_CALLDATA,
  value: 42n,
  startTimestamp: EVM_START_TIMESTAMP,
  ...overrides,
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
    ethBridgeApiMock.getRequestStatus.mockReset();
    getOutgoingClaimStatusMock.mockResolvedValue('inconclusive');
    ethBridgeApiMock.history = {};
    ethBridgeApiMock.state.storage = {};
    createTypeMock.mockImplementation(() => mockIncomingCall());
    getEvmTransactionReceiptByHashMock.mockResolvedValue({
      from: '0xeth-sender',
      fee: '0.01',
    });
  });

  it('fetches outgoing ETH history by account and raw incoming ETH history globally', async () => {
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

  it('bypasses an unavailable explorer only when Ethereum confirms the request is unclaimed and the account is idle', async () => {
    const history = new EthBridgeHistory('etherscan-key');
    await history.init({ OTHER: EVM_BRIDGE } as never, 1);
    const fetchHistory = vi
      .spyOn(history as any, 'fetchEthAccountTransactions')
      .mockRejectedValue(new Error('offline'));
    getOutgoingClaimStatusMock.mockResolvedValue('unclaimed');

    expect(await history.findEthTxBySoraHash(EVM_FROM, EVM_HASH)).toBeNull();
    expect(getOutgoingClaimStatusMock).toHaveBeenCalledWith({}, 1, [EVM_BRIDGE], EVM_FROM, EVM_HASH);
    expect(fetchHistory).not.toHaveBeenCalled();
  });

  it('does not treat an inconclusive Ethereum check and explorer outage as permission to sign again', async () => {
    const history = new EthBridgeHistory('etherscan-key');
    await history.init({ OTHER: EVM_BRIDGE } as never, 1);
    vi.spyOn(history as any, 'fetchEthAccountTransactions').mockRejectedValue(new Error('offline'));
    getOutgoingClaimStatusMock.mockRejectedValue(new Error('wallet unavailable'));

    await expect(history.findEthTxBySoraHash(EVM_FROM, EVM_HASH)).rejects.toThrow('offline');
  });

  it.each(['consumed', 'pending'])(
    'does not let an empty explorer override a %s Ethereum claim status',
    async (status) => {
      const history = new EthBridgeHistory('etherscan-key');
      await history.init({ OTHER: EVM_BRIDGE } as never, 1);
      vi.spyOn(history as any, 'fetchEthAccountTransactions').mockResolvedValue({});
      getOutgoingClaimStatusMock.mockResolvedValue(status);

      await expect(history.findEthTxBySoraHash(EVM_FROM, EVM_HASH)).rejects.toThrow('awaiting transaction history');
    }
  );

  it('refreshes cached history and prefers a successful claim over later failed retries', async () => {
    const history = new EthBridgeHistory('etherscan-key');
    await history.init({ OTHER: EVM_BRIDGE } as never, 1);
    const claim = new Interface([
      'function receiveBySidechainAssetId(bytes32 sidechainAssetId,uint256 amount,address to,address from,bytes32 txHash,uint8[] v,bytes32[] r,bytes32[] s)',
    ]);
    const input = claim.encodeFunctionData('receiveBySidechainAssetId', [
      '0x0200000000000000000000000000000000000000000000000000000000000000',
      '5000000000000000000',
      EVM_FROM,
      EVM_BRIDGE,
      EVM_HASH,
      [],
      [],
      [],
    ]);
    const success = createEtherscanTransaction({ hash: '0xsuccess', input, isError: '0' });
    const failed = createEtherscanTransaction({ hash: '0xfailed', input, isError: '1' });
    (history as any).ethAccountTransactionsMap[EVM_FROM] = {};
    const fetchHistory = vi.spyOn(history as any, 'fetchEthAccountTransactions').mockResolvedValue({ success, failed });

    expect(await history.findEthTxBySoraHash(EVM_FROM, EVM_HASH)).toEqual(success);
    expect(fetchHistory).toHaveBeenCalledOnce();
  });

  it('restores a SORA-approved outgoing row even when Ethereum history is unavailable', async () => {
    const history = new EthBridgeHistory('etherscan-key');
    (history as any).externalNetwork = 1;
    ethBridgeApiMock.getRequestStatus.mockResolvedValue('ApprovalsReady');
    vi.spyOn(history, 'findEthTxBySoraHash').mockRejectedValue(new Error('explorer offline'));
    setPagedHistory([], [createOutgoingHistoryElement('approved', 22)]);

    await history.updateAccountHistory('sora-address', {} as any, {}, () => ({ ...XOR, decimals: 18 }) as any);

    expect(ethBridgeApiMock.generateHistoryItem).toHaveBeenCalledWith(
      expect.objectContaining({
        txId: 'approved',
        hash: 'request-approved',
        transactionState: ETH_BRIDGE_STATES.EVM_REJECTED,
      })
    );
  });

  it.each(['failure', 'empty', 'older failure'])(
    'preserves a local Ethereum broadcast hash when explorer restoration is %s',
    async (result) => {
      const history = new EthBridgeHistory('etherscan-key');
      const row = {
        id: 'local',
        txId: 'approved',
        hash: 'request-approved',
        externalHash: EVM_HASH,
        type: Operation.EthBridgeOutgoing,
        transactionState: ETH_BRIDGE_STATES.EVM_PENDING,
      };
      ethBridgeApiMock.history = { local: row };
      ethBridgeApiMock.getRequestStatus.mockResolvedValue('ApprovalsReady');
      const find = vi.spyOn(history, 'findEthTxBySoraHash');
      if (result === 'failure') find.mockRejectedValue(new Error('explorer offline'));
      else if (result === 'older failure') find.mockResolvedValue({ hash: '0xolder-failed', isError: '1' } as never);
      else find.mockResolvedValue(null);
      setPagedHistory([], [createOutgoingHistoryElement('approved', 22)]);

      await history.updateAccountHistory('sora-address', {} as any, {}, () => ({ ...XOR, decimals: 18 }) as any);

      expect(ethBridgeApiMock.history.local).toEqual(row);
      expect(ethBridgeApiMock.saveHistory).not.toHaveBeenCalled();
    }
  );

  it('force-refreshes an empty Etherscan cache when finding a submission fingerprint', async () => {
    const history = new EthBridgeHistory('etherscan-key');
    const transaction = createEtherscanTransaction();
    const etherscan = {
      fetch: vi.fn().mockResolvedValue('100'),
      getHistory: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([transaction]),
      getBlock: vi.fn(),
    };

    (history as any).etherscanInstance = etherscan;

    await expect(history.findEthTxBySubmissionFingerprint(createSubmissionFingerprint() as any)).resolves.toBeNull();
    await expect(history.findEthTxBySubmissionFingerprint(createSubmissionFingerprint() as any)).resolves.toBe(
      transaction
    );

    expect(etherscan.getHistory).toHaveBeenCalledTimes(2);
    expect(etherscan.getHistory).toHaveBeenNthCalledWith(2, EVM_FROM, 100);
    expect(etherscan.fetch).toHaveBeenCalledWith('block', {
      action: 'getblocknobytime',
      closest: 'before',
      timestamp: 1_699_999_700,
    });
  });

  it('normalizes ethers transaction fields and resolves its timestamp from the block', async () => {
    const history = new EthBridgeHistory('etherscan-key');
    const transaction = {
      ...createEtherscanTransaction(),
      nonce: 7,
      input: undefined,
      data: '0xABCDEF12',
      value: 42n,
      timeStamp: undefined,
      blockNumber: 101,
    };
    const etherscan = {
      fetch: vi.fn().mockResolvedValue('100'),
      getHistory: vi.fn().mockResolvedValue([transaction]),
      getBlock: vi.fn().mockResolvedValue({ timestamp: 1_700_000_001 }),
    };

    (history as any).etherscanInstance = etherscan;

    await expect(
      history.findEthTxBySubmissionFingerprint(
        createSubmissionFingerprint({ nonce: '0x07', data: EVM_CALLDATA.toUpperCase(), value: '0x2a' }) as any
      )
    ).resolves.toBe(transaction);
    expect(etherscan.getBlock).toHaveBeenCalledWith(101);
  });

  it('allows bounded negative provider clock skew when matching a unique submission', async () => {
    const history = new EthBridgeHistory('etherscan-key');
    const transaction = createEtherscanTransaction({ timeStamp: '1699999761' });
    const etherscan = {
      fetch: vi.fn().mockResolvedValue('90'),
      getHistory: vi.fn().mockResolvedValue([transaction]),
      getBlock: vi.fn(),
    };

    (history as any).etherscanInstance = etherscan;

    await expect(history.findEthTxBySubmissionFingerprint(createSubmissionFingerprint() as any)).resolves.toBe(
      transaction
    );
  });

  it('requires every fingerprint field and a transaction at or after the persisted start time', async () => {
    const history = new EthBridgeHistory('etherscan-key');
    const etherscan = {
      fetch: vi.fn().mockResolvedValue('100'),
      getHistory: vi
        .fn()
        .mockResolvedValue([
          null,
          createEtherscanTransaction({ hash: `0x${'b'.repeat(64)}`, nonce: '8' }),
          createEtherscanTransaction({ hash: `0x${'c'.repeat(64)}`, input: '0xabcdef13' }),
          createEtherscanTransaction({ hash: `0x${'d'.repeat(64)}`, value: '43' }),
          createEtherscanTransaction({ hash: `0x${'e'.repeat(64)}`, timeStamp: '1699999600' }),
        ]),
      getBlock: vi.fn(),
    };

    (history as any).etherscanInstance = etherscan;

    await expect(history.findEthTxBySubmissionFingerprint(createSubmissionFingerprint() as any)).resolves.toBeNull();
    await expect(
      history.findEthTxBySubmissionFingerprint(createSubmissionFingerprint({ data: 'not-calldata' }) as any)
    ).resolves.toBeNull();
    expect(etherscan.getHistory).toHaveBeenCalledTimes(1);
  });

  it.each(['not-a-number', 'Infinity', '-1', String(Date.now()), String(Number.MAX_SAFE_INTEGER)])(
    'recovers from a malformed persisted sync timestamp: %s',
    async (value) => {
      const history = new EthBridgeHistory('etherscan-key');
      const outgoing = createOutgoingHistoryElementWithoutRequestHash('restored-after-invalid-cursor', 22);

      ethBridgeApiMock.state.storage.ethBridgeHistorySyncTimestamp = value;
      ethBridgeApiMock.state.storage.ethBridgeHistoryFullSyncTimestamp = value;
      (history as any).externalNetwork = 1;
      vi.spyOn(history, 'findEthTxBySoraHash').mockResolvedValue(null);
      setPagedHistory([], [outgoing]);

      expect(history.historySyncTimestamp).toBe(0);
      expect(history.fullHistorySyncTimestamp).toBe(0);

      await history.updateAccountHistory(
        'sora-address',
        { [Operation.EthBridgeOutgoing]: '0' } as any,
        {},
        () => ({ ...XOR, decimals: 18 }) as any
      );

      expect(historyElementsFilterMock).toHaveBeenCalledWith(expect.objectContaining({ timestamp: 0 }));
      expect(ethBridgeApiMock.accountStorage.set).toHaveBeenCalledWith('ethBridgeHistorySyncTimestamp', 22);
      expect(ethBridgeApiMock.accountStorage.set).toHaveBeenCalledWith('ethBridgeHistoryFullSyncTimestamp', 22);
    }
  );

  it('skips an indexer row with an implausible future timestamp', async () => {
    const history = new EthBridgeHistory('etherscan-key');
    const outgoing = createOutgoingHistoryElementWithoutRequestHash('future-row', Number.MAX_SAFE_INTEGER);

    (history as any).externalNetwork = 1;
    setPagedHistory([], [outgoing]);

    await history.updateAccountHistory(
      'sora-address',
      { [Operation.EthBridgeOutgoing]: '0' } as any,
      {},
      () => ({ ...XOR, decimals: 18 }) as any
    );

    expect(ethBridgeApiMock.generateHistoryItem).not.toHaveBeenCalled();
    expect(ethBridgeApiMock.accountStorage.set).toHaveBeenCalledWith('ethBridgeHistorySyncTimestamp', 0);
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
      () => ({ ...XOR, decimals: 18 }) as any,
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
      () => ({ ...XOR, decimals: 18 }) as any
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
      () => ({ ...XOR, decimals: 18 }) as any
    );

    expect(ethBridgeApiMock.generateHistoryItem).toHaveBeenCalledWith(
      expect.objectContaining({
        txId: 'restored-after-fallback',
        hash: 'restored-after-fallback',
      })
    );
    expect(ethBridgeApiMock.accountStorage.set).toHaveBeenCalledWith('ethBridgeHistorySyncTimestamp', 22);
  });

  it('reconciles from the beginning once when incremental ETH history may have skipped older outgoing rows', async () => {
    const history = new EthBridgeHistory('etherscan-key');
    const olderMissing = createOutgoingHistoryElementWithoutRequestHash('older-missing', 10);
    const newerIncremental = createOutgoingHistoryElementWithoutRequestHash('newer-incremental', 40);

    ethBridgeApiMock.state.storage.ethBridgeHistorySyncTimestamp = '30';
    (history as any).externalNetwork = 1;
    vi.spyOn(history, 'findEthTxBySoraHash').mockResolvedValue(null);
    getHistoryPagedMock.mockImplementation(async ({ filter }) => {
      const operation = filter.operations?.[0];
      const nodes =
        operation !== Operation.EthBridgeOutgoing
          ? []
          : filter.timestamp === 30
            ? [newerIncremental]
            : [newerIncremental, olderMissing];

      return {
        edges: nodes.map((node) => ({ node })),
        pageInfo: { hasNextPage: false, endCursor: '' },
      };
    });

    await history.updateAccountHistory(
      'sora-address',
      { [Operation.EthBridgeOutgoing]: '0' } as any,
      {},
      () => ({ ...XOR, decimals: 18 }) as any
    );

    expect(getHistoryPagedMock).toHaveBeenCalledWith(
      expect.objectContaining({ filter: expect.objectContaining({ timestamp: 30 }) })
    );
    expect(getHistoryPagedMock).toHaveBeenCalledWith(
      expect.objectContaining({ filter: expect.objectContaining({ timestamp: 0 }) })
    );
    expect(ethBridgeApiMock.generateHistoryItem).toHaveBeenCalledWith(
      expect.objectContaining({ txId: 'newer-incremental' })
    );
    expect(ethBridgeApiMock.generateHistoryItem).toHaveBeenCalledWith(
      expect.objectContaining({ txId: 'older-missing' })
    );
    expect(ethBridgeApiMock.accountStorage.set).toHaveBeenCalledWith('ethBridgeHistorySyncTimestamp', 40);
    expect(ethBridgeApiMock.accountStorage.set).toHaveBeenCalledWith('ethBridgeHistoryFullSyncTimestamp', 40);
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
      () => ({ ...XOR, decimals: 18 }) as any
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
