import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Operation, TransactionStatus } from '@sora-substrate/sdk';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { BridgeNetworkType, BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';

const historyElementsFilterMock = vi.hoisted(() => vi.fn((value) => value));
const getHistoryPagedMock = vi.hoisted(() => vi.fn());
const parseTransactionAsHistoryItemMock = vi.hoisted(() => vi.fn());
const fetchSorametricsLiberlandBridgeHistoryMock = vi.hoisted(() => vi.fn());

vi.mock('@polkadot/util-crypto', async (importOriginal) => importOriginal<typeof import('@polkadot/util-crypto')>());

const subBridgeApiMock = vi.hoisted(() => {
  const state = {
    history: {} as Record<string, any>,
    storage: {} as Record<string, string>,
  };

  return {
    state,
    api: {},
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
    getUserTransactions: vi.fn(),
    saveHistory: vi.fn((item: Record<string, any>) => {
      state.history[item.id] = item;
    }),
    generateHistoryItem: vi.fn((item: Record<string, any>) => {
      state.history[item.id] = item;
      return item;
    }),
    removeHistory: vi.fn((...ids: string[]) => {
      ids.forEach((id) => {
        delete state.history[id];
      });
    }),
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
      dataParser: {
        parseTransactionAsHistoryItem: parseTransactionAsHistoryItemMock,
      },
    },
  }),
}));

vi.mock('@/utils/bridge/sub/api', () => ({
  subBridgeApi: subBridgeApiMock,
}));

vi.mock('@/utils/bridge/sub/classes/adapter', () => ({
  SubNetworksConnector: class {
    public start = vi.fn();
    public stop = vi.fn();
    public network = {
      formatAddress: vi.fn((address: string) => `formatted:${address}`),
    };
  },
}));

vi.mock('@/services/sorametrics', () => ({
  fetchSorametricsLiberlandBridgeHistory: fetchSorametricsLiberlandBridgeHistoryMock,
}));

vi.mock('@/utils/bridge/common/utils', () => ({
  getBlockEventsByTxIndex: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    system: {},
  },
}));

import { hasExactlyOneMatchingLiberlandMessage, SubBridgeHistory } from '@/utils/bridge/sub/classes/history';
import { SUB_BRIDGE_DISPLAY_ONLY_HISTORY_RECOVERY } from '@/utils/bridge/sub/reconciliation';

const SORA_PUBLIC_KEY = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
const LIBERLAND_PUBLIC_KEY = Uint8Array.from({ length: 32 }, (_, index) => 255 - index);
const SORA_ADDRESS = encodeAddress(SORA_PUBLIC_KEY, 69);
const LIBERLAND_ADDRESS = encodeAddress(LIBERLAND_PUBLIC_KEY, 42);
const SETTLEMENT_HASH = `0x${'11'.repeat(32)}`;
const SETTLEMENT_BLOCK_HASH = `0x${'22'.repeat(32)}`;
const LLD_ASSET_ADDRESS = `0x${'33'.repeat(32)}`;
const SETTLEMENT_BLOCK = 27_410_636;
const SETTLEMENT_TIMESTAMP_SECONDS = 1_787_581_248;
const SETTLEMENT_TIMESTAMP_MS = SETTLEMENT_TIMESTAMP_SECONDS * 1_000 + 50_803;

