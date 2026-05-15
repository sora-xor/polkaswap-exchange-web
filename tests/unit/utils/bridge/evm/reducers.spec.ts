import { Operation } from '@sora-substrate/sdk';
import { BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { Observable, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reducerMocks = vi.hoisted(() => ({
  getTransactionEvents: vi.fn(),
  isUnsignedTx: vi.fn(() => false),
  evmBridgeApi: {
    api: {
      events: {
        bridgeProxy: {
          RequestStatusUpdate: {
            is: vi.fn(() => true),
          },
        },
      },
    },
    subscribeOnTransactionDetails: vi.fn(),
    transfer: vi.fn(),
  },
}));

vi.mock('@/utils/bridge/common/utils', () => ({
  getTransactionEvents: reducerMocks.getTransactionEvents,
  isUnsignedTx: reducerMocks.isUnsignedTx,
}));

vi.mock('@/utils/bridge/evm/api', () => ({
  evmBridgeApi: reducerMocks.evmBridgeApi,
}));

import { EvmBridgeOutgoingReducer } from '@/utils/bridge/evm/classes/reducers';

type TestEvmHistory = {
  id: string;
  type: Operation;
  transactionState: BridgeTxStatus;
  amount: string;
  assetAddress: string;
  blockId: string;
  externalNetwork: number;
  from: string;
  hash?: string;
  to: string;
  txId: string;
};

describe('EvmBridgeOutgoingReducer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reducerMocks.getTransactionEvents.mockResolvedValue([
      {
        event: {
          data: [{ toString: () => '0xsora-hash' }],
        },
      },
    ]);
    reducerMocks.evmBridgeApi.subscribeOnTransactionDetails.mockReturnValue(
      of({ status: BridgeTxStatus.Done }) as Observable<{ status: BridgeTxStatus }>
    );
  });

  it('keeps mutating the generated local transaction id after resolving the SORA hash', async () => {
    const tx = createTransaction();
    const transactions = new Map<string, TestEvmHistory>([[tx.id, tx]]);
    const updateTransaction = vi.fn((id: string, params: Partial<TestEvmHistory>) => {
      const current = transactions.get(id);
      if (!current) throw new Error(`missing transaction ${id}`);
      transactions.set(id, { ...current, ...params });
    });
    const reducer = new EvmBridgeOutgoingReducer({
      addAsset: vi.fn(async () => undefined),
      getAssetByAddress: vi.fn(() => ({ address: 'asset-1' })),
      getTransaction: vi.fn((id: string) => {
        const current = transactions.get(id);
        if (!current) throw new Error(`missing transaction ${id}`);
        return current;
      }),
      updateTransaction,
      updateHistory: vi.fn(),
      showNotification: vi.fn(),
      getActiveTransaction: vi.fn(() => transactions.get(tx.id) ?? null),
      addTransactionToProgress: vi.fn(),
      removeTransactionFromProgress: vi.fn(),
      beforeTransactionSign: vi.fn(async () => undefined),
      boundaryStates: {
        [Operation.EvmOutgoing]: {
          done: BridgeTxStatus.Done,
          failed: [BridgeTxStatus.Failed],
        },
      },
      removeTransactionByHash: vi.fn(),
    } as any);

    await reducer.changeState(tx as any);

    expect(transactions.get(tx.id)?.hash).toBe('0xsora-hash');
    expect(updateTransaction.mock.calls.map(([id]) => id)).not.toContain('0xsora-hash');
    expect(updateTransaction).toHaveBeenCalledWith(tx.id, expect.objectContaining({ endTime: expect.any(Number) }));
  });
});

const createTransaction = (): TestEvmHistory => ({
  id: 'tx-local',
  type: Operation.EvmOutgoing,
  transactionState: BridgeTxStatus.Pending,
  amount: '1',
  assetAddress: 'asset-1',
  blockId: '0xblock',
  externalNetwork: 1,
  from: 'sora-account',
  to: '0xrecipient',
  txId: '0xextrinsic',
});
