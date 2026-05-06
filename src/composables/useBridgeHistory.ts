import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useLoading } from '@/composables/useLoading';
import { PageNames } from '@/consts';
import { resolveBridgeBackLocation } from '@/features/bridge/services/navigationHistory';
import { useSettingsStore } from '@/stores/settings';
import { useBridgeStore } from '@/stores/bridge';
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
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const bridgeStore = useBridgeStore();
  const loadingApi = useLoading({ parentLoading: options.parentLoading });

  const networkHistoryId = computed(() => bridgeStore.networkHistoryId as Nullable<BridgeNetworkId>);
  const history = computed(() => bridgeStore.historyInternal as Record<string, T>);
  const networkHistoryLoading = computed(() =>
    Boolean(networkHistoryId.value && bridgeStore.historyLoading[networkHistoryId.value])
  );
  const networkFees = computed(() => settingsStore.networkFees as NetworkFeesObject);

  const setSoraToEvm = (value: boolean) => {
    bridgeStore.updateForm({ isSoraToEvm: value });
  };

  const setHistoryPage = (page?: number) => {
    bridgeStore.setHistoryPage(page);
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
    const backLocation = resolveBridgeBackLocation();

    if (backLocation) {
      router.push(backLocation);
      return;
    }

    router.push({ name: PageNames.Bridge });
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
