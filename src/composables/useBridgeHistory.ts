import { computed } from 'vue';

import { useLoading } from '@/composables/useLoading';
import { PageNames } from '@/consts';
import router from '@/router';
import store from '@/store';
import { useRouterStore } from '@/stores/router';
import { useSettingsStore } from '@/stores/settings';
import type { Nullable } from '@/types/common';
import { isOutgoingTransaction } from '@/utils/bridge/common/utils';

import type { NetworkFeesObject, IBridgeTransaction } from '@sora-substrate/sdk';
import type { Ref } from 'vue';

type ParentLoadingSource = Ref<boolean> | (() => boolean);

type UseBridgeHistoryOptions = {
  parentLoading?: ParentLoadingSource;
};

/**
 * Composition replacement for the legacy `BridgeHistoryMixin`.
 * Provides accessors and helpers for bridge history interactions
 * together with loading helpers sourced from {@link useLoading}.
 */
export function useBridgeHistory<T extends IBridgeTransaction>(options: UseBridgeHistoryOptions = {}) {
  const routerStore = useRouterStore();
  const settingsStore = useSettingsStore();
  const loadingApi = useLoading({ parentLoading: options.parentLoading });

  const history = computed(() => store.getters.bridge.history as Record<string, T>);
  const networkHistoryLoading = computed(() => Boolean(store.getters.bridge.networkHistoryLoading));
  const networkFees = computed(() => settingsStore.networkFees as NetworkFeesObject);
  const prevRoute = computed(() => routerStore.prev as Nullable<PageNames>);

  const setSoraToEvm = (value: boolean) => {
    store.commit.bridge.setSoraToEvm(value);
  };

  const setHistoryPage = (page?: number) => {
    store.commit.bridge.setHistoryPage(page);
  };

  const setHistoryId = (id?: string) => {
    store.commit.bridge.setHistoryId(id);
  };

  const setAssetAddress = async (address?: string) => {
    await store.dispatch.bridge.setAssetAddress(address);
  };

  const generateHistoryItem = async (historyItem?: unknown): Promise<T> => {
    return (await store.dispatch.bridge.generateHistoryItem(historyItem)) as T;
  };

  const updateInternalHistory = async (): Promise<void> => {
    await store.dispatch.bridge.updateInternalHistory();
  };

  const updateExternalHistory = async (clearHistory?: boolean): Promise<void> => {
    await store.dispatch.bridge.updateExternalHistory(clearHistory);
  };

  const navigateToBridgeTransaction = () => {
    router.push({ name: PageNames.BridgeTransaction });
  };

  const handleBack = () => {
    const fallback = prevRoute.value ?? PageNames.Bridge;
    router.push({ name: fallback });
  };

  const showHistory = async (id?: string): Promise<void> => {
    if (!id) {
      handleBack();
      return;
    }

    const tx = history.value[id];
    if (!tx) return;

    await loadingApi.withLoading(async () => {
      setSoraToEvm(isOutgoingTransaction(tx));
      await setAssetAddress(tx.assetAddress);
      setHistoryId(tx.id);
      navigateToBridgeTransaction();
    });
  };

  return {
    ...loadingApi,
    history,
    networkHistoryLoading,
    networkFees,
    prevRoute,
    setSoraToEvm,
    setHistoryPage,
    setHistoryId,
    setAssetAddress,
    generateHistoryItem,
    updateInternalHistory,
    updateExternalHistory,
    navigateToBridgeTransaction,
    handleBack,
    showHistory,
  };
}
