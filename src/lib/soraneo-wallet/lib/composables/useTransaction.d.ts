import { HistoryItem } from '@sora-substrate/sdk';
import { AsyncFnWithoutArgs } from './useNotification';

export declare function useTransaction(): {
  loading: import('vue').Ref<boolean, boolean>;
  withLoading: <T>(fn: () => T | Promise<T>) => Promise<T>;
  withApi: <T>(fn: () => T | Promise<T>) => Promise<T>;
  withChainApi: <T>(chainApi: import('@sora-substrate/sdk').WithConnectionApi, fn: () => T | Promise<T>) => Promise<T>;
  withParentLoading: <T>(fn: () => T | Promise<T>) => Promise<T>;
  handleChangeTransaction: (value: Nullable<HistoryItem>, oldValue: Nullable<HistoryItem>) => void;
  withNotifications: (func: AsyncFnWithoutArgs) => Promise<void>;
};
