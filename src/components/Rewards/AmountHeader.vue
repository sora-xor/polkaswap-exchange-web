<template>
  <div class="amount-header">
    <template v-for="({ asset, amount, symbol }, index) in items">
      <div :key="symbol" class="amount-block">
        <formatted-amount
          class="amount-block__amount"
          :value="formatStringValue(amount, asset.decimal)"
          :font-size-rate="FontSizeRate.MEDIUM"
          :asset-symbol="symbol"
          symbol-as-decimal
        />
        <formatted-amount
          :value="getFiatAmountByString(amount, asset)"
          is-fiat-value
          with-left-shift
        />
      </div>
      <div v-if="items.length - 1 !== index" class="amount-header-divider" :key="index">
        <s-divider direction="vertical" class="amount-header-divider__slash" />
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { FormattedAmountMixin, FormattedAmount, FontSizeRate } from '@soramitsu/soraneo-wallet-web'

import { RewardsAmountHeaderItem } from '@/types/rewards'

@Component({
  components: {
    FormattedAmount
  }
})
export default class AmountHeader extends Mixins(FormattedAmountMixin) {
  readonly FontSizeRate = FontSizeRate

  @Prop({ default: () => [], type: Array }) items!: Array<RewardsAmountHeaderItem>
}
</script>

<style lang="scss" scoped>
$amount-font-size: 24px;
$amount-line-height: 20px;
$divider-width: 12px;
$divider-height: 20px;

.amount {
  &-header {
    display: flex;
    flex-wrap: wrap;
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
    .formatted-amount {
      flex-wrap: wrap;
      justify-content: center;
    }
  }

  &-block {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    justify-content: center;
    line-height: $amount-line-height;
    text-align: center;

    &:first-child:not(:last-child) {
      text-align: right;
    }

    &:last-child:not(:first-child) {
      text-align: left;
    }

    &__amount,
    .formatted-amount--fiat-value {
      font-weight: 700;
      letter-spacing: var(--s-letter-spacing-small);
    }

    &__amount {
      font-size: var(--s-font-size-large);
    }

    .formatted-amount--fiat-value {
      font-size: calc(var(--s-font-size-large) * 0.875);
    }
  }
}
</style>
