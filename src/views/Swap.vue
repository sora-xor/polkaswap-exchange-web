<template>
  <div class="swap-container">
    <div class="column column--small">
      <swap-form-widget :parent-loading="loadingState" class="swap-form-widget" />
      <customise-widget v-model="customise" :widgets-model.sync="widgetsSync" :labels="labels" />
      <swap-distribution-widget v-if="widgets[SwapWidgets.Distribution]" />
    </div>
    <div class="column">
      <swap-chart-widget v-if="widgets[SwapWidgets.Chart]" :parent-loading="loadingState" class="swap-chart-widget" />
      <swap-transactions-widget v-if="widgets[SwapWidgets.Transactions]" :parent-loading="loadingState" />
    </div>
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
import type { WidgetsVisibilityModel } from '@/types/layout';
import { layoutsStorage } from '@/utils/storage';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

enum SwapWidgets {
  Chart = 'swapChart',
  Transactions = 'swapTransactions',
  Distribution = 'swapDistribution',
}

const storageTemporaryKey = 'swapWidgets';

@Component({
  components: {
    SwapFormWidget: lazyComponent(Components.SwapFormWidget),
    SwapChartWidget: lazyComponent(Components.SwapChartWidget),
    SwapTransactionsWidget: lazyComponent(Components.SwapTransactionsWidget),
    SwapDistributionWidget: lazyComponent(Components.SwapDistributionWidget),
    CustomiseWidget: lazyComponent(Components.CustomiseWidget),
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

  customise = false;

  widgets: WidgetsVisibilityModel = {
    [SwapWidgets.Chart]: true,
    [SwapWidgets.Distribution]: true,
    [SwapWidgets.Transactions]: false,
  };

  get widgetsSync(): WidgetsVisibilityModel {
    return this.widgets;
  }

  set widgetsSync(widgetsModel: WidgetsVisibilityModel) {
    this.widgets = widgetsModel;
    layoutsStorage.set(storageTemporaryKey, JSON.stringify(widgetsModel));
  }

  get labels(): Record<string, string> {
    return {
      [SwapWidgets.Chart]: this.t('priceChartText'),
      [SwapWidgets.Distribution]: this.t('swap.route'),
      [SwapWidgets.Transactions]: this.tc('transactionText', 2),
    };
  }

  @Watch('tokenFrom')
  @Watch('tokenTo')
  private updateRouteTokensParams() {
    this.updateRouteAfterSelectTokens(this.tokenFrom, this.tokenTo);
  }

  get loadingState(): boolean {
    return this.parentLoading || this.loading;
  }

  created(): void {
    const widgetsModel = layoutsStorage.get(storageTemporaryKey);

    if (widgetsModel) {
      this.widgets = JSON.parse(widgetsModel);
    }

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
  display: flex;
  flex-flow: row wrap;
  justify-content: center;
  align-items: flex-start;
  gap: $inner-spacing-medium;

  .swap-chart-widget,
  .swap-form-widget {
    @include desktop {
      min-height: 492px;
    }
  }
}
.column {
  display: flex;
  gap: $inner-spacing-medium;
  flex-flow: column nowrap;

  &--small {
    max-width: $inner-window-width;
  }

  @include tablet(true) {
    max-width: $inner-window-width;
  }

  @include mobile(true) {
    max-width: 360px;
  }
}
</style>
