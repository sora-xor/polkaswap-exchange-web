<template>
  <s-tabs class="stats-filters" type="rounded" v-model="model">
    <s-tab v-for="{ name, label } in filters" :key="name" :name="name" :label="label" :disabled="disabled" />
  </s-tabs>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';

import type { SnapshotFilter } from '@/types/filters';

@Component
export default class StatsFilter extends Mixins() {
  @Prop({ default: () => null, type: Object }) readonly value!: SnapshotFilter;
  @Prop({ default: () => [], type: Array }) readonly filters!: SnapshotFilter[];
  @Prop({ default: false, type: Boolean }) readonly disabled!: boolean;

  get model(): string {
    return this.value?.name ?? '';
  }

  set model(name: string) {
    const filter = this.filters.find((item) => item.name === name);

    if (filter) {
      this.$emit('input', filter);
    }
  }
}
</script>

<style lang="scss">
.stats-filters {
  .el-tabs__header {
    margin-bottom: 0;
  }

  &.s-tabs.s-rounded .el-tabs__nav-wrap .el-tabs__item {
    padding: 0 $inner-spacing-mini;
    text-transform: initial;
    &:not(.is-active).is-disabled {
      color: var(--s-color-base-content-primary);
    }
    &.is-disabled {
      cursor: not-allowed;
    }
  }
}
</style>
