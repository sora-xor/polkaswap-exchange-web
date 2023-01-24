<template>
  <div class="stats-container">
    <stats-card class="grid-item">
      <template #title>Network statistics</template>

      <div class="stats-row">
        <div class="stats-column">
          <s-card size="small" border-radius="mini">
            <div slot="header" class="stats-card-title">TRANSACTIONS</div>
            <div class="stats-card-data">
              <span>873.060K</span>
            </div>
          </s-card>
        </div>
        <div class="stats-column">
          <div class="stats-column-title">TRANSACTIONS</div>
          <div class="stats-column-data">
            <span>873.060K</span>
          </div>
        </div>
        <div class="stats-column">
          <div class="stats-column-title">TRANSACTIONS</div>
          <div class="stats-column-data">
            <span>873.060K</span>
          </div>
        </div>
        <div class="stats-column">
          <div class="stats-column-title">TRANSACTIONS</div>
          <div class="stats-column-data">
            <span>873.060K</span>
          </div>
        </div>
        <div class="stats-column">
          <div class="stats-column-title">TRANSACTIONS</div>
          <div class="stats-column-data">
            <span>873.060K</span>
          </div>
        </div>
      </div>
    </stats-card>

    <stats-card class="grid-item grid-item--50">
      <template #title>TVL</template>
    </stats-card>

    <stats-card class="grid-item grid-item--50">
      <template #title>Volume</template>
    </stats-card>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';

@Component({
  components: {
    StatsCard: lazyComponent(Components.StatsCard),
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
      max-width: calc(50% - (#{$gap} / 2));
    }
  }
}

.stats-row {
  display: flex;
  flex-flow: row wrap;
  gap: $inner-spacing-mini;

  .stats-column {
    width: calc(20% - ((#{$inner-spacing-mini} * 4) / 5));
    min-width: 180px;
  }
}

.stats-card {
  &-title {
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-small);
    font-weight: 800;
  }
}
</style>
