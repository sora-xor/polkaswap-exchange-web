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
import { subscribeOnOrderBookUpdates } from '@/indexer/queries/orderBook/orderBook';
import { fetchOrderBookPriceData } from '@/indexer/queries/orderBook/price';
import { lazyComponent } from '@/router';
import store from '@/store';

import type { RequestMethod, RequestSubscription, RequestSubscriptionCallback } from '@/types/chart';

defineOptions({
  components: {
    PriceChartWidget: lazyComponent(Components.PriceChartWidget),
  },
});

const { baseAsset, quoteAsset } = useOrderBook();
const dexId = computed(() => store.state.orderBook.dexId as string);

const orderBookId = computed<Nullable<string>>(() => {
  if (!(baseAsset.value && quoteAsset.value)) return null;
  return [dexId.value, baseAsset.value.address, quoteAsset.value.address].join('-');
});

const requestMethod: RequestMethod = fetchOrderBookPriceData;

const requestSubscription = computed<Nullable<RequestSubscription>>(() => {
  if (!orderBookId.value) return null;
  return async (callback: RequestSubscriptionCallback) =>
    await subscribeOnOrderBookUpdates(orderBookId.value as string, callback, console.error);
});
</script>
