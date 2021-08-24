import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'

import LoadingMixin from './LoadingMixin'

const namespace = 'pool'

@Component
export default class PoolUpdatesMixin extends Mixins(LoadingMixin) {
  @Action('getAssets', { namespace: 'assets' }) getAssets!: AsyncVoidFn

  @Action('subscribeOnAccountLiquidityList', { namespace }) subscribeOnAccountLiquidityList!: AsyncVoidFn
  @Action('subscribeOnAccountLiquidityUpdates', { namespace }) subscribeOnAccountLiquidityUpdates!: AsyncVoidFn
  @Action('unsubscribeAccountLiquidityListAndUpdates', { namespace }) unsubscribeAccountLiquidityListAndUpdates!: AsyncVoidFn

  @Getter isLoggedIn!: boolean

  async onCreated (): Promise<void> {
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

  async onDestroyed (): Promise<void> {
    await this.withApi(async () => {
      await this.unsubscribeAccountLiquidityListAndUpdates()
    })
  }
}
