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
export default class AssetOwnerContainer extends Mixins(SubscriptionsMixin) {
  @action.dashboard.subscribeOnOwnedAssets private subscribeOnOwnedAssets!: AsyncFnWithoutArgs;
  @action.dashboard.reset private reset!: AsyncFnWithoutArgs;

  created(): void {
    this.setStartSubscriptions([this.subscribeOnOwnedAssets]);
    this.setResetSubscriptions([this.reset]);
  }
}
</script>
