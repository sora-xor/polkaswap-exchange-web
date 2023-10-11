<template>
  <el-popover :visible-arrow="false" placement="top-start" popper-class="swap-distribution" trigger="click">
    <ol class="distribution">
      <li v-for="({ input, output, income, outcome, sources }, index) in swapPaths" :key="index">
        <p>{{ income }} {{ input }} -> {{ outcome }} {{ output }}</p>
        <ul>
          <li v-for="{ source, income, outcome, fee } in sources" :key="source">
            <table>
              <tr>
                <td colspan="3">{{ source }}</td>
              </tr>
              <tr>
                <td>I:</td>
                <td>{{ income }}</td>
                <td>{{ input }}</td>
              </tr>
              <tr>
                <td>O:</td>
                <td>{{ outcome }}</td>
                <td>{{ output }}</td>
              </tr>
              <tr>
                <td>Fee:</td>
                <td>{{ fee }}</td>
                <td>XOR</td>
              </tr>
            </table>
          </li>
        </ul>
      </li>
    </ol>
    <template #reference>
      <slot />
    </template>
  </el-popover>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
import { Component, Vue } from 'vue-property-decorator';

import { getter, state } from '@/store/decorators';

import type { Distribution } from '@sora-substrate/liquidity-proxy/build/types';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

type SwapSource = {
  source: string;
  income: string;
  outcome: string;
  fee: string;
};

type SwapPath = {
  input: string;
  output: string;
  income: string;
  outcome: string;
  sources: SwapSource[];
};

@Component
export default class SwapDistribution extends Vue {
  @state.swap.distribution private distribution!: Distribution[][];

  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<AccountAsset>;

  get swapPaths(): SwapPath[] {
    return this.distribution.map((step) => {
      let stepIncome = FPNumber.ZERO;
      let stepOutcome = FPNumber.ZERO;

      const input = this.getAsset(step[0].input)?.symbol ?? '?';
      const output = this.getAsset(step[0].output)?.symbol ?? '?';

      const sources = step.map((path) => {
        stepIncome = stepIncome.add(path.income);
        stepOutcome = stepOutcome.add(path.outcome);

        return {
          source: path.market,
          income: path.income.toLocaleString(),
          outcome: path.outcome.toLocaleString(),
          fee: path.fee.toLocaleString(),
        };
      });

      return {
        input,
        output,
        income: stepIncome.toLocaleString(),
        outcome: stepOutcome.toLocaleString(),
        sources,
      };
    });
  }
}
</script>
