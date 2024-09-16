<template>
  <div class="stats-filter">
    <s-button type="link" size="small" class="stats-filter-button" @click="openMenu" :disabled="disabled">
      {{ filter.label }}
      <s-icon name="el-icon-arrow-down" size="12px" class="stats-filter-button-icon" />
    </s-button>
    <div v-show="visibility" class="stats-filter-menu stats-filter-list">
      <s-button
        v-for="{ name, label } in filters"
        :key="name"
        type="link"
        size="small"
        :class="['stats-filter-list-item', { 's-pressed': name === filter.name }]"
        @click="setValue(name)"
      >
        {{ label }}
      </s-button>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop, ModelSync } from 'vue-property-decorator';

import type { SnapshotFilter } from '@/types/filters';

@Component
export default class StatsFilter extends Mixins() {
  @Prop({ default: () => [], type: Array }) readonly filters!: SnapshotFilter[];
  @Prop({ default: false, type: Boolean }) readonly disabled!: boolean;

  @ModelSync('value', 'input', { type: Object })
  filter!: SnapshotFilter;

  visibility = false;

  beforeDestroy(): void {
    this.closeMenu();
  }

  openMenu(): void {
    this.visibility = true;
    this.$el.ownerDocument.addEventListener('click', this.handleClickOutside);
  }

  closeMenu(): void {
    this.visibility = false;
    this.$el.ownerDocument.removeEventListener('click', this.handleClickOutside);
  }

  handleClickOutside(e: Event): void {
    const target = e.target as any;
    const menu = !!target.closest('.stats-filter');

    if (!menu) {
      this.closeMenu();
    }
  }

  setValue(name: string): void {
    const filter = this.getFilter(name);

    if (filter) {
      this.filter = filter;
      this.closeMenu();
    }
  }

  private getFilter(name: string): Nullable<SnapshotFilter> {
    return this.filters.find((item) => item.name === name);
  }
}
</script>

<style lang="scss" scoped>
$gap: $inner-spacing-mini;

.stats-filter {
  position: relative;

  &-button {
    &-icon {
      margin-left: $inner-spacing-tiny;
    }
  }

  &-menu {
    position: absolute;
    z-index: 10;
    top: 100%;
    left: 50%;
    transform: translate(-50%, 10px);
  }

  &-list {
    background: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-dialog);
    border-radius: $inner-spacing-small;
    width: 240px;
    padding: $gap;
    display: flex;
    flex-flow: row wrap;
    gap: $gap;

    &-item {
      @include columns(3, $gap);
    }
  }
}
</style>
