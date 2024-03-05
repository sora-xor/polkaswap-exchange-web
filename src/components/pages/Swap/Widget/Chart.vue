<template>
  <price-chart-widget :base-asset="tokenFrom" :quote-asset="tokenTo" :is-available="isAvailable" />
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    PriceChartWidget: lazyComponent(Components.PriceChartWidget),
  },
})
export default class SwapChartWidget extends Mixins() {
  @state.swap.isAvailable isAvailable!: boolean;
  @getter.swap.tokenFrom tokenFrom!: Nullable<AccountAsset>;
  @getter.swap.tokenTo tokenTo!: Nullable<AccountAsset>;
}
</script>
