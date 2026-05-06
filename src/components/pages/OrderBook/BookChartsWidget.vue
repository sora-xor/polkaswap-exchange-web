<template>
  <price-chart-widget
    v-bind="$attrs"
    :base-asset="baseAsset"
    :quote-asset="quoteAsset"
    :request-entity-id="orderBookId"
    :request-method="requestMethod"
    :request-subscription="requestSubscription"
    is-available
    class="order-book-chart"
  ></price-chart-widget>
</template>

<script setup lang="ts">
import PriceChartWidget from '@/components/shared/Widget/PriceChart.vue';
import { computed } from 'vue';

import { useOrderBook } from '@/composables/useOrderBook';
import { usePiniaTelemetry } from '@/composables/usePiniaTelemetry';
import { subscribeOnOrderBookUpdates } from '@/indexer/queries/orderBook/orderBook';
import { fetchOrderBookPriceData } from '@/indexer/queries/orderBook/price';
import { useOrderBookStore } from '@/stores/orderBook';

import type { RequestMethod, RequestSubscription, RequestSubscriptionCallback } from '@/types/chart';

const { baseAsset, quoteAsset, dexId, orderBookId: storeOrderBookId } = useOrderBook();
const orderBookStore = useOrderBookStore();

const orderBookId = computed<Nullable<string>>(() => {
  if (!(baseAsset.value && quoteAsset.value && dexId.value)) return null;
  return [dexId.value, baseAsset.value.address, quoteAsset.value.address].join('-');
});

const requestMethod: RequestMethod = fetchOrderBookPriceData;

const requestSubscription = computed<Nullable<RequestSubscription>>(() => {
  if (!orderBookId.value) return null;
  return async (callback: RequestSubscriptionCallback) =>
    await subscribeOnOrderBookUpdates(orderBookId.value as string, callback, console.error);
});

usePiniaTelemetry('order-book', [{ store: orderBookStore, storeId: 'orderBook' }], {
  metadata: () => ({
    widget: 'book-charts',
    orderBookId: storeOrderBookId.value || orderBookId.value,
    baseAsset: baseAsset.value?.symbol ?? null,
    quoteAsset: quoteAsset.value?.symbol ?? null,
  }),
});
</script>
