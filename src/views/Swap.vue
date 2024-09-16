<template>
  <widgets-grid
    grid-id="swapGrid"
    class="swap-container"
    :draggable="options.edit"
    :resizable="options.edit"
    :lines="options.edit"
    :loading="pageLoading"
    :default-layouts="DefaultLayouts"
    v-model="widgets"
  >
    <template v-slot:[SwapWidgets.Form]="props">
      <swap-form-widget v-bind="props" primary-title full />
    </template>
    <template v-slot:[SwapWidgets.Chart]="props">
      <price-chart-widget
        v-bind="props"
        :base-asset="tokenFrom"
        :quote-asset="tokenTo"
        :is-available="isAvailable"
        full
      />
    </template>
    <template v-slot:[SwapWidgets.Distribution]="props">
      <swap-distribution-widget v-bind="props" full />
    </template>
    <template v-slot:[SwapWidgets.TransactionDetails]="props">
      <swap-transaction-details-widget v-bind="props" full />
    </template>
    <template v-slot:[SwapWidgets.Transactions]="props">
      <swap-transactions-widget v-bind="props" full extensive />
    </template>
    <template v-slot:[SwapWidgets.Customise]="{ reset, ...props }">
      <customise-widget
        v-bind="props"
        v-model="customizePopper"
        :widgets-model.sync="widgets"
        :options-model.sync="options"
        :labels="labels"
        pip-disabled
        full
      >
        <s-button @click="reset">{{ t('resetText') }}</s-button>
      </customise-widget>
    </template>
    <template v-slot:[SwapWidgets.TokenPriceChart]="props">
      <token-price-chart-widget v-bind="props" full />
    </template>
    <template v-slot:[SwapWidgets.SupplyChart]="props">
      <supply-chart-widget v-bind="props" full />
    </template>
  </widgets-grid>
</template>

<script lang="ts">
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import SelectedTokenRouteMixin from '@/components/mixins/SelectedTokensRouteMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, PageNames } from '@/consts';
import { lazyComponent } from '@/router';
import { action, getter, state } from '@/store/decorators';
import type { ResponsiveLayouts, WidgetsVisibilityModel } from '@/types/layout';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

enum SwapWidgets {
  Customise = 'customise',
  // main
  Form = 'swapForm',
  Chart = 'swapChart',
  Distribution = 'swapDistribution',
  // additional
  TransactionDetails = 'swapTransactionDetails',
  Transactions = 'swapTransactions',
  TokenPriceChart = 'swapTokenPriceChart',
  SupplyChart = 'swapSupplyChart',
}

