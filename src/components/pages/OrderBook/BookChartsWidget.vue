<template>
  <div class="order-book-widget">
    <swap-chart :token-from="quoteAsset" :token-to="baseAsset" :is-available="isAvailable" class="swap-chart" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, LimitOrderSide } from '@/consts';
import { lazyComponent } from '@/router';
import { mutation, getter } from '@/store/decorators';

import type { AccountAsset, Asset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    SwapChart: lazyComponent(Components.SwapChart),
  },
})
export default class BookChartsWidget extends Mixins(TranslationMixin) {
  @getter.orderBook.baseAsset baseAsset!: AccountAsset;
  @getter.orderBook.quoteAsset quoteAsset!: AccountAsset;

  get isAvailable() {
    return true;
  }
}
</script>
