<template>
  <div class="amount-header">
    <template v-for="({ amount, symbol }, index) in items">
      <div :key="symbol" class="amount-block">
        <div class="amount-block__amount">{{ amount || '-' }}</div>
        <div class="amount-block__symbol">{{ symbol }}</div>
      </div>
      <div v-if="items.length - 1 !== index" class="amount-header-divider" :key="index">
        <s-divider direction="vertical" class="amount-header-divider__slash" />
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'

import { RewardsAmountHeaderItem } from '@/types/rewards'

@Component
export default class AmountHeader extends Vue {
  @Prop({ default: () => [], type: Array }) items!: Array<RewardsAmountHeaderItem>
}
</script>

<style lang="scss" scoped>
$amount-font-size: 20px;
$divider-width: 12px;
$divider-height: 40px;

.amount {
  &-header {
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    justify-content: center;

    &-divider {
      display: flex;
      justify-content: center;
      margin: 0 $inner-spacing-mini;
      width: $divider-width;

      &__slash {
        width: 1px;
        height: $divider-height;
        margin: 0;
        background: var(--s-color-base-on-accent);
        opacity: 0.5;
        transform: rotate(15deg)
      }
    }
  }

  &-block {
    flex: 1;
    color: var(--s-color-base-on-accent);
    text-align: center;

    &:first-child:not(:last-child) {
      text-align: right;
    }

    &:last-child:not(:first-child) {
      text-align: left;
    }

    &__amount {
      font-size: $amount-font-size;
      font-weight: $s-font-weight-big;
      line-height: $s-line-height-medium;
      letter-spacing: $s-letter-spacing-big;
    }

    &__symbol {
      font-size: var(--s-font-size-small);
      line-height: $s-line-height-base;
    }
  }
}
</style>
