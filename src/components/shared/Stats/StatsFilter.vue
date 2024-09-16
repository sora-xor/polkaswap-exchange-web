<template>
  <div class="stats-filter">
    <s-button type="link" size="small" class="stats-filter-button" @click="toggleMenu" :disabled="disabled">
      {{ filter.label }}
      <s-icon name="el-icon-arrow-down" size="12px" :class="['stats-filter-button-icon', { opened: visibility }]" />
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
import { Component, Mixins, Prop, ModelSync, Watch } from 'vue-property-decorator';

import type { SnapshotFilter } from '@/types/filters';

function hasParentEl(target: Node, el: Node) {
  if (target === el) return true;
  if (!target.parentNode) return false;

  return hasParentEl(target.parentNode, el);
}

@Component
export default class StatsFilter extends Mixins() {
  @Prop({ default: () => [], type: Array }) readonly filters!: SnapshotFilter[];
  @Prop({ default: false, type: Boolean }) readonly disabled!: boolean;

  @ModelSync('value', 'input', { type: Object })
  filter!: SnapshotFilter;

  visibility = false;

  @Watch('visibility')
  private toggleListener(value: boolean): void {
    if (value) {
      this.addListener();
    } else {
      this.removeListener();
    }
  }

  private addListener(): void {
    this.$el.ownerDocument.addEventListener('click', this.handleClickOutside);
  }

  private removeListener(): void {
    this.$el.ownerDocument.removeEventListener('click', this.handleClickOutside);
  }

  beforeDestroy(): void {
    this.removeListener();
  }

  toggleMenu(): void {
    this.visibility = !this.visibility;
  }

  openMenu(): void {
    this.visibility = true;
  }

  closeMenu(): void {
    this.visibility = false;
  }

  handleClickOutside(e: Event): void {
    const target = e.target as Node;
    const isMenu = hasParentEl(target, this.$el);

    if (!isMenu) {
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

      &.opened {
        transform: rotate(180deg);
      }
    }
  }

  &-menu {
    position: absolute;
    z-index: 10;
    top: 100%;
    left: 100%;
    transform: translate(-100%, 10px);
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