const writeLittleEndianU128 = (target: Uint8Array, offset: number, value: bigint): void => {
  let remaining = value;

  for (let index = 0; index < 16; index += 1) {
    target[offset + index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
};

const createLiberlandV1Payload = (overrides: { amount?: bigint; mutate?: (bytes: Uint8Array) => void } = {}) => {
  const bytes = new Uint8Array(118);
  bytes.set([0x04, 0x00, 0x00], 0);
  bytes.set(hexToU8a(LLD_ASSET_ADDRESS), 3);
  bytes[35] = 2;
  bytes.set(decodeAddress(LIBERLAND_ADDRESS, false), 36);
  bytes[68] = 1;
  bytes.set(decodeAddress(SORA_ADDRESS, false), 69);
  bytes[101] = 0;
  writeLittleEndianU128(bytes, 102, overrides.amount ?? 1_000_000_000_000n);
  overrides.mutate?.(bytes);

  return u8aToHex(bytes);
};

const createLiberlandCandidate = (overrides: Record<string, unknown> = {}) => ({
  hash: SETTLEMENT_HASH,
  block: SETTLEMENT_BLOCK,
  timestamp: SETTLEMENT_TIMESTAMP_MS,
  recipient: SORA_ADDRESS,
  sender: LIBERLAND_ADDRESS,
  assetAddress: LLD_ASSET_ADDRESS,
  amount: '1',
  ...overrides,
});

const createSettlementHistoryElement = (overrides: Record<string, unknown> = {}) => ({
  id: SETTLEMENT_HASH,
  blockHash: SETTLEMENT_BLOCK_HASH,
  blockHeight: SETTLEMENT_BLOCK,
  module: 'substrateBridgeInboundChannel',
  method: 'submit',
  address: '',
  networkFee: '42',
  execution: { success: true },
  timestamp: SETTLEMENT_TIMESTAMP_SECONDS,
  data: {
    networkId: SubNetworkId.Liberland,
    commitment: {
      sub: {
        messages: [{ payload: createLiberlandV1Payload() }],
      },
    },
  },
  calls: [],
  ...overrides,
});

describe('SubBridgeHistory', () => {
  const assetDataByAddress = vi.fn((address?: string | null) =>
    address === XOR.address ? { address: XOR.address, symbol: XOR.symbol, decimals: XOR.decimals } : null
  );

  beforeEach(() => {
    vi.clearAllMocks();
    subBridgeApiMock.history = {};
    subBridgeApiMock.state.storage = {};
    subBridgeApiMock.getUserTransactions.mockResolvedValue([]);
    fetchSorametricsLiberlandBridgeHistoryMock.mockReset();
    fetchSorametricsLiberlandBridgeHistoryMock.mockResolvedValue([]);
    getHistoryPagedMock.mockResolvedValue({
      edges: [],
      pageInfo: { hasNextPage: false, endCursor: '' },
    });
    parseTransactionAsHistoryItemMock.mockReset();
  });

  it('restores Liberland bridge history from Polkaswap indexer rows even when live bridge storage is empty', async () => {
    const updateCallback = vi.fn();

    getHistoryPagedMock.mockResolvedValueOnce({
      edges: [{ node: { id: '0xliberland', timestamp: 100 } }],
      pageInfo: { hasNextPage: false, endCursor: '' },
    });
    parseTransactionAsHistoryItemMock.mockResolvedValueOnce({
      id: '0xliberland',
      txId: '0xliberland',
      hash: '0xrequest',
      type: Operation.SubstrateOutgoing,
      status: TransactionStatus.Finalized,
      externalNetwork: SubNetworkId.Liberland,
      assetAddress: XOR.address,
      amount: '7',
      from: 'sora-address',
      to: 'liberland-address',
    });

    await new SubBridgeHistory().updateAccountHistory(
      SubNetworkId.Liberland,
      'sora-address',
      [XOR.address],
      {},
      assetDataByAddress,
      updateCallback
    );

    expect(historyElementsFilterMock).toHaveBeenCalledWith({
      address: 'sora-address',
      operations: [Operation.SubstrateOutgoing, Operation.SubstrateIncoming],
      timestamp: 0,
    });
    expect(subBridgeApiMock.getUserTransactions).toHaveBeenCalledWith('sora-address', SubNetworkId.Liberland);
    expect(subBridgeApiMock.saveHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '0xliberland',
        externalNetwork: SubNetworkId.Liberland,
        externalNetworkType: BridgeNetworkType.Sub,
        transactionState: BridgeTxStatus.Done,
      })
    );
    expect(updateCallback).toHaveBeenCalled();
    expect(subBridgeApiMock.accountStorage.set).toHaveBeenCalledWith('subBridgeHistorySyncTimestamp:Liberland', 100);
  });

  it('restores live Liberland history while the registered asset list is still loading', async () => {
    const updateCallback = vi.fn();
    const bridgeHistory = new SubBridgeHistory();
    const restoredHistory = {
      id: '0xliberland-request',
      hash: '0xliberland-request',
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Done,
      externalNetwork: SubNetworkId.Liberland,
      externalNetworkType: BridgeNetworkType.Sub,
      assetAddress: XOR.address,
      amount: '1',
      payload: {},
    };

    subBridgeApiMock.getUserTransactions.mockResolvedValueOnce([
      {
        soraHash: '0xliberland-request',
        soraAssetAddress: XOR.address,
      },
    ]);
    vi.spyOn(bridgeHistory as any, 'txDataToHistory').mockResolvedValueOnce(restoredHistory);

    await bridgeHistory.updateAccountHistory(
      SubNetworkId.Liberland,
      'sora-address',
      [],
      {},
      assetDataByAddress,
      updateCallback
    );

    expect(subBridgeApiMock.generateHistoryItem).toHaveBeenCalledWith(restoredHistory);
    expect(updateCallback).toHaveBeenCalledTimes(1);
  });

  it('restores live Liberland history when the indexer is unavailable', async () => {
    const bridgeHistory = new SubBridgeHistory();
    const restoredHistory = {
      id: '0xlive-request',
      hash: '0xlive-request',
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Done,
      externalNetwork: SubNetworkId.Liberland,
      assetAddress: XOR.address,
      payload: {},
    };

    getHistoryPagedMock.mockRejectedValueOnce(new Error('indexer unavailable'));
    subBridgeApiMock.getUserTransactions.mockResolvedValueOnce([
      {
        soraHash: '0xlive-request',
        soraAssetAddress: XOR.address,
      },
    ]);
    vi.spyOn(bridgeHistory as any, 'txDataToHistory').mockResolvedValueOnce(restoredHistory);

    await bridgeHistory.updateAccountHistory(
      SubNetworkId.Liberland,
      'sora-address',
      [XOR.address],
      {},
      assetDataByAddress
    );

    expect(subBridgeApiMock.getUserTransactions).toHaveBeenCalledWith('sora-address', SubNetworkId.Liberland);
    expect(subBridgeApiMock.generateHistoryItem).toHaveBeenCalledWith(restoredHistory);
  });

  it('skips cross-network, in-progress, finalized, and hidden-asset indexer rows', async () => {
    const updateCallback = vi.fn();

    subBridgeApiMock.history = {
      inProgress: { id: 'inProgress', hash: '0xinprogress', externalNetwork: SubNetworkId.Liberland },
      done: {
        id: 'done',
        hash: '0xdone',
        externalNetwork: SubNetworkId.Liberland,
        transactionState: BridgeTxStatus.Done,
      },
    };
    getHistoryPagedMock.mockResolvedValueOnce({
      edges: [
        { node: { id: 'wrong-operation', timestamp: 104 } },
        { node: { id: 'wrong-network', timestamp: 103 } },
        { node: { id: 'in-progress-row', timestamp: 102 } },
        { node: { id: 'done-row', timestamp: 101 } },
        { node: { id: 'hidden-asset', timestamp: 100 } },
        { node: { id: 'fresh', timestamp: 99 } },
      ],
      pageInfo: { hasNextPage: false, endCursor: '' },
    });
    parseTransactionAsHistoryItemMock
      .mockResolvedValueOnce({
        id: 'wrong-operation',
        type: Operation.EvmOutgoing,
        externalNetwork: SubNetworkId.Liberland,
        assetAddress: XOR.address,
      })
      .mockResolvedValueOnce({
        id: 'wrong-network',
        type: Operation.SubstrateOutgoing,
        externalNetwork: SubNetworkId.Kusama,
        assetAddress: XOR.address,
      })
      .mockResolvedValueOnce({
        id: 'in-progress-row',
        hash: '0xinprogress',
        type: Operation.SubstrateOutgoing,
        externalNetwork: SubNetworkId.Liberland,
        assetAddress: XOR.address,
      })
      .mockResolvedValueOnce({
        id: 'done-row',
        hash: '0xdone',
        type: Operation.SubstrateIncoming,
        externalNetwork: SubNetworkId.Liberland,
        assetAddress: XOR.address,
      })
      .mockResolvedValueOnce({
        id: 'hidden-asset',
        type: Operation.SubstrateIncoming,
        externalNetwork: SubNetworkId.Liberland,
        assetAddress: 'hidden',
      })
      .mockResolvedValueOnce({
        id: 'fresh',
        type: Operation.SubstrateIncoming,
        status: TransactionStatus.Error,
        externalNetwork: SubNetworkId.Liberland,
        assetAddress: XOR.address,
      });

    await new SubBridgeHistory().updateAccountHistory(
      SubNetworkId.Liberland,
      'sora-address',
      [XOR.address],
      { inProgress: true },
      assetDataByAddress,
      updateCallback
    );

    expect(subBridgeApiMock.saveHistory).toHaveBeenCalledTimes(1);
    expect(subBridgeApiMock.saveHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'fresh',
        transactionState: BridgeTxStatus.Failed,
      })
    );
    expect(updateCallback).toHaveBeenCalledTimes(1);
  });

  it('reconciles a stale local Failed state to authoritative completed history', async () => {
    subBridgeApiMock.history = {
      failed: {
        id: 'failed',
        hash: '0xrequest',
        externalNetwork: SubNetworkId.Liberland,
        transactionState: BridgeTxStatus.Failed,
      },
    };
    getHistoryPagedMock.mockResolvedValueOnce({
      edges: [{ node: { id: 'completed-row', timestamp: 100 } }],
      pageInfo: { hasNextPage: false, endCursor: '' },
    });
    parseTransactionAsHistoryItemMock.mockResolvedValueOnce({
      id: 'completed-row',
      hash: '0xrequest',
      type: Operation.SubstrateIncoming,
      status: TransactionStatus.Finalized,
      transactionState: BridgeTxStatus.Done,
      externalNetwork: SubNetworkId.Liberland,
      assetAddress: XOR.address,
      payload: {},
    });

    await new SubBridgeHistory().updateAccountHistory(
      SubNetworkId.Liberland,
      'sora-address',
      [XOR.address],
      {},
      assetDataByAddress
    );

    expect(subBridgeApiMock.saveHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'completed-row',
        hash: '0xrequest',
        transactionState: BridgeTxStatus.Done,
      })
    );
  });

  it('preserves an authoritative terminal recovery outcome during later history syncs', async () => {
    subBridgeApiMock.history = {
      refunded: {
        id: 'refunded',
        hash: '0xrequest',
        externalNetwork: SubNetworkId.Liberland,
        transactionState: BridgeTxStatus.Failed,
        payload: { bridgeRecoveryStatus: 'Refunded' },
      },
    };
    getHistoryPagedMock.mockResolvedValueOnce({
      edges: [{ node: { id: 'remote-row', timestamp: 100 } }],
      pageInfo: { hasNextPage: false, endCursor: '' },
    });
    parseTransactionAsHistoryItemMock.mockResolvedValueOnce({
      id: 'remote-row',
      hash: '0xrequest',
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Failed,
      externalNetwork: SubNetworkId.Liberland,
      assetAddress: XOR.address,
      payload: {},
    });

    await new SubBridgeHistory().updateAccountHistory(
      SubNetworkId.Liberland,
      'sora-address',
      [XOR.address],
      {},
      assetDataByAddress
    );

    expect(subBridgeApiMock.saveHistory).not.toHaveBeenCalled();
    expect(subBridgeApiMock.history.refunded.payload.bridgeRecoveryStatus).toBe('Refunded');
  });

  it('verifies exactly one canonical Liberland v1 settlement payload', () => {
    const candidate = createLiberlandCandidate();
    const asset = {
      address: LLD_ASSET_ADDRESS,
      symbol: 'LLD',
      decimals: 18,
      externalDecimals: 12,
    } as any;
    const validData = createSettlementHistoryElement().data as Record<string, unknown>;

    expect(hasExactlyOneMatchingLiberlandMessage(validData, candidate, asset)).toBe(true);

    const invalidPayloads = [
      createLiberlandV1Payload().slice(0, -2),
      createLiberlandV1Payload().slice(0, -1),
      `${createLiberlandV1Payload()}00`,
      `0x${'gg'.repeat(118)}`,
      createLiberlandV1Payload({ mutate: (bytes) => (bytes[0] = 5) }),
      createLiberlandV1Payload({ mutate: (bytes) => (bytes[35] = 1) }),
      createLiberlandV1Payload({ mutate: (bytes) => (bytes[68] = 2) }),
      createLiberlandV1Payload({ mutate: (bytes) => (bytes[101] = 1) }),
      createLiberlandV1Payload({ mutate: (bytes) => (bytes[3] ^= 1) }),
      createLiberlandV1Payload({ mutate: (bytes) => (bytes[36] ^= 1) }),
      createLiberlandV1Payload({ mutate: (bytes) => (bytes[69] ^= 1) }),
      createLiberlandV1Payload({ amount: 0n }),
      createLiberlandV1Payload({ amount: 2_000_000_000_000n }),
    ];

    invalidPayloads.forEach((payload) => {
      expect(
        hasExactlyOneMatchingLiberlandMessage(
          {
            networkId: SubNetworkId.Liberland,
            commitment: { sub: { messages: [{ payload }] } },
          },
          candidate,
          asset
        )
      ).toBe(false);
    });
    expect(hasExactlyOneMatchingLiberlandMessage({ commitment: { sub: { messages: [] } } }, candidate, asset)).toBe(
      false
    );
    expect(
      hasExactlyOneMatchingLiberlandMessage(
        {
          commitment: {
            sub: { messages: [{ payload: createLiberlandV1Payload() }, { payload: createLiberlandV1Payload() }] },
          },
        },
        candidate,
        asset
      )
    ).toBe(false);
    expect(hasExactlyOneMatchingLiberlandMessage(validData, candidate, { ...asset, externalDecimals: 10_000 })).toBe(
      false
    );
    expect(hasExactlyOneMatchingLiberlandMessage(validData, { ...candidate, amount: '1.0000000000001' }, asset)).toBe(
      false
    );
  });

  it('fails closed when any settlement identity or execution field disagrees with discovery', () => {
    const asset = {
      address: LLD_ASSET_ADDRESS,
      symbol: 'LLD',
      decimals: 18,
      externalDecimals: 12,
    } as any;
    const invalidators: Array<(row: any, candidate: any) => void> = [
      (row) => (row.id = `0x${'44'.repeat(32)}`),
      (row) => (row.blockHeight += 1),
      (row) => (row.module = 'system'),
      (row) => (row.method = 'remark'),
      (row) => (row.data.networkId = SubNetworkId.Kusama),
      (row) => (row.execution.success = false),
      (row) => (row.execution.error = { moduleErrorId: 1, moduleErrorIndex: 2 }),
      (row) => (row.timestamp -= 3_600),
      (row) => (row.timestamp = Number.MAX_SAFE_INTEGER),
      (_row, candidate) => (candidate.recipient = encodeAddress(new Uint8Array(32).fill(9), 69)),
      (_row, candidate) => (candidate.sender = encodeAddress(new Uint8Array(32).fill(8), 42)),
      (_row, candidate) => (candidate.assetAddress = `0x${'55'.repeat(32)}`),
      (_row, candidate) => (candidate.amount = '2'),
    ];
    const history = new SubBridgeHistory();

    expect(
      (history as any).isVerifiedLiberlandSettlement(
        createSettlementHistoryElement(),
        createLiberlandCandidate(),
        asset
      )
    ).toBe(true);

    invalidators.forEach((invalidate) => {
      const row = createSettlementHistoryElement() as any;
      const candidate = createLiberlandCandidate() as any;
      invalidate(row, candidate);

      expect((history as any).isVerifiedLiberlandSettlement(row, candidate, asset)).toBe(false);
    });
  });

  it('does not persist a candidate when the hydrated settlement proof is inconsistent', async () => {
    const invalidators: Array<(row: any) => void> = [
      (row) => (row.module = 'system'),
      (row) => (row.method = 'remark'),
      (row) => (row.data.networkId = SubNetworkId.Kusama),
      (row) => (row.execution.success = false),
      (row) => (row.execution.error = { moduleErrorId: 1, moduleErrorIndex: 2 }),
      (row) => (row.blockHeight += 1),
      (row) => (row.timestamp -= 3_600),
    ];
    const lldAssetDataByAddress = vi.fn((address?: string | null) =>
      address === LLD_ASSET_ADDRESS
        ? {
            address: LLD_ASSET_ADDRESS,
            symbol: 'LLD',
            decimals: 18,
            externalDecimals: 12,
          }
        : null
    );

    for (const invalidate of invalidators) {
      const row = createSettlementHistoryElement() as any;
      invalidate(row);
      subBridgeApiMock.saveHistory.mockClear();
      fetchSorametricsLiberlandBridgeHistoryMock.mockReset();
      fetchSorametricsLiberlandBridgeHistoryMock.mockResolvedValueOnce([createLiberlandCandidate()]);
      getHistoryPagedMock.mockReset();
      getHistoryPagedMock
        .mockResolvedValueOnce({ edges: [], pageInfo: { hasNextPage: false, endCursor: '' } })
        .mockResolvedValueOnce({
          edges: [{ node: row }],
          pageInfo: { hasNextPage: false, endCursor: '' },
          totalCount: 1,
        });

      await new SubBridgeHistory().updateAccountHistory(
        SubNetworkId.Liberland,
        SORA_ADDRESS,
        [LLD_ASSET_ADDRESS],
        {},
        lldAssetDataByAddress,
        undefined,
        'https://sorametrics.org'
      );

      expect(subBridgeApiMock.saveHistory).not.toHaveBeenCalled();
    }
  });

  it('restores a verified Sorametrics Liberland settlement as a display-only Done row', async () => {
    const candidate = createLiberlandCandidate();
    const lldAsset = {
      address: LLD_ASSET_ADDRESS,
      symbol: 'LLD-registry',
      decimals: 18,
      externalDecimals: 12,
    };
    const lldAssetDataByAddress = vi.fn((address?: string | null) => (address === LLD_ASSET_ADDRESS ? lldAsset : null));

    subBridgeApiMock.history = {
      stale: {
        id: 'stale',
        txId: SETTLEMENT_HASH,
        hash: '0xstale-request',
        externalHash: '0xstale-external',
        externalBlockId: '0xstale-block',
        externalBlockHeight: 1,
        externalEventIndex: 2,
        parachainBlockId: '0xstale-parachain',
        parachainBlockHeight: 3,
        parachainHash: '0xstale-parachain-hash',
        parachainEventIndex: 4,
        relaychainBlockId: '0xstale-relay',
        relaychainBlockHeight: 5,
        relaychainHash: '0xstale-relay-hash',
        relaychainEventIndex: 6,
        type: Operation.SubstrateIncoming,
        transactionState: BridgeTxStatus.Failed,
        externalNetwork: SubNetworkId.Liberland,
        payload: {
          startBlock: 1,
          submissionState: 'broadcast',
          batchNonce: 2,
          messageNonce: 3,
          messageHash: '0xstale-message',
          eventIndex: 4,
        },
      },
    };

    fetchSorametricsLiberlandBridgeHistoryMock.mockResolvedValueOnce([candidate]);
    getHistoryPagedMock
      .mockResolvedValueOnce({ edges: [], pageInfo: { hasNextPage: false, endCursor: '' } })
      .mockResolvedValueOnce({
        edges: [{ node: createSettlementHistoryElement() }],
        pageInfo: { hasNextPage: false, endCursor: '' },
        totalCount: 1,
      });

    await new SubBridgeHistory().updateAccountHistory(
      SubNetworkId.Liberland,
      SORA_ADDRESS,
      [LLD_ASSET_ADDRESS],
      {},
      lldAssetDataByAddress,
      undefined,
      'https://sorametrics.org'
    );

    expect(fetchSorametricsLiberlandBridgeHistoryMock).toHaveBeenCalledWith('https://sorametrics.org', SORA_ADDRESS, {
      signal: undefined,
    });
    expect(historyElementsFilterMock).toHaveBeenLastCalledWith({ ids: [SETTLEMENT_HASH] });
    expect(subBridgeApiMock.saveHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        id: SETTLEMENT_HASH,
        txId: SETTLEMENT_HASH,
        hash: undefined,
        externalHash: undefined,
        externalBlockId: undefined,
        externalBlockHeight: undefined,
        externalEventIndex: undefined,
        parachainBlockId: undefined,
        parachainBlockHeight: undefined,
        parachainHash: undefined,
        parachainEventIndex: undefined,
        relaychainBlockId: undefined,
        relaychainBlockHeight: undefined,
        relaychainHash: undefined,
        relaychainEventIndex: undefined,
        blockId: SETTLEMENT_BLOCK_HASH,
        blockHeight: SETTLEMENT_BLOCK,
        type: Operation.SubstrateIncoming,
        status: TransactionStatus.Finalized,
        transactionState: BridgeTxStatus.Done,
        externalNetwork: SubNetworkId.Liberland,
        externalNetworkType: BridgeNetworkType.Sub,
        assetAddress: LLD_ASSET_ADDRESS,
        symbol: 'LLD-registry',
        amount: '1',
        amount2: '1',
        from: SORA_ADDRESS,
        to: `formatted:${LIBERLAND_ADDRESS}`,
        soraNetworkFee: '42',
        externalNetworkFee: '0',
        payload: {
          subBridgeHistoryRecovery: SUB_BRIDGE_DISPLAY_ONLY_HISTORY_RECOVERY,
        },
      })
    );
    expect(subBridgeApiMock.removeHistory).toHaveBeenCalledWith('stale');
  });

  it('fails closed on duplicate hydrated hashes and keeps local history when fallback fails', async () => {
    const existing = {
      id: 'local',
      type: Operation.SubstrateIncoming,
      externalNetwork: SubNetworkId.Liberland,
      transactionState: BridgeTxStatus.Failed,
    };
    subBridgeApiMock.history = { local: existing };
    fetchSorametricsLiberlandBridgeHistoryMock.mockResolvedValueOnce([createLiberlandCandidate()]);
    getHistoryPagedMock
      .mockResolvedValueOnce({ edges: [], pageInfo: { hasNextPage: false, endCursor: '' } })
      .mockResolvedValueOnce({
        edges: [{ node: createSettlementHistoryElement() }, { node: createSettlementHistoryElement() }],
        pageInfo: { hasNextPage: false, endCursor: '' },
        totalCount: 2,
      });

    await new SubBridgeHistory().updateAccountHistory(
      SubNetworkId.Liberland,
      SORA_ADDRESS,
      [LLD_ASSET_ADDRESS],
      {},
      vi.fn(() => ({
        address: LLD_ASSET_ADDRESS,
        symbol: 'LLD',
        decimals: 18,
        externalDecimals: 12,
      })) as any,
      undefined,
      'https://sorametrics.org'
    );

    expect(subBridgeApiMock.saveHistory).not.toHaveBeenCalled();
    expect(subBridgeApiMock.history.local).toBe(existing);
  });

  it('does not persist indexer results after the history request becomes stale', async () => {
    let resolveIndexer!: (value: unknown) => void;
    let current = true;
    const response = new Promise((resolve) => {
      resolveIndexer = resolve;
    });
    getHistoryPagedMock.mockReturnValueOnce(response);

    const update = new SubBridgeHistory().updateAccountHistory(
      SubNetworkId.Liberland,
      SORA_ADDRESS,
      [XOR.address],
      {},
      assetDataByAddress,
      undefined,
      '',
      () => current
    );

    current = false;
    resolveIndexer({
      edges: [{ node: { id: 'stale', timestamp: 100 } }],
      pageInfo: { hasNextPage: false, endCursor: '' },
    });
    await update;

    expect(parseTransactionAsHistoryItemMock).not.toHaveBeenCalled();
    expect(subBridgeApiMock.saveHistory).not.toHaveBeenCalled();
    expect(subBridgeApiMock.generateHistoryItem).not.toHaveBeenCalled();
  });

  it('replaces a display-only settlement when runtime history provides the authoritative request row', async () => {
    const displayOnly = {
      id: SETTLEMENT_HASH,
      txId: SETTLEMENT_HASH,
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Done,
      externalNetwork: SubNetworkId.Liberland,
      externalNetworkType: BridgeNetworkType.Sub,
      payload: { subBridgeHistoryRecovery: SUB_BRIDGE_DISPLAY_ONLY_HISTORY_RECOVERY },
    };
    const authoritative = {
      id: '0xrequest',
      txId: SETTLEMENT_HASH,
      hash: '0xrequest',
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Done,
      externalNetwork: SubNetworkId.Liberland,
      externalNetworkType: BridgeNetworkType.Sub,
      assetAddress: XOR.address,
      payload: {},
    };
    const bridgeHistory = new SubBridgeHistory();
    subBridgeApiMock.history = { [SETTLEMENT_HASH]: displayOnly };
    subBridgeApiMock.getUserTransactions.mockResolvedValueOnce([
      { soraHash: '0xrequest', soraAssetAddress: XOR.address },
    ]);
    vi.spyOn(bridgeHistory as any, 'txDataToHistory').mockResolvedValueOnce(authoritative);

    await bridgeHistory.updateAccountHistory(
      SubNetworkId.Liberland,
      SORA_ADDRESS,
      [XOR.address],
      {},
      assetDataByAddress
    );

    expect(subBridgeApiMock.saveHistory).toHaveBeenCalledWith(authoritative);
    expect(subBridgeApiMock.removeHistory).toHaveBeenCalledWith(SETTLEMENT_HASH);
    expect(subBridgeApiMock.history['0xrequest']).toEqual(authoritative);
    expect(subBridgeApiMock.history[SETTLEMENT_HASH]).toBeUndefined();
  });

  it('resets restoration sync state without deleting local network history', async () => {
    subBridgeApiMock.history = {
      remove: { id: 'remove', externalNetwork: SubNetworkId.Liberland },
      keep: { id: 'keep', externalNetwork: SubNetworkId.Kusama },
    };

    await new SubBridgeHistory().clearHistory(SubNetworkId.Liberland, {}, vi.fn());

    expect(subBridgeApiMock.history).toEqual({
      remove: { id: 'remove', externalNetwork: SubNetworkId.Liberland },
      keep: { id: 'keep', externalNetwork: SubNetworkId.Kusama },
    });
    expect(subBridgeApiMock.removeHistory).not.toHaveBeenCalled();
    expect(subBridgeApiMock.accountStorage.set).toHaveBeenCalledWith('subBridgeHistorySyncTimestamp:Liberland', 0);
  });
});
