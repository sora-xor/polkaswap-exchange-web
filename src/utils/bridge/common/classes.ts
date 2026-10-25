import { BLOCK_PRODUCE_TIME_MS } from '@/utils/bridge/eth/constants';

import { delay } from '@/utils';
import type {
  BeforeTransactionSign,
  AddAsset,
  GetAssetByAddress,
  GetTransaction,
  GetActiveTransaction,
  AddTransactionToProgress,
  RemoveTransactionFromProgress,
  IsTransactionInProgress,
  UpdateTransaction,
  ShowNotification,
  TransactionBoundaryStates,
  Constructable,
  IBridgeReducerOptions,
  IBridgeReducer,
  IBridgeConstructorOptions,
  TransactionHandlerPayload,
} from '@/utils/bridge/common/types';
import { isUnsignedTx } from '@/utils/bridge/common/utils';

import type { IBridgeTransaction } from '@sora-substrate/sdk';

/** Converts an unknown reducer failure into durable transaction-history text. */
const getBridgeFailureMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  return 'Bridge transaction processing failed';
};

const isBridgeTrackingAbort = (error: unknown): boolean => {
  return error instanceof Error && error.name === 'AbortError';
};

const throwIfBridgeTrackingAborted = (signal?: AbortSignal): void => {
  if (!signal?.aborted) return;

  const error = new Error('Bridge transaction tracking canceled');
  error.name = 'AbortError';
  throw error;
};

/** Lets a managed tracker stop promptly while an underlying provider call unwinds. */
const raceWithBridgeTrackingAbort = async <T>(operation: Promise<T>, signal?: AbortSignal): Promise<T> => {
  throwIfBridgeTrackingAborted(signal);

  if (!signal) return await operation;

  return await new Promise<T>((resolve, reject) => {
    let settled = false;

    const settle = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', handleAbort);
      callback();
    };
    const handleAbort = (): void => {
      const error = new Error('Bridge transaction tracking canceled');
      error.name = 'AbortError';
      settle(() => reject(error));
    };

    signal.addEventListener('abort', handleAbort, { once: true });
    operation.then(
      (value) => settle(() => resolve(value)),
      (error) => settle(() => reject(error))
    );

    if (signal.aborted) handleAbort();
  });
};

export class BridgeReducer<Transaction extends IBridgeTransaction> implements IBridgeReducer<Transaction> {
  /** Keeps late provider callbacks from mutating a transaction after its tracker was canceled. */
  private readonly trackingSignals = new Map<string, Set<AbortSignal>>();
  // asset
  protected readonly addAsset!: AddAsset;
  protected readonly getAssetByAddress!: GetAssetByAddress;
  // transaction
  protected readonly getTransaction!: GetTransaction<Transaction>;
  protected readonly updateTransaction!: UpdateTransaction<Transaction>;
  // ui integration
  protected readonly updateHistory!: VoidFunction;
  protected readonly showNotification!: ShowNotification<Transaction>;
  protected readonly getActiveTransaction!: GetActiveTransaction<Transaction>;
  protected readonly addTransactionToProgress!: AddTransactionToProgress;
  protected readonly removeTransactionFromProgress!: RemoveTransactionFromProgress;
  protected readonly isTransactionInProgress!: IsTransactionInProgress;
  // transaction signing
  protected readonly beforeTransactionSign!: BeforeTransactionSign;
  // boundary states
  protected readonly boundaryStates!: TransactionBoundaryStates<Transaction>;

