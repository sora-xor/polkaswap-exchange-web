<template>
  <s-card class="stats-card" border-radius="small" shadow="always" size="big" primary>
    <div class="stats-card-header">
      <div class="s-flex stats-card-title header-title">
        <slot name="title" />
      </div>
      <div v-if="$slots.filters" class="s-flex stats-card-filters">
        <slot name="filters" />
      </div>
      <div v-if="$slots.types" class="s-flex stats-card-types">
        <slot name="types" />
      </div>
    </div>

    <slot />
  </s-card>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

@Component
export default class StatsCard extends Mixins() {}
</script>

<style lang="scss" scoped>
.stats-card {
  &.s-card.neumorphic.s-size-big {
    padding: $inner-spacing-big $inner-spacing-big $inner-spacing-medium;
  }

  &-header {
    display: flex;
    flex-flow: row wrap;
    align-items: center;
    justify-content: space-between;
    gap: $inner-spacing-small;
    margin-bottom: $inner-spacing-small;
  }

  &-title {
    display: flex;
    align-items: center;
    gap: $inner-spacing-mini;
  }

  &-filters {
    order: 1;

    @include large-desktop {
      margin-left: auto;
      width: auto;
      order: initial;
    }
  }
}

.header-title {
  font-size: var(--s-font-size-medium);
  line-height: var(--s-line-height-medium);
  font-weight: 600;
}
</style>
