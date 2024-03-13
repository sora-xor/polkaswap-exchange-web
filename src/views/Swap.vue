<template>
  <div class="s-flex" style="flex-flow: column; height: 100%">
    <div class="controls s-flex" style="gap: 16px; justify-content: space-between">
      <div class="s-flex">
        <s-checkbox v-model="draggable" label="Draggable" />
        <s-checkbox v-model="resizable" label="Resizable" />
        <s-checkbox v-model="compact" label="Compact" />
        <s-checkbox v-model="lines" label="Show grid" />
      </div>
      <div class="s-flex">
        <s-checkbox v-model="form" @change="updateWidget(SwapWidgets.Form, $event)" label="Form" />
        <s-checkbox v-model="chart" @change="updateWidget(SwapWidgets.Chart, $event)" label="Chart" />
        <s-checkbox
          v-model="transactions"
          @change="updateWidget(SwapWidgets.Transactions, $event)"
          label="Transactions"
        />
        <s-checkbox v-model="distribution" @change="updateWidget(SwapWidgets.Distribution, $event)" label="Route" />
      </div>
    </div>
    <widgets-grid
      class="swap-container"
      :draggable="draggable"
      :resizable="resizable"
      :compact="compact"
      :lines="lines"
      :layouts="layouts"
      :loading="parentLoading"
      @update="updateLayoutsConfig"
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
    </widgets-grid>
  </div>
</template>

<script lang="ts">
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import cloneDeep from 'lodash/fp/cloneDeep';
import isEqual from 'lodash/fp/isEqual';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import SelectedTokenRouteMixin from '@/components/mixins/SelectedTokensRouteMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, PageNames } from '@/consts';
import { lazyComponent } from '@/router';
import { action, getter, state } from '@/store/decorators';
import type { LayoutWidget, LayoutWidgetConfig, ResponsiveLayouts } from '@/types/layout';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

enum SwapWidgets {
  Form = 'form',
  Chart = 'chart',
  Transactions = 'transactions',
  Distribution = 'distribution',
}

const LayoutsConfigDefault: ResponsiveLayouts<LayoutWidgetConfig> = {
  md: [
    { x: 0, y: 0, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
    { x: 4, y: 0, w: 12, h: 20, minW: 4, minH: 20, i: SwapWidgets.Chart },
    { x: 0, y: 20, w: 4, h: 6, minW: 4, minH: 6, i: SwapWidgets.Distribution },
    { x: 4, y: 20, w: 8, h: 24, minW: 4, minH: 24, i: SwapWidgets.Transactions },
  ],
  sm: [
    { x: 0, y: 0, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
    { x: 4, y: 0, w: 8, h: 20, minW: 4, minH: 20, i: SwapWidgets.Chart },
    { x: 0, y: 20, w: 4, h: 4, minW: 4, minH: 4, i: SwapWidgets.Distribution },
    { x: 4, y: 20, w: 8, h: 24, minW: 4, minH: 24, i: SwapWidgets.Transactions },
  ],
  xs: [
    { x: 0, y: 0, w: 4, h: 20, i: SwapWidgets.Form },
    { x: 4, y: 0, w: 4, h: 20, i: SwapWidgets.Chart },
    { x: 0, y: 20, w: 4, h: 12, i: SwapWidgets.Distribution },
    { x: 4, y: 20, w: 4, h: 24, i: SwapWidgets.Transactions },
  ],
};

@Component({
  components: {
    SwapFormWidget: lazyComponent(Components.SwapFormWidget),
    SwapChartWidget: lazyComponent(Components.PriceChartWidget),
    SwapTransactionsWidget: lazyComponent(Components.SwapTransactionsWidget),
    WidgetsGrid: lazyComponent(Components.WidgetsGrid),
    SwapDistributionWidget: lazyComponent(Components.SwapDistributionWidget),
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

  draggable = false;
  resizable = false;
  compact = false;
  lines = false;

  form = true;
  chart = true;
  transactions = true;
  distribution = true;

  layouts: ResponsiveLayouts<LayoutWidgetConfig> = cloneDeep(LayoutsConfigDefault);

  updateLayoutsConfig(updated: ResponsiveLayouts<LayoutWidget>): void {
    if (!isEqual(this.layouts, updated)) {
      this.layouts = { ...this.layouts, ...updated };
    }
  }

  updateWidget(id: SwapWidgets, flag: boolean): void {
    Object.keys(this.layouts).forEach((key) => {
      if (flag) {
        const widget = LayoutsConfigDefault[key].find((widget) => widget.i === id);

        if (widget) {
          this.layouts[key] = [...this.layouts[key], { ...widget }];
        }
      } else {
        this.layouts[key] = this.layouts[key].filter((widget) => widget.i !== id);
      }
    });
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

<style lang="scss" scoped>
.swap-container {
  flex: 1;

  #form,
  #chart {
    min-height: 502px;
  }
}
</style>
