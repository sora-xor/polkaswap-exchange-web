<template>
  <router-view
    v-bind="{
      parentLoading: subscriptionsDataLoading,
      ...$attrs,
    }"
    v-on="$listeners"
    v-loading="subscriptionsDataLoading"
  />
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import SubscriptionsMixin from '@/components/mixins/SubscriptionsMixin';
import { action } from '@/store/decorators';

@Component
export default class VaultsContainer extends Mixins(SubscriptionsMixin) {
  @action.vault.subscribeOnCollaterals private subscribeOnCollaterals!: AsyncFnWithoutArgs;
  @action.vault.subscribeOnAccountVaults private subscribeOnAccountVaults!: AsyncFnWithoutArgs;
  @action.vault.reset private reset!: AsyncFnWithoutArgs;

  created(): void {
    this.setStartSubscriptions([this.subscribeOnCollaterals, this.subscribeOnAccountVaults]);
    this.setResetSubscriptions([this.reset]);
  }
}
</script>