  constructor({
    // asset
    addAsset,
    getAssetByAddress,
    // transaction
    getTransaction,
    updateTransaction,
    // ui updates
    updateHistory,
    showNotification,
    getActiveTransaction,
    addTransactionToProgress,
    removeTransactionFromProgress,
    isTransactionInProgress,
    // transaction signing
    beforeTransactionSign,
    // boundary states
    boundaryStates,
  }: IBridgeReducerOptions<Transaction>) {
    this.addAsset = addAsset;
    this.getAssetByAddress = getAssetByAddress;
    this.getTransaction = getTransaction;
    this.getActiveTransaction = getActiveTransaction;
    this.updateTransaction = updateTransaction;
    this.updateHistory = updateHistory;
    this.showNotification = showNotification;
    this.addTransactionToProgress = addTransactionToProgress;
    this.removeTransactionFromProgress = removeTransactionFromProgress;
    this.isTransactionInProgress = isTransactionInProgress ?? (() => false);
    this.beforeTransactionSign = beforeTransactionSign;
    this.boundaryStates = boundaryStates;
  }

  async changeState(transaction: Transaction, _signal?: AbortSignal): Promise<void> {
    throw new Error(`[${this.constructor.name}]: "changeState" method implementation is required!`);
  }

  async process(transaction: Transaction, signal?: AbortSignal) {
    throwIfBridgeTrackingAborted(signal);
    const transactionId = transaction.id as string;

    if (signal) {
      const transactionSignals = this.trackingSignals.get(transactionId) ?? new Set<AbortSignal>();
      transactionSignals.add(signal);
      this.trackingSignals.set(transactionId, transactionSignals);
    }

    const handleTrackingAbort = (): void => {
      void this.onTrackingAbort().catch(() => undefined);
    };

    signal?.addEventListener('abort', handleTrackingAbort, { once: true });

    const stateChange = this.changeState(transaction, signal);
    const releaseSignal = (): void => {
      if (!signal) return;

      signal.removeEventListener('abort', handleTrackingAbort);

      const transactionSignals = this.trackingSignals.get(transactionId);
      transactionSignals?.delete(signal);

      if (!transactionSignals?.size) this.trackingSignals.delete(transactionId);
    };

    void stateChange.then(releaseSignal, releaseSignal);
    await raceWithBridgeTrackingAbort(stateChange, signal);
    throwIfBridgeTrackingAborted(signal);

    try {
      const tx = this.getTransaction(transactionId);

      if (tx) {
        const { done, failed } = this.boundaryStates[tx.type];
        const state = tx.transactionState;

        if (state !== done && !failed.includes(state)) {
          await this.process(tx, signal);
        }
      }
    } catch {}
  }

  updateTransactionParams(id: string, params = {}): void {
    const abortedSignal = [...(this.trackingSignals.get(id) ?? [])].find((signal) => signal.aborted);
    throwIfBridgeTrackingAborted(abortedSignal);
    this.updateTransaction(id, params);
    this.updateHistory();
  }

  /** Releases reducer-specific providers when a managed run is canceled. */
  protected async onTrackingAbort(): Promise<void> {
    return undefined;
  }

  async handleState(
    id: string,
    { nextState, rejectState, handler }: TransactionHandlerPayload<Transaction>
  ): Promise<void> {
    try {
      const updatedId = handler ? ((await handler(id)) ?? id) : id;

      this.updateTransactionParams(updatedId, { transactionState: nextState });
    } catch (error) {
      if (isBridgeTrackingAbort(error)) {
        this.removeTransactionFromProgress(id);
        throw error;
      }

      console.error(error);

      const transaction = this.getTransaction(id);
      const failedStates = this.boundaryStates[transaction.type].failed;
      const endTime = failedStates.includes(transaction.transactionState) ? transaction.endTime : Date.now();
      const errorMessage = getBridgeFailureMessage(error);

      this.updateTransactionParams(id, {
        transactionState: rejectState,
        endTime,
        errorMessage,
      });

      this.removeTransactionFromProgress(id);
    }
  }

  async onComplete(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (tx) {
      this.updateTransactionParams(id, {
        endTime: Date.now(),
      });

      if (tx.assetAddress && !this.getAssetByAddress(tx.assetAddress)) {
        // Add asset to account assets
        this.addAsset(tx.assetAddress);
      }

      this.showNotification(tx);
    }

    this.removeTransactionFromProgress(id);
  }

