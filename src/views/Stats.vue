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
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import StatsBarChart from '@/components/pages/Stats/BarChart.vue';
import StatsNetworkStats from '@/components/pages/Stats/NetworkStats.vue';
import StatsSupplyChart from '@/components/pages/Stats/SupplyChart.vue';
import StatsTvlChart from '@/components/pages/Stats/TvlChart.vue';

@Component({
  components: {
    StatsNetworkStats,
    StatsTvlChart,
    StatsBarChart,
    StatsSupplyChart,
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
    @include large-desktop {
      @include columns(2, $gap);
    }
  }
}
</style>
