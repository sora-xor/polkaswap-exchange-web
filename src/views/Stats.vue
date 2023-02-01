<template>
  <div class="stats-container">
    <stats-network-stats class="grid-item" />

    <stats-tvl-chart class="grid-item grid-item--50" />

    <stats-bar-chart class="grid-item grid-item--50" />

    <stats-bar-chart class="grid-item grid-item--50" fees />

    <stats-supply-chart class="grid-item grid-item--50" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

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
export default class Stats extends Mixins() {}
</script>

<style lang="scss" scoped>
$container-max-width: 989px;
$gap: $inner-spacing-medium;

.stats-container {
  width: 75vw;
  max-width: $container-max-width;
  margin: auto;

  display: flex;
  flex-flow: row wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: $gap;
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