@Component({
  components: {
    SwapFormWidget: lazyComponent(Components.SwapFormWidget),
    SwapTransactionsWidget: lazyComponent(Components.SwapTransactionsWidget),
    SwapTransactionDetailsWidget: lazyComponent(Components.SwapTransactionDetailsWidget),
    SwapDistributionWidget: lazyComponent(Components.SwapDistributionWidget),
    CustomiseWidget: lazyComponent(Components.CustomiseWidget),
    PriceChartWidget: lazyComponent(Components.PriceChartWidget),
    TokenPriceChartWidget: lazyComponent(Components.TokenPriceChartWidget),
    SupplyChartWidget: lazyComponent(Components.SupplyChartWidget),
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
      { x: 5, y: 0, w: 6, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
      { x: 5, y: 20, w: 6, h: 4, minW: 2, minH: 4, i: SwapWidgets.Customise },
      { x: 5, y: 24, w: 6, h: 8, minW: 4, minH: 8, i: SwapWidgets.Distribution },
      { x: 5, y: 24, w: 6, h: 8, minW: 4, minH: 8, i: SwapWidgets.TransactionDetails },
      { x: 5, y: 24, w: 6, h: 16, minW: 4, minH: 16, i: SwapWidgets.SupplyChart },
      { x: 11, y: 0, w: 8, h: 20, minW: 4, minH: 16, i: SwapWidgets.Chart },
      { x: 11, y: 20, w: 8, h: 20, minW: 4, minH: 20, i: SwapWidgets.Transactions },
      { x: 11, y: 20, w: 8, h: 20, minW: 4, minH: 16, i: SwapWidgets.TokenPriceChart },
    ],
    md: [
      { x: 3, y: 0, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
      { x: 3, y: 20, w: 4, h: 4, minW: 2, minH: 4, i: SwapWidgets.Customise },
      { x: 3, y: 24, w: 4, h: 8, minW: 4, minH: 8, i: SwapWidgets.Distribution },
      { x: 3, y: 24, w: 4, h: 8, minW: 4, minH: 8, i: SwapWidgets.TransactionDetails },
      { x: 3, y: 24, w: 4, h: 12, minW: 4, minH: 12, i: SwapWidgets.SupplyChart },
      { x: 7, y: 0, w: 6, h: 20, minW: 4, minH: 16, i: SwapWidgets.Chart },
      { x: 7, y: 20, w: 6, h: 20, minW: 4, minH: 20, i: SwapWidgets.Transactions },
      { x: 7, y: 20, w: 6, h: 20, minW: 4, minH: 16, i: SwapWidgets.TokenPriceChart },
    ],
    sm: [
      { x: 1, y: 0, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
      { x: 1, y: 20, w: 4, h: 4, minW: 2, minH: 4, i: SwapWidgets.Customise },
      { x: 1, y: 24, w: 4, h: 9, minW: 4, minH: 9, i: SwapWidgets.Distribution },
      { x: 1, y: 24, w: 4, h: 9, minW: 4, minH: 9, i: SwapWidgets.TransactionDetails },
      { x: 1, y: 24, w: 4, h: 20, minW: 4, minH: 16, i: SwapWidgets.SupplyChart },
      { x: 5, y: 0, w: 6, h: 20, minW: 4, minH: 20, i: SwapWidgets.Chart },
      { x: 5, y: 20, w: 6, h: 20, minW: 4, minH: 20, i: SwapWidgets.Transactions },
      { x: 5, y: 40, w: 6, h: 20, minW: 4, minH: 16, i: SwapWidgets.TokenPriceChart },
    ],
    xs: [
      { x: 0, y: 0, w: 4, h: 4, minW: 2, minH: 4, i: SwapWidgets.Customise },
      { x: 0, y: 4, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
      { x: 0, y: 24, w: 4, h: 8, minW: 4, minH: 8, i: SwapWidgets.Distribution },
      { x: 0, y: 24, w: 4, h: 8, minW: 4, minH: 8, i: SwapWidgets.TransactionDetails },
      { x: 4, y: 0, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Chart },
      { x: 0, y: 32, w: 4, h: 16, minW: 4, minH: 16, i: SwapWidgets.Transactions },
      { x: 4, y: 20, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.TokenPriceChart },
      { x: 4, y: 20, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.SupplyChart },
    ],
    xss: [
      { x: 0, y: 0, w: 4, h: 4, minW: 2, minH: 4, i: SwapWidgets.Customise },
      { x: 0, y: 4, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Form },
      { x: 0, y: 24, w: 4, h: 8, minW: 4, minH: 8, i: SwapWidgets.Distribution },
      { x: 0, y: 24, w: 4, h: 8, minW: 4, minH: 8, i: SwapWidgets.TransactionDetails },
      { x: 0, y: 36, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Chart },
      { x: 0, y: 56, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.TokenPriceChart },
      { x: 0, y: 56, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.Transactions },
      { x: 0, y: 56, w: 4, h: 20, minW: 4, minH: 20, i: SwapWidgets.SupplyChart },
    ],
  };

  customizePopper = false;

  options = {
    edit: false,
  };

  widgets: WidgetsVisibilityModel = {
    [SwapWidgets.Chart]: true,
    [SwapWidgets.Distribution]: true,
    [SwapWidgets.TransactionDetails]: false,
    [SwapWidgets.Transactions]: false,
    [SwapWidgets.TokenPriceChart]: false,
    [SwapWidgets.SupplyChart]: false,
  };

  get labels(): Record<string, string> {
    const priceText = this.t('priceChartText');

    const aSymbol = this.tokenFrom?.symbol ?? '';
    const bSymbol = this.tokenTo?.symbol ?? '';
    const tokensText = [aSymbol, bSymbol].filter(Boolean).join('/');

    return {
      // widgets
      [SwapWidgets.Form]: this.t('swapText'),
      [SwapWidgets.Distribution]: this.t('swap.route'),
      [SwapWidgets.TransactionDetails]: this.t('transaction.title'),
      [SwapWidgets.Transactions]: this.tc('transactionText', 2),
      [SwapWidgets.Chart]: `${priceText} ${tokensText}`,
      [SwapWidgets.TokenPriceChart]: priceText,
      [SwapWidgets.SupplyChart]: 'Supply',
      // options
      edit: this.t('editText'),
    };
  }

  get pageLoading(): boolean {
    return this.parentLoading || this.loading;
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
