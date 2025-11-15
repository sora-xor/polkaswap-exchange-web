<template>
  <order-table :orders="filtered" :parent-loading="loading"></order-table>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { fetchOrderBookAccountOrders } from '@/indexer/queries/orderBook/orders';
import store from '@/store';
import { useLoading } from '@/composables/useLoading';
import { useWalletStore } from '@/stores/wallet';
import { Filter, OrderStatus } from '@/types/orderBook';

import OrderTable from './OrderTable.vue';

import type { OrderData } from '@/types/orderBook';
import type { OrderBook } from '@sora-substrate/liquidity-proxy';
import type { Nullable } from '@/types/common';

const props = withDefaults(
  defineProps<{
    filter?: string;
  }>(),
  { filter: '' }
);

const { loading, withLoading } = useLoading();
const walletStore = useWalletStore();

const orders = ref<OrderData[]>([]);

const accountAddress = computed(() => walletStore.address);
const currentOrderBook = computed<Nullable<OrderBook>>(
  () => (store.getters?.orderBook?.currentOrderBook as Nullable<OrderBook>) ?? null
);

/**
 * Fetches account orders for the currently selected order book.
 */
const fetchOrders = async () => {
  const address = accountAddress.value;
  if (!address) {
    orders.value = [];
    return;
  }

  await withLoading(async () => {
    const data = await fetchOrderBookAccountOrders(address, currentOrderBook.value?.orderBookId);
    orders.value = data ?? [];
  });
};

const filtered = computed(() => {
  if (props.filter !== Filter.executed) {
    return orders.value;
  }

  return orders.value.filter((item) => item.status === OrderStatus.Filled);
});

onMounted(fetchOrders);
</script>
