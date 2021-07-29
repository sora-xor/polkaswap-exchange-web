<template>
  <div class="amount-header">
    <template v-for="({ amount, symbol }, index) in items">
      <div :key="symbol" class="amount-block">
        <formatted-amount class="amount-block__amount" :value="amount" :asset-symbol="symbol" />
      </div>
      <formatted-amount
        v-if="getAssetFiatPrice(getAsset(symbol))"
        :key="symbol"
        :value="getFiatAmount(amount, getAsset(symbol))"
        is-fiat-value
      />
      <div v-if="items.length - 1 !== index" class="amount-header-divider" :key="index">
        <s-divider direction="vertical" class="amount-header-divider__slash" />
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { FormattedAmountMixin, FormattedAmount } from '@soramitsu/soraneo-wallet-web'
import { KnownAssets } from '@sora-substrate/util'

import { RewardsAmountHeaderItem } from '@/types/rewards'

@Component({
  components: {
    FormattedAmount
  }
})
export default class AmountHeader extends Mixins(FormattedAmountMixin) {
  @Prop({ default: () => [], type: Array }) items!: Array<RewardsAmountHeaderItem>

  getAsset (symbol: string): Nullable<any> {
    const asset = KnownAssets.get(symbol)
    return asset?.address ? this.whitelist[asset.address] : null
  }
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
    display: flex;
    flex-flow: row nowrap;
    align-items: baseline;
    line-height: $amount-line-height

    &:first-child:not(:last-child) {
      text-align: right;
    }

    &:last-child:not(:first-child) {
      text-align: left;
    }

    &__amount {
      font-size: var(--s-font-size-large);
      font-weight: 700;
      letter-spacing: var(--s-letter-spacing-big);
    }

    &__symbol {
      font-size: var(--s-font-size-big);
      font-weight: 600;
    }
  }
}
</style>
