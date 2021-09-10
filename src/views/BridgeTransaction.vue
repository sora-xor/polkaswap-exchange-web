<template>
  <div v-loading="!isInitRequestCompleted" class="container transaction-container">
    <generic-page-header has-button-back :title="t('bridgeTransaction.title')" @back="handleBack">
      <s-button
        v-if="isInitRequestCompleted"
        class="el-button--history"
        type="action"
        icon="time-time-history-24"
        :tooltip="t('bridgeHistory.showHistory')"
        tooltip-placement="bottom-end"
        @click="handleViewTransactionsHistory"
      />
    </generic-page-header>
    <div class="transaction-content">
      <template v-if="isInitRequestCompleted">
        <div class="header">
          <div v-loading="isTransactionFromPending || isTransactionToPending" :class="headerIconClasses" />
          <h5 class="header-details">
            <formatted-amount class="info-line-value" :value="formattedAmount" :asset-symbol="formattedAssetSymbol">
              <i :class="firstNetworkIcon" />
            </formatted-amount>
            <span class="header-details-separator">{{ t('bridgeTransaction.for') }}</span>
            <formatted-amount class="info-line-value" :value="formattedAmount" :asset-symbol="formattedAssetSymbol">
              <i :class="secondNetworkIcon" />
            </formatted-amount>
          </h5>
          <p class="header-status">{{ headerStatus }}</p>
        </div>
        <s-collapse borders :value="activeTransactionStep">
          <s-collapse-item :name="transactionSteps.from">
            <template #title>
              <div class="network-info-title">
                <h3>{{ `${t('bridgeTransaction.steps.step', { step: '1' })} ${t('bridgeTransaction.networkTitle', { network: formattedNetworkStep1 })}` }}</h3>
                <span :class="firstTxIconStatusClasses" />
              </div>
            </template>
            <div v-if="transactionFromHash" :class="firstTxHashContainerClasses">
              <s-input :placeholder="t('bridgeTransaction.transactionHash')" :value="firstTxHash" readonly />
              <s-button class="s-button--hash-copy" type="action" alternative icon="basic-copy-24" @click="handleCopyTransactionHash(transactionFromHash)" />
              <s-dropdown
                class="s-dropdown--hash-menu"
                borderRadius="mini"
                type="ellipsis"
                icon="basic-more-vertical-24"
                placement="bottom-end"
                @select="(isSoraToEvm ? handleOpenSorascan : handleOpenEtherscan)()"
              >
                <template slot="menu">
                  <s-dropdown-item class="s-dropdown-menu__item" :disabled="isSoraToEvm && !(soraTxId || soraTxBlockId)">
                    <span>{{ t(`bridgeTransaction.${isSoraToEvm ? 'viewInSorascan' : 'viewInEtherscan'}`) }}</span>
                  </s-dropdown-item>
                </template>
              </s-dropdown>
            </div>
            <info-line :class="failedClassStep1" :label="t('bridgeTransaction.networkInfo.status')" :value="statusFrom" />
            <info-line :label="t('bridgeTransaction.networkInfo.date')" :value="transactionFirstDate" />
            <info-line
              v-if="amount"
              :label="t('bridgeTransaction.networkInfo.amount')"
              :value="`-${formattedAmount}`"
              :asset-symbol="formattedAssetSymbol"
              :fiat-value="firstAmountFiatValue"
              is-formatted
            />
            <info-line
              :label="t('bridgeTransaction.networkInfo.transactionFee')"
              :value="isSoraToEvm ? formattedSoraNetworkFee : formattedEvmNetworkFee"
              :asset-symbol="isSoraToEvm ? KnownSymbols.XOR : evmTokenSymbol"
              :fiat-value="soraFeeFiatValue"
              is-formatted
            >
              <template v-if="!isSoraToEvm && formattedEvmNetworkFee" #info-line-value-prefix>
                <span class="info-line-value-prefix">~</span>
              </template>
            </info-line>
            <!-- TODO: We don't need this block right now. How we should calculate the total? What for a case with not XOR asset (We can't just add it to soraNetworkFee as usual)? -->
            <!-- <info-line :label="t('bridgeTransaction.networkInfo.total')" :value="isSoraToEvm ? formattedSoraNetworkFee : ethereumNetworkFee" :asset-symbol="isSoraToEvm ? KnownSymbols.XOR : evmTokenSymbol" /> -->
            <s-button
              v-if="isTransactionStep1"
              type="primary"
              class="s-typograhy-button--big"
              :disabled="isFirstConfirmationButtonDisabled"
              @click="handleSendTransactionFrom"
            >
              <template v-if="!(isSoraToEvm || isExternalAccountConnected)">{{ t('bridgeTransaction.connectWallet') }}</template>
              <template v-else-if="!(isSoraToEvm || isValidNetworkType)">{{ t('bridgeTransaction.changeNetwork') }}</template>
              <span v-else-if="isTransactionFromPending" v-html="t('bridgeTransaction.pending', { network: t(`bridgeTransaction.${isSoraToEvm ? 'sora' : 'ethereum'}`) })" />
              <template v-else-if="isInsufficientBalance">{{ t('confirmBridgeTransactionDialog.insufficientBalance', { tokenSymbol: formattedAssetSymbol }) }}</template>
              <template v-else-if="isInsufficientXorForFee">{{ t('confirmBridgeTransactionDialog.insufficientBalance', { tokenSymbol: KnownSymbols.XOR }) }}</template>
              <template v-else-if="isInsufficientEvmNativeTokenForFee">{{ t('confirmBridgeTransactionDialog.insufficientBalance', { tokenSymbol: evmTokenSymbol }) }}</template>
              <template v-else-if="isTransactionFromFailed">{{ t('bridgeTransaction.retry') }}</template>
              <template v-else>{{ t('bridgeTransaction.confirm', { direction: t(`bridgeTransaction.${isSoraToEvm ? 'sora' : 'metamask'}`) }) }}</template>
            </s-button>
          </s-collapse-item>
          <s-collapse-item :name="transactionSteps.to">
            <template #title>
              <div class="network-info-title">
                <h3>{{ `${t('bridgeTransaction.steps.step', { step: '2' })} ${t('bridgeTransaction.networkTitle', { network: formattedNetworkStep2 })}` }}</h3>
                <span v-if="isTransactionStep2" :class="secondTxIconStatusClasses" />
              </div>
            </template>
            <div v-if="isSoraToEvm && !isTxEvmAccount" class="transaction-error">
              <span class="transaction-error__title">{{ t('bridgeTransaction.expectedMetaMaskAddress') }}</span>
              <span class="transaction-error__value">{{ transactionEvmAddress }}</span>
            </div>
            <div v-if="isTransactionStep2 && transactionToHash" :class="secondTxHashContainerClasses">
              <s-input :placeholder="t('bridgeTransaction.transactionHash')" :value="secondTxHash" readonly />
              <s-button class="s-button--hash-copy" type="action" alternative icon="basic-copy-24" @click="handleCopyTransactionHash(transactionToHash)" />
              <s-dropdown
                v-if="isSoraToEvm"
                class="s-dropdown--hash-menu"
                borderRadius="mini"
                type="ellipsis"
                icon="basic-more-vertical-24"
                placement="bottom-end"
                @select="handleOpenEtherscan"
              >
                <template slot="menu">
                  <s-dropdown-item class="s-dropdown-menu__item">
                    <span>{{ t('bridgeTransaction.viewInEtherscan') }}</span>
                  </s-dropdown-item>
                </template>
              </s-dropdown>
            </div>
            <info-line :class="failedClassStep2" :label="t('bridgeTransaction.networkInfo.status')" :value="statusTo" />
            <info-line :label="t('bridgeTransaction.networkInfo.date')" :value="transactionSecondDate" />
            <info-line
              v-if="amount"
              :label="t('bridgeTransaction.networkInfo.amount')"
              :value="formattedAmount"
              :asset-symbol="formattedAssetSymbol"
              :fiat-value="secondAmountFiatValue"
              is-formatted
            />
            <info-line
              :label="t('bridgeTransaction.networkInfo.transactionFee')"
              :value="!isSoraToEvm ? formattedSoraNetworkFee : formattedEvmNetworkFee"
              :asset-symbol="!isSoraToEvm ? KnownSymbols.XOR : evmTokenSymbol"
              :fiat-value="soraNetworkFeeFiatValue"
              is-formatted
            >
              <template v-if="isSoraToEvm && formattedEvmNetworkFee" #info-line-value-prefix>
                <span class="info-line-value-prefix">~</span>
              </template>
            </info-line>
            <!-- TODO: We don't need this block right now. How we should calculate the total? What for a case with not XOR asset (We can't just add it to soraNetworkFee as usual)? -->
            <!-- <info-line :label="t('bridgeTransaction.networkInfo.total')" :value="!isSoraToEvm ? formattedSoraNetworkFee : ethereumNetworkFee" :asset-symbol="!isSoraToEvm ? KnownSymbols.XOR : evmTokenSymbol" /> -->
            <s-button
              v-if="isTransactionStep2 && !isTransferCompleted"
              type="primary"
              class="s-typograhy-button--big"
              :disabled="isSecondConfirmationButtonDisabled"
              @click="handleSendTransactionTo"
            >
              <template v-if="isSoraToEvm && !isExternalAccountConnected">{{ t('bridgeTransaction.connectWallet') }}</template>
              <template v-else-if="isSoraToEvm && !isTxEvmAccount">{{ t('bridgeTransaction.changeAccount') }}</template>
              <template v-else-if="isSoraToEvm && !isValidNetworkType">{{ t('bridgeTransaction.changeNetwork') }}</template>
              <span v-else-if="isTransactionToPending" v-html="t('bridgeTransaction.pending', { network: t(`bridgeTransaction.${!isSoraToEvm ? 'sora' : 'ethereum'}`) })" />
              <template v-else-if="isSoraToEvm ? isInsufficientEvmNativeTokenForFee : isInsufficientXorForFee">{{ t('confirmBridgeTransactionDialog.insufficientBalance', { tokenSymbol: isSoraToEvm ? evmTokenSymbol : KnownSymbols.XOR }) }}</template>
              <template v-else-if="isTransactionToFailed">{{ t('bridgeTransaction.retry') }}</template>
              <template v-else>{{ t('bridgeTransaction.confirm', { direction: t(`bridgeTransaction.${!isSoraToEvm ? 'sora' : 'metamask'}`) }) }}</template>
            </s-button>
          </s-collapse-item>
        </s-collapse>
      </template>
    </div>
    <s-button
      v-if="isInitRequestCompleted && isTransferCompleted"
      class="s-typography-button--large"
      type="secondary"
      @click="handleCreateTransaction"
    >
      {{ t('bridgeTransaction.newTransaction') }}
    </s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'
