<template>
  <router-view
    v-bind="{
      parentLoading: poolLoading,
      ...$attrs
    }"
    v-on="$listeners"
  />
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'

import LoadingMixin from '@/components/mixins/LoadingMixin'

const namespace = 'pool'

@Component
export default class PoolContainer extends Mixins(LoadingMixin) {
  @Action('getAssets', { namespace: 'assets' }) getAssets!: AsyncVoidFn

  @Action('subscribeOnAccountLiquidityList', { namespace }) subscribeOnAccountLiquidityList!: AsyncVoidFn
  @Action('subscribeOnAccountLiquidityUpdates', { namespace }) subscribeOnAccountLiquidityUpdates!: AsyncVoidFn
  @Action('unsubscribeAccountLiquidityListAndUpdates', { namespace }) unsubscribeAccountLiquidityListAndUpdates!: AsyncVoidFn

  @Getter isLoggedIn!: boolean

  get poolLoading (): boolean {
    return this.parentLoading || this.loading
  }

  async created (): Promise<void> {
    await this.withApi(async () => {
      if (this.isLoggedIn) {
        await Promise.all([
          this.subscribeOnAccountLiquidityList(),
          this.subscribeOnAccountLiquidityUpdates()
        ])
      }
      await this.getAssets()
    })
  }

  async beforeDestroy (): Promise<void> {
    await this.withApi(async () => {
      await this.unsubscribeAccountLiquidityListAndUpdates()
    })
  }
}
</script>
