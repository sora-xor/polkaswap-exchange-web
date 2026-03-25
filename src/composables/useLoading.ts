import { computed, ref } from 'vue';

import { delay } from '@/shims/wallet-util';
import pinia from '@/plugins/pinia';
import { useSettingsStore } from '@/stores/settings';

import type { WithConnectionApi } from '@sora-substrate/sdk';
import type { Ref } from 'vue';

type LoadingOptions = {
  parentLoading?: Ref<boolean> | (() => boolean);
  walletLoadTimeoutMs?: number;
  walletLoadPollMs?: number;
  forceWalletReadinessWaitInTests?: boolean;
};

type MaybePromiseFn<T> = FnWithoutArgs<T> | AsyncFnWithoutArgs<T>;
type ChainApiInstance = WithConnectionApi['api'];

/**
 * Composition-friendly replacement for the wallet `LoadingMixin`.
 */
const importMetaMode = typeof import.meta !== 'undefined' ? (import.meta as any)?.env?.MODE : undefined;
const isTestEnvironment = importMetaMode === 'test' || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
const DEFAULT_WALLET_LOAD_TIMEOUT_MS = 12_000;
const DEFAULT_WALLET_LOAD_POLL_MS = 100;

let walletTimeoutWarningShown = false;

const toNonNegativeNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const resolveWalletLoadTimeoutMs = (options: LoadingOptions): number => {
  return toNonNegativeNumber(
    options.walletLoadTimeoutMs ?? process.env.VITE_WALLET_LOAD_TIMEOUT_MS,
    DEFAULT_WALLET_LOAD_TIMEOUT_MS
  );
};

const resolveWalletLoadPollMs = (options: LoadingOptions): number => {
  return toNonNegativeNumber(
    options.walletLoadPollMs ?? process.env.VITE_WALLET_LOAD_POLL_MS,
    DEFAULT_WALLET_LOAD_POLL_MS
  );
};

const resolveChainApi = (apiRef: WithConnectionApi): ChainApiInstance | null => {
  try {
    return apiRef.api;
  } catch {
    // Some flows call withChainApi before connection is attached; retry instead of crashing.
    return null;
  }
};

export function useLoading(options: LoadingOptions = {}) {
  const loading = ref(false);
  const settingsStore = useSettingsStore(pinia);
  const isWalletLoaded = computed(() => settingsStore.isWalletLoaded);
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

    const walletReady = isWalletLoaded.value;
    const shouldBypassWalletWaitInTests = isTestEnvironment && !options.forceWalletReadinessWaitInTests;
    if (!shouldBypassWalletWaitInTests && !walletReady) {
      const timeoutMs = resolveWalletLoadTimeoutMs(options);
      const pollMs = resolveWalletLoadPollMs(options);
      const timeoutAt = Date.now() + timeoutMs;

      while (!isWalletLoaded.value) {
        if (Date.now() >= timeoutAt) {
          if (!walletTimeoutWarningShown) {
            walletTimeoutWarningShown = true;
            console.warn(
              `[useLoading] wallet readiness wait timed out after ${timeoutMs}ms; continuing without wallet-ready flag.`
            );
          }
          break;
        }

        await delay(pollMs);
      }

      if (isWalletLoaded.value) {
        walletTimeoutWarningShown = false;
      }
    }

    return await withLoading(handler);
  };

  const withChainApi = async <T>(apiRef: WithConnectionApi, handler: MaybePromiseFn<T>): Promise<T> => {
    loading.value = true;

    const api = resolveChainApi(apiRef);

    if (!api) {
      await delay();
      return await withChainApi(apiRef, handler);
    }

    await api.isReady;
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
