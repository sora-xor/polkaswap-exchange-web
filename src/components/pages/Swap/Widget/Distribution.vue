<template>
  <base-widget :title="t('swap.route')">
    <s-skeleton :loading="!swapPaths.length">
      <template #template>
        <div class="distribution">
          <div class="distribution-step">
            <div class="distribution-asset">
              <template v-if="tokenFrom">
                <token-logo :token="tokenFrom" size="small" class="distribution-asset-logo" />
                <span class="distribution-asset-amount">{{ fromValue }} {{ tokenFrom.symbol }}</span>
              </template>
            </div>
            <div class="distribution-path">
              <span class="distribution-path-line"></span>
              <div class="distribution-path-sources">
                <div class="distribution-path-source">
                  <div class="flex-cell">
                    <s-skeleton-item element="rect" class="distribution-path-source-name" />
                    <s-skeleton-item element="rect" class="distribution-path-source-change" />
                  </div>
                  <div class="flex-cell">
                    <s-skeleton-item element="circle" />
                    <s-skeleton-item element="rect" />
                    <s-skeleton-item element="circle" />
                    <s-skeleton-item element="rect" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="distribution-step">
            <div class="distribution-asset">
              <template v-if="tokenTo">
                <token-logo :token="tokenTo" size="small" class="distribution-asset-logo" />
                <span class="distribution-asset-amount">{{ toValue }} {{ tokenTo.symbol }}</span>
              </template>
            </div>
          </div>
        </div>
      </template>

      <ul class="distribution">
        <li v-for="{ input, output, amount, sources } in swapPaths" :key="input.address" class="distribution-step">
          <div class="distribution-asset">
            <token-logo :token="input" size="small" class="distribution-asset-logo" />
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
                  <span class="distribution-path-source-name">{{ source }}:</span>
                  <value-status-wrapper :value="fiatDifference" class="distribution-path-source-change">
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
    </s-skeleton>
  </base-widget>
</template>

<script lang="ts">
import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { FPNumber } from '@sora-substrate/util';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { SSkeleton, SSkeletonItem } from '@soramitsu-ui/ui-vue2/lib/components/Skeleton';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
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
    SSkeleton,
    SSkeletonItem,
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
    BaseWidget: lazyComponent(Components.BaseWidget),
    ValueStatusWrapper: lazyComponent(Components.ValueStatusWrapper),
  },
})
export default class SwapDistributionWidget extends Mixins(mixins.FormattedAmountMixin, TranslationMixin) {
  @state.swap.distribution private distribution!: Distribution[][];
  @state.swap.fromValue fromValue!: string;
  @state.swap.toValue toValue!: string;

  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<AccountAsset>;
  @getter.swap.tokenFrom tokenFrom!: Nullable<AccountAsset>;
  @getter.swap.tokenTo tokenTo!: Nullable<AccountAsset>;

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
.s-skeleton .distribution {
  .el-skeleton__item {
    display: inline-flex;
    flex-shrink: 0;
    width: initial;

    &:not(:last-child) {
      margin-bottom: 0;
    }

    &.el-skeleton__circle {
      width: 16px;
      height: 16px;
    }
    &.el-skeleton__rect {
      min-width: 48px;
      min-height: 16px;
    }
  }
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

    min-height: 40px;
    min-width: 120px;

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
      flex-flow: column nowrap;
      flex-grow: 1;
      padding: $inner-spacing-medium 0 $inner-spacing-medium $inner-spacing-medium;
      gap: $inner-spacing-medium;
    }

    &-source {
      display: flex;
      flex-flow: row wrap;
      flex-grow: 1;
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

      &-name {
        &.el-skeleton__item {
          height: 16px;
          width: 64px;
        }
      }
    }
  }
}
</style>
