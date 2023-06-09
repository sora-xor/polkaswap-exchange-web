import type { IBridgeTransaction, RegisteredAccountAsset } from '@sora-substrate/util';

export type AddAsset = (address: string) => Promise<void>;
export type GetAssetByAddress = (address: string) => Nullable<RegisteredAccountAsset>;
export type GetActiveTransaction<T> = () => Nullable<T>;
export type AddTransactionToProgress = (id: string) => void;
export type RemoveTransactionFromProgress = (id: string) => void;
export type GetBridgeHistoryInstance<T> = () => Promise<T>;
export type GetTransaction<T> = (id: string) => T;
export type UpdateTransaction<T> = (id: string, params: Partial<T>) => void;
export type ShowNotification<T> = (tx: T) => void;
export type SignExternal = (id: string) => Promise<any>;
export type SignSora = (id: string) => Promise<void>;
export type TransactionBoundaryStates<T extends IBridgeTransaction> = Partial<
  Record<
    T['type'],
    {
      done: T['transactionState'];
      failed: T['transactionState'][];
    }
  >
>;

export type RemoveTransactionByHash<T> = (options: { tx: Partial<T>; force: boolean }) => void;

export interface Constructable<T> {
  new (...args: any): T;
}

export type TransactionHandlerPayload<Transaction extends IBridgeTransaction> = {
  nextState: Transaction['transactionState'];
  rejectState: Transaction['transactionState'];
  handler?: (id: string) => Promise<string | void>;
};

export interface IBridgeOptions<T extends IBridgeTransaction> {
  // asset
  addAsset: AddAsset;
  getAssetByAddress: GetAssetByAddress;
  // transaction
  getTransaction: GetTransaction<T>;
  updateTransaction: UpdateTransaction<T>;
  // ui integration
  showNotification: ShowNotification<T>;
  updateHistory: VoidFunction;
  getActiveTransaction: GetActiveTransaction<T>;
  addTransactionToProgress: AddTransactionToProgress;
  removeTransactionFromProgress: RemoveTransactionFromProgress;
  // boundary states ("failed", "done")
  boundaryStates: TransactionBoundaryStates<T>;
}

export interface IBridgeReducerOptions<T extends IBridgeTransaction> extends IBridgeOptions<T> {
  signExternal: SignExternal;
  signSora: SignSora;
}

export interface IBridgeReducer<T extends IBridgeTransaction> {
  process: (transaction: T) => Promise<void>;
  changeState: (transaction: T) => Promise<void>;
  handleState: (id: string, payload: TransactionHandlerPayload<T>) => Promise<void>;
  updateTransactionParams: (id: string, params: Partial<T>) => void;
  beforeSubmit: (id: string) => void;
  onComplete: (id: string) => Promise<void>;
}

export interface IBridgeConstructorOptions<
  Transaction extends IBridgeTransaction,
  Reducer extends IBridgeReducer<Transaction>
> extends IBridgeOptions<Transaction> {
  reducers: Record<Transaction['type'], Constructable<Reducer>>;
  signExternal: Partial<Record<Transaction['type'], SignExternal>>;
  signSora: Partial<Record<Transaction['type'], SignSora>>;
}
