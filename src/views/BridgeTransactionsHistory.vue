<template>
  <div class="history-container">
    <s-card v-loading="parentLoading" class="history-content" border-radius="medium" shadow="never">
      <generic-page-header has-button-back :back-page-name="PageNames.Bridge" :title="t('bridgeHistory.title')">
        <s-button
          class="base-title_settings"
          type="action"
          icon="basic-trash-24"
          :disabled="!hasHistory"
          :tooltip="t('bridgeHistory.clearHistory')"
          tooltip-placement="bottom-end"
          @click="handleClearHistory"
        />
      </generic-page-header>
      <s-form
        class="history-form"
        :show-message="false"
      >
        <s-form-item v-if="history.length" class="history--search">
          <s-input
            v-model="query"
            :placeholder="t('bridgeHistory.filterPlaceholder')"
            prefix="el-icon-search"
            size="medium"
            border-radius="mini"
          >
            <template #suffix>
              <s-button class="s-button--clear" icon="clear-X-16" @click="handleResetSearch" />
            </template>
          </s-input>
        </s-form-item>
        <div class="history-items">
          <template v-if="hasHistory">
            <div
              class="history-item"
              v-for="item in filteredHistory.slice((currentPage - 1) * 10, currentPage * 10)"
              :key="`history-${item.id}`"
              @click="showHistory(item.id)"
            >
              <div class="history-item-info">
                <div class="history-item-title">{{ t('bridgeTransaction.details', {
                    from: `${item.amount} ${formatAssetSymbol(item.symbol, !isOutgoingType(item.type))}`,
                    to: `${item.amount} ${formatAssetSymbol(item.symbol, isOutgoingType(item.type))}`
                  }) }}</div>
                <div class="history-item-date">{{ formatDate(item) }}</div>
              </div>
              <div :class="historyStatusIconClasses(item.type, item.transactionState)" />
            </div>
          </template>
          <p v-else class="history-empty p4">{{ t('bridgeHistory.empty') }}</p>
        </div>
        <s-pagination
          v-if="hasHistory"
          :layout="'total, prev, next'"
          :current-page.sync="currentPage"
          :total="filteredHistory.length"
          @prev-click="handlePrevClick"
          @next-click="handleNextClick"
        />
      </s-form>
    </s-card>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'
import { RegisteredAccountAsset, BridgeTxStatus, Operation, isBridgeOperation, BridgeHistory } from '@sora-substrate/util'
import { api } from '@soramitsu/soraneo-wallet-web'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import router, { lazyComponent } from '@/router'
import { Components, PageNames } from '@/consts'
import { formatAssetSymbol, formatDateItem } from '@/utils'
import { STATES } from '@/utils/fsm'

const namespace = 'bridge'

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    InfoLine: lazyComponent(Components.InfoLine)
  }
})
export default class BridgeTransactionsHistory extends Mixins(TranslationMixin, LoadingMixin) {
  @Getter('registeredAssets', { namespace: 'assets' }) registeredAssets!: Array<RegisteredAccountAsset>
  @Getter('isSoraToEthereum', { namespace }) isSoraToEthereum!: boolean
  @Getter('history', { namespace }) history!: Array<BridgeHistory> | null
  @Getter('soraNetworkFee', { namespace }) soraNetworkFee!: string
  @Getter('ethereumNetworkFee', { namespace }) ethereumNetworkFee!: string

