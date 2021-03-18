<template>
  <div class="history-container">
    <s-card v-loading="parentLoading" class="history-content" border-radius="medium" shadow="never">
      <generic-page-header has-button-back :back-page-name="PageNames.Bridge" :title="t('bridgeHistory.title')">
        <s-tooltip
            popper-class="info-tooltip"
            :content="t('bridgeHistory.clearHistory')"
            placement="bottom-end"
          >
          <s-button
            class="base-title_settings"
            type="action"
            icon="trash"
            size="medium"
            :disabled="!hasHistory"
            @click="handleSettingsClick"
          />
        </s-tooltip>
      </generic-page-header>
      <s-form
        class="history-form"
        :show-message="false"
      >
        <s-form-item class="history--search">
          <s-input
            v-model="query"
            :placeholder="t('bridgeHistory.filterPlaceholder')"
            prefix="el-icon-search"
            size="medium"
            border-radius="mini"
          />
          <!-- TODO: Change the icon -->
          <s-button class="s-button--clear" icon="circle-x" @click="handleResetSearch" />
        </s-form-item>
        <div class="history-items">
          <template v-if="hasHistory">
            <div v-for="item in filteredHistory.slice((currentPage - 1) * 10, currentPage * 10)" :key="item.id" class="history-item" :data-id="item.id || item.hash || item.ethereumHash" @click="showHistory(item.id || item.hash || item.ethereumHash)">
              <div class="history-item-info">
                <div class="history-item-title">{{ t('bridgeTransaction.details', {
                    from: `${item.amount} ${formatAssetSymbol(item.symbol, !isOutgoingType(item.type))}`,
                    to: `${item.amount} ${formatAssetSymbol(item.symbol, isOutgoingType(item.type))}`
                  }) }}</div>
                <div class="history-item-date">{{ formatDate(item) }}</div>
              </div>
              <div :class="historyStatusIconClasses(item.status)" />
            </div>
          </template>
          <p v-else class="history-empty">{{ t('bridgeHistory.emptyHistory') }}</p>
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
import { BridgeTxStatus, Operation } from '@sora-substrate/util'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import router, { lazyComponent } from '@/router'
import { Components, PageNames } from '@/consts'
import { RegisteredAccountAsset } from '@/store/assets'
import { formatAssetSymbol, formatDateItem } from '@/utils'

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
  @Getter('history', { namespace }) history!: Array<any>
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
    const historyCopy = this.history.slice().reverse()
    return this.getFilteredHistory(
      historyCopy.filter(item => ([Operation.EthBridgeOutgoing, Operation.EthBridgeIncoming].includes(item.type) && item.transactionStep))
    )
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
        `${this.getAssetBySymbol(item.symbol)?.address}`.toLowerCase().includes(query) ||
        `${this.getAssetBySymbol(item.symbol)?.externalAddress}`.toLowerCase().includes(query) ||
        `${formatAssetSymbol(item.symbol)}`.toLowerCase().includes(query) ||
        `${formatAssetSymbol(item.symbol, true)}`.toLowerCase().includes(query)
      )
    }

    return history
  }

  getAssetBySymbol (symbol: string): RegisteredAccountAsset | null {
    return symbol ? this.registeredAssets.filter(asset => asset.symbol === symbol)?.[0] : null
  }

  formatDate (response: any): string {
    // We use current date if request is failed
    const date = response && response.endTime ? new Date(response.endTime) : new Date()
    return `${date.getDate()} ${this.t(`months[${date.getMonth()}]`)} ${date.getFullYear()}, ${formatDateItem(date.getHours())}:${formatDateItem(date.getMinutes())}:${formatDateItem(date.getSeconds())}`
  }

  historyStatusIconClasses (status: string): string {
    const iconClass = 'history-item-icon'
    const classes = [iconClass]
    if (status === BridgeTxStatus.Ready || status === BridgeTxStatus.Pending) {
      classes.push(`${iconClass}--pending`)
      return classes.join(' ')
    }
    if (status === BridgeTxStatus.Failed) {
      classes.push(`${iconClass}--error`)
    }
    return classes.join(' ')
  }

  isOutgoingType (type: string | undefined): boolean {
    if (type) {
      return type !== Operation.EthBridgeIncoming
    }
    return true
  }

  async showHistory (idOrHash: string): Promise<void> {
    const currentTransaction = this.filteredHistory.filter(item => (item.id === idOrHash) || (this.isOutgoingType(item.type) ? item.hash === idOrHash : item.ethereumHash === idOrHash))[0]
    if (currentTransaction) {
      await this.setTransactionConfirm(true)
      await this.setSoraToEthereum(this.isOutgoingType(currentTransaction.type))
      await this.setAssetAddress(this.getAssetBySymbol(currentTransaction?.symbol)?.address)
      await this.setAmount(currentTransaction.amount)
      await this.setSoraTransactionHash(currentTransaction.hash)
      await this.setSoraTransactionDate(currentTransaction[this.isOutgoingType(currentTransaction.type) ? 'startTime' : 'endTime'])
      await this.setEthereumTransactionHash(currentTransaction.ethereumHash)
      await this.setEthereumTransactionDate(currentTransaction[!this.isOutgoingType(currentTransaction.type) ? 'startTime' : 'endTime'])
      if (currentTransaction.status === BridgeTxStatus.Failed) {
        await this.getNetworkFee()
        await this.getEthNetworkFee()
        await this.setSoraNetworkFee(this.isOutgoingType(currentTransaction.type) ? currentTransaction.soraNetworkFee : this.soraNetworkFee)
        await this.setEthereumNetworkFee(!this.isOutgoingType(currentTransaction.type) ? currentTransaction.ethereumNetworkFee : this.ethereumNetworkFee)
      } else {
        await this.setSoraNetworkFee(currentTransaction.soraNetworkFee)
        await this.setEthereumNetworkFee(currentTransaction.ethereumNetworkFee)
      }
      await this.setTransactionStep(currentTransaction.transactionStep)
      await this.setCurrentTransactionState(currentTransaction.transactionState)
      await this.setHistoryItem(currentTransaction)
    }
    router.push({ name: PageNames.BridgeTransaction })
  }

  handlePrevClick (current: number): void {
    this.currentPage = current
  }

  handleNextClick (current: number): void {
    this.currentPage = current
  }

  async handleSettingsClick (): Promise<void> {
    await this.clearHistory()
  }

  handleResetSearch (): void {
    this.query = ''
    this.currentPage = 1
  }
}
</script>

<style lang="scss">
$history-search-class: 'history--search';
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
}

@include search-item-unscoped($history-search-class);
.#{$history-search-class} {
  .el-input__inner {
    padding-right: var(--s-size-medium);
  }
}
</style>

<style lang="scss" scoped>
$tooltip-area-height: var(--s-size-medium);
$tooltip-size: var(--s-size-medium);
$title-padding: calc(#{var(--s-size-medium)} + #{$inner-spacing-small});
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
@include search-item('history--search', 0);
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
    &:not(:first-child) {
      &:before {
        width: 100%;
      }
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
  @include status-icon;
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
