<template>
  <el-popover :visible-arrow="false" placement="right-end" popper-class="swap-distribution-popper" trigger="click">
    <ul class="distribution">
      <li v-for="{ input, output, amount, sources } in swapPaths" :key="input.address" class="distribution-step">
        <div class="distribution-asset">
          <token-logo :token="input" size="small" />
          <span class="distribution-asset-amount">{{ amount }} {{ input.symbol }}</span>
        </div>
        <div v-if="sources.length" class="distribution-path">
          <span class="distribution-path-line"></span>
          <div class="distribution-path-sources">
            <div
              v-for="{ source, income, outcome, fiatDifference } in sources"
              :key="source"
              class="distribution-path-source"
            >
              <div class="flex-cell">
                <span>{{ source }}:</span>
                <value-status-wrapper :value="fiatDifference">
                  <formatted-amount :value="formatStringValue(fiatDifference)">%</formatted-amount>
                </value-status-wrapper>
              </div>
              <div class="flex-cell">
                <token-logo :token="input" size="mini" />{{ income }}
                &rarr;
                <token-logo :token="output" size="mini" />{{ outcome }}
              </div>
            </div>
          </div>
        </div>
      </li>
    </ul>
    <template #reference>
      <slot />
    </template>
  </el-popover>
</template>

<script lang="ts">
import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { FPNumber } from '@sora-substrate/util';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';
import { calcFiatDifference } from '@/utils/swap';

import type { Distribution } from '@sora-substrate/liquidity-proxy/build/types';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

type SwapSource = {
  income: string;
  outcome: string;
  fee: string;
  source: string;
  fiatDifference: string;
};

type SwapPath = {
  input: AccountAsset;
  amount: string;
  sources: SwapSource[];
  output?: AccountAsset;
};

const MARKETS = {
  [LiquiditySourceTypes.XYKPool]: 'XYK Pool',
  [LiquiditySourceTypes.MulticollateralBondingCurvePool]: 'TBC Pool',
  [LiquiditySourceTypes.XSTPool]: 'XST Pool',
  [LiquiditySourceTypes.OrderBook]: 'Order Book',
};

@Component({
  components: {
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
    ValueStatusWrapper: lazyComponent(Components.ValueStatusWrapper),
  },
})
export default class SwapDistribution extends Mixins(mixins.FormattedAmountMixin) {
  @state.swap.distribution private distribution!: Distribution[][];

  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<AccountAsset>;

  get swapPaths(): SwapPath[] {
    const paths: SwapPath[] = [];

    this.distribution.forEach((step, index, list) => {
      const sources: SwapSource[] = [];

      let income = FPNumber.ZERO;
      let outcome = FPNumber.ZERO;

      const input = this.getAsset(step[0].input) as AccountAsset;
      const output = this.getAsset(step[0].output) as AccountAsset;

      step.forEach((path) => {
        const amountIn = path.income;
        const amountOut = path.outcome;
        const amountInFiat = this.getFPNumberFiatAmountByFPNumber(amountIn, input) ?? FPNumber.ZERO;
        const amountOutFiat = this.getFPNumberFiatAmountByFPNumber(amountOut, output) ?? FPNumber.ZERO;
        const fiatDifference = calcFiatDifference(amountInFiat, amountOutFiat).toFixed(2);

        income = income.add(amountIn);
        outcome = outcome.add(amountOut);

        sources.push({
          income: amountIn.toLocaleString(),
          outcome: amountOut.toLocaleString(),
          fee: path.fee.toLocaleString(),
          source: MARKETS[path.market],
          fiatDifference,
        });
      });

      paths.push({ input, output, amount: income.toLocaleString(), sources });

      if (index === list.length - 1) {
        paths.push({ input: output, amount: outcome.toLocaleString(), sources: [] });
      }
    });

    return paths;
  }
}
</script>

<style lang="scss">
.swap-distribution-popper {
  @include popper-content;
}
</style>

<style lang="scss" scoped>
$path-color: var(--s-color-base-content-tertiary);

.flex-cell {
  display: inline-flex;
  align-items: center;
  gap: $inner-spacing-tiny;
}

.distribution {
  list-style-type: none;
  padding-left: 0;

  &-asset {
    display: inline-flex;
    flex-flow: row nowrap;
    align-items: center;
    gap: $inner-spacing-mini;

    border-radius: var(--s-border-radius-mini);
    background-color: $path-color;
    padding: $inner-spacing-mini;

    &-amount {
      font-weight: 500;
      font-size: var(--s-font-size-medium);
    }
  }

  &-path {
    display: flex;
    flex-flow: row nowrap;
    margin-left: $inner-spacing-mini * 2.5;

    &-line {
      border-right: 1px dashed $path-color;
    }

    &-sources {
      display: flex;
      flex-grow: 1;
      padding: $inner-spacing-medium;
      gap: $inner-spacing-medium;
    }

    &-source {
      display: flex;
      flex-grow: 1;
      align-items: center;
      justify-content: space-between;
      position: relative;
      gap: $inner-spacing-mini;

      &::before {
        content: '';
        display: block;
        width: $inner-spacing-medium;
        height: 1px;
        border-color: $path-color;
        border-style: dashed;
        border-width: 1px 0 0 0;

        position: absolute;
        margin: auto;
        top: 0;
        bottom: 0;
        left: -#{$inner-spacing-medium};
      }
    }
  }
}
</style>
