<template>
  <base-widget v-bind="$attrs" :title="t('swap.route')">
    <template v-if="swapPaths.length">
      <ul class="distribution">
        <li v-for="{ input, output, amount, sources } in swapPaths" :key="input.address" class="distribution-step">
          <div class="distribution-asset">
            <token-logo :token="input" size="small" class="distribution-asset-logo"></token-logo>
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
                  <div class="flex-cell"><token-logo :token="input" size="mini"></token-logo>{{ income }}</div>
                  &rarr;
                  <div class="flex-cell"><token-logo :token="output" size="mini"></token-logo>{{ outcome }}</div>
                </div>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </template>
    <div v-else class="distribution">
      <div class="distribution-step">
        <div class="distribution-asset">
          <template v-if="tokenFrom">
            <token-logo :token="tokenFrom" size="small" class="distribution-asset-logo"></token-logo>
            <span class="distribution-asset-amount">{{ fromValue }} {{ tokenFrom.symbol }}</span>
          </template>
        </div>
        <div class="distribution-path">
          <span class="distribution-path-line"></span>
          <div class="distribution-path-sources">
            <div class="distribution-path-source">
              <div class="flex-cell">
                <span class="distribution-skeleton distribution-skeleton--rect distribution-path-source-name"></span>
                <span class="distribution-skeleton distribution-skeleton--rect distribution-path-source-change"></span>
              </div>
              <div class="flex-cell">
                <span class="distribution-skeleton distribution-skeleton--circle"></span>
                <span class="distribution-skeleton distribution-skeleton--rect"></span>
                <span class="distribution-skeleton distribution-skeleton--circle"></span>
                <span class="distribution-skeleton distribution-skeleton--rect"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="distribution-step">
        <div class="distribution-asset">
          <template v-if="tokenTo">
            <token-logo :token="tokenTo" size="small" class="distribution-asset-logo"></token-logo>
            <span class="distribution-asset-amount">{{ toValue }} {{ tokenTo.symbol }}</span>
          </template>
        </div>
      </div>
    </div>
  </base-widget>
</template>

<script setup lang="ts">
import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { FPNumber } from '@sora-substrate/sdk';
import { components } from '@wallet';
import { computed } from 'vue';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useSwapAmounts } from '@/composables/useSwapAmounts';
import { useTranslation } from '@/composables/useTranslation';
import { Components } from '@/consts';
import { useSwapStore } from '@/stores/swap';
import { lazyComponent } from '@/router';
import { useAssetsStore } from '@/stores/assets';
import { calcFiatDifference } from '@/utils/swap';

import type { Distribution } from '@sora-substrate/liquidity-proxy/build/types';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

const BaseWidget = lazyComponent(Components.BaseWidget);
const ValueStatusWrapper = lazyComponent(Components.ValueStatusWrapper);

defineOptions({
  name: 'SwapDistributionWidget',
  components: {
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
  },
});

const MARKETS: Partial<Record<LiquiditySourceTypes, string>> = {
  [LiquiditySourceTypes.XYKPool]: 'XYK Pool',
  [LiquiditySourceTypes.MulticollateralBondingCurvePool]: 'TBC Pool',
  [LiquiditySourceTypes.XSTPool]: 'XST Pool',
  [LiquiditySourceTypes.OrderBook]: 'Order Book',
};

const { t } = useTranslation();
const { formatStringValue, getFPNumberFiatAmountByFPNumber } = useFormattedAmount();
const { tokenFrom, tokenTo, fromValue, toValue } = useSwapAmounts();
const swapStore = useSwapStore();
const assetsStore = useAssetsStore();

const distribution = computed(() => swapStore.distribution as Distribution[][]);
const getAsset = (address?: string) => assetsStore.assetDataByAddress(address) as AccountAsset;

const swapPaths = computed(() => {
  const paths: Array<{
    input: AccountAsset;
    output?: AccountAsset;
    amount: string;
    sources: Array<{
      income: string;
      outcome: string;
      source: string;
      fiatDifference: string;
    }>;
  }> = [];

  distribution.value.forEach((step, index, list) => {
    if (!step.length) return;

    const input = getAsset(step[0].input);
    const output = getAsset(step[0].output);

    let income = FPNumber.ZERO;
    let outcome = FPNumber.ZERO;
    const sources: Array<{ income: string; outcome: string; source: string; fiatDifference: string }> = [];

    step.forEach((path) => {
      const amountIn = path.income;
      const amountOut = path.outcome;
      const amountInFiat = getFPNumberFiatAmountByFPNumber(amountIn, input) ?? FPNumber.ZERO;
      const amountOutFiat = getFPNumberFiatAmountByFPNumber(amountOut, output) ?? FPNumber.ZERO;
      const fiatDifference = calcFiatDifference(amountInFiat, amountOutFiat).toFixed(2);

      income = income.add(amountIn);
      outcome = outcome.add(amountOut);

      sources.push({
        income: amountIn.toLocaleString(),
        outcome: amountOut.toLocaleString(),
        source: MARKETS[path.market] ?? path.market,
        fiatDifference,
      });
    });

    paths.push({ input, output, amount: income.toLocaleString(), sources });

    if (index === list.length - 1 && output) {
      paths.push({ input: output, amount: outcome.toLocaleString(), sources: [] });
    }
  });

  return paths;
});
</script>

<style lang="scss" scoped>
$path-color: var(--s-color-base-content-tertiary);

.flex-cell {
  display: flex;
  flex-flow: row wrap;
  align-items: center;
  gap: $inner-spacing-tiny;
  font-size: var(--s-font-size-small);
  line-height: var(--s-line-height-medium);
}

.distribution {
  // Remove inline-block whitespace between route blocks to keep spacing aligned with production layout.
  font-size: 0;
  line-height: 0;
  list-style-type: none;
  padding-left: 0;

  &-skeleton {
    display: inline-flex;
    flex-shrink: 0;
    border-radius: var(--s-border-radius-mini);
    background: linear-gradient(90deg, rgba(0, 0, 0, 0.06) 25%, rgba(0, 0, 0, 0.1) 37%, rgba(0, 0, 0, 0.06) 63%);
    background-size: 400% 100%;
    min-width: 48px;
    min-height: 16px;
    animation: ps-skeleton-loading 1.4s ease infinite;

    &--circle {
      width: 16px;
      min-width: 16px;
      height: 16px;
      min-height: 16px;
      border-radius: 50%;
    }

    &--rect {
      width: 48px;
    }
  }

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
      line-height: var(--s-line-height-medium);
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
