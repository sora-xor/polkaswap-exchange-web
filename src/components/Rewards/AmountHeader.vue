<template>
  <div class="amount-header">
    <template v-for="{ asset, amount } in items">
      <div :key="asset.symbol" class="amount-block">
        <formatted-amount
          class="amount-block__amount"
          :value="formatStringValue(amount, asset.decimal)"
          :font-size-rate="FontSizeRate.MEDIUM"
          :asset-symbol="asset.symbol"
          symbol-as-decimal
        />
        <formatted-amount
          :value="getFiatAmountByString(amount, asset)"
          is-fiat-value
          with-left-shift
        />
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

.amount {
  &-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

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
    font-size: var(--s-font-size-large);

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

    .formatted-amount--fiat-value {
      font-size: 0.875em;
    }
  }
}
</style>
