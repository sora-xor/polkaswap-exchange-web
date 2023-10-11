<template>
  <el-popover :visible-arrow="false" placement="top-start" popper-class="swap-distribution" trigger="click">
    <ol class="distribution">
      <li v-for="(step, index) in paths" :key="index">
        <ul>
          <li v-for="{ input, output, income, outcome, market } in step" :key="market">
            <p>{{ market }}</p>
            <p>{{ income }} {{ input }} -> {{ outcome }} {{ output }}</p>
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
import { Component, Vue } from 'vue-property-decorator';

import { getter, state } from '@/store/decorators';

import type { Distribution } from '@sora-substrate/liquidity-proxy/build/types';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

type Path = {
  source: string;
  input: string;
  output: string;
  income: string;
  outcome: string;
  fee: string;
};

@Component
export default class SwapDistribution extends Vue {
  @state.swap.distribution private distribution!: Distribution[][];

  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<AccountAsset>;

  get paths(): Path[][] {
    return this.distribution.map((step) => {
      return step.map((path) => {
        const input = this.getAsset(path.input)?.symbol ?? '?';
        const output = this.getAsset(path.output)?.symbol ?? '?';
        const income = path.income.toLocaleString();
        const outcome = path.outcome.toLocaleString();
        const fee = path.fee.toLocaleString();

        return {
          source: path.market,
          input,
          output,
          income,
          outcome,
          fee,
        };
      });
    });
  }
}
</script>
