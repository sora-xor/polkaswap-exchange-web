<template>
  <el-popover :visible-arrow="false" placement="right-end" popper-class="swap-distribution-popper" trigger="hover">
    <ul class="distribution">
      <li v-for="{ asset, amount, sources } in swapPaths" :key="asset.address" class="distribution-step">
        <div class="distribution-path">
          <span v-if="sources.length" class="distribution-path-line"></span>
          <token-logo :token="asset" size="small" />
        </div>
        <div class="distribution-asset">
          <table v-if="sources.length" class="distribution-sources">
            <tr v-for="{ source, input, output, income, outcome } in sources" :key="source">
              <td>{{ source }}:</td>
              <td>{{ income }} {{ input }}</td>
              <td>&rarr;</td>
              <td>{{ outcome }} {{ output }}</td>
            </tr>
          </table>
          <span class="distribution-amount">{{ amount }} {{ asset.symbol }}</span>
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
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Vue } from 'vue-property-decorator';

import { MarketAlgorithms } from '@/consts';
import { getter, state } from '@/store/decorators';

import type { Distribution } from '@sora-substrate/liquidity-proxy/build/types';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

type SwapSource = {
  source: string;
  input: string;
  output: string;
  income: string;
  outcome: string;
  fee: string;
};

type SwapPath = {
  asset: AccountAsset;
  amount: string;
  sources: SwapSource[];
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
  },
})
export default class SwapDistribution extends Vue {
  @state.swap.distribution private distribution!: Distribution[][];

  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<AccountAsset>;

  get swapPaths(): SwapPath[] {
    const paths: SwapPath[] = [];

    this.distribution.forEach((step, index) => {
      const sources: SwapSource[] = [];

      let income = FPNumber.ZERO;
      let outcome = FPNumber.ZERO;

      const input = this.getAsset(step[0].input) as AccountAsset;
      const output = this.getAsset(step[0].output) as AccountAsset;

      step.forEach((path) => {
        income = income.add(path.income);
        outcome = outcome.add(path.outcome);

        sources.push({
          source: MARKETS[path.market],
          input: input.symbol,
          output: output.symbol,
          income: path.income.toLocaleString(),
          outcome: path.outcome.toLocaleString(),
          fee: path.fee.toLocaleString(),
        });
      });

      if (index === 0) {
        paths.push({ asset: input, amount: income.toLocaleString(), sources: [] });
      }

      paths.push({ asset: output, amount: outcome.toLocaleString(), sources });
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
.distribution {
  display: flex;
  flex-flow: column nowrap;
  list-style-type: none;
  padding-left: 0;

  &-step {
    display: flex;
    flex-flow: row nowrap;
    gap: $inner-spacing-mini;
  }

  &-path {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;

    &-line {
      display: flex;
      flex-grow: 1;
      border: 1px dashed var(--s-color-base-content-primary);
    }
  }

  &-asset {
    display: flex;
    flex-flow: column nowrap;
    align-items: flex-start;
  }

  &-amount {
    font-weight: 600;
    margin-bottom: 2px;
  }

  &-sources {
    font-size: var(--s-font-size-extra-mini);
  }
}
</style>
