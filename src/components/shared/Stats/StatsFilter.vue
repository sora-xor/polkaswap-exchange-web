<template>
  <responsive-tabs
    :is-mobile="isMobile"
    :tabs="filters"
    v-model="model"
    :disabled="disabled"
    size="small"
    class="stats-filters"
  />
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import type { SnapshotFilter } from '@/types/filters';

@Component({
  components: {
    ResponsiveTabs: lazyComponent(Components.ResponsiveTabs),
  },
})
export default class StatsFilter extends Mixins() {
  @Prop({ default: () => null, type: Object }) readonly value!: SnapshotFilter;
  @Prop({ default: () => [], type: Array }) readonly filters!: SnapshotFilter[];
  @Prop({ default: false, type: Boolean }) readonly isMobile!: boolean;
  @Prop({ default: false, type: Boolean }) readonly disabled!: boolean;

  get model(): string {
    return this.value?.name ?? '';
  }

  set model(name: string) {
    const filter = this.getFilter(name);

    if (filter) {
      this.$emit('input', filter);
    }
  }

  private getFilter(name: string): Nullable<SnapshotFilter> {
    return this.filters.find((item) => item.name === name);
  }
}
</script>
