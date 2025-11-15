<template>
  <order-table
    ref="orderTable"
    is-open-orders
    :orders="sortedUserLimitOrders"
    :selectable="isSelectionAllowed"
    :parent-loading="loadingState"
    @cell-click="handleSelectRow"
    @selection-change="handleSelectionChange"
    @select="handleSelect"
    @page-updated="handlePagination"
    @sync="syncTableItems"
  ></order-table>
</template>

<script setup lang="ts">
import { OrderBookStatus } from '@sora-substrate/liquidity-proxy';
import { components } from '@wallet';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';
import store from '@/store';
import { delay, waitUntil } from '@/utils';

import OrderTable from './OrderTable.vue';

import type { OrderBook } from '@sora-substrate/liquidity-proxy';
import type { LimitOrder } from '@sora-substrate/sdk/build/orderBook/types';

defineOptions({
  components: {
    OrderTable,
    HistoryPagination: components.HistoryPagination,
  },
});

const props = withDefaults(
  defineProps<{
    parentLoading?: boolean;
  }>(),
  { parentLoading: false }
);

const { t } = useTranslation();
const { loading, withLoading } = useLoading({ parentLoading: () => props.parentLoading });

const orderTable = ref<InstanceType<typeof OrderTable>>();

const userLimitOrders = computed<LimitOrder[]>(() => store.state.orderBook.userLimitOrders as LimitOrder[]);
const currentOrderBook = computed<Nullable<OrderBook>>(
  () => (store.getters.orderBook?.currentOrderBook as Nullable<OrderBook>) ?? null
);
const ordersToBeCancelled = computed<LimitOrder[]>(() => store.state.orderBook.ordersToBeCancelled as LimitOrder[]);

const loadingState = computed(() => Boolean(props.parentLoading) || loading.value);
const isSelectionAllowed = computed(
  () => !!currentOrderBook.value && currentOrderBook.value.status !== OrderBookStatus.Stop
);
const sortedUserLimitOrders = computed<LimitOrder[]>(() => [...userLimitOrders.value].sort((a, b) => b.time - a.time));

const currentPage = ref(1);
const tableItems = ref<LimitOrder[]>([]);
const selectedPageItemIds = ref<number[]>([]);
const needToUpdateSelection = ref(false);
const syncTableItemsRefreshing = ref(false);

const ordersToBeCancelledIds = computed(() => ordersToBeCancelled.value.map(({ id }) => id));

const subscribeOnLimitOrders = async (ids: number[]) => await store.dispatch.orderBook?.subscribeOnLimitOrders?.(ids);
const resetLimitOrdersSubscription = () => store.commit.orderBook?.resetPagedUserLimitOrdersSubscription?.();
const setOrdersToBeCancelled = (orders: LimitOrder[]) => store.commit.orderBook?.setOrdersToBeCancelled?.(orders);

const restoreSelectedData = () => {
  const pageItems = tableItems.value.filter(({ id }) => ordersToBeCancelledIds.value.includes(id));

  pageItems.forEach((row) => {
    orderTable.value?.tableComponent?.toggleRowSelection?.(row, true);
  });

  selectedPageItemIds.value = pageItems.map(({ id }) => id);
};

const handlePagination = async (page: number, items?: LimitOrder[]) => {
  await withLoading(async () => {
    const list = items ?? tableItems.value;
    currentPage.value = page;

    resetLimitOrdersSubscription();
    if (list.length) {
      await subscribeOnLimitOrders(list.map(({ id }) => id));
    }
  });
};

const handleSelect = () => {
  needToUpdateSelection.value = true;
};

const handleSelectRow = (row: LimitOrder) => {
  if (!isSelectionAllowed.value) return;

  needToUpdateSelection.value = true;
  orderTable.value?.tableComponent?.toggleRowSelection?.(row);
};

const handleSelectionChange = (rows: LimitOrder[]) => {
  if (!(isSelectionAllowed.value && needToUpdateSelection.value)) return;

  const diff = selectedPageItemIds.value.length - rows.length;

  if (diff === 1) {
    const rowIds = rows.map(({ id }) => id);
    const clickedRowId = selectedPageItemIds.value.find((id) => !rowIds.includes(id));
    if (clickedRowId) {
      setOrdersToBeCancelled(ordersToBeCancelled.value.filter(({ id }) => id !== clickedRowId));
    }
  } else if (diff === -1) {
    const clickedRow = rows.find(({ id }) => !selectedPageItemIds.value.includes(id));
    if (clickedRow) {
      setOrdersToBeCancelled([...ordersToBeCancelled.value, clickedRow]);
    }
  }

  selectedPageItemIds.value = rows.map(({ id }) => id);
  needToUpdateSelection.value = false;
};

const syncTableItems = (items: LimitOrder[]) => {
  tableItems.value = items;
  syncTableItemsRefreshing.value = false;
  restoreSelectedData();
};

watch(
  sortedUserLimitOrders,
  async (next, prev) => {
    if (!next?.length || next.length === prev?.length) {
      return;
    }

    syncTableItemsRefreshing.value = true;
    await waitUntil(() => !syncTableItemsRefreshing.value);

    if (ordersToBeCancelledIds.value.length) {
      const stillRemain = tableItems.value.filter(({ id }) => ordersToBeCancelledIds.value.includes(id));
      setOrdersToBeCancelled(stillRemain);
    }

    await handlePagination(currentPage.value);
  },
  { deep: true, immediate: true }
);

onBeforeUnmount(() => {
  if (isSelectionAllowed.value) {
    setOrdersToBeCancelled([]);
  }
  resetLimitOrdersSubscription();
});

defineExpose({
  handlePagination,
});
</script>
