<template>
  <div :class="classes">
    <s-icon class="price-change-arrow" :name="icon" size="14px" />
    <span>{{ formatted }}%</span>
  </div>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class PriceChange extends Vue {
  @Prop({ default: FPNumber.ZERO, type: Object }) readonly value!: FPNumber;

  get increased(): boolean {
    return FPNumber.gte(this.value, FPNumber.ZERO);
  }

  get icon(): string {
    return `arrows-arrow-bold-${this.increased ? 'top' : 'bottom'}-24`;
  }

  get classes(): Array<string> {
    const baseClass = 'price-change';
    const cssClasses: Array<string> = [baseClass];
    if (this.increased) {
      cssClasses.push(`${baseClass}--increased`);
    }
    return cssClasses;
  }

  get formatted(): string {
    return this.value.dp(2).toLocaleString();
  }
}
</script>

<style lang="scss" scoped>
.price-change {
  color: var(--s-color-theme-accent);
  font-size: var(--s-font-size-medium);
  font-weight: 600;
  letter-spacing: var(--s-letter-spacing-small);
  line-height: var(--s-line-height-medium);

  &--increased {
    color: var(--s-color-status-success);
  }

  &-arrow {
    color: inherit;
  }
}
</style>
