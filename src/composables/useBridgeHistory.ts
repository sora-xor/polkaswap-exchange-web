import { computed } from 'vue';
import { storeToRefs } from 'pinia';

import { useLoading } from '@/composables/useLoading';
import { PageNames } from '@/consts';
import router from '@/router';
import { useRouterStore } from '@/stores/router';
import { useSettingsStore } from '@/stores/settings';
import { useBridgeHistoryStore } from '@/stores/bridge/history';
import { useBridgeStore } from '@/stores/bridge';
import { useBridgeTransactionsStore } from '@/stores/bridge/transactions';
import type { Nullable } from '@/types/common';
import { isOutgoingTransaction } from '@/utils/bridge/common/utils';

import type { NetworkFeesObject, IBridgeTransaction } from '@sora-substrate/sdk';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';
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
  const bridgeHistoryStore = useBridgeHistoryStore();
  const bridgeStore = useBridgeStore();
  const bridgeTransactionsStore = useBridgeTransactionsStore();
  const { historyInternal, historyLoading } = storeToRefs(bridgeTransactionsStore);
  const loadingApi = useLoading({ parentLoading: options.parentLoading });

  const networkHistoryId = computed(() => bridgeStore.networkHistoryId as Nullable<BridgeNetworkId>);
  const history = computed(() => historyInternal.value as Record<string, T>);
  const networkHistoryLoading = computed(() =>
    Boolean(networkHistoryId.value && historyLoading.value[networkHistoryId.value])
  );
  const networkFees = computed(() => settingsStore.networkFees as NetworkFeesObject);
  const prevRoute = computed(() => routerStore.prev as Nullable<PageNames>);

  const setSoraToEvm = (value: boolean) => {
    bridgeStore.updateForm({ isSoraToEvm: value });
  };

  const setHistoryPage = (page?: number) => {
    bridgeHistoryStore.setHistoryPage(page);
  };

  const setHistoryId = (id?: string) => {
    bridgeStore.setHistoryId(id);
  };

  const setAssetAddress = async (address?: string) => {
    if (!address) {
      bridgeStore.setAssetAddress('');
      return;
    }
    bridgeStore.setAssetAddress(address);
  };

  const generateHistoryItem = async (historyItem?: unknown): Promise<T> => {
    return (await bridgeStore.generateHistoryItem(historyItem)) as T;
  };

  const updateInternalHistory = async (): Promise<void> => {
    await bridgeStore.updateInternalHistory();
  };

  const updateExternalHistory = async (clearHistory?: boolean): Promise<void> => {
    await bridgeStore.updateExternalHistory(clearHistory);
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
