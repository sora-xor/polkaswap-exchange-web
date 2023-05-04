import type { EvmHistory } from '@sora-substrate/util/build/evm/types';
import type { BridgeHistory } from '@sora-substrate/util';
import type { RegisteredAccountAssetWithDecimals } from '@/store/assets/types';

export type IBridgeTransaction = EvmHistory | BridgeHistory;

export type AddAsset = (address: string) => Promise<void>;
export type GetAssetByAddress = (address: string) => Nullable<RegisteredAccountAssetWithDecimals>;
export type GetActiveTransaction<T> = () => Nullable<T>;
export type AddTransactionToProgress = (id: string) => void;
export type RemoveTransactionFromProgress = (id: string) => void;
export type GetBridgeHistoryInstance<T> = () => Promise<T>;
export type GetTransaction<T> = (id: string) => T;
export type UpdateTransaction<T> = (id: string, params: Partial<T>) => void;
export type ShowNotification<T> = (tx: T) => void;
export type SignEvm = (id: string) => Promise<any>;
export type SignSora = (id: string) => Promise<void>;
export type TransactionBoundaryStates<T extends IBridgeTransaction> = {
  done: T['transactionState'];
  failed: T['transactionState'];
};

export type RemoveTransactionByHash<T> = (options: { tx: Partial<T>; force: boolean }) => void;

export interface Constructable<T> {
  new (...args: any): T;
}

export type TransactionHandlerPayload<Transaction extends IBridgeTransaction> = {
  nextState: Transaction['transactionState'];
  rejectState: Transaction['transactionState'];
  status?: any;
  handler?: (id: string) => Promise<void>;
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
  signEvm: SignEvm;
  signSora: SignSora;
}

export interface IBridgeReducer<T extends IBridgeTransaction> {
  process: (transaction: T) => Promise<void>;
  changeState: (transaction: T) => Promise<void>;
  handleState: (id: string, payload: TransactionHandlerPayload<T>) => Promise<void>;
  updateTransactionParams: (id: string, params: Partial<T>) => Promise<void>;
  beforeSubmit: (id: string) => void;
  onComplete: (id: string) => Promise<void>;
}

export interface IBridgeConstructorOptions<
  Transaction extends IBridgeTransaction,
  Reducer extends IBridgeReducer<Transaction>
> extends IBridgeOptions<Transaction> {
  reducers: Record<Transaction['type'], Constructable<Reducer>>;
  signEvm: Partial<Record<Transaction['type'], SignEvm>>;
  signSora: Partial<Record<Transaction['type'], SignSora>>;
}
