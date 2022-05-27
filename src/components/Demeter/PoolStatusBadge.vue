<template>
  <div :class="['pool-status-badge', { active }]">
    <s-icon :name="icon" size="12" :class="['pool-status-badge-icon', { active }]" />

    <div class="pool-status-badge-title">{{ title }}</div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component
export default class PoolStatusBadge extends Mixins(TranslationMixin) {
  @Prop({ default: false, type: Boolean }) readonly active!: boolean;

  get title(): string {
    return this.active ? 'Staking Active' : 'Start Staking';
  }

  get icon(): string {
    return this.active ? 'basic-placeholder-24' : 'printer-16';
  }
}
</script>

<style lang="scss" scoped>
.pool-status-badge {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  width: 93px;
  height: var(--s-size-small);

  padding: $inner-spacing-mini / 2 $inner-spacing-mini;
  border-radius: var(--s-border-radius-mini);

  box-shadow: 1px 1px 5px #391057, -1px -1px 5px #9b6fa5;

  background: var(--s-color-theme-accent);
  color: var(--s-color-base-on-accent);

  &.active {
    background: var(--s-color-base-on-accent);
    color: var(--s-color-base-content-primary);
  }

  &-icon {
    color: var(--s-color-base-on-accent);

    &.active {
      color: var(--s-color-status-success);
    }
  }

  &-title {
    font-size: var(--s-font-size-extra-mini);
    font-weight: 700;
    line-height: var(--s-line-height-reset);
    text-align: left;
    text-transform: uppercase;
  }

  &-icon + &-title {
    margin-left: 6px;
  }
}
</style>
