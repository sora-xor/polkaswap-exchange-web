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

function resolveBoolean(source?: BooleanSource): boolean {
  if (!source) return false;
  if (typeof source === 'function') {
    return Boolean(source());
  }
  return Boolean(source.value);
}

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

    if (!chainApi.api) {
      await delay();
      return withChainApi(chainApi, fn);
    }

    await chainApi.api.isReady;
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
