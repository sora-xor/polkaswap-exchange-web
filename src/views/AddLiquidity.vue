<template>
  <div v-loading="parentLoading" class="container">
    <generic-page-header
      has-button-back
      :title="t('addLiquidity.title')"
      :tooltip="t('pool.description')"
      @back="handleBack"
    />
    <add-liquidity-form />
  </div>
</template>

<script lang="ts">
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import SelectedTokenRouteMixin from '@/components/mixins/SelectedTokensRouteMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { PageNames, Components } from '@/consts';
import { PoolComponents } from '@/modules/pool/consts';
import { poolLazyComponent } from '@/modules/pool/router';
import router, { lazyComponent } from '@/router';
import { getter, action } from '@/store/decorators';
import type { LiquidityParams } from '@/store/pool/types';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    AddLiquidityForm: poolLazyComponent(PoolComponents.AddLiquidityForm),
  },
})
export default class AddLiquidity extends Mixins(SelectedTokenRouteMixin, TranslationMixin, mixins.LoadingMixin) {
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  @getter.addLiquidity.firstToken private firstToken!: Nullable<AccountAsset>;
  @getter.addLiquidity.secondToken private secondToken!: Nullable<AccountAsset>;

  @action.addLiquidity.resetData private resetData!: AsyncFnWithoutArgs;
  @action.addLiquidity.setDataFromLiquidity private setData!: (args: LiquidityParams) => Promise<void>; // Overrides SelectedTokenRouteMixin

  @Watch('isLoggedIn')
  private handleLoggedInStateChange(isLoggedIn: boolean, wasLoggedIn: boolean): void {
    if (wasLoggedIn && !isLoggedIn) {
      this.handleBack();
    }
  }

  @Watch('firstToken')
  @Watch('secondToken')
  private afterTokenChange() {
    this.updateRouteAfterSelectTokens(this.firstToken, this.secondToken);
  }

  async mounted(): Promise<void> {
    await this.withParentLoading(async () => {
      this.parseCurrentRoute();

      const firstAddress = this.isValidRoute && this.firstRouteAddress ? this.firstRouteAddress : XOR.address;
      const secondAddress = this.isValidRoute && this.secondRouteAddress ? this.secondRouteAddress : '';

      await this.setData({ firstAddress, secondAddress });
    });
  }

  destroyed(): void {
    this.resetData();
  }

  handleBack(): void {
    router.push({ name: PageNames.Pool });
  }
}
</script>