  @Action('getHistory', { namespace }) getHistory
  @Action('getNetworkFee', { namespace }) getNetworkFee
  @Action('getEthNetworkFee', { namespace }) getEthNetworkFee
  @Action('clearHistory', { namespace }) clearHistory
  @Action('setSoraToEthereum', { namespace }) setSoraToEthereum
  @Action('setTransactionConfirm', { namespace }) setTransactionConfirm
  @Action('setAssetAddress', { namespace }) setAssetAddress
  @Action('setAmount', { namespace }) setAmount
  @Action('setSoraTransactionHash', { namespace }) setSoraTransactionHash
  @Action('setEthereumTransactionHash', { namespace }) setEthereumTransactionHash
  @Action('setSoraTransactionDate', { namespace }) setSoraTransactionDate
  @Action('setEthereumTransactionDate', { namespace }) setEthereumTransactionDate
  @Action('setSoraNetworkFee', { namespace }) setSoraNetworkFee
  @Action('setEthereumNetworkFee', { namespace }) setEthereumNetworkFee
  @Action('setCurrentTransactionState', { namespace }) setCurrentTransactionState
  @Action('setTransactionStep', { namespace }) setTransactionStep
  @Action('setHistoryItem', { namespace }) setHistoryItem

  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean

  PageNames = PageNames
  formatAssetSymbol = formatAssetSymbol
  formatDateItem = formatDateItem
  query = ''
  currentPage = 1

  get filteredHistory (): Array<any> {
    if (!this.history?.length) return []
    const historyCopy = this.history.sort((a: BridgeHistory, b: BridgeHistory) => a.startTime && b.startTime ? b.startTime - a.startTime : 0)
    return this.getFilteredHistory(historyCopy.filter(item => (isBridgeOperation(item.type) && item.transactionStep)))
  }

  get hasHistory (): boolean {
    return this.filteredHistory && this.filteredHistory.length > 0
  }

  async created (): Promise<void> {
    this.withApi(async () => {
      await this.getHistory()
      await this.getNetworkFee()
      await this.getEthNetworkFee()
    })
  }

  getFilteredHistory (history: Array<any>): Array<any> {
    if (this.query) {
      const query = this.query.toLowerCase().trim()
      return history.filter(item =>
        `${item.assetAddress}`.toLowerCase().includes(query) ||
        `${this.registeredAssets.find(asset => asset.address === item.assetAddress)?.externalAddress}`.toLowerCase().includes(query) ||
        `${formatAssetSymbol(item.symbol)}`.toLowerCase().includes(query) ||
        `${formatAssetSymbol(item.symbol, true)}`.toLowerCase().includes(query)
      )
    }

    return history
  }

  formatDate (response: any): string {
    // We use current date if request is failed
    const date = response && response.endTime ? new Date(response.endTime) : new Date()
    return `${date.getDate()} ${this.t(`months[${date.getMonth()}]`)} ${date.getFullYear()}, ${formatDateItem(date.getHours())}:${formatDateItem(date.getMinutes())}:${formatDateItem(date.getSeconds())}`
  }

  historyStatusIconClasses (type: Operation, state: STATES): string {
    const iconClass = 'history-item-icon'
    const classes = [iconClass]
    if ([STATES.SORA_REJECTED, STATES.ETHEREUM_REJECTED].includes(state)) {
      classes.push(`${iconClass}--error`)
      return classes.join(' ')
    }
    if (!(this.isOutgoingType(type) ? state === STATES.ETHEREUM_COMMITED : state === STATES.SORA_COMMITED)) {
      classes.push(`${iconClass}--pending`)
      return classes.join(' ')
    }
    return classes.join(' ')
  }

  isOutgoingType (type: string | undefined): boolean {
    if (type) {
      return type !== Operation.EthBridgeIncoming
    }
    return true
  }

