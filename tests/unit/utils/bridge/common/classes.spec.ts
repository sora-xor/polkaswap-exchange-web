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
  errorMessage?: string;
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

class RestoringReducer extends NoopReducer {
  public readonly restoreBlock = vi.fn(async () => true);

  protected override async restoreTransactionBlockId(id: string): Promise<boolean> {
    return await this.restoreBlock(id);
  }
}

class DelayedMutationReducer extends BridgeReducer<TestTransaction> {
  static instances: DelayedMutationReducer[] = [];
  private readonly releases: VoidFunction[] = [];

  constructor(options: any) {
    super(options);
    DelayedMutationReducer.instances.push(this);
  }

  continueNext(): void {
    this.releases.shift()?.();
  }

  async changeState(transaction: TestTransaction): Promise<void> {
    await new Promise<void>((resolve) => this.releases.push(resolve));
    this.updateTransactionParams(transaction.id, { transactionState: 'done' });
  }
}

class CleanupOnAbortReducer extends DelayedMutationReducer {
  readonly cleanup = vi.fn(async () => undefined);

  protected override async onTrackingAbort(): Promise<void> {
    await this.cleanup();
  }
}

describe('bridge base classes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    DelayedMutationReducer.instances = [];
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
    const sourceError = new Error('handler failed');

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
    const sourceError = new Error('handler failed');
    const { options, removeTransactionFromProgress, updateTransaction } = createHarness({
      transactionState: 'pending',
    });
    const reducer = new NoopReducer(options as any);

    await reducer.handleState('tx-1', {
      nextState: 'done',
      rejectState: 'failed',
      handler: async () => {
        throw sourceError;
      },
    });

    expect(updateTransaction).toHaveBeenCalledWith('tx-1', {
      transactionState: 'failed',
      endTime: 123_456,
      errorMessage: 'handler failed',
    });
    expect(removeTransactionFromProgress).toHaveBeenCalledWith('tx-1');
    expect(consoleErrorSpy).toHaveBeenCalledWith(sourceError);

    consoleErrorSpy.mockRestore();
    nowSpy.mockRestore();
  });

  it('cancels tracking without converting a pending transaction into a failure', async () => {
    const { options, removeTransactionFromProgress, updateTransaction } = createHarness({
      transactionState: 'pending',
    });
    const reducer = new NoopReducer(options as any);
    const abortError = new Error('canceled');
    abortError.name = 'AbortError';

    await expect(
      reducer.handleState('tx-1', {
        nextState: 'done',
        rejectState: 'failed',
        handler: async () => {
          throw abortError;
        },
      })
    ).rejects.toBe(abortError);

    expect(updateTransaction).not.toHaveBeenCalled();
    expect(removeTransactionFromProgress).toHaveBeenCalledWith('tx-1');
  });

  it('settles cancellation promptly and blocks late provider callbacks from mutating history', async () => {
    const { options, transaction, updateTransaction } = createHarness({ transactionState: 'pending' });
    const reducer = new DelayedMutationReducer(options as any);
    const controller = new AbortController();

    const processing = reducer.process(transaction, controller.signal);
    const expectation = expect(processing).rejects.toMatchObject({ name: 'AbortError' });

    controller.abort();
    await expectation;

    reducer.continueNext();
    await Promise.resolve();
    await Promise.resolve();

    expect(updateTransaction).not.toHaveBeenCalled();
  });

  it('releases reducer-specific providers when managed tracking is aborted', async () => {
    const { options, transaction } = createHarness({ transactionState: 'pending' });
    const reducer = new CleanupOnAbortReducer(options as any);
    const controller = new AbortController();

    const processing = reducer.process(transaction, controller.signal);
    const expectation = expect(processing).rejects.toMatchObject({ name: 'AbortError' });

    controller.abort();

    await expectation;
    expect(reducer.cleanup).toHaveBeenCalledTimes(1);
  });

  it('isolates a replacement run from an older canceled provider call that never settles', async () => {
    const { options, transaction, updateTransaction } = createHarness({ transactionState: 'pending' });
    const firstController = new AbortController();
    const secondController = new AbortController();
    const bridge = new Bridge({
      ...options,
      reducers: { [transaction.type]: DelayedMutationReducer },
    } as any);

    const firstRun = bridge.handleTransaction(transaction.id, firstController.signal);
    const firstExpectation = expect(firstRun).rejects.toMatchObject({ name: 'AbortError' });
    firstController.abort();
    await firstExpectation;

    const secondRun = bridge.handleTransaction(transaction.id, secondController.signal);
    const firstReducer = DelayedMutationReducer.instances[0];
    const secondReducer = DelayedMutationReducer.instances[1];

    secondReducer.continueNext();
    await secondRun;

    expect(updateTransaction).toHaveBeenCalledTimes(1);
    expect(updateTransaction).toHaveBeenCalledWith('tx-1', { transactionState: 'done' });
    expect(firstReducer).not.toBe(secondReducer);
  });

  it('preserves the original end time when a handler fails from an already failed state', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { options, updateTransaction } = createHarness({
      transactionState: 'failed',
      endTime: 42,
      errorMessage: 'still failed',
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
      errorMessage: 'still failed',
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

  it('fails explicitly when block id waiting and restoration both fail', async () => {
    const { options } = createHarness({ blockId: undefined, externalBlockId: undefined });
    bridgeClassMocks.delay.mockImplementation((_ms: number, rejectOnTimeout?: boolean) => {
      if (rejectOnTimeout === false) {
        return Promise.reject(new Error('timeout'));
      }

      return new Promise(() => undefined);
    });
    const reducer = new NoopReducer(options as any);

    await expect(reducer.waitForTransactionBlockId('tx-1')).rejects.toThrow(
      '[NoopReducer]: Unable to restore a block for transaction "tx-1"'
    );
  });

  it('uses reducer-specific restoration after block id waiting times out', async () => {
    const { options } = createHarness({ blockId: undefined, externalBlockId: undefined });
    bridgeClassMocks.delay.mockImplementation((_ms: number, rejectOnTimeout?: boolean) => {
      if (rejectOnTimeout === false) {
        return Promise.reject(new Error('timeout'));
      }

      return new Promise(() => undefined);
    });
    const reducer = new RestoringReducer(options as any);

    await expect(reducer.waitForTransactionBlockId('tx-1')).resolves.toBeUndefined();

    expect(reducer.restoreBlock).toHaveBeenCalledWith('tx-1');
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
