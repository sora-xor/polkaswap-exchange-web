import type { EvmHistory } from '@sora-substrate/util/build/evm/types';
import type { RegisteredAccountAssetWithDecimals } from '@/store/assets/types';

export type AddAsset = (address: string) => Promise<void>;
export type GetAssetByAddress = (address: string) => Nullable<RegisteredAccountAssetWithDecimals>;
export type GetActiveTransaction<T> = () => Nullable<T>;
export type RemoveTransactionByHash<T> = (options: { tx: Partial<T>; force: boolean }) => void;
export type AddTransactionToProgress = (id: string) => void;
export type RemoveTransactionFromProgress = (id: string) => void;
export type GetBridgeHistoryInstance<T> = () => Promise<T>;
export type GetTransaction<T> = (id: string) => T;
export type UpdateTransaction<T> = (id: string, params: Partial<T>) => void;
export type ShowNotification<T> = (tx: T) => void;
export type SignEvm = (id: string) => Promise<void>;
export type SignSora = (id: string) => Promise<void>;
export type TransactionBoundaryStates<T extends EvmHistory> = {
  done: T['transactionState'];
  failed: T['transactionState'];
};

export interface Constructable<T> {
  new (...args: any): T;
}

export interface BridgeCommonOptions<T extends EvmHistory> {
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
  removeTransactionByHash: RemoveTransactionByHash<T>;
  addTransactionToProgress: AddTransactionToProgress;
  removeTransactionFromProgress: RemoveTransactionFromProgress;
  // boundary states ("failed", "done")
  boundaryStates: TransactionBoundaryStates<T>;
}

export interface BridgeReducerOptions<T extends EvmHistory> extends BridgeCommonOptions<T> {
  signEvm: SignEvm;
  signSora: SignSora;
}
