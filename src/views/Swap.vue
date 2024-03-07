<template>
  <widgets-grid :layouts="layouts" class="swap-container" draggable resizable>
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

  layouts = {
    lg: [
      { x: 0, y: 0, w: 6, h: 20, i: 'form' },
      { x: 6, y: 0, w: 12, h: 20, i: 'chart' },
      { x: 18, y: 0, w: 6, h: 24, i: 'transactions' },
      { x: 0, y: 20, w: 6, h: 6, i: 'distribution' },
    ],
    md: [
      { x: 0, y: 0, w: 4, h: 20, i: 'form' },
      { x: 4, y: 0, w: 8, h: 20, i: 'chart' },
      { x: 0, y: 20, w: 4, h: 12, i: 'distribution' },
      { x: 4, y: 20, w: 6, h: 24, i: 'transactions' },
    ],
  };

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
