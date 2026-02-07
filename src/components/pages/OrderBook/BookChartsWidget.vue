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
import { computed } from 'vue';

import { Components } from '@/consts';
import { useOrderBook } from '@/composables/useOrderBook';
import { usePiniaTelemetry } from '@/composables/usePiniaTelemetry';
import { subscribeOnOrderBookUpdates } from '@/indexer/queries/orderBook/orderBook';
import { fetchOrderBookPriceData } from '@/indexer/queries/orderBook/price';
import { lazyComponent } from '@/router';
import { useOrderBookStore } from '@/stores/orderBook';

import type { RequestMethod, RequestSubscription, RequestSubscriptionCallback } from '@/types/chart';

defineOptions({
  components: {
    PriceChartWidget: lazyComponent(Components.PriceChartWidget),
  },
});

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
