import { ref, type Ref } from 'vue';

import { delay } from '@/util';

import type { WithConnectionApi } from '@sora-substrate/sdk';

type BooleanSource = Ref<boolean> | (() => boolean) | undefined;

type LoadingOptions = {
  parentLoading?: BooleanSource;
  isWalletLoaded?: BooleanSource;
};

type MaybePromise<T> = T | Promise<T>;

type AsyncOrSyncFn<T> = () => MaybePromise<T>;
type ChainApiInstance = WithConnectionApi['api'];

function resolveBoolean(source?: BooleanSource): boolean {
  if (!source) return false;
  if (typeof source === 'function') {
    return Boolean(source());
  }
  return Boolean(source.value);
}

const resolveChainApi = (chainApi: WithConnectionApi): ChainApiInstance | null => {
  try {
    return chainApi.api;
  } catch {
    // Connection object may still be initializing when the helper is first called.
    return null;
  }
};

export function useLoading(options: LoadingOptions = {}) {
  const loading = ref(false);

  const withLoading = async <T>(fn: AsyncOrSyncFn<T>): Promise<T> => {
    loading.value = true;
    try {
      return await fn();
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const withApi = async <T>(fn: AsyncOrSyncFn<T>): Promise<T> => {
    loading.value = true;

    if (resolveBoolean(options.isWalletLoaded)) {
      return withLoading(fn);
    }

    await delay();
    return withApi(fn);
  };

  const withChainApi = async <T>(chainApi: WithConnectionApi, fn: AsyncOrSyncFn<T>): Promise<T> => {
    loading.value = true;

    const api = resolveChainApi(chainApi);

    if (!api) {
      await delay();
      return withChainApi(chainApi, fn);
    }

    await api.isReady;
    return withLoading(fn);
  };

  const withParentLoading = async <T>(fn: AsyncOrSyncFn<T>): Promise<T> => {
    if (!resolveBoolean(options.parentLoading)) {
      return fn();
    }

    await delay();
    return withParentLoading(fn);
  };

  return {
    loading,
    withLoading,
    withApi,
    withChainApi,
    withParentLoading,
  };
}
