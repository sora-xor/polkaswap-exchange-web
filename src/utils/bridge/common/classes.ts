import type { EvmHistory } from '@sora-substrate/util/build/evm/types';

import { delay } from '@/utils';

import type {
  SignEvm,
  SignSora,
  AddAsset,
  GetAssetByAddress,
  GetTransaction,
  GetActiveTransaction,
  AddTransactionToProgress,
  RemoveTransactionFromProgress,
  RemoveTransactionByHash,
  UpdateTransaction,
  ShowNotification,
  TransactionBoundaryStates,
  Constructable,
  BridgeCommonOptions,
  BridgeReducerOptions,
} from '@/utils/bridge/common/types';
import { evmBridgeApi } from '../evm/api';

type TransactionHandlerPayload<Transaction extends EvmHistory> = {
  nextState: Transaction['transactionState'];
  rejectState: Transaction['transactionState'];
  status?: any;
  handler?: (id: string) => Promise<void>;
};

export class BridgeTransactionStateHandler<Transaction extends EvmHistory> {
  protected readonly signEvm!: SignEvm;
  protected readonly signSora!: SignSora;
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
  protected readonly removeTransactionByHash!: RemoveTransactionByHash<Transaction>;
  protected readonly addTransactionToProgress!: AddTransactionToProgress;
  protected readonly removeTransactionFromProgress!: RemoveTransactionFromProgress;
  // boundary states
  protected readonly boundaryStates!: TransactionBoundaryStates<Transaction>;

  constructor({
    signEvm,
    signSora,
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
    removeTransactionByHash,
    addTransactionToProgress,
    removeTransactionFromProgress,
    // boundary states
    boundaryStates,
  }: BridgeReducerOptions<Transaction>) {
    this.signEvm = signEvm;
    this.signSora = signSora;
    this.addAsset = addAsset;
    this.getAssetByAddress = getAssetByAddress;
    this.getTransaction = getTransaction;
    this.getActiveTransaction = getActiveTransaction;
    this.removeTransactionByHash = removeTransactionByHash;
    this.updateTransaction = updateTransaction;
    this.updateHistory = updateHistory;
    this.showNotification = showNotification;
    this.addTransactionToProgress = addTransactionToProgress;
    this.removeTransactionFromProgress = removeTransactionFromProgress;
    this.boundaryStates = boundaryStates;
  }

  async changeState(transaction: Transaction): Promise<void> {
    throw new Error(`[${this.constructor.name}]: "changeState" method implementation is required!`);
  }

  async process(transaction: Transaction) {
    await this.changeState(transaction);

    const tx = this.getTransaction(transaction.id as string);

    if (tx && !Object.values(this.boundaryStates).includes(tx.transactionState)) {
      await this.process(tx);
    }
  }

  async updateTransactionParams(id: string, params = {}): Promise<void> {
    if (id in evmBridgeApi.history) {
      this.updateTransaction(id, params);
    }

    this.updateHistory();
    // TODO: remove after fix submitExtrinsic in js-lib
    await delay();
  }

  async handleState(
    id: string,
    { nextState, rejectState, handler, status }: TransactionHandlerPayload<Transaction>
  ): Promise<void> {
    try {
      const transaction = this.getTransaction(id);

      // optional update
      if (status && transaction.status !== status) {
        await this.updateTransactionParams(id, { status });
      }

      if (typeof handler === 'function') {
        await handler(id);
      }

      await this.updateTransactionParams(id, { transactionState: nextState });
    } catch (error) {
      console.error(error);

      const transaction = this.getTransaction(id);
      const endTime = transaction.transactionState === this.boundaryStates.failed ? transaction.endTime : Date.now();

      await this.updateTransactionParams(id, {
        transactionState: rejectState,
        endTime,
      });

      this.removeTransactionFromProgress(id);
    }
  }

  async onComplete(id: string): Promise<void> {
    await this.updateTransactionParams(id, {
      transactionState: this.boundaryStates.done,
      endTime: Date.now(),
    });

    const tx = this.getTransaction(id);

    if (tx) {
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
      throw new Error(`[Bridge]: Transaction ${id} stopped, user should sign transaction in ui`);
    }

    this.addTransactionToProgress(id);
  }
}

interface BridgeConstructorOptions<
  Transaction extends EvmHistory,
  BridgeReducer extends BridgeTransactionStateHandler<Transaction>
> extends BridgeCommonOptions<Transaction> {
  reducers: Record<Transaction['type'], Constructable<BridgeReducer>>;
  signEvm: Partial<Record<Transaction['type'], SignEvm>>;
  signSora: Partial<Record<Transaction['type'], SignSora>>;
}

export class Bridge<Transaction extends EvmHistory, BridgeReducer extends BridgeTransactionStateHandler<Transaction>> {
  protected reducers!: Partial<Record<Transaction['type'], BridgeReducer>>;
  protected readonly getTransaction!: GetTransaction<Transaction>;

  constructor({
    reducers,
    signEvm,
    signSora,
    getTransaction,
    ...rest
  }: BridgeConstructorOptions<Transaction, BridgeReducer>) {
    this.getTransaction = getTransaction;
    this.reducers = Object.entries<Constructable<BridgeReducer>>(reducers).reduce((acc, [operation, Reducer]) => {
      acc[operation] = new Reducer({
        ...rest,
        getTransaction,
        signEvm: signEvm[operation],
        signSora: signSora[operation],
      });
      return acc;
    }, {});
  }

  /**
   * Get necessary reducer and handle transaction
   * @param id transaction id
   */
  async handleTransaction(id: string) {
    const transaction = this.getTransaction(id);
    const reducer = this.reducers[transaction.type];

    if (!reducer) {
      throw new Error(`[Bridge] No reducer for operation: '${transaction.type}'`);
    } else {
      await reducer.process(transaction);
    }
  }
}
