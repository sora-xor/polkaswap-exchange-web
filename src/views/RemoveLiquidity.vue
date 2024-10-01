<template>
  <div v-loading="parentLoading" class="container container--remove-liquidity">
    <generic-page-header
      has-button-back
      :title="t('removeLiquidity.title')"
      :tooltip="t('removeLiquidity.description')"
      @back="handleBack"
    />
    <remove-liquidity-form @back="handleBack" />
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import SelectedTokenRouteMixin from '@/components/mixins/SelectedTokensRouteMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, PageNames } from '@/consts';
import { PoolComponents } from '@/modules/pool/consts';
import { poolLazyComponent } from '@/modules/pool/router';
import router, { lazyComponent } from '@/router';
import { getter, mutation, action } from '@/store/decorators';
import type { LiquidityParams } from '@/store/pool/types';

import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    RemoveLiquidityForm: poolLazyComponent(PoolComponents.RemoveLiquidityForm),
  },
})
export default class RemoveLiquidity extends Mixins(SelectedTokenRouteMixin, TranslationMixin, mixins.LoadingMixin) {
  @getter.removeLiquidity.liquidity liquidity!: AccountLiquidity;

  @mutation.removeLiquidity.setAddresses private setAddresses!: (params: LiquidityParams) => void;

  @action.removeLiquidity.resetData private resetData!: AsyncFnWithoutArgs;

  async mounted(): Promise<void> {
    await this.withParentLoading(async () => {
      this.setData({
        firstAddress: this.firstRouteAddress,
        secondAddress: this.secondRouteAddress,
      });
    });
  }

  beforeDestroy(): void {
    this.resetData();
  }

  /** Overrides SelectedTokenRouteMixin */
  async setData(params: { firstAddress: string; secondAddress: string }): Promise<void> {
    this.setAddresses({
      firstAddress: params.firstAddress,
      secondAddress: params.secondAddress,
    });
    // If user don't have the liquidity (navigated through the address bar) redirect to the Pool page
    if (!this.liquidity) {
      return this.handleBack();
    }
  }

  handleBack(): void {
    router.push({ name: PageNames.Pool });
  }
}
</script>
