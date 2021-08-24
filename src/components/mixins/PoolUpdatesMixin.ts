import { Component, Mixins } from 'vue-property-decorator'
import { Action } from 'vuex-class'

import LoadingMixin from './LoadingMixin'

const namespace = 'pool'

@Component
export default class PoolUpdatesMixin extends Mixins(LoadingMixin) {
  @Action('getAssets', { namespace: 'assets' }) getAssets!: AsyncVoidFn

  @Action('subscribeOnAccountLiquidityList', { namespace }) subscribeOnAccountLiquidityList!: AsyncVoidFn
  @Action('subscribeOnAccountLiquidityUpdates', { namespace }) subscribeOnAccountLiquidityUpdates!: AsyncVoidFn
  @Action('unsubscribeAccountLiquidityListAndUpdates', { namespace }) unsubscribeAccountLiquidityListAndUpdates!: AsyncVoidFn

  async onCreated (fn?: () => Promise<void>): Promise<void> {
    await this.withApi(async () => {
      await Promise.all([
        this.subscribeOnAccountLiquidityList(),
        this.subscribeOnAccountLiquidityUpdates(),
        this.getAssets()
      ])
      if (fn) {
        await fn()
      }
    })
  }

  async onDestroyed (fn?: () => void): Promise<void> {
    await this.unsubscribeAccountLiquidityListAndUpdates()
    if (fn) {
      fn()
    }
  }
}
