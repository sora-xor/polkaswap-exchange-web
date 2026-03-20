import { u as useOrderBookStore } from "./index-BDxnS5Vu.js";
import { h as computed } from "./index-73GArslZ.js";
function useOrderBookManagement() {
  const orderBookStore = useOrderBookStore();
  const orderBooks = computed(
    () => orderBookStore.orderBooks ?? {}
  );
  const setCurrentOrderBook = (id) => {
    orderBookStore.setCurrentOrderBook(id);
  };
  const getOrderBooksInfo = async () => {
    await orderBookStore.getOrderBooksInfo();
  };
  const subscribeToOrderBookStats = async () => {
    await orderBookStore.subscribeToOrderBookStats();
  };
  const unsubscribeFromOrderBookStats = async () => {
    await orderBookStore.unsubscribeFromOrderBookStats();
  };
  const unsubscribeFromBidsAndAsks = async () => {
    await orderBookStore.unsubscribeFromBidsAndAsks();
  };
  const updateBalanceSubscription = async (reset = false) => {
    await orderBookStore.updateBalanceSubscription(reset);
  };
  const updateOrderBooksStats = async () => {
    await orderBookStore.updateOrderBooksStats();
  };
  return {
    orderBooks,
    setCurrentOrderBook,
    getOrderBooksInfo,
    subscribeToOrderBookStats,
    unsubscribeFromOrderBookStats,
    unsubscribeFromBidsAndAsks,
    updateBalanceSubscription,
    updateOrderBooksStats
  };
}
export {
  useOrderBookManagement as u
};
