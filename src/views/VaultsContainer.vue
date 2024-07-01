<template>
  <router-view
    class="vaults-view-container"
    v-bind="{
      parentLoading: subscriptionsDataLoading,
      ...$attrs,
    }"
    v-on="$listeners"
    v-loading="subscriptionsDataLoading"
  />
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';

import SubscriptionsMixin from '@/components/mixins/SubscriptionsMixin';
import { PageNames } from '@/consts';
import { goTo } from '@/router';
import { action, getter } from '@/store/decorators';

@Component
export default class VaultsContainer extends Mixins(SubscriptionsMixin) {
  @action.vault.subscribeOnCollaterals private subscribeOnCollaterals!: AsyncFnWithoutArgs;
  @action.vault.subscribeOnAccountVaults private subscribeOnAccountVaults!: AsyncFnWithoutArgs;
  @action.vault.updateBalanceSubscriptions private updateBalanceSubscriptions!: AsyncFnWithoutArgs;
  @action.vault.getLiquidationPenalty private getLiquidationPenalty!: AsyncFnWithoutArgs;
  @action.vault.subscribeOnBorrowTaxes private subscribeOnBorrowTaxes!: AsyncFnWithoutArgs;
  @action.vault.subscribeOnDebtCalculation private subscribeOnDebtCalculation!: AsyncFnWithoutArgs;
  @action.vault.reset private reset!: AsyncFnWithoutArgs;

  @getter.settings.kensetsuEnabled kensetsuEnabled!: Nullable<boolean>;

  @Watch('kensetsuEnabled', { immediate: true })
  private checkAvailability(value: Nullable<boolean>): void {
    if (value === false) {
      goTo(PageNames.Swap);
    }
  }

  created(): void {
    this.setStartSubscriptions([
      this.subscribeOnCollaterals,
      this.subscribeOnAccountVaults,
      this.updateBalanceSubscriptions,
      this.getLiquidationPenalty,
      this.subscribeOnBorrowTaxes,
      this.subscribeOnDebtCalculation,
    ]);
    this.setResetSubscriptions([this.reset]);
  }
}
</script>

<style lang="scss">
.vaults-view-container > .el-loading-mask {
  margin: -$inner-spacing-medium; // compensate for the padding of the .app-content from App.vue
}
</style>
