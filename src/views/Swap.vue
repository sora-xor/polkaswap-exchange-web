<template>
  <div>
    <div class="controls s-flex" style="gap: 16px; justify-content: space-between">
      <div class="s-flex">
        <s-checkbox v-model="draggable" label="Draggable" />
        <s-checkbox v-model="resizable" label="Resizable" />
        <s-checkbox v-model="compact" label="Compact" />
      </div>
      <div class="s-flex">
        <s-checkbox v-model="chart" label="Chart" />
        <s-checkbox v-model="transactions" label="Transactions" />
        <s-checkbox v-model="distribution" label="Route" />
      </div>
    </div>
    <widgets-grid
      :draggable="draggable"
      :resizable="resizable"
      :compact="compact"
      :layouts="layouts"
      class="swap-container"
    >
      <template v-slot="{ id, resize }">
        <template v-if="id === 'form'">
          <swap-form-widget :parent-loading="parentLoading" @resize="resize" />
        </template>
        <template v-else-if="id === 'chart'">
          <swap-chart-widget full :parent-loading="parentLoading" v-if="chartsEnabled" />
        </template>
        <template v-else-if="id === 'distribution'">
          <swap-distribution-widget :parent-loading="parentLoading" @resize="resize" />
        </template>
        <template v-else-if="id === 'transactions'">
          <swap-transactions-widget full :parent-loading="parentLoading" />
        </template>
      </template>
    </widgets-grid>
  </div>
</template>

<script lang="ts">
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import SelectedTokenRouteMixin from '@/components/mixins/SelectedTokensRouteMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, PageNames } from '@/consts';
import { lazyComponent } from '@/router';
import { action, getter, state } from '@/store/decorators';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    SwapFormWidget: lazyComponent(Components.SwapFormWidget),
    SwapChartWidget: lazyComponent(Components.SwapChartWidget),
    SwapTransactionsWidget: lazyComponent(Components.SwapTransactionsWidget),
    WidgetsGrid: lazyComponent(Components.WidgetsGrid),
    SwapDistributionWidget: lazyComponent(Components.SwapDistributionWidget),
  },
})
export default class Swap extends Mixins(mixins.LoadingMixin, TranslationMixin, SelectedTokenRouteMixin) {
  @state.swap.isAvailable isAvailable!: boolean;
  @state.router.prev private prevRoute!: Nullable<PageNames>;

  @getter.settings.chartsEnabled chartsEnabled!: boolean;
  @getter.swap.tokenFrom tokenFrom!: Nullable<AccountAsset>;
  @getter.swap.tokenTo tokenTo!: Nullable<AccountAsset>;

  @action.swap.setTokenFromAddress private setTokenFromAddress!: (address?: string) => Promise<void>;
  @action.swap.setTokenToAddress private setTokenToAddress!: (address?: string) => Promise<void>;

  draggable = false;
  resizable = false;
  compact = false;

  form = true;
  chart = true;
  transactions = true;
  distribution = true;

  get layouts() {
    const lg = [];
    const sm = [];

    if (this.form) {
      lg.push({ x: 0, y: 0, w: 6, h: 20, i: 'form' });
      sm.push({ x: 0, y: 0, w: 4, h: 20, i: 'form' });
    }

    if (this.chart) {
      lg.push({ x: 6, y: 0, w: 12, h: 20, i: 'chart' });
      sm.push({ x: 4, y: 0, w: 8, h: 20, i: 'chart' });
    }

    if (this.transactions) {
      lg.push({ x: 18, y: 0, w: 6, h: 24, i: 'transactions' });
      sm.push({ x: 4, y: 20, w: 6, h: 24, i: 'transactions' });
    }

    if (this.distribution) {
      lg.push({ x: 0, y: 20, w: 6, h: 6, i: 'distribution' });
      sm.push({ x: 0, y: 20, w: 4, h: 12, i: 'distribution' });
    }

    return {
      lg,
      sm,
    };
  }

  @Watch('tokenFrom')
  @Watch('tokenTo')
  private updateRouteTokensParams() {
    this.updateRouteAfterSelectTokens(this.tokenFrom, this.tokenTo);
  }

  created(): void {
    this.withApi(async () => {
      this.parseCurrentRoute();
      // Need to wait the previous page beforeDestroy somehow to set the route params
      // TODO: [STEFAN]: add the core logic for each component using common Mixin + vuex router module
      if (this.tokenFrom && this.tokenTo && this.prevRoute !== PageNames.OrderBook) {
        this.updateRouteAfterSelectTokens(this.tokenFrom, this.tokenTo);
      } else if (this.isValidRoute && this.firstRouteAddress && this.secondRouteAddress) {
        await this.setData({
          firstAddress: this.firstRouteAddress,
          secondAddress: this.secondRouteAddress,
        });
      } else if (!this.tokenFrom) {
        await this.setData({
          firstAddress: XOR.address,
          secondAddress: '',
        });
      }
    });
  }

  /** Overrides SelectedTokenRouteMixin */
  async setData(params: { firstAddress: string; secondAddress: string }): Promise<void> {
    await this.setTokenFromAddress(params.firstAddress);
    await this.setTokenToAddress(params.secondAddress);
  }
}
</script>
