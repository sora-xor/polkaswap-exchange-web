import { Vue, Component, Prop } from 'vue-property-decorator'
import { isWalletLoaded } from '@soramitsu/soraneo-wallet-web'
import { delay } from '@/utils'

@Component
export default class LoadingMixin extends Vue {
  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean

  loading = false

  async withLoading (func: Function): Promise<any> {
    this.loading = true
    try {
      return await func()
    } catch (e) {
      console.error(e)
      throw e
    } finally {
      this.loading = false
    }
  }

  /**
   * Function for any request to blockchain.
   * It is guaranteed that api has a connection
   * @param func
   */
  async withApi (func: Function): Promise<any> {
    if (!isWalletLoaded) {
      await delay()
      return await this.withApi(func)
    } else {
      return await this.withLoading(func)
    }
  }
}