import { AccountAsset, RegisteredAccountAsset, KnownSymbols, FPNumber, CodecString, BridgeHistory, BridgeNetworks } from '@sora-substrate/util'
import { api, getExplorerLink, FormattedAmountMixin, FormattedAmount, InfoLine } from '@soramitsu/soraneo-wallet-web'
import { interpret } from 'xstate'

import BridgeMixin from '@/components/mixins/BridgeMixin'
import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin'

import router, { lazyComponent } from '@/router'
import { Components, PageNames, EvmSymbol, MetamaskCancellationCode } from '@/consts'
import { formatAssetSymbol, copyToClipboard, formatDateItem, hasInsufficientBalance, hasInsufficientXorForFee, hasInsufficientEvmNativeTokenForFee } from '@/utils'
import { createFSM, EVENTS, SORA_EVM_STATES, EVM_SORA_STATES, STATES } from '@/utils/fsm'

const FORMATTED_HASH_LENGTH = 24
const namespace = 'bridge'

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    ConfirmBridgeTransactionDialog: lazyComponent(Components.ConfirmBridgeTransactionDialog),
    FormattedAmount,
    InfoLine
  }
})
export default class BridgeTransaction extends Mixins(
  FormattedAmountMixin,
  BridgeMixin,
  NetworkFormatterMixin
) {
  @Getter soraNetwork!: string
  @Getter('isValidNetworkType', { namespace: 'web3' }) isValidNetworkType!: boolean
  @Getter('prev', { namespace: 'router' }) prevRoute!: PageNames

  @Getter('isSoraToEvm', { namespace }) isSoraToEvm!: boolean
  @Getter('asset', { namespace }) asset!: Nullable<AccountAsset | RegisteredAccountAsset>
  @Getter('tokenXOR', { namespace: 'assets' }) tokenXOR!: any
  @Getter('amount', { namespace }) amount!: string
  @Getter('evmBalance', { namespace: 'web3' }) evmBalance!: CodecString
  @Getter('evmNetwork', { namespace: 'web3' }) evmNetwork!: BridgeNetworks
  @Getter('evmNetworkFee', { namespace }) evmNetworkFee!: CodecString
  @Getter('soraNetworkFee', { namespace }) soraNetworkFee!: CodecString
  @Getter('isTransactionConfirmed', { namespace }) isTransactionConfirmed!: boolean
  @Getter('soraTransactionHash', { namespace }) soraTransactionHash!: string
  @Getter('evmTransactionHash', { namespace }) evmTransactionHash!: string
  @Getter('soraTransactionDate', { namespace }) soraTransactionDate!: string
  @Getter('evmTransactionDate', { namespace }) evmTransactionDate!: string
  @Getter('currentTransactionState', { namespace }) currentState!: STATES
  @Getter('initialTransactionState', { namespace }) initialTransactionState!: STATES
  @Getter('transactionStep', { namespace }) transactionStep!: number
  @Getter('historyItem', { namespace }) historyItem!: any
  @Getter('isTxEvmAccount', { namespace }) isTxEvmAccount!: boolean

  @Action('setCurrentTransactionState', { namespace }) setCurrentTransactionState
  @Action('setInitialTransactionState', { namespace }) setInitialTransactionState
  @Action('setTransactionStep', { namespace }) setTransactionStep
  @Action('setHistoryItem', { namespace }) setHistoryItem

  @Action('signSoraTransactionSoraToEvm', { namespace }) signSoraTransactionSoraToEvm
  @Action('signEvmTransactionSoraToEvm', { namespace }) signEvmTransactionSoraToEvm
  @Action('sendSoraTransactionSoraToEvm', { namespace }) sendSoraTransactionSoraToEvm
  @Action('sendEvmTransactionSoraToEvm', { namespace }) sendEvmTransactionSoraToEvm

  @Action('signSoraTransactionEvmToSora', { namespace }) signSoraTransactionEvmToSora
  @Action('signEvmTransactionEvmToSora', { namespace }) signEvmTransactionEvmToSora
  @Action('sendSoraTransactionEvmToSora', { namespace }) sendSoraTransactionEvmToSora
  @Action('sendEvmTransactionEvmToSora', { namespace }) sendEvmTransactionEvmToSora

  @Action('generateHistoryItem', { namespace }) generateHistoryItem!: ({ date: Date }) => Promise<BridgeHistory>
  @Action('updateHistoryParams', { namespace }) updateHistoryParams
  @Action('removeHistoryById', { namespace }) removeHistoryById
  @Action('setSoraTransactionHash', { namespace }) setSoraTransactionHash
  @Action('setEvmTransactionHash', { namespace }) setEvmTransactionHash

  EvmSymbol = EvmSymbol
  KnownSymbols = KnownSymbols
  STATES = STATES

  callFirstTransition = () => {}
  callSecondTransition = () => {}
  callRetryTransition = () => {}
  sendService: any = null
  isInitRequestCompleted = false
  transactionSteps = {
    from: 'step-from',
    to: 'step-to'
  }

  activeTransactionStep: any = [this.transactionSteps.from, this.transactionSteps.to]

  get formattedAmount (): string {
    return this.amount && this.asset ? new FPNumber(this.amount, this.asset.decimals).toLocaleString() : ''
  }

  get assetSymbol (): string {
    return this.asset?.symbol ?? ''
  }

  get formattedAssetSymbol (): string {
    return formatAssetSymbol(this.assetSymbol)
  }

  get evmIcon (): string {
    return this.getEvmIcon(this.evmNetwork)
  }

  get soraFeeFiatValue (): Nullable<string> {
    if (this.isSoraToEvm) {
      return this.getFiatAmountByCodecString(this.historyItem?.soraNetworkFee || this.soraNetworkFee)
    }
    return null
  }

  get firstAmountFiatValue (): Nullable<string> {
    if (this.isSoraToEvm && this.asset) {
      return this.getFiatAmountByString(this.amount, this.asset)
    }
    return null
  }

  get secondAmountFiatValue (): Nullable<string> {
    if (!this.isSoraToEvm && this.asset) {
      return this.getFiatAmountByString(this.amount, this.asset)
    }
    return null
  }

  get isTransactionStep1 (): boolean {
    return this.transactionStep === 1
  }

  get isTransactionStep2 (): boolean {
    return this.transactionStep === 2
  }

  get isTransactionFromPending (): boolean {
    return this.currentState === (this.isSoraToEvm ? STATES.SORA_PENDING : STATES.EVM_PENDING)
  }

  get isTransactionToPending (): boolean {
    return this.currentState === (!this.isSoraToEvm ? STATES.SORA_PENDING : STATES.EVM_PENDING)
  }

  get isTransactionFromFailed (): boolean {
    return this.currentState === (this.isSoraToEvm ? STATES.SORA_REJECTED : STATES.EVM_REJECTED)
  }

  get isTransactionToFailed (): boolean {
    return this.currentState === (!this.isSoraToEvm ? STATES.SORA_REJECTED : STATES.EVM_REJECTED)
  }

  get isTransactionFromCompleted (): boolean {
    return !this.isTransactionStep1
  }

  get isTransferCompleted (): boolean {
    const isTransactionCompleted = this.currentState === (!this.isSoraToEvm ? STATES.SORA_COMMITED : STATES.EVM_COMMITED)
    if (isTransactionCompleted) {
      this.activeTransactionStep = null
    }
    return isTransactionCompleted
  }

  get headerIconClasses (): string {
    const iconClass = 'header-icon'
    const classes = [iconClass]

    if (this.isTransactionFromFailed || this.isTransactionToFailed) {
      classes.push(`${iconClass}--error`)
    }

    if (this.isTransactionStep2) {
      if (this.isTransactionFromCompleted && !this.isTransferCompleted) {
        classes.push(`${iconClass}--wait`)
        return classes.join(' ')
      }
      if (this.isTransferCompleted) {
        classes.push(`${iconClass}--success`)
      }
    }

    return classes.join(' ')
  }

  get headerStatus (): string {
    const failedAndPendingParams = { step: this.t('bridgeTransaction.steps.step', { step: this.t(`bridgeTransaction.steps.step${this.transactionStep}`) }) }
    if (this.isTransactionFromPending || this.isTransactionToPending) {
      return this.t('bridgeTransaction.status.pending', failedAndPendingParams)
    }
    if (this.isTransactionFromFailed || this.isTransactionToFailed) {
      return this.t('bridgeTransaction.status.failed', failedAndPendingParams)
    }
    if (this.isTransferCompleted) {
      return this.t('bridgeTransaction.status.convertionComplete')
    }
    return this.t('bridgeTransaction.status.confirm')
  }

  get statusFrom (): string {
    if (!this.currentState) {
      return this.t('bridgeTransaction.statuses.waiting') + '...'
    }
    if (this.isTransactionStep1) {
      if (this.currentState === (this.isSoraToEvm ? STATES.SORA_PENDING : STATES.EVM_PENDING)) {
        return this.t('bridgeTransaction.statuses.pending') + '...'
      }
      if (this.currentState === (this.isSoraToEvm ? STATES.SORA_REJECTED : STATES.EVM_REJECTED)) {
        return this.t('bridgeTransaction.statuses.failed')
      }
    }
    return this.t('bridgeTransaction.statuses.done')
  }

  get statusTo (): string {
    if (!this.currentState || !this.isTransactionFromCompleted) {
      return this.t('bridgeTransaction.statuses.waiting') + '...'
    }
    if (this.currentState === (!this.isSoraToEvm ? STATES.SORA_PENDING : STATES.EVM_PENDING)) {
      const message = this.t('bridgeTransaction.statuses.pending') + '...'
      if (this.isSoraToEvm) {
        return message
      }
      return `${message} (${this.t('bridgeTransaction.wait30Block')})`
    }
    if (this.currentState === (!this.isSoraToEvm ? STATES.SORA_REJECTED : STATES.EVM_REJECTED)) {
      return this.t('bridgeTransaction.statuses.failed')
    }
    if (this.isTransferCompleted) {
      return this.t('bridgeTransaction.statuses.done')
    }
    return this.t('bridgeTransaction.statuses.waitingForConfirmation')
  }

  get transactionEvmAddress (): string {
    return this.historyItem?.to ?? ''
  }

  get soraTxId (): Nullable<string> {
    if (!this.historyItem?.id) {
      return null
    }
    return this.historyItem.txId || api.bridge.getHistory(this.historyItem.id)?.txId
  }

  get soraTxBlockId (): Nullable<string> {
    if (!this.historyItem?.id) {
      return null
    }
    return this.historyItem.blockId || api.bridge.getHistory(this.historyItem.id)?.blockId
  }

  get transactionFromHash (): string {
    if (this.isSoraToEvm) {
      return this.soraTransactionHash
    }
    return this.evmTransactionHash
  }

  get transactionToHash (): string {
    if (!this.isSoraToEvm) {
      return this.soraTransactionHash
    }
    return this.evmTransactionHash
  }

  get transactionFirstDate (): string {
    return this.getTransactionDate(this.isSoraToEvm ? this.soraTransactionDate : this.evmTransactionDate)
  }

  get transactionSecondDate (): string {
    return this.getTransactionDate(!this.isSoraToEvm ? this.soraTransactionDate : this.evmTransactionDate)
  }

  get formattedSoraNetworkFee (): string {
    return this.getStringFromCodec(this.historyItem?.soraNetworkFee || this.soraNetworkFee, this.tokenXOR?.decimals)
  }

  get soraNetworkFeeFiatValue (): Nullable<string> {
    if (this.isSoraToEvm) {
      return null
    }
    return this.getFiatAmountByCodecString(this.historyItem?.soraNetworkFee || this.soraNetworkFee)
  }

  get formattedEvmNetworkFee (): string {
    return this.getFPNumberFromCodec(this.historyItem?.ethereumNetworkFee ?? this.evmNetworkFee).toLocaleString()
  }

  get isInsufficientBalance (): boolean {
    const fee = this.isSoraToEvm
      ? this.historyItem?.soraNetworkFee ?? this.soraNetworkFee
      : this.historyItem?.ethereumNetworkFee ?? this.evmNetworkFee

    if (!this.asset || !this.amount || !fee) return false

    return hasInsufficientBalance(this.asset, this.amount, fee, !this.isSoraToEvm)
  }

  get isInsufficientXorForFee (): boolean {
    return hasInsufficientXorForFee(this.tokenXOR, this.historyItem?.soraNetworkFee ?? this.soraNetworkFee)
  }

  get isInsufficientEvmNativeTokenForFee (): boolean {
    return hasInsufficientEvmNativeTokenForFee(this.evmBalance, this.historyItem?.ethereumNetworkFee ?? this.evmNetworkFee)
  }

  get evmTokenSymbol (): string {
    if (this.evmNetwork === BridgeNetworks.ENERGY_NETWORK_ID) {
      return this.EvmSymbol.VT
    }
    return this.EvmSymbol.ETH
  }

  get isFirstConfirmationButtonDisabled (): boolean {
    return !(this.isSoraToEvm || this.isValidNetworkType) ||
      this.currentState === STATES.INITIAL ||
      this.isInsufficientBalance ||
      this.isInsufficientXorForFee ||
      this.isInsufficientEvmNativeTokenForFee ||
      this.isTransactionFromPending
  }

  get isSecondConfirmationButtonDisabled (): boolean {
    return (this.isSoraToEvm && !(this.isValidNetworkType && this.isTxEvmAccount)) ||
      (this.isSoraToEvm ? this.isInsufficientEvmNativeTokenForFee : this.isInsufficientXorForFee) ||
      this.isTransactionToPending
  }

  get firstNetworkIcon (): string {
    return `s-icon--network s-icon-${this.isSoraToEvm ? 'sora' : this.evmIcon}`
  }

  get secondNetworkIcon (): string {
    return `s-icon--network s-icon-${this.isSoraToEvm ? this.evmIcon : 'sora'}`
  }

  private openBlockExplorer (url: string): void {
    const win = window.open(url, '_blank')
    win && win.focus()
  }

  handleOpenEtherscan (): void {
    const hash = this.isSoraToEvm ? this.transactionToHash : this.transactionFromHash
    const url = this.getEtherscanLink(hash, true)
    this.openBlockExplorer(url)
  }

  handleOpenSorascan (): void {
    const txId = this.soraTxId || this.soraTxBlockId
    const explorerPath = this.soraTxId ? 'transaction' : 'block'
    if (!(this.isSoraToEvm && txId)) {
      return
    }
    const url = `${getExplorerLink(this.soraNetwork)}/${explorerPath}/${txId}`
    this.openBlockExplorer(url)
  }

  get firstTxHash (): string {
    return this.formatAddress(this.transactionFromHash, FORMATTED_HASH_LENGTH)
  }

  get secondTxHash (): string {
    return this.formatAddress(this.transactionToHash, FORMATTED_HASH_LENGTH)
  }

  handleViewTransactionsHistory (): void {
    router.push({ name: PageNames.BridgeTransactionsHistory })
  }

  handleCreateTransaction (): void {
    router.push({ name: PageNames.Bridge })
  }

  async created (): Promise<void> {
    if (!this.isTransactionConfirmed) {
      router.push({ name: PageNames.Bridge })
      return
    }
    this.initializeTransactionStateMachine()
    this.isInitRequestCompleted = true
    const withAutoRetry = this.prevRoute !== PageNames.BridgeTransactionsHistory
    await this.handleSendTransactionFrom(withAutoRetry)
  }

  async beforeDestroy (): Promise<void> {
    this.setInitialTransactionState(STATES.INITIAL)
    this.setCurrentTransactionState(STATES.INITIAL)
    this.setTransactionStep(1)
    this.setHistoryItem(null)
    if (this.sendService) {
      this.sendService.stop()
    }
  }

  async initializeTransactionStateMachine () {
    // Create state machine and interpret it
    const historyItem = this.historyItem
      ? this.historyItem
      : await this.generateHistoryItem({ date: Date.now() })
    const machineStates = this.isSoraToEvm ? SORA_EVM_STATES : EVM_SORA_STATES
    const initialState = this.initialTransactionState === this.currentState
      ? this.initialTransactionState
      : this.currentState
    this.sendService = interpret(
      createFSM(
        {
          history: historyItem,
          SORA_EVM: {
            sora: {
              sign: this.signSoraTransactionSoraToEvm,
              send: this.sendSoraTransactionSoraToEvm
            },
            evm: {
              sign: this.signEvmTransactionSoraToEvm,
              send: this.sendEvmTransactionSoraToEvm
            }
          },
          EVM_SORA: {
            sora: {
              sign: this.signSoraTransactionEvmToSora,
              send: this.sendSoraTransactionEvmToSora
            },
            evm: {
              sign: this.signEvmTransactionEvmToSora,
              send: this.sendEvmTransactionEvmToSora
            }
          }
        },
        machineStates,
        initialState
      )
    )

    this.callFirstTransition = () => machineStates === SORA_EVM_STATES
      ? this.sendService.send(EVENTS.SEND_SORA)
      : this.sendService.send(EVENTS.SEND_EVM)

    this.callSecondTransition = () => machineStates === SORA_EVM_STATES
      ? this.sendService.send(EVENTS.SEND_EVM)
      : this.sendService.send(EVENTS.SEND_SORA)

    this.callRetryTransition = () => this.sendService.send(EVENTS.RETRY)

    // Subscribe to transition events
    this.sendService
      .onTransition(async state => {
        await this.setCurrentTransactionState(state.context.history.transactionState)
        await this.updateHistoryParams({ tx: state.context.history })

        if (
          !state.context.history.hash?.length &&
          !state.context.history.ethereumHash?.length &&
          [STATES.SORA_REJECTED, STATES.EVM_REJECTED].includes(state.value)
        ) {
          if (
            state.event.data?.message.includes('Cancelled') ||
            state.event.data?.code === MetamaskCancellationCode
          ) {
            await this.removeHistoryById(state.context.history.id)
          }
        }

        if (state.context.history.hash && !this.soraTransactionHash.length) {
          await this.setSoraTransactionHash(state.context.history.hash)
        }
        if (state.context.history.ethereumHash && !this.evmTransactionHash.length) {
          await this.setEvmTransactionHash(state.context.history.ethereumHash)
        }

        if (
          (machineStates === SORA_EVM_STATES && state.value === STATES.SORA_COMMITED) ||
          (machineStates === EVM_SORA_STATES && state.value === STATES.EVM_COMMITED)
        ) {
          await this.setFromTransactionCompleted()
          this.callSecondTransition()
        }
      })
      .start()
  }

  setFromTransactionCompleted () {
    this.setTransactionStep(2)
    this.activeTransactionStep = this.transactionSteps.to
  }

  private getTxIconStatusClasses (isSecondTransaction?: boolean): string {
    const iconClass = 'network-info-icon'
    const classes = [iconClass]
    if (isSecondTransaction) {
      if (this.currentState === (!this.isSoraToEvm ? STATES.SORA_REJECTED : STATES.EVM_REJECTED)) {
        classes.push(`${iconClass}--error`)
        return classes.join(' ')
      }
      if (this.isTransferCompleted) {
        classes.push(`${iconClass}--success`)
        return classes.join(' ')
      }
    } else {
      if (this.currentState === (this.isSoraToEvm ? STATES.SORA_REJECTED : STATES.EVM_REJECTED)) {
        classes.push(`${iconClass}--error`)
        return classes.join(' ')
      }
      if (this.isTransactionFromCompleted) {
        classes.push(`${iconClass}--success`)
        return classes.join(' ')
      }
    }
    classes.push(`${iconClass}--pending`)
    return classes.join(' ')
  }

  get firstTxIconStatusClasses (): string {
    return this.getTxIconStatusClasses()
  }

  get secondTxIconStatusClasses (): string {
    return this.getTxIconStatusClasses(true)
  }

  private getHashContainerClasses (hasMenuDropdown = true): string {
    const container = 'transaction-hash-container'
    const classes = [container]
    if (hasMenuDropdown) {
      classes.push(`${container}--with-dropdown`)
      return classes.join(' ')
    }
    return classes.join(' ')
  }

  get firstTxHashContainerClasses (): string {
    return this.getHashContainerClasses()
  }

  get secondTxHashContainerClasses (): string {
    // cuz we don't show SORA tx for ETH->SORA flow
    return this.getHashContainerClasses(this.isSoraToEvm)
  }

  get formattedNetworkStep1 (): string {
    return this.t(this.formatNetwork(this.isSoraToEvm, true))
  }

  get formattedNetworkStep2 (): string {
    return this.t(this.formatNetwork(!this.isSoraToEvm, true))
  }

  async handleCopyTransactionHash (hash: string): Promise<void> {
    try {
      await copyToClipboard(hash)
      this.$notify({
        message: this.t('bridgeTransaction.successCopy'),
        type: 'success',
        title: ''
      })
    } catch (error) {
      this.$notify({
        message: `${this.t('warningText')} ${error}`,
        type: 'warning',
        title: ''
      })
    }
  }

  private getFailedClass (isSecondTransaction?: boolean): string {
    if (!isSecondTransaction) {
      return this.currentState === (this.isSoraToEvm ? STATES.SORA_REJECTED : STATES.EVM_REJECTED) ? 'info-line--error' : ''
    }
    return this.currentState === (!this.isSoraToEvm ? STATES.SORA_REJECTED : STATES.EVM_REJECTED) ? 'info-line--error' : ''
  }

  get failedClassStep1 (): string {
    return this.getFailedClass()
  }

  get failedClassStep2 (): string {
    return this.getFailedClass(true)
  }

  getTransactionDate (transactionDate: string): string {
    // We use current date if request is failed
    const date = transactionDate ? new Date(transactionDate) : new Date()
    return `${date.getDate()} ${this.t(`months[${date.getMonth()}]`)} ${date.getFullYear()}, ${formatDateItem(date.getHours())}:${formatDateItem(date.getMinutes())}:${formatDateItem(date.getSeconds())}`
  }

  async handleSendTransactionFrom (withAutoRetry = true): Promise<void> {
    await this.checkConnectionToExternalAccount(() => {
      if (this.isTransactionFromFailed && withAutoRetry) {
        this.callRetryTransition()
      } else {
        this.callFirstTransition()
      }
    })
  }

  async handleSendTransactionTo (): Promise<void> {
    await this.checkConnectionToExternalAccount(() => {
      if (this.isTransactionToFailed) {
        this.callRetryTransition()
      } else {
        this.callSecondTransition()
      }
    })
  }

  handleBack (): void {
    router.push({ name: this.prevRoute })
  }
}
</script>

