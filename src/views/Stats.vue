<template>
  <div class="stats-container">
    <stats-network-stats class="grid-item" :parent-loading="parentLoading" />

    <stats-tvl-chart class="grid-item grid-item--50" :parent-loading="parentLoading" />

    <stats-bar-chart class="grid-item grid-item--50" :parent-loading="parentLoading" />

    <stats-bar-chart class="grid-item grid-item--50" fees :parent-loading="parentLoading" />

    <stats-supply-chart class="grid-item grid-item--50" :parent-loading="parentLoading" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';

@Component({
  components: {
    StatsNetworkStats: lazyComponent(Components.StatsNetworkStats),
    StatsTvlChart: lazyComponent(Components.StatsTvlChart),
    StatsBarChart: lazyComponent(Components.StatsBarChart),
    StatsSupplyChart: lazyComponent(Components.StatsSupplyChart),
  },
})
export default class Stats extends Mixins(mixins.LoadingMixin) {}
</script>

<style lang="scss" scoped>
$container-max-width: 989px;
$container-width: 75vw;
$gap: $inner-spacing-medium;

.stats-container {
  max-width: $container-max-width;
  margin: auto;
  display: flex;
  flex-flow: row wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: $gap;

  @include large-mobile {
    width: $container-width;
  }
}

.grid-item {
  width: 100%;

  &--50 {
    @include desktop {
      @include columns(2, $gap);
    }
  }
}
</style>
