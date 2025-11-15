import { HashType } from '@/consts';
interface TxHashViewData {
  value: string;
  type: HashType;
  translation: string;
  block?: Nullable<string>;
}
export declare const MOCK_TRANSACTION_HASH_VIEW: Array<TxHashViewData>;
export {};
