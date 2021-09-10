import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { Operation, CodecString } from '@sora-substrate/util'

import LoadingMixin from '@/components/mixins/LoadingMixin'

import router from '@/router'
import { PageNames, ZeroStringValue } from '@/consts'
import { bridgeApi } from '@/utils/bridge'

const namespace = 'bridge'

@Component
export default class BridgeHistoryMixin extends Mixins(LoadingMixin) {
  @Getter networkFees!: any
  @Getter('evmNetworkFee', { namespace }) evmNetworkFee!: CodecString

  @Action('getEvmNetworkFee', { namespace }) getEvmNetworkFee!: AsyncVoidFn
  @Action('setSoraToEvm', { namespace }) setSoraToEvm
  @Action('setTransactionConfirm', { namespace }) setTransactionConfirm!: (value: boolean) => Promise<void>
  @Action('setAssetAddress', { namespace }) setAssetAddress
  @Action('setAmount', { namespace }) setAmount
  @Action('setSoraTransactionHash', { namespace }) setSoraTransactionHash
  @Action('setEvmTransactionHash', { namespace }) setEvmTransactionHash
  @Action('setSoraTransactionDate', { namespace }) setSoraTransactionDate
  @Action('setEvmTransactionDate', { namespace }) setEvmTransactionDate
  @Action('setEvmNetworkFee', { namespace }) setEvmNetworkFee
  @Action('setCurrentTransactionState', { namespace }) setCurrentTransactionState
  @Action('setTransactionStep', { namespace }) setTransactionStep
  @Action('setHistoryItem', { namespace }) setHistoryItem
  @Action('saveHistory', { namespace }) saveHistory

  getSoraNetworkFee (type: Operation): CodecString {
    return this.isOutgoingType(type) ? this.networkFees[Operation.EthBridgeOutgoing] : ZeroStringValue
  }

  isOutgoingType (type: string | undefined): boolean {
    return type !== Operation.EthBridgeIncoming
  }

  async showHistory (id: string): Promise<void> {
    await this.withLoading(async () => {
      const tx = bridgeApi.getHistory(id)
      if (!tx) {
        router.push({ name: PageNames.BridgeTransaction })
        return
      }
      await this.setTransactionConfirm(true)
      await this.setSoraToEvm(this.isOutgoingType(tx.type))
      await this.setAssetAddress(tx.assetAddress)
      await this.setAmount(tx.amount)
      await this.setSoraTransactionHash(tx.hash)
      await this.setSoraTransactionDate(tx[this.isOutgoingType(tx.type) ? 'startTime' : 'endTime'])
      await this.setEvmTransactionHash(tx.ethereumHash)
      await this.setEvmTransactionDate(tx[!this.isOutgoingType(tx.type) ? 'startTime' : 'endTime'])
      const soraNetworkFee = +(tx.soraNetworkFee || 0)
      const evmNetworkFee = +(tx.ethereumNetworkFee || 0)
      if (!soraNetworkFee) {
        tx.soraNetworkFee = this.getSoraNetworkFee(tx.type)
      }
      if (!evmNetworkFee) {
        tx.ethereumNetworkFee = this.evmNetworkFee
        await this.getEvmNetworkFee()
      }
      if (!(soraNetworkFee && evmNetworkFee)) {
        this.saveHistory(tx)
      }
      await this.setEvmNetworkFee(evmNetworkFee || this.evmNetworkFee)
      await this.setTransactionStep(tx.transactionStep)
      await this.setCurrentTransactionState(tx.transactionState)
      await this.setHistoryItem(tx)

      this.navigateToBridgeTransaction()
    })
  }

  navigateToBridgeTransaction (): void {
    router.push({ name: PageNames.BridgeTransaction })
  }
}