  beforeSubmit(id: string): void {
    const activeTransaction = this.getActiveTransaction();

    if (!activeTransaction || activeTransaction.id !== id) {
      throw new Error(`[${this.constructor.name}]: Transaction ${id} stopped, user should sign transaction in ui`);
    }

    this.addTransactionToProgress(id);
  }

  async beforeSign(id: string, ...args: Parameters<BeforeTransactionSign>): Promise<void> {
    const tx = this.getTransaction(id);

    if (!tx) throw new Error(`Transaction not found: ${id}`);

    const { to, amount, assetAddress, externalNetwork } = tx;

    if (!externalNetwork) throw new Error('Transaction "externalNetwork" cannot be empty');
    if (!amount) throw new Error('Transaction "amount" cannot be empty');
    if (!assetAddress) throw new Error('Transaction "assetAddress" cannot be empty');
    if (!to) throw new Error('Transaction "to" cannot be empty');

    const asset = this.getAssetByAddress(assetAddress);

    if (!asset) throw new Error(`Transaction asset is not registered: ${assetAddress}`);

    await this.beforeTransactionSign(...args);
  }

  async waitForTransactionStatus(id: string): Promise<void> {
    const { status } = this.getTransaction(id);

    if (status) return;

    await delay(1_000);
    await this.waitForTransactionStatus(id);
  }

  private async checkTransactionBlockId(id: string, isCancelled: () => boolean): Promise<void> {
    while (!isCancelled()) {
      const { blockId, externalBlockId } = this.getTransaction(id);

      if (blockId || externalBlockId) return;

      await delay(1_000);
    }
  }

  /**
   * Gives bridge-specific reducers one bounded chance to rebuild block data
   * after a status subscription missed the in-block notification.
   */
  protected async restoreTransactionBlockId(_id: string): Promise<boolean> {
    return false;
  }

  async waitForTransactionBlockId(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (isUnsignedTx(tx)) {
      throw new Error(
        `[${this.constructor.name}]: Transaction "id" or "externalHash" is empty, first sign the transaction`
      );
    }

    let cancelled = false;

    try {
      await Promise.race([
        this.checkTransactionBlockId(id, () => cancelled),
        delay(BLOCK_PRODUCE_TIME_MS * 10, false), // 60s
      ]);
    } catch {
      cancelled = true;

      if (await this.restoreTransactionBlockId(id)) return;

      const transaction = this.getTransaction(id);
      const transactionId = transaction.txId ?? transaction.externalHash ?? id;

      throw new Error(`[${this.constructor.name}]: Unable to restore a block for transaction "${transactionId}"`);
    } finally {
      cancelled = true;
    }
  }
}

export class Bridge<
  Transaction extends IBridgeTransaction,
  Reducer extends IBridgeReducer<Transaction>,
  ConstructorOptions extends IBridgeConstructorOptions<Transaction, Reducer>,
> {
  protected reducerConstructors!: Partial<Record<Transaction['type'], Constructable<Reducer>>>;
  protected reducerOptions!: Omit<ConstructorOptions, 'reducers'>;
  protected readonly getTransaction!: GetTransaction<Transaction>;

  constructor({ reducers, getTransaction, ...rest }: ConstructorOptions) {
    this.getTransaction = getTransaction;
    this.reducerConstructors = reducers;
    this.reducerOptions = { ...rest, getTransaction } as Omit<ConstructorOptions, 'reducers'>;
  }

  /**
   * Get necessary reducer and handle transaction
   * @param id transaction id
   */
  async handleTransaction(id: string, signal?: AbortSignal): Promise<void> {
    const transaction = this.getTransaction(id);
    const Reducer = this.reducerConstructors[transaction.type];

    if (!Reducer) {
      throw new Error(`[${this.constructor.name}]: No reducer for operation: '${transaction.type}'`);
    } else {
      // A reducer owns run-local cancellation and connector state. Creating it
      // per managed run prevents an old provider callback from sharing mutable
      // lifecycle state with a replacement run for the same transaction id.
      const reducer = new Reducer(this.reducerOptions);
      await reducer.process(transaction, signal);
    }
  }
}
