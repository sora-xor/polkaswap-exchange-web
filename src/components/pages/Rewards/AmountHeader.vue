<template>
  <div class="amount-header">
    <div v-for="{ asset, amount } in items" :key="asset.symbol" class="amount-block">
      <formatted-amount
        class="amount-block__amount"
        symbol-as-decimal
        value-can-be-hidden
        :value="formatStringValue(amount, asset.decimals)"
        :font-size-rate="FontSizeRate.MEDIUM"
        :asset-symbol="asset.symbol"
      />
    </div>
    <formatted-amount v-if="totalFiatValue" is-fiat-value value-can-be-hidden :value="totalFiatValue" />
  </div>
</template>

<script lang="ts">
import { mixins, components, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import { RewardsAmountHeaderItem } from '@/types/rewards';

import type { FPNumber } from '@sora-substrate/math';
import type { Asset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
  },
})
export default class RewardsAmountHeader extends Mixins(mixins.FormattedAmountMixin, mixins.NumberFormatterMixin) {
  readonly FontSizeRate = WALLET_CONSTS.FontSizeRate;

  @Prop({ default: () => [], type: Array }) items!: Array<RewardsAmountHeaderItem>;

  get totalFiatValue(): Nullable<string> {
    const value = this.items.reduce<Nullable<FPNumber>>((result, item) => {
      if (!item.amount || !item.asset) return result;

      const fpAmount = this.getFPNumber(item.amount);

      if (!fpAmount) return result;

      const fpFiatAmount = this.getFPNumberFiatAmountByFPNumber(fpAmount, item.asset as Asset);

      if (fpFiatAmount) {
        if (!result) {
          result = this.Zero;
        }
        return result.add(fpFiatAmount);
      } else {
        return result;
      }
    }, null);

    return value?.toLocaleString();
  }
}
</script>

<style lang="scss">
.amount {
  &-header {
    .formatted-amount__container {
      justify-content: center;
      text-align: center;
    }
  }

  &-block {
    &__amount,
    .formatted-amount--fiat-value {
      font-weight: 700;
    }

    .formatted-amount--fiat-value {
      font-size: 0.875em;
    }
  }
}
</style>

<style lang="scss" scoped>
$amount-line-height: 20px;

.amount {
  &-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
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
  }
}
</style>