  async showHistory (id: string): Promise<void> {
    const tx = api.bridge.getHistory(id)
    if (tx) {
      await this.setTransactionConfirm(true)
      await this.setSoraToEthereum(this.isOutgoingType(tx.type))
      await this.setAssetAddress(tx.assetAddress)
      await this.setAmount(tx.amount)
      await this.setSoraTransactionHash(tx.hash)
      await this.setSoraTransactionDate(tx[this.isOutgoingType(tx.type) ? 'startTime' : 'endTime'])
      await this.setEthereumTransactionHash(tx.ethereumHash)
      await this.setEthereumTransactionDate(tx[!this.isOutgoingType(tx.type) ? 'startTime' : 'endTime'])
      if (tx.status === BridgeTxStatus.Failed) {
        await this.getNetworkFee()
        await this.getEthNetworkFee()
        await this.setSoraNetworkFee(this.isOutgoingType(tx.type) ? tx.soraNetworkFee : this.soraNetworkFee)
        await this.setEthereumNetworkFee(!this.isOutgoingType(tx.type) ? tx.ethereumNetworkFee : this.ethereumNetworkFee)
      } else {
        await this.setSoraNetworkFee(tx.soraNetworkFee)
        await this.setEthereumNetworkFee(tx.ethereumNetworkFee)
      }
      await this.setTransactionStep(tx.transactionStep)
      await this.setCurrentTransactionState(tx.transactionState)
      await this.setHistoryItem(tx)
    }
    router.push({ name: PageNames.BridgeTransaction })
  }

  handlePrevClick (current: number): void {
    this.currentPage = current
  }

  handleNextClick (current: number): void {
    this.currentPage = current
  }

  async handleClearHistory (): Promise<void> {
    await this.clearHistory()
  }

  handleResetSearch (): void {
    this.query = ''
    this.currentPage = 1
  }
}
</script>

<style lang="scss">
.history {
  &-container {
    @include bridge-container;
  }
  &-content {
    .el-card__body {
      padding: $inner-spacing-medium $inner-spacing-medium $inner-spacing-big;
    }
    .el-pagination {
      .btn {
        &-prev,
        &-next {
          padding-right: 0;
          padding-left: 0;
          min-width: $inner-spacing-big;
        }
        &-prev {
          margin-left: auto;
          margin-right: $inner-spacing-mini;
        }
      }
    }
  }
  &--search {
    .el-input__inner {
      padding-right: var(--s-size-medium);
    }
  }
}
</style>

<style lang="scss" scoped>
$history-item-horizontal-space: $inner-spacing-medium;
$history-item-height: 48px;
$history-item-top-border-height: 1px;
.history {
  &--search.el-form-item {
    margin-bottom: $basic-spacing * 2;
  }
  &-container {
    flex-direction: column;
    align-items: center;
    margin-top: $inner-spacing-large;
    margin-right: auto;
    margin-left: auto;
  }
  &-content {
    min-height: $bridge-height;
    @include bridge-content;
  }
  &-items {
    height: #{$history-item-height * 10};
  }
  &-empty {
    text-align: center;
    @include empty-search;
  }
}
@include search-item('history--search');
.history-item {
  display: flex;
  margin-right: -#{$history-item-horizontal-space};
  margin-left: -#{$history-item-horizontal-space};
  height: $history-item-height;
  padding: #{$inner-spacing-mini / 2 + $history-item-top-border-height} $history-item-horizontal-space $inner-spacing-mini;
  &:not(:first-child) {
    position: relative;
    &:before {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      display: block;
      margin-right: auto;
      margin-left: auto;
      height: 1px;
      width: calc(100% - #{$history-item-horizontal-space * 2});
      content: '';
      background-color: var(--s-color-base-border-secondary);
    }
  }
  &:hover {
    background-color: var(--s-color-base-background-hover);
    cursor: pointer;
    &:before, & + .history-item::before {
      width: 100%;
    }
  }
  &-info {
    font-size: var(--s-font-size-mini);
  }
  &-title,
  &-date {
    width: 100%;
  }
  &-title {
    line-height: $s-line-height-big;
  }
  &-date {
    color: var(--s-color-base-content-secondary);
    line-height: $s-line-height-mini;
  }
  @include status-icon(true);
  &-icon {
    flex-shrink: 0;
    align-self: flex-start;
    margin-top: $inner-spacing-mini / 2;
    margin-right: $inner-spacing-mini;
    margin-left: auto;
  }
}
.el-pagination {
  display: flex;
  margin-top: $inner-spacing-medium;
  padding-left: 0;
  padding-right: 0;
}
</style>
