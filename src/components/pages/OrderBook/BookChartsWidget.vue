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
  />
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { subscribeOnOrderBookUpdates } from '@/indexer/queries/orderBook';
import { fetchOrderBookPriceData } from '@/indexer/queries/orderBook/price';
import { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';
import type { RequestMethod, RequestSubscription, RequestSubscriptionCallback } from '@/types/chart';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { DexId } from '@sora-substrate/sdk/build/dex/consts';

@Component({
  components: {
    PriceChartWidget: lazyComponent(Components.PriceChartWidget),
  },
})
export default class BookChartsWidget extends Mixins(TranslationMixin) {
  @getter.orderBook.baseAsset baseAsset!: AccountAsset;
  @getter.orderBook.quoteAsset quoteAsset!: AccountAsset;
  @state.orderBook.dexId dexId!: DexId;

  get orderBookId(): Nullable<string> {
    if (!(this.baseAsset && this.quoteAsset)) return null;

    return [this.dexId, this.baseAsset.address, this.quoteAsset.address].join('-');
  }

  get requestMethod(): RequestMethod {
    return fetchOrderBookPriceData;
  }

  get requestSubscription(): Nullable<RequestSubscription> {
    const id = this.orderBookId;

    if (!id) return null;

    return async (callback: RequestSubscriptionCallback) =>
      await subscribeOnOrderBookUpdates(id, callback, console.error);
  }
}
</script>
