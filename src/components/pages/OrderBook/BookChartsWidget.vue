<template>
  <swap-chart
    :dex-id="dexId"
    :base-asset="baseAsset"
    :quote-asset="quoteAsset"
    is-available
    is-order-book
    class="order-book-chart"
  />
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { DexId } from '@sora-substrate/util/build/dex/consts';

@Component({
  components: {
    SwapChart: lazyComponent(Components.SwapChart),
  },
})
export default class BookChartsWidget extends Mixins(TranslationMixin) {
  @getter.orderBook.baseAsset baseAsset!: AccountAsset;
  @getter.orderBook.quoteAsset quoteAsset!: AccountAsset;
  @state.orderBook.dexId dexId!: DexId;
}
</script>
