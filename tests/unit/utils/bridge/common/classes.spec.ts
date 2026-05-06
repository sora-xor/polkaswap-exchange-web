import { beforeEach, describe, expect, it, vi } from 'vitest';

const bridgeClassMocks = vi.hoisted(() => ({
  delay: vi.fn(),
  isUnsignedTx: vi.fn(),
}));

vi.mock('@/utils', () => ({
  delay: bridgeClassMocks.delay,
}));

vi.mock('@/utils/bridge/eth/constants', () => ({
  BLOCK_PRODUCE_TIME_MS: 1,
}));

vi.mock('@/utils/bridge/common/utils', () => ({
  isUnsignedTx: bridgeClassMocks.isUnsignedTx,
}));

import { Bridge, BridgeReducer } from '@/utils/bridge/common/classes';

type TestTransaction = {
  id: string;
  type: string;
  transactionState: string;
  amount?: string;
  assetAddress?: string;
  blockId?: string;
  endTime?: number;
  externalBlockId?: string;
  externalNetwork?: string;
  status?: string;
  to?: string;
};

class AdvancingReducer extends BridgeReducer<TestTransaction> {
  async changeState(transaction: TestTransaction): Promise<void> {
    const nextState = transaction.transactionState === 'initial' ? 'pending' : 'done';

    this.updateTransactionParams(transaction.id, { transactionState: nextState });
  }
}

class NoopReducer extends BridgeReducer<TestTransaction> {
  async changeState(): Promise<void> {
    return undefined;
  }
}

