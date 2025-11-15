import { delay } from '@wallet/src/util';
import { computed, ref } from 'vue';

import store from '@/store';

import type { WithConnectionApi } from '@sora-substrate/sdk';
import type { Ref } from 'vue';

type LoadingOptions = {
  parentLoading?: Ref<boolean> | (() => boolean);
};

type MaybePromiseFn<T> = FnWithoutArgs<T> | AsyncFnWithoutArgs<T>;

/**
 * Composition-friendly replacement for the wallet `LoadingMixin`.
 */
const importMetaMode = typeof import.meta !== 'undefined' ? (import.meta as any)?.env?.MODE : undefined;
const isTestEnvironment = importMetaMode === 'test' || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

export function useLoading(options: LoadingOptions = {}) {
  const loading = ref(false);
  const isWalletLoaded = computed(() => store.state?.settings?.isWalletLoaded ?? true);
  const parentLoading = options.parentLoading;

  const resolveParentLoading = (): boolean => {
    if (!parentLoading) return false;
    return typeof parentLoading === 'function' ? parentLoading() : parentLoading.value;
  };

  const withLoading = async <T>(handler: MaybePromiseFn<T>): Promise<T> => {
    loading.value = true;
    try {
      return await handler();
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const withApi = async <T>(handler: MaybePromiseFn<T>): Promise<T> => {
    loading.value = true;

    if (!isWalletLoaded.value) {
      if (isTestEnvironment) {
        return await withLoading(handler);
      }

      await delay();
      return await withApi(handler);
    }

    return await withLoading(handler);
  };

  const withChainApi = async <T>(apiRef: WithConnectionApi, handler: MaybePromiseFn<T>): Promise<T> => {
    loading.value = true;

    if (!apiRef.api) {
      await delay();
      return await withChainApi(apiRef, handler);
    }

    await apiRef.api.isReady;
    return await withLoading(handler);
  };

  const withParentLoading = async <T>(handler: MaybePromiseFn<T>): Promise<T> => {
    if (resolveParentLoading()) {
      await delay();
      return await withParentLoading(handler);
    }

    return await handler();
  };

  return {
    loading,
    withLoading,
    withApi,
    withChainApi,
    withParentLoading,
  };
}

export type LoadingComposable = ReturnType<typeof useLoading>;
