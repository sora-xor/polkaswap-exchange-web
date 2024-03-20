<template>
  <widgets-grid
    class="swap-container"
    :draggable="options.edit"
    :resizable="options.edit"
    :lines="options.edit"
    :compact="options.compact"
    :loading="parentLoading"
    :default-layouts="DefaultLayouts"
    v-model="widgets"
  >
    <template v-slot:[SwapWidgets.Form]="props">
      <swap-form-widget v-bind="props" primary-title />
    </template>
    <template v-slot:[SwapWidgets.Chart]="props">
      <swap-chart-widget
        v-bind="props"
        :base-asset="tokenFrom"
        :quote-asset="tokenTo"
        :is-available="isAvailable"
        full
      />
    </template>
    <template v-slot:[SwapWidgets.Distribution]="props">
      <swap-distribution-widget v-bind="props" />
    </template>
    <template v-slot:[SwapWidgets.Transactions]="props">
      <swap-transactions-widget v-bind="props" full extensive />
    </template>
    <template v-slot:[SwapWidgets.Customize]="props">
      <customise-widget v-bind="props" :widgets.sync="widgets" :options.sync="options" />
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
import type { ResponsiveLayouts, WidgetsVisibilityModel } from '@/types/layout';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

enum SwapWidgets {
  Form = 'form',
  Chart = 'chart',
  Transactions = 'transactions',
  Distribution = 'distribution',
  Customize = 'customize',
}

@Component({
  components: {
    SwapFormWidget: lazyComponent(Components.SwapFormWidget),
    SwapChartWidget: lazyComponent(Components.PriceChartWidget),
    SwapTransactionsWidget: lazyComponent(Components.SwapTransactionsWidget),
    SwapDistributionWidget: lazyComponent(Components.SwapDistributionWidget),
    CustomiseWidget: lazyComponent(Components.CustomiseWidget),
    WidgetsGrid: lazyComponent(Components.WidgetsGrid),
  },
})
export default class Swap extends Mixins(mixins.LoadingMixin, TranslationMixin, SelectedTokenRouteMixin) {
  @state.swap.isAvailable isAvailable!: boolean;
  @state.router.prev private prevRoute!: Nullable<PageNames>;

  @getter.swap.tokenFrom tokenFrom!: Nullable<AccountAsset>;
  @getter.swap.tokenTo tokenTo!: Nullable<AccountAsset>;

  @action.swap.setTokenFromAddress private setTokenFromAddress!: (address?: string) => Promise<void>;
  @action.swap.setTokenToAddress private setTokenToAddress!: (address?: string) => Promise<void>;

  readonly SwapWidgets = SwapWidgets;

  readonly DefaultLayouts: ResponsiveLayouts = {
    lg: [
      { x: 0, y: 0, w: 6, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
      { x: 0, y: 20, w: 6, h: 4, minW: 4, minH: 4, i: SwapWidgets.Customize },
      { x: 0, y: 24, w: 6, h: 4, minW: 4, minH: 4, i: SwapWidgets.Distribution },
      { x: 6, y: 0, w: 9, h: 24, minW: 4, minH: 20, i: SwapWidgets.Chart },
      { x: 15, y: 0, w: 9, h: 24, minW: 4, minH: 24, i: SwapWidgets.Transactions },
    ],
    md: [
      { x: 0, y: 0, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
      { x: 0, y: 20, w: 4, h: 4, minW: 4, minH: 4, i: SwapWidgets.Customize },
      { x: 0, y: 24, w: 4, h: 4, minW: 4, minH: 4, i: SwapWidgets.Distribution },
      { x: 4, y: 0, w: 12, h: 20, minW: 4, minH: 20, i: SwapWidgets.Chart },
      { x: 4, y: 20, w: 8, h: 24, minW: 4, minH: 24, i: SwapWidgets.Transactions },
    ],
    sm: [
      { x: 0, y: 0, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
      { x: 0, y: 20, w: 4, h: 4, minW: 4, minH: 4, i: SwapWidgets.Customize },
      { x: 0, y: 24, w: 4, h: 4, minW: 4, minH: 4, i: SwapWidgets.Distribution },
      { x: 4, y: 0, w: 8, h: 20, minW: 4, minH: 20, i: SwapWidgets.Chart },
      { x: 4, y: 20, w: 8, h: 24, minW: 4, minH: 24, i: SwapWidgets.Transactions },
    ],
    xs: [
      { x: 0, y: 0, w: 4, h: 4, minW: 4, minH: 4, i: SwapWidgets.Customize },
      { x: 0, y: 4, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
      { x: 4, y: 0, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Chart },
      { x: 0, y: 20, w: 4, h: 12, minW: 4, minH: 12, i: SwapWidgets.Distribution },
      { x: 4, y: 20, w: 4, h: 24, minW: 4, minH: 24, i: SwapWidgets.Transactions },
    ],
    xss: [
      { x: 0, y: 0, w: 4, h: 4, minW: 4, minH: 12, i: SwapWidgets.Customize },
      { x: 0, y: 4, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
      { x: 0, y: 20, w: 4, h: 12, minW: 4, minH: 12, i: SwapWidgets.Distribution },
      { x: 0, y: 32, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Chart },
      { x: 0, y: 52, w: 4, h: 24, minW: 4, minH: 24, i: SwapWidgets.Transactions },
    ],
  };

  options = {
    edit: false,
    compact: false,
  };

  widgets: WidgetsVisibilityModel = {
    [SwapWidgets.Form]: true,
    [SwapWidgets.Chart]: true,
    [SwapWidgets.Distribution]: true,
    [SwapWidgets.Transactions]: true,
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

<style lang="scss" scoped>
.swap-container {
  #form,
  #chart {
    min-height: 502px;
  }
}
</style>