describe('bridge base classes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bridgeClassMocks.delay.mockResolvedValue(undefined);
    bridgeClassMocks.isUnsignedTx.mockReturnValue(false);
  });

  it('throws from the base reducer when changeState is not implemented', async () => {
    const { options, transaction } = createHarness();
    const reducer = new BridgeReducer(options as any);

    await expect(reducer.changeState(transaction as any)).rejects.toThrow(
      '[BridgeReducer]: "changeState" method implementation is required!'
    );
  });

  it('keeps processing a transaction until a done boundary state is reached', async () => {
    const { options, getTransaction, updateHistory, transaction } = createHarness();
    const reducer = new AdvancingReducer(options as any);

    await reducer.process(transaction);

    expect(getTransaction).toHaveBeenCalledWith('tx-1');
    expect(getTransaction('tx-1').transactionState).toBe('done');
    expect(updateHistory).toHaveBeenCalledTimes(2);
  });

  it('updates the id returned by a successful state handler', async () => {
    const { options, updateTransaction, updateHistory } = createHarness();
    const reducer = new NoopReducer(options as any);

    await reducer.handleState('tx-1', {
      nextState: 'done',
      rejectState: 'failed',
      handler: async () => 'tx-2',
    });

    expect(updateTransaction).toHaveBeenCalledWith('tx-2', {
      transactionState: 'done',
    });
    expect(updateHistory).toHaveBeenCalledTimes(1);
  });

  it('marks a transaction rejected when a state handler fails', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(123_456);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { options, removeTransactionFromProgress, updateTransaction } = createHarness({
      transactionState: 'pending',
    });
    const reducer = new NoopReducer(options as any);

    await reducer.handleState('tx-1', {
      nextState: 'done',
      rejectState: 'failed',
      handler: async () => {
        throw new Error('handler failed');
      },
    });

    expect(updateTransaction).toHaveBeenCalledWith('tx-1', {
      transactionState: 'failed',
      endTime: 123_456,
    });
    expect(removeTransactionFromProgress).toHaveBeenCalledWith('tx-1');
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
    nowSpy.mockRestore();
  });

  it('preserves the original end time when a handler fails from an already failed state', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { options, updateTransaction } = createHarness({
      transactionState: 'failed',
      endTime: 42,
    });
    const reducer = new NoopReducer(options as any);

    await reducer.handleState('tx-1', {
      nextState: 'done',
      rejectState: 'failed',
      handler: async () => {
        throw new Error('still failed');
      },
    });

    expect(updateTransaction).toHaveBeenCalledWith('tx-1', {
      transactionState: 'failed',
      endTime: 42,
    });

    consoleErrorSpy.mockRestore();
  });

  it('completes transactions, registers missing assets, and removes progress state', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(987_654);
    const { addAsset, getAssetByAddress, options, removeTransactionFromProgress, showNotification, updateTransaction } =
      createHarness({
        assetAddress: 'asset-1',
      });
    getAssetByAddress.mockReturnValueOnce(null);
    const reducer = new NoopReducer(options as any);

    await reducer.onComplete('tx-1');

    expect(updateTransaction).toHaveBeenCalledWith('tx-1', {
      endTime: 987_654,
    });
    expect(addAsset).toHaveBeenCalledWith('asset-1');
    expect(showNotification).toHaveBeenCalledWith(expect.objectContaining({ id: 'tx-1' }));
    expect(removeTransactionFromProgress).toHaveBeenCalledWith('tx-1');

    nowSpy.mockRestore();
  });

  it('removes progress state even when completing a missing transaction', async () => {
    const { options, removeTransactionFromProgress } = createHarness();
    const reducer = new NoopReducer(options as any);

    await reducer.onComplete('missing');

    expect(removeTransactionFromProgress).toHaveBeenCalledWith('missing');
  });

  it('requires the active transaction before submitting for signing', () => {
    const { addTransactionToProgress, getActiveTransaction, options } = createHarness();
    const reducer = new NoopReducer(options as any);

    getActiveTransaction.mockReturnValueOnce(null);
    expect(() => reducer.beforeSubmit('tx-1')).toThrow('Transaction tx-1 stopped');

    getActiveTransaction.mockReturnValueOnce({ id: 'other' });
    expect(() => reducer.beforeSubmit('tx-1')).toThrow('Transaction tx-1 stopped');

    getActiveTransaction.mockReturnValueOnce({ id: 'tx-1' });
    reducer.beforeSubmit('tx-1');

    expect(addTransactionToProgress).toHaveBeenCalledWith('tx-1');
  });

  it('validates required transaction fields before signing', async () => {
    const { getAssetByAddress, options, transactions } = createHarness();
    const reducer = new NoopReducer(options as any);

    await expect(reducer.beforeSign('missing')).rejects.toThrow('Transaction not found: missing');

    transactions.set('tx-1', createTransaction({ externalNetwork: undefined }));
    await expect(reducer.beforeSign('tx-1')).rejects.toThrow('externalNetwork');

    transactions.set('tx-1', createTransaction({ amount: undefined }));
    await expect(reducer.beforeSign('tx-1')).rejects.toThrow('amount');

    transactions.set('tx-1', createTransaction({ assetAddress: undefined }));
    await expect(reducer.beforeSign('tx-1')).rejects.toThrow('assetAddress');

    transactions.set('tx-1', createTransaction({ to: undefined }));
    await expect(reducer.beforeSign('tx-1')).rejects.toThrow('to');

    getAssetByAddress.mockReturnValueOnce(null);
    transactions.set('tx-1', createTransaction());
    await expect(reducer.beforeSign('tx-1')).rejects.toThrow('Transaction asset is not registered: asset-1');
  });

  it('delegates to the injected signing guard when transaction data is valid', async () => {
    const { beforeTransactionSign, options } = createHarness();
    const reducer = new NoopReducer(options as any);

    await reducer.beforeSign('tx-1', 'signer-api', 'bridge' as any);

    expect(beforeTransactionSign).toHaveBeenCalledWith('signer-api', 'bridge');
  });

  it('waits for transaction status when it is not available yet', async () => {
    const { options, transactions } = createHarness({ status: undefined });
    bridgeClassMocks.delay.mockImplementation(async () => {
      transactions.set('tx-1', createTransaction({ status: 'Ready' }));
    });
    const reducer = new NoopReducer(options as any);

    await reducer.waitForTransactionStatus('tx-1');

    expect(bridgeClassMocks.delay).toHaveBeenCalledWith(1_000);
  });

  it('rejects block waiting for unsigned transactions', async () => {
    const { options } = createHarness();
    bridgeClassMocks.isUnsignedTx.mockReturnValue(true);
    const reducer = new NoopReducer(options as any);

    await expect(reducer.waitForTransactionBlockId('tx-1')).rejects.toThrow('first sign the transaction');
  });

  it('waits until a signed transaction gets a block id', async () => {
    const { options, transactions } = createHarness({ blockId: undefined, externalBlockId: undefined });
    bridgeClassMocks.delay.mockImplementation(async (_ms: number, rejectOnTimeout?: boolean) => {
      if (rejectOnTimeout === false) {
        return new Promise(() => undefined);
      }

      transactions.set('tx-1', createTransaction({ blockId: 'block-1' }));
      return undefined;
    });
    const reducer = new NoopReducer(options as any);

    await reducer.waitForTransactionBlockId('tx-1');

    expect(bridgeClassMocks.delay).toHaveBeenCalledWith(1_000);
  });

  it('logs the restoration hint when block id waiting times out', async () => {
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const { options } = createHarness({ blockId: undefined, externalBlockId: undefined });
    bridgeClassMocks.delay.mockImplementation((_ms: number, rejectOnTimeout?: boolean) => {
      if (rejectOnTimeout === false) {
        return Promise.reject(new Error('timeout'));
      }

      return new Promise(() => undefined);
    });
    const reducer = new NoopReducer(options as any);

    await reducer.waitForTransactionBlockId('tx-1');

    expect(consoleInfoSpy).toHaveBeenCalledWith('[NoopReducer]: Implement "blockId" restoration by "txId"');
    consoleInfoSpy.mockRestore();
  });

  it('dispatches bridge transactions to reducers by operation type', async () => {
    const { getTransaction, options } = createHarness();
    const bridge = new Bridge({
      ...options,
      reducers: {
        transfer: AdvancingReducer,
      },
      getTransaction,
    } as any);

    await bridge.handleTransaction('tx-1');

    expect(getTransaction('tx-1').transactionState).toBe('done');
  });

  it('throws when a bridge transaction has no reducer for its operation type', async () => {
    const { getTransaction, options, transactions } = createHarness({ type: 'unsupported' });
    const bridge = new Bridge({
      ...options,
      reducers: {
        transfer: AdvancingReducer,
      },
      getTransaction,
    } as any);

    await expect(bridge.handleTransaction('tx-1')).rejects.toThrow("No reducer for operation: 'unsupported'");
    expect(transactions.get('tx-1')?.transactionState).toBe('initial');
  });
});

