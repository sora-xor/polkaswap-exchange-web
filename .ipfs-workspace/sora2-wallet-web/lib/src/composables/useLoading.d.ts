import { type Ref } from 'vue';
import type { WithConnectionApi } from '@sora-substrate/sdk';
type BooleanSource = Ref<boolean> | (() => boolean) | undefined;
type LoadingOptions = {
  parentLoading?: BooleanSource;
  isWalletLoaded?: BooleanSource;
};
type MaybePromise<T> = T | Promise<T>;
type AsyncOrSyncFn<T> = () => MaybePromise<T>;
export declare function useLoading(options?: LoadingOptions): {
  loading: Ref<boolean, boolean>;
  withLoading: <T>(fn: AsyncOrSyncFn<T>) => Promise<T>;
  withApi: <T>(fn: AsyncOrSyncFn<T>) => Promise<T>;
  withChainApi: <T>(chainApi: WithConnectionApi, fn: AsyncOrSyncFn<T>) => Promise<T>;
  withParentLoading: <T>(fn: AsyncOrSyncFn<T>) => Promise<T>;
};
export {};
