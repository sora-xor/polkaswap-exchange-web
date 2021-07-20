<template>
  <div v-loading="!isInitRequestCompleted" class="transaction-container">
    <s-button
      v-if="isInitRequestCompleted"
      class="s-button--view-transactions-history"
      type="link"
      icon="arrows-arrow-left-24"
      icon-position="left"
      @click="handleViewTransactionsHistory"
    >
      {{ t('bridgeTransaction.viewHistory') }}
    </s-button>
    <s-card class="transaction-content" border-radius="medium" shadow="always" primary>
      <template v-if="isInitRequestCompleted">
        <div class="header">
          <div v-loading="isTransactionFromPending || isTransactionToPending" :class="headerIconClasses" />
          <h5 class="header-details">
            {{ `${formattedAmount} ${formatAssetSymbol(assetSymbol)}` }}
            <i :class="`s-icon--network s-icon-${isSoraToEvm ? 'sora' : getEvmIcon(evmNetwork)}`" />
            <span class="header-details-separator">{{ t('bridgeTransaction.for') }}</span>
            {{ `${formattedAmount} ${formatAssetSymbol(assetSymbol)}` }}
            <i :class="`s-icon--network s-icon-${!isSoraToEvm ? 'sora' : getEvmIcon(evmNetwork)}`" />
          </h5>
          <p class="header-status">{{ headerStatus }}</p>
        </div>
        <s-collapse :value="activeTransactionStep" :borders="true">
          <s-collapse-item :name="transactionSteps.from">
            <template #title>
              <div class="network-info-title">
                <span>{{ t('bridgeTransaction.steps.step', { step: '1' }) }}</span>
                <h3>{{ t('bridgeTransaction.networkTitle', { network: t(formatNetwork(isSoraToEvm, true)) }) }}</h3>
                <span :class="transactionIconStatusClasses()" />
              </div>
            </template>
            <div v-if="transactionFromHash" :class="hashContainerClasses()">
              <s-input :placeholder="t('bridgeTransaction.transactionHash')" :value="formatTxHash(transactionFromHash)" readonly />
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
            <info-line :class="failedClass()" :label="t('bridgeTransaction.networkInfo.status')" :value="statusFrom" />
            <info-line :label="t('bridgeTransaction.networkInfo.date')" :value="transactionFromDate" />
            <info-line
              v-if="amount"
              :label="t('bridgeTransaction.networkInfo.amount')"
              :value="`-${formattedAmount}`"
              :asset-symbol="formatAssetSymbol(assetSymbol)"
            />
            <info-line
              :label="t('bridgeTransaction.networkInfo.transactionFee')"
              :value="isSoraToEvm ? formattedSoraNetworkFee : formattedEvmNetworkFee"
              :asset-symbol="isSoraToEvm ? KnownSymbols.XOR : currentEvmTokenSymbol"
            />
            <!-- TODO: We don't need this block right now. How we should calculate the total? What for a case with not XOR asset (We can't just add it to soraNetworkFee as usual)? -->
            <!-- <info-line :label="t('bridgeTransaction.networkInfo.total')" :value="isSoraToEvm ? formattedSoraNetworkFee : ethereumNetworkFee" :asset-symbol="isSoraToEvm ? KnownSymbols.XOR : EvmSymbol.ETH" /> -->
            <s-button
              v-if="isTransactionStep1"
              type="primary"
              class="s-typograhy-button--big"
              :disabled="!(isSoraToEvm || isValidNetworkType) || currentState === STATES.INITIAL || isInsufficientBalance || isInsufficientXorForFee || isInsufficientEvmNativeTokenForFee || isTransactionFromPending"
              @click="handleSendTransactionFrom"
            >
              <template v-if="!isSoraToEvm && !isExternalAccountConnected">{{ t('bridgeTransaction.connectWallet') }}</template>
              <template v-else-if="!(isSoraToEvm || isValidNetworkType)">{{ t('bridgeTransaction.changeNetwork') }}</template>
              <span v-else-if="isTransactionFromPending" v-html="t('bridgeTransaction.pending', { network: t(`bridgeTransaction.${isSoraToEvm ? 'sora' : 'ethereum'}`) })" />
              <template v-else-if="isInsufficientBalance">{{ t('confirmBridgeTransactionDialog.insufficientBalance', { tokenSymbol : formatAssetSymbol(assetSymbol) }) }}</template>
              <template v-else-if="isInsufficientXorForFee">{{ t('confirmBridgeTransactionDialog.insufficientBalance', { tokenSymbol : KnownSymbols.XOR }) }}</template>
              <template v-else-if="isInsufficientEvmNativeTokenForFee">{{ t('confirmBridgeTransactionDialog.insufficientBalance', { tokenSymbol : EvmSymbol.ETH }) }}</template>
              <template v-else-if="isTransactionFromFailed">{{ t('bridgeTransaction.retry') }}</template>
              <template v-else>{{ t('bridgeTransaction.confirm', { direction: t(`bridgeTransaction.${isSoraToEvm ? 'sora' : 'metamask'}`) }) }}</template>
            </s-button>
          </s-collapse-item>
          <s-collapse-item :name="transactionSteps.to">
            <template #title>
              <div class="network-info-title">
                <span>{{ t('bridgeTransaction.steps.step', { step: '2' }) }}</span>
                <h3>{{ t('bridgeTransaction.networkTitle', { network: t(formatNetwork(!isSoraToEvm, true)) }) }}</h3>
                <span v-if="isTransactionStep2" :class="transactionIconStatusClasses(true)" />
              </div>
            </template>
            <div v-if="isSoraToEvm && !isTxEvmAccount" class="transaction-error">
              <span class="transaction-error__title">Expected address in MetaMask:</span>
              <span class="transaction-error__value">{{ transactionEvmAddress }}</span>
            </div>
            <div v-if="isTransactionStep2 && transactionToHash" :class="hashContainerClasses(isSoraToEvm)">
              <s-input :placeholder="t('bridgeTransaction.transactionHash')" :value="formatTxHash(transactionToHash)" readonly />
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
            <info-line :class="failedClass(true)" :label="t('bridgeTransaction.networkInfo.status')" :value="statusTo" />
            <info-line :label="t('bridgeTransaction.networkInfo.date')" :value="transactionDate(!isSoraToEvm ? soraTransactionDate : evmTransactionDate)" />
            <info-line
              v-if="amount"
              :label="t('bridgeTransaction.networkInfo.amount')"
              :value="`${formattedAmount}`"
              :asset-symbol="formatAssetSymbol(assetSymbol)"
            />
            <info-line
              :label="t('bridgeTransaction.networkInfo.transactionFee')"
              :value="!isSoraToEvm ? formattedSoraNetworkFee : formattedEvmNetworkFee"
              :asset-symbol="!isSoraToEvm ? KnownSymbols.XOR : currentEvmTokenSymbol"
            />
            <!-- TODO: We don't need this block right now. How we should calculate the total? What for a case with not XOR asset (We can't just add it to soraNetworkFee as usual)? -->
            <!-- <info-line :label="t('bridgeTransaction.networkInfo.total')" :value="!isSoraToEvm ? formattedSoraNetworkFee : ethereumNetworkFee" :asset-symbol="!isSoraToEvm ? KnownSymbols.XOR : EvmSymbol.ETH" /> -->
            <s-button
              v-if="isTransactionStep2 && !isTransferCompleted"
              type="primary"
              class="s-typograhy-button--big"
              :disabled="(isSoraToEvm && (!isValidNetworkType || !isTxEvmAccount)) || isInsufficientXorForFee || isInsufficientEvmNativeTokenForFee || isTransactionToPending"
              @click="handleSendTransactionTo"
            >
              <template v-if="isSoraToEvm && !isExternalAccountConnected">{{ t('bridgeTransaction.connectWallet') }}</template>
              <template v-else-if="isSoraToEvm && !isTxEvmAccount">{{ t('bridgeTransaction.changeAccount') }}</template>
              <template v-else-if="isSoraToEvm && !isValidNetworkType">{{ t('bridgeTransaction.changeNetwork') }}</template>
              <span v-else-if="isTransactionToPending" v-html="t('bridgeTransaction.pending', { network: t(`bridgeTransaction.${!isSoraToEvm ? 'sora' : 'ethereum'}`) })" />
              <template v-else-if="isInsufficientXorForFee">{{ t('confirmBridgeTransactionDialog.insufficientBalance', { assetSymbol : KnownSymbols.XOR }) }}</template>
              <template v-else-if="isInsufficientEvmNativeTokenForFee">{{ t('confirmBridgeTransactionDialog.insufficientBalance', { assetSymbol : EvmSymbol.ETH }) }}</template>
              <template v-else-if="isTransactionToFailed">{{ t('bridgeTransaction.retry') }}</template>
              <template v-else>{{ t('bridgeTransaction.confirm', { direction: t(`bridgeTransaction.${!isSoraToEvm ? 'sora' : 'metamask'}`) }) }}</template>
            </s-button>
          </s-collapse-item>
        </s-collapse>
      </template>
    </s-card>
    <s-button
      v-if="isInitRequestCompleted && isTransferCompleted"
      class="s-button--create-transaction"
      type="link"
      icon="basic-circle-plus-24"
      @click="handleCreateTransaction"
    >
      {{ t('bridgeTransaction.newTransaction') }}
    </s-button>
    <confirm-bridge-transaction-dialog :visible.sync="showConfirmTransactionDialog" @confirm="confirmTransaction" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'
