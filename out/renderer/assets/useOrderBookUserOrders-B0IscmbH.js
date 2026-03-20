import { e as useSettingsStore, h as computed, aa as OrderBookStatus } from "./index-73GArslZ.js";
import { u as useOrderBookStore } from "./index-BDxnS5Vu.js";
function useOrderBookUserOrders() {
  const orderBookStore = useOrderBookStore();
  const settingsStore = useSettingsStore();
  const userLimitOrders = computed(() => orderBookStore.userLimitOrders ?? []);
  const ordersToBeCancelled = computed(() => orderBookStore.ordersToBeCancelled ?? []);
  const currentOrderBook = computed(
    () => orderBookStore.currentOrderBook ?? null
  );
  const nodeIsConnected = computed(() => settingsStore.nodeIsConnected);
  const isBookStopped = computed(
    () => !currentOrderBook.value || currentOrderBook.value.status === OrderBookStatus.Stop
  );
  const subscribeToUserLimitOrders = async () => {
    await orderBookStore.subscribeToUserLimitOrders();
  };
  const unsubscribeFromUserLimitOrders = async () => {
    await orderBookStore.unsubscribeFromUserLimitOrders();
  };
  const subscribeOnLimitOrders = async (ids) => {
    await orderBookStore.subscribeOnLimitOrders(ids);
  };
  const resetPagedUserLimitOrdersSubscription = () => {
    orderBookStore.resetPagedUserLimitOrdersSubscription();
  };
  const setOrdersToBeCancelled = (orders) => {
    orderBookStore.setOrdersToBeCancelled(orders);
  };
  return {
    userLimitOrders,
    ordersToBeCancelled,
    currentOrderBook,
    nodeIsConnected,
    isBookStopped,
    subscribeToUserLimitOrders,
    unsubscribeFromUserLimitOrders,
    subscribeOnLimitOrders,
    resetPagedUserLimitOrdersSubscription,
    setOrdersToBeCancelled
  };
}
export {
  useOrderBookUserOrders as u
};
