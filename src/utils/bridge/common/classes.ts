import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

import { delay } from '@/utils';
import type {
  BeforeTransactionSign,
  AddAsset,
  GetAssetByAddress,
  GetTransaction,
  GetActiveTransaction,
  AddTransactionToProgress,
  RemoveTransactionFromProgress,
  UpdateTransaction,
  ShowNotification,
  TransactionBoundaryStates,
  Constructable,
  IBridgeReducerOptions,
  IBridgeReducer,
  IBridgeConstructorOptions,
  TransactionHandlerPayload,
} from '@/utils/bridge/common/types';

import type { IBridgeTransaction } from '@sora-substrate/util';

const { BLOCK_PRODUCE_TIME } = WALLET_CONSTS;

export class BridgeReducer<Transaction extends IBridgeTransaction> implements IBridgeReducer<Transaction> {
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
    this.beforeTransactionSign = beforeTransactionSign;
    this.boundaryStates = boundaryStates;
  }

  async changeState(transaction: Transaction): Promise<void> {
    throw new Error(`[${this.constructor.name}]: "changeState" method implementation is required!`);
  }

  async process(transaction: Transaction) {
    await this.changeState(transaction);

    try {
      const tx = this.getTransaction(transaction.id as string);

      if (tx) {
        const { done, failed } = this.boundaryStates[tx.type];
        const state = tx.transactionState;

        if (state !== done && !failed.includes(state)) {
          await this.process(tx);
        }
      }
    } catch {}
  }

  updateTransactionParams(id: string, params = {}): void {
    this.updateTransaction(id, params);
    this.updateHistory();
  }

  async handleState(
    id: string,
    { nextState, rejectState, handler }: TransactionHandlerPayload<Transaction>
  ): Promise<void> {
    try {
      const updatedId = handler ? (await handler(id)) ?? id : id;

      this.updateTransactionParams(updatedId, { transactionState: nextState });
    } catch (error) {
      console.error(error);

      const transaction = this.getTransaction(id);
      const failedStates = this.boundaryStates[transaction.type].failed;
      const endTime = failedStates.includes(transaction.transactionState) ? transaction.endTime : Date.now();

      this.updateTransactionParams(id, {
        transactionState: rejectState,
        endTime,
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

  async beforeSign(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (!tx) throw new Error(`Transaction not found: ${id}`);

    const { to, amount, assetAddress, externalNetwork } = tx;

    if (!externalNetwork) throw new Error('Transaction "externalNetwork" cannot be empty');
    if (!amount) throw new Error('Transaction "amount" cannot be empty');
    if (!assetAddress) throw new Error('Transaction "assetAddress" cannot be empty');
    if (!to) throw new Error('Transaction "to" cannot be empty');

    const asset = this.getAssetByAddress(assetAddress);

    if (!asset) throw new Error(`Transaction asset is not registered: ${assetAddress}`);

    await this.beforeTransactionSign();
  }

  async waitForTransactionStatus(id: string): Promise<void> {
    const { status } = this.getTransaction(id);

    if (status) return;

    await delay(1_000);
    await this.waitForTransactionStatus(id);
  }

  private async checkTransactionBlockId(id: string): Promise<void> {
    const { blockId } = this.getTransaction(id);

    if (blockId) return;

    await delay(1_000);
    await this.checkTransactionBlockId(id);
  }

  async waitForTransactionBlockId(id: string): Promise<void> {
    const { txId } = this.getTransaction(id);

    if (!txId) {
      throw new Error(`[${this.constructor.name}]: Transaction "id" is empty, first sign the transaction`);
    }

    try {
      await Promise.race([
        this.checkTransactionBlockId(id),
        new Promise((resolve, reject) => setTimeout(reject, BLOCK_PRODUCE_TIME * 3)),
      ]);
    } catch (error) {
      console.info(`[${this.constructor.name}]: Implement "blockId" restoration by "txId"`);
    }
  }
}

export class Bridge<
  Transaction extends IBridgeTransaction,
  Reducer extends IBridgeReducer<Transaction>,
  ConstructorOptions extends IBridgeConstructorOptions<Transaction, Reducer>
> {
  protected reducers!: Partial<Record<Transaction['type'], Reducer>>;
  protected readonly getTransaction!: GetTransaction<Transaction>;

  constructor({ reducers, getTransaction, ...rest }: ConstructorOptions) {
    this.getTransaction = getTransaction;
    this.reducers = Object.entries<Constructable<Reducer>>(reducers).reduce((acc, [operation, Reducer]) => {
      acc[operation] = new Reducer({
        ...rest,
        getTransaction,
      });
      return acc;
    }, {});
  }

  /**
   * Get necessary reducer and handle transaction
   * @param id transaction id
   */
  async handleTransaction(id: string): Promise<void> {
    const transaction = this.getTransaction(id);
    const reducer = this.reducers[transaction.type];

    if (!reducer) {
      throw new Error(`[${this.constructor.name}]: No reducer for operation: '${transaction.type}'`);
    } else {
      await reducer.process(transaction);
    }
  }
}
