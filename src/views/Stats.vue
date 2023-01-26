<template>
  <div class="stats-container">
    <network-stats class="grid-item" />

    <network-tvl-chart class="grid-item grid-item--50" />

    <div class="grid-item grid-item--50">Volume</div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';

@Component({
  components: {
    NetworkStats: lazyComponent(Components.NetworkStats),
    NetworkTvlChart: lazyComponent(Components.NetworkTvlChart),
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
    @include tablet {
      @include columns(2, $gap);
    }
  }
}
</style>
