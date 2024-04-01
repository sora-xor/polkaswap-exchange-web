<template>
  <div class="swap-container">
    <div class="column column--small">
      <swap-form-widget :parent-loading="loadingState" class="swap-form-widget" />
      <swap-distribution-widget />
    </div>
    <div class="column">
      <swap-chart-widget :parent-loading="loadingState" v-if="chartsEnabled" class="swap-chart-widget" />
      <swap-transactions-widget :parent-loading="loadingState" />
    </div>
  </div>
</template>

<script lang="ts">
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import Shepherd from 'shepherd.js';
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

  @Watch('tokenFrom')
  @Watch('tokenTo')
  private updateRouteTokensParams() {
    this.updateRouteAfterSelectTokens(this.tokenFrom, this.tokenTo);
  }

  get loadingState(): boolean {
    return this.parentLoading || this.loading;
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

  mounted(): void {
    const tour = new Shepherd.Tour({
      defaultStepOptions: {
        cancelIcon: {
          enabled: true,
        },
        classes: 'class-1 class-2',
        scrollTo: { behavior: 'smooth', block: 'center' },
      },
    });

    tour.addStep({
      title: 'Polkaswap swap page tour',
      text: 'Take a short tour demonstrating how to exchange tokens in Polkaswap',
      attachTo: {
        element: '.swap-widget',
        on: 'left',
      },
      buttons: [
        {
          action() {
            return this.next();
          },
          text: 'Start tour',
        },
      ],
      id: 'start',
    });

    tour.addStep({
      title: 'Select token',
      text: 'Click on this button with the name of the token in order to select the token that you want to exchange',
      attachTo: {
        element: '.s-input[data-test-name="swapFrom"] .token-select-button',
        on: 'bottom',
      },
      id: 'open-select-token',
    });

    tour.addStep({
      title: 'Select token 2',
      text: 'Click on this button with the name of the token in order to select the token that you want to exchange',
      attachTo: {
        element: '.s-input[data-test-name="swapFrom"] .token-select-button',
        on: 'bottom',
      },
      id: 'select-token',
    });

    setTimeout(() => {
      tour.start();

      const element = document.querySelector('.s-input[data-test-name="swapFrom"] .token-select-button');

      if (element) {
        element.addEventListener('click', () => {
          tour.show('select-token');
        });
      }
    }, 3000);
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
      min-height: 517px;
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
}
</style>
