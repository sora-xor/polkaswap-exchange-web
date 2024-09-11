<template>
  <div :class="['gradient-box', symbolClass]">
    <slot />
  </div>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator';

import type { KnownSymbols } from '@sora-substrate/sdk/build/assets/consts';

@Component
export default class RewardsGradientBox extends Vue {
  @Prop({ default: '', type: String }) symbol!: KnownSymbols;

  get symbolClass(): string {
    if (!this.symbol) return '';

    return `gradient-box--${this.symbol.toLowerCase()}`;
  }
}
</script>

<style lang="scss" scoped>
.gradient-box {
  padding: $inner-spacing-medium * 2 $inner-spacing-medium $inner-spacing-medium * 1.5;
  border-radius: var(--s-border-radius-medium);
  background: linear-gradient(101.79deg, #e81860 8.64%, #f89b29 93.47%);
  display: flex;
  flex-flow: column nowrap;

  &--pswap {
    background: linear-gradient(110.38deg, #e81860 13.54%, #6453c1 86.15%);
  }

  &--val {
    background: linear-gradient(110.38deg, #c8ac5f 13.54%, #967e2c 86.15%);
  }
}
</style>