<style lang="scss">
$collapse-horisontal-padding: $inner-spacing-medium;
$header-icon-size: 52px;
$header-spinner-size: 62px;
$header-font-size: var(--s-heading3-font-size);
$collapse-header-title-font-size: $s-heading3-caps-font-size;
$collapse-header-title-line-height: var(--s-line-height-base);
$collapse-header-title-height: calc(#{$collapse-header-title-font-size} * #{$collapse-header-title-line-height});
$collapse-header-height: calc(#{$basic-spacing * 4} + #{$collapse-header-title-height});

.transaction {
  &-container {
    @include bridge-container;
  }
  &-content {
    @include collapse-items;
    .header {
      &-details .info-line-value {
        .formatted-amount {
          &__integer,
          &__symbol {
            font-size: $header-font-size;
          }
          &__decimal {
            font-size: calc(#{$header-font-size} * 0.75) !important;
          }
        }
      }
      &-icon {
        position: relative;
        @include svg-icon('', $header-icon-size);
        .el-loading-mask {
          background-color: var(--s-color-utility-surface);
        }
        .el-loading-spinner {
          top: 0;
          margin-top: calc(#{$header-icon-size - $header-spinner-size} / 2);
          margin-left: calc(#{$header-icon-size - $header-spinner-size} / 2);
          .circular {
            width: $header-spinner-size;
            height: $header-spinner-size;
          }
        }
      }
    }
    .el-button .network-title {
      text-transform: uppercase;
    }
    .info-line {
      &--error .info-line-value {
        color: var(--s-color-status-error);
        font-weight: 600;
        text-transform: uppercase;
      }
      &-label {
        font-weight: 300;
      }
    }
  }
  &-hash-container {
    .s-button--hash-copy {
      padding: 0;
      color: var(--s-color-base-content-tertiary) !important;
      .s-icon-copy {
        margin-right: 0 !important;
      }
    }
    &--with-dropdown {
      .s-button--hash-copy {
        right: calc(#{$inner-spacing-medium} + var(--s-size-mini));
      }
    }
    i {
      font-weight: 600;
      @include icon-styles;
    }
  }
}
.s-button--hash-copy,
.s-dropdown--hash-menu {
  right: $inner-spacing-medium;
}
.s-dropdown--hash-menu {
  display: block;
  text-align: center;
  font-size: var(--s-size-mini);
}
// TODO: fix UI library
.s-dropdown-menu__item {
  border-radius: calc(var(--s-border-radius-mini) / 2);
}
[design-system-theme="dark"] {
  .transaction-content .s-input {
    background-color: var(--s-color-base-on-accent);
  }
  .s-icon--network {
    color: var(--s-color-base-content-tertiary);
  }
}
</style>

<style lang="scss" scoped>
.transaction {
  &-container {
    flex-direction: column;
    align-items: center;
    margin-top: $inner-spacing-large;
    margin-right: auto;
    margin-left: auto;
    &.el-loading-parent--relative .transaction-content {
      min-height: $bridge-height;
    }
  }
  &-content .el-button,
  &-container .s-typography-button--large {
    width: 100%;
    margin-top: $inner-spacing-medium;
  }
  &-content {
    @include bridge-content (285px);
    margin-top: $inner-spacing-big;
  }
  &-hash-container {
    position: relative;
    margin-bottom: $inner-spacing-mini;
    .s-button--hash-copy,
    .s-dropdown--hash-menu {
      position: absolute;
      z-index: 1;
      top: 0;
      bottom: 0;
      margin-top: auto;
      margin-bottom: auto;
      padding: 0;
      width: var(--s-size-mini);
      height: var(--s-size-mini);
      line-height: 1;
    }
  }
  &-error {
    color: var(--s-color-status-error);
    display: flex;
    flex-flow: column nowrap;
    padding: 0 $inner-spacing-mini / 2;
    margin-bottom: $inner-spacing-medium;
    line-height: var(--s-line-height-mini);
    text-align: left;

    &__title {
      margin-bottom: $inner-spacing-mini / 2;
      text-transform: uppercase;
      font-weight: 300;
    }
    &__value {
      font-weight: 400;
    }
  }
}
.header {
  margin-bottom: $inner-spacing-medium;
  text-align: center;
  &-icon {
    margin: $inner-spacing-medium auto;
    &--success {
      background-image: url("~@/assets/img/status-success.svg");
      background-size: 110%;
    }
    &--wait {
      background-image: url("~@/assets/img/header-wait.svg");
    }
    &--error {
      background-image: url("~@/assets/img/header-error.svg");
      background-size: 125%;
    }
    &.el-loading-parent--relative {
      background-image: none;
    }
  }
  &-details {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    margin-bottom: $inner-spacing-mini;
    font-weight: 700;
    line-height: var(--s-line-height-medium);
    .s-icon--network {
      font-size: var(--s-heading4-font-size);
      margin-left: $inner-spacing-mini / 4;
    }
    &-separator {
      margin-right: $inner-spacing-mini / 2;
      margin-left: $inner-spacing-mini / 2;
      font-size: var(--s-heading3-font-size);
      font-weight: 300;
    }
  }
}
.network-info {
  &-title {
    display: flex;
    align-items: baseline;
    h3 {
      padding-right: $inner-spacing-mini;
      padding-left: $inner-spacing-mini;
      font-size: var(--s-font-size-small);
      line-height: var(--s-line-height-reset);
      font-weight: 600;
      letter-spacing: var(--s-letter-spacing-small);
      text-transform: inherit;
    }
  }
  @include status-icon(true);
}
</style>
