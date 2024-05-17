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
import { Component, Mixins, Watch } from 'vue-property-decorator';

import SubscriptionsMixin from '@/components/mixins/SubscriptionsMixin';
import { PageNames } from '@/consts';
import { goTo } from '@/router';
import { action, getter } from '@/store/decorators';

@Component
export default class AssetOwnerContainer extends Mixins(SubscriptionsMixin) {
  @action.dashboard.subscribeOnOwnedAssets private subscribeOnOwnedAssets!: AsyncFnWithoutArgs;
  @action.dashboard.reset private reset!: AsyncFnWithoutArgs;

  @getter.settings.assetOwnerEnabled assetOwnerEnabled!: Nullable<boolean>;

  @Watch('assetOwnerEnabled', { immediate: true })
  private checkAvailability(value: Nullable<boolean>): void {
    if (value === false) {
      goTo(PageNames.Swap);
    }
  }

  created(): void {
    this.setStartSubscriptions([this.subscribeOnOwnedAssets]);
    this.setResetSubscriptions([this.reset]);
  }
}
</script>
