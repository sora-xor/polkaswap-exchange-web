<template>
  <div class="stats-container">
    <stats-network-stats class="grid-item" :parent-loading="parentLoading" pip-disabled></stats-network-stats>

    <stats-tvl-chart class="grid-item grid-item--50" :parent-loading="parentLoading" pip-disabled></stats-tvl-chart>

    <stats-bar-chart class="grid-item grid-item--50" :parent-loading="parentLoading" pip-disabled></stats-bar-chart>

    <stats-bar-chart
      class="grid-item grid-item--50"
      fees
      :parent-loading="parentLoading"
      pip-disabled
    ></stats-bar-chart>

    <supply-chart-widget
      class="grid-item grid-item--50"
      :parent-loading="parentLoading"
      pip-disabled
    ></supply-chart-widget>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import SupplyChartWidget from '@/components/shared/Widget/SupplyChart.vue';
import StatsBarChart from '@/components/pages/Stats/BarChart.vue';
import StatsNetworkStats from '@/components/pages/Stats/NetworkStats.vue';
import StatsTvlChart from '@/components/pages/Stats/TvlChart.vue';

defineOptions({
  name: 'StatsPage',
});

const props = withDefaults(defineProps<{ parentLoading?: boolean }>(), { parentLoading: false });

const parentLoading = computed(() => props.parentLoading);
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