const createTransaction = (overrides: Partial<TestTransaction> = {}): TestTransaction => ({
  id: 'tx-1',
  type: 'transfer',
  transactionState: 'initial',
  amount: '10',
  assetAddress: 'asset-1',
  externalNetwork: 'ethereum',
  to: '0xrecipient',
  ...overrides,
});

const createHarness = (overrides: Partial<TestTransaction> = {}) => {
  const transaction = createTransaction(overrides);
  const transactions = new Map<string, TestTransaction>([[transaction.id, transaction]]);
  const addAsset = vi.fn(async () => undefined);
  const getAssetByAddress = vi.fn(() => ({ address: 'asset-1' }));
  const updateHistory = vi.fn();
  const showNotification = vi.fn();
  const getActiveTransaction = vi.fn(() => transactions.get(transaction.id) ?? null);
  const addTransactionToProgress = vi.fn();
  const removeTransactionFromProgress = vi.fn();
  const beforeTransactionSign = vi.fn(async () => undefined);
  const getTransaction = vi.fn((id: string) => transactions.get(id) as TestTransaction);
  const updateTransaction = vi.fn((id: string, params: Partial<TestTransaction>) => {
    transactions.set(id, {
      ...(transactions.get(id) ?? createTransaction({ id })),
      ...params,
    });
  });
  const boundaryStates = {
    transfer: {
      done: 'done',
      failed: ['failed'],
    },
    unsupported: {
      done: 'done',
      failed: ['failed'],
    },
  };
  const options = {
    addAsset,
    getAssetByAddress,
    getTransaction,
    updateTransaction,
    updateHistory,
    showNotification,
    getActiveTransaction,
    addTransactionToProgress,
    removeTransactionFromProgress,
    beforeTransactionSign,
    boundaryStates,
  };

  return {
    addAsset,
    addTransactionToProgress,
    beforeTransactionSign,
    getActiveTransaction,
    getAssetByAddress,
    getTransaction,
    options,
    removeTransactionFromProgress,
    showNotification,
    transaction,
    transactions,
    updateHistory,
    updateTransaction,
  };
};
