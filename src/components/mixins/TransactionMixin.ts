import { Component, Mixins } from 'vue-property-decorator'
import { History, TransactionStatus, Operation } from '@sora-substrate/util'
import { api } from '@soramitsu/soraneo-wallet-web'
import findLast from 'lodash/fp/findLast'
import { Action } from 'vuex-class'

import { formatAddress, delay } from '@/utils'
import { groupRewardsByAssetsList } from '@/utils/rewards'
import TranslationMixin from './TranslationMixin'
import LoadingMixin from './LoadingMixin'
import NumberFormatterMixin from './NumberFormatterMixin'

@Component
export default class TransactionMixin extends Mixins(TranslationMixin, LoadingMixin, NumberFormatterMixin) {
  private time = 0

  transaction: History | null | undefined = null // It's used just for sync errors

  @Action addActiveTransaction
  @Action removeActiveTransaction

  private getMessage (value?: History): string {
    if (!value || !Object.values(Operation).includes(value.type as any)) {
      return ''
    }
    const params = { ...value } as any
    if (value.type === Operation.Transfer) {
      params.address = formatAddress(value.to as string, 10)
    }
    if ([Operation.AddLiquidity, Operation.CreatePair, Operation.Transfer, Operation.RemoveLiquidity, Operation.Swap].includes(value.type)) {
      params.amount = params.amount ? this.formatStringValue(params.amount) : ''
    }
    if ([Operation.AddLiquidity, Operation.CreatePair, Operation.RemoveLiquidity, Operation.Swap].includes(value.type)) {
      params.amount2 = params.amount2 ? this.formatStringValue(params.amount2) : ''
    }
    if (value.type === Operation.ClaimRewards) {
      params.rewards = groupRewardsByAssetsList(params.rewards)
        .map(({ amount, symbol }) => `${amount} ${symbol}`)
        .join(` ${this.t('rewards.andText')} `)
    }
    return this.t(`operations.${value.status}.${value.type}`, params)
  }

  private async getLastTransaction (): Promise<void> {
    // Now we are checking every transaction with 1 second interval
    const tx = findLast(
      item => Number(item.startTime) > this.time,
      api.history
    )
    if (!tx) {
      await delay()
      return await this.getLastTransaction()
    }
    this.transaction = tx
    this.addActiveTransaction({ tx: this.transaction })
  }

  /** Should be used with @Watch like a singletone in a root of the project */
  handleChangeTransaction (value: History): void {
    if (!value || !value.status || ![TransactionStatus.Finalized, TransactionStatus.Error].includes(value.status as any)) {
      return
    }
    const message = this.getMessage(value)
    if (value.status === TransactionStatus.Error) {
      this.$notify({
        message: message || this.t('unknownErrorText'),
        type: 'error',
        title: ''
      })
    } else if (value.status === TransactionStatus.Finalized) {
      this.$notify({
        message,
        type: 'success',
        title: ''
      })
    }
    this.time = 0
    this.removeActiveTransaction({ tx: value })
  }

  async withNotifications (func: () => Promise<void>): Promise<void> {
    await this.withLoading(async () => {
      try {
        this.time = Date.now()
        await func()
        await this.getLastTransaction()
        this.$notify({ message: this.t('transactionSubmittedText'), title: '' })
      } catch (error) {
        const message = this.getMessage(this.transaction as History)
        this.time = 0
        this.removeActiveTransaction({ tx: this.transaction })
        this.transaction = null
        this.$notify({
          message: message || this.t('unknownErrorText'),
          type: 'error',
          title: ''
        })
        throw new Error(error.message)
      }
    })
  }
}
