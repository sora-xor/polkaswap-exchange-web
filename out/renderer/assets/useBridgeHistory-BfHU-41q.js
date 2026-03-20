import { P as useRouterStore, e as useSettingsStore, Q as useBridgeHistoryStore, R as useBridgeTransactionsStore, I as storeToRefs, U as useLoading, h as computed, f as isOutgoingTransaction, V as PageNames, W as router } from "./index-73GArslZ.js";
import { u as useBridgeStore } from "./index-FPtsBGoq.js";
function useBridgeHistory(options = {}) {
  const routerStore = useRouterStore();
  const settingsStore = useSettingsStore();
  const bridgeHistoryStore = useBridgeHistoryStore();
  const bridgeStore = useBridgeStore();
  const bridgeTransactionsStore = useBridgeTransactionsStore();
  const { historyInternal, historyLoading } = storeToRefs(bridgeTransactionsStore);
  const loadingApi = useLoading({ parentLoading: options.parentLoading });
  const networkHistoryId = computed(() => bridgeStore.networkHistoryId);
  const history = computed(() => historyInternal.value);
  const networkHistoryLoading = computed(
    () => Boolean(networkHistoryId.value && historyLoading.value[networkHistoryId.value])
  );
  const networkFees = computed(() => settingsStore.networkFees);
  const prevRoute = computed(() => routerStore.prev);
  const setSoraToEvm = (value) => {
    bridgeStore.updateForm({ isSoraToEvm: value });
  };
  const setHistoryPage = (page) => {
    bridgeHistoryStore.setHistoryPage(page);
  };
  const setHistoryId = (id) => {
    bridgeStore.setHistoryId(id);
  };
  const setAssetAddress = async (address) => {
    if (!address) {
      bridgeStore.setAssetAddress("");
      return;
    }
    bridgeStore.setAssetAddress(address);
  };
  const generateHistoryItem = async (historyItem) => {
    return await bridgeStore.generateHistoryItem(historyItem);
  };
  const updateInternalHistory = async () => {
    await bridgeStore.updateInternalHistory();
  };
  const updateExternalHistory = async (clearHistory) => {
    await bridgeStore.updateExternalHistory(clearHistory);
  };
  const navigateToBridgeTransaction = () => {
    router.push({ name: PageNames.BridgeTransaction });
  };
  const handleBack = () => {
    const fallback = prevRoute.value ?? PageNames.Bridge;
    router.push({ name: fallback });
  };
  const showHistory = async (id) => {
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
    showHistory
  };
}
export {
  useBridgeHistory as u
};
