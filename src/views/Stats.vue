<template>
  <div class="stats-container">
    <s-card class="stats-card" border-radius="small" shadow="always" size="medium" primary> 1 </s-card>

    <s-card class="stats-card stats-card--half" border-radius="small" shadow="always" size="medium" primary> 2 </s-card>

    <s-card class="stats-card stats-card--half" border-radius="small" shadow="always" size="medium" primary> 3 </s-card>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

@Component
export default class Stats extends Mixins() {}
</script>

<style lang="scss" scoped>
$container-max-width: 989px;
$gap: $inner-spacing-medium;

.stats-container {
  display: flex;
  flex-flow: row wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: $gap;
  max-width: $container-max-width;
  margin: $inner-spacing-big $inner-spacing-big 0;
}

.stats-card {
  width: 100%;
  min-width: calc(#{$inner-window-width} * 0.75);

  &--half {
    @include tablet {
      max-width: calc(50% - (#{$gap} / 2));
    }
  }
}
</style>