import { AccountAsset, RegisteredAccountAsset, KnownSymbols, FPNumber, CodecString, BridgeHistory, BridgeNetworks } from '@sora-substrate/util'
import { getExplorerLink, api } from '@soramitsu/soraneo-wallet-web'
import { interpret } from 'xstate'

import BridgeMixin from '@/components/mixins/BridgeMixin'
import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin'
import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'

import router, { lazyComponent } from '@/router'
import { Components, PageNames, EvmSymbol, MetamaskCancellationCode } from '@/consts'
import { formatAssetSymbol, copyToClipboard, formatDateItem, hasInsufficientBalance, hasInsufficientXorForFee, hasInsufficientEvmNativeTokenForFee } from '@/utils'
import { createFSM, EVENTS, SORA_EVM_STATES, EVM_SORA_STATES, STATES } from '@/utils/fsm'

const namespace = 'bridge'

@Component({
  components: {
    InfoLine: lazyComponent(Components.InfoLine),
    ConfirmBridgeTransactionDialog: lazyComponent(Components.ConfirmBridgeTransactionDialog)
  }
})
export default class BridgeTransaction extends Mixins(
  BridgeMixin,
  NetworkFormatterMixin,
  NumberFormatterMixin
) {
  @Getter soraNetwork!: string
  @Getter('isValidNetworkType', { namespace: 'web3' }) isValidNetworkType!: boolean

  @Getter('isSoraToEvm', { namespace }) isSoraToEvm!: boolean
  @Getter('asset', { namespace }) asset!: AccountAsset | RegisteredAccountAsset | null | undefined
  @Getter('tokenXOR', { namespace: 'assets' }) tokenXOR!: any
  @Getter('amount', { namespace }) amount!: string
  @Getter('evmBalance', { namespace: 'web3' }) evmBalance!: CodecString
  @Getter('evmNetwork', { namespace: 'web3' }) evmNetwork!: BridgeNetworks
  @Getter('soraNetworkFee', { namespace }) soraNetworkFee!: CodecString
  @Getter('evmNetworkFee', { namespace }) evmNetworkFee!: CodecString
  @Getter('isTransactionConfirmed', { namespace }) isTransactionConfirmed!: boolean
  @Getter('soraTransactionHash', { namespace }) soraTransactionHash!: string
  @Getter('evmTransactionHash', { namespace }) evmTransactionHash!: string
  @Getter('soraTransactionDate', { namespace }) soraTransactionDate!: string
  @Getter('evmTransactionDate', { namespace }) evmTransactionDate!: string
  @Getter('currentTransactionState', { namespace }) currentTransactionState!: STATES
  @Getter('initialTransactionState', { namespace }) initialTransactionState!: STATES
  @Getter('transactionStep', { namespace }) transactionStep!: number
  @Getter('historyItem', { namespace }) historyItem!: any
  @Getter('isTxEvmAccount', { namespace }) isTxEvmAccount!: boolean

  @Action('getNetworkFee', { namespace }) getNetworkFee!: () => Promise<void>

  @Action('setCurrentTransactionState', { namespace }) setCurrentTransactionState
  @Action('setInitialTransactionState', { namespace }) setInitialTransactionState
  @Action('setTransactionStep', { namespace }) setTransactionStep
  @Action('setTransactionConfirm', { namespace }) setTransactionConfirm
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
  formatAssetSymbol = formatAssetSymbol
  formatDateItem = formatDateItem
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
  currentTransactionStep = 1
  showConfirmTransactionDialog = false

  get formattedAmount (): string {
    return this.amount ? new FPNumber(this.amount, this.asset?.decimals).toLocaleString() : ''
  }

  get assetSymbol (): string {
    return this.asset?.symbol ?? ''
  }

  get currentState (): STATES {
    return this.currentTransactionState
  }

  get isTransactionStep1 (): boolean {
    return this.currentTransactionStep === 1
  }

  get isTransactionStep2 (): boolean {
    return this.currentTransactionStep === 2
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

    // TODO: Check the code above
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
    if (this.isTransactionFromPending || this.isTransactionToPending) {
      return this.t(
        'bridgeTransaction.status.pending',
        { step: this.t('bridgeTransaction.steps.step', { step: this.t(`bridgeTransaction.steps.step${this.currentTransactionStep}`) }) }
      )
    }
    if (this.isTransactionFromFailed || this.isTransactionToFailed) {
      return this.t(
        'bridgeTransaction.status.failed',
        { step: this.t('bridgeTransaction.steps.step', { step: this.t(`bridgeTransaction.steps.step${this.currentTransactionStep}`) }) }
      )
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

  get soraTxId (): string | null | undefined {
    if (!this.historyItem?.id) {
      return null
    }
    return this.historyItem.txId || api.bridge.getHistory(this.historyItem.id)?.txId
  }

  get soraTxBlockId (): string | null | undefined {
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

  get transactionFromDate (): string {
    return this.transactionDate(this.isSoraToEvm ? this.soraTransactionDate : this.evmTransactionDate)
  }

  get formattedSoraNetworkFee (): string {
    return this.formatCodecNumber(this.historyItem?.soraNetworkFee ?? this.soraNetworkFee)
  }

  get formattedEvmNetworkFee (): string {
    const fee = this.formatCodecNumber(this.historyItem?.ethereumNetworkFee ?? this.evmNetworkFee)
    return fee ? `~${fee}` : fee
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

  get currentEvmTokenSymbol (): string {
    if (this.evmNetwork === BridgeNetworks.ENERGY_NETWORK_ID) {
      return this.EvmSymbol.VT
    }
    return this.EvmSymbol.ETH
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

  formatTxHash (hash: string): string {
    return this.formatAddress(hash, 24)
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
    if (!this.historyItem) {
      await this.getNetworkFee()
    }
    this.initializeTransactionStateMachine()
    this.isInitRequestCompleted = true
    this.currentTransactionStep = this.transactionStep
    await this.handleSendTransactionFrom()
  }

  async beforeDestroy (): Promise<void> {
    this.setInitialTransactionState(STATES.INITIAL)
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
    const initialState = this.initialTransactionState === this.currentTransactionState
      ? this.initialTransactionState
      : this.currentTransactionState
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
    this.currentTransactionStep = 2
    this.setTransactionStep(2)
    this.activeTransactionStep = this.transactionSteps.to
  }

  transactionIconStatusClasses (isSecondTransaction: boolean): string {
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

  hashContainerClasses (hasMenuDropdown = true): string {
    const container = 'transaction-hash-container'
    const classes = [container]
    if (hasMenuDropdown) {
      classes.push(`${container}--with-dropdown`)
      return classes.join(' ')
    }
    return classes.join(' ')
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

  failedClass (isSecondTransaction: boolean): string {
    if (!isSecondTransaction) {
      return this.currentState === (this.isSoraToEvm ? STATES.SORA_REJECTED : STATES.EVM_REJECTED) ? 'info-line--error' : ''
    }
    return this.currentState === (!this.isSoraToEvm ? STATES.SORA_REJECTED : STATES.EVM_REJECTED) ? 'info-line--error' : ''
  }

  transactionDate (transactionDate: string): string {
    // We use current date if request is failed
    const date = transactionDate ? new Date(transactionDate) : new Date()
    return `${date.getDate()} ${this.t(`months[${date.getMonth()}]`)} ${date.getFullYear()}, ${formatDateItem(date.getHours())}:${formatDateItem(date.getMinutes())}:${formatDateItem(date.getSeconds())}`
  }

  async handleSendTransactionFrom (): Promise<void> {
    await this.checkConnectionToExternalAccount(() => {
      if (this.isTransactionFromFailed) {
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

  async confirmTransaction (isTransactionConfirmed: boolean) {
    if (isTransactionConfirmed) {
      if (this.isTransactionFromFailed || this.isTransactionToFailed) {
        this.callRetryTransition()
      } else {
        if (this.isTransactionStep2) {
          this.callSecondTransition()
        }
      }
    }
  }
}
</script>

<style lang="scss">
$collapse-horisontal-padding: $inner-spacing-medium;
$header-icon-size: 100px;
$header-spinner-size: 83px;
$collapse-header-title-font-size: $s-heading3-caps-font-size;
$collapse-header-title-line-height: var(--s-line-height-base);
$collapse-header-title-height: calc(#{$collapse-header-title-font-size} * #{$collapse-header-title-line-height});
$collapse-header-height: calc(#{$basic-spacing * 4} + #{$collapse-header-title-height});

.transaction {
  &-container {
    @include bridge-container;
  }
  &-content {
    .el-card__body {
      padding: $inner-spacing-medium;
    }
    .header-icon {
      position: relative;
      @include svg-icon('', $header-icon-size);
      .el-loading-mask {
        background-color: var(--s-color-utility-surface);
      }
      .el-loading-spinner {
        top: 0;
        margin-top: calc(#{$header-icon-size - $header-spinner-size} / 2);
        .circular {
          width: $header-spinner-size;
          height: $header-spinner-size;
        }
      }
    }
    .el-button .network-title {
      text-transform: uppercase;
    }
    .el-collapse {
      margin-right: -#{$collapse-horisontal-padding};
      margin-left: -#{$collapse-horisontal-padding};
      border-bottom: none;
      &-item {
        &__header {
          height: $collapse-header-height;
          line-height: $collapse-header-height;
          background-color: unset;
          .network-info-title {
            padding-left: #{$collapse-horisontal-padding + $inner-spacing-mini / 2};
            h3 {
              font-size: $s-heading3-caps-font-size;
              line-height: var(--s-line-height-base);
            }
          }
        }
        &__content {
          padding-right: $collapse-horisontal-padding;
          padding-left: $collapse-horisontal-padding;
        }
        &:last-child {
          .el-collapse-item__header,
          .el-collapse-item__wrap {
            border-bottom: none;
          }
        }
        &__arrow.el-icon-arrow-right {
          margin-right: $inner-spacing-small;
          &, &:hover {
            background-color: transparent;
          }
        }
      }
    }
    .info-line--error .info-line-value {
      color: var(--s-color-status-error);
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
    .el-button {
      width: 100%;
    }
    .s-button {
      &--create-transaction {
        @include bottom-button;
        color: var(--s-color-base-content-tertiary);
        letter-spacing: var(--s-letter-spacing-big);
        margin-top: $inner-spacing-mini * 2.5;
        &:hover, &:focus, &:active {
          color: var(--s-color-base-content-secondary);
          border: none;
        }
      }
      &--view-transactions-history {
        font-weight: 700;
        line-height: var(--s-line-height-medium);
      }
    }
  }
  &-content {
    margin-top: $inner-spacing-large;
    @include bridge-content;
    .el-button {
      margin-top: $basic-spacing;
      font-weight: 600;
    }
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
    margin-bottom: $inner-spacing-mini;

    &__title {
      text-transform: uppercase;
    }
    &__value {
      font-weight: 600;
    }
  }
}
.header {
  margin-bottom: $basic-spacing * 2;
  text-align: center;
  &-icon {
    margin: $inner-spacing-medium auto;
    &--success {
      background-image: url("~@/assets/img/status-success.svg");
      background-size: 84%;
    }
    &--wait {
      background-image: url("~@/assets/img/header-wait.svg");
    }
    &--error {
      background-image: url("~@/assets/img/header-error.svg");
    }
    &.el-loading-parent--relative {
      background-image: none;
    }
  }
  &-details {
    margin-bottom: $inner-spacing-mini;
    font-weight: 700;
    line-height: var(--s-line-height-medium);
    .s-icon {
      &-sora, &-eth {
        position: relative;
        top: 1px;
      }
    }
    &-separator {
      font-weight: normal;
    }
  }
}
.network-info {
  &-title {
    color: var(--s-color-base-content-secondary);
    display: flex;
    align-items: baseline;
    font-size: var(--s-font-size-mini);
    line-height: var(--s-line-height-big);
    h3 {
      padding-right: $inner-spacing-mini;
      padding-left: $inner-spacing-mini;
      font-weight: 700;
      letter-spacing: var(--s-letter-spacing-extra-large);
      text-transform: uppercase;
    }
  }
  @include status-icon(true);
}
</style>
