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
    <s-card class="transaction-content" border-radius="medium" shadow="never">
      <template v-if="isInitRequestCompleted">
        <div class="header">
          <div v-loading="isTransactionFromPending || isTransactionToPending" :class="headerIconClasses" />
          <h5 class="header-details">{{ transactionDetails }}</h5>
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
            <div v-if="transactionFromHash" :class="hashContainerClasses(!isSoraToEvm)">
              <s-input :placeholder="t('bridgeTransaction.transactionHash')" :value="formatAddress(transactionFromHash, 32)" readonly />
              <s-button class="s-button--hash-copy" type="link" icon="copy-16" @click="handleCopyTransactionHash(transactionFromHash)" />
              <!-- TODO: Add work with Polkascan -->
              <s-dropdown
                v-if="!isSoraToEvm"
                class="s-dropdown--hash-menu"
                borderRadius="mini"
                type="ellipsis"
                icon="basic-more-vertical-24"
                placement="bottom-end"
                @select="handleOpenEtherscan"
              >
                <template slot="menu">
                  <s-dropdown-item>
                    <span>{{ t('bridgeTransaction.viewInEtherscan') }}</span>
                  </s-dropdown-item>
                </template>
              </s-dropdown>
            </div>
            <info-line :class="failedClass()" :label="t('bridgeTransaction.networkInfo.status')" :value="statusFrom" />
            <info-line :label="t('bridgeTransaction.networkInfo.date')" :value="transactionFromDate" />
            <info-line
              :label="t('bridgeTransaction.networkInfo.amount')"
              :value="`-${amount}`"
              :asset-symbol="formatAssetSymbol(assetSymbol, !isSoraToEvm)"
            />
            <info-line
              :label="t('bridgeTransaction.networkInfo.transactionFee')"
              :value="isSoraToEvm ? formattedSoraNetworkFee : formattedEthNetworkFee"
              :asset-symbol="isSoraToEvm ? KnownSymbols.XOR : EthSymbol"
            />
            <!-- TODO: We don't need this block right now. How we should calculate the total? What for a case with not XOR asset (We can't just add it to soraNetworkFee as usual)? -->
            <!-- <info-line :label="t('bridgeTransaction.networkInfo.total')" :value="isSoraToEvm ? formattedSoraNetworkFee : ethereumNetworkFee" :asset-symbol="isSoraToEvm ? KnownSymbols.XOR : EthSymbol" /> -->
            <s-button
              v-if="isTransactionStep1"
              type="primary"
              :disabled="!(isSoraToEvm || isValidNetworkType) || currentState === STATES.INITIAL || isInsufficientBalance || isInsufficientXorForFee || isInsufficientEthereumForFee || isTransactionFromPending"
              @click="handleSendTransactionFrom"
            >
              <template v-if="!isSoraToEvm && !isExternalAccountConnected">{{ t('bridgeTransaction.connectWallet') }}</template>
              <template v-else-if="!(isSoraToEvm || isValidNetworkType)">{{ t('bridgeTransaction.changeNetwork') }}</template>
              <span v-else-if="isTransactionFromPending" v-html="t('bridgeTransaction.pending', { network: t(`bridgeTransaction.${isSoraToEvm ? 'sora' : 'ethereum'}`) })" />
              <template v-else-if="isInsufficientXorForFee">{{ t('confirmBridgeTransactionDialog.insufficientBalance', { tokenSymbol : KnownSymbols.XOR }) }}</template>
              <template v-else-if="isInsufficientEthereumForFee">{{ t('confirmBridgeTransactionDialog.insufficientBalance', { tokenSymbol : EthSymbol }) }}</template>
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
            <div v-if="isTransactionStep2 && transactionToHash" :class="hashContainerClasses(isSoraToEvm)">
              <s-input :placeholder="t('bridgeTransaction.transactionHash')" :value="formatAddress(transactionToHash, 32)" readonly />
              <s-button class="s-button--hash-copy" type="link" icon="copy-16" @click="handleCopyTransactionHash(transactionToHash)" />
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
                  <s-dropdown-item>
                    <span>{{ t('bridgeTransaction.viewInEtherscan') }}</span>
                  </s-dropdown-item>
                </template>
              </s-dropdown>
            </div>
            <info-line :class="failedClass(true)" :label="t('bridgeTransaction.networkInfo.status')" :value="statusTo" />
            <info-line :label="t('bridgeTransaction.networkInfo.date')" :value="transactionDate(!isSoraToEvm ? soraTransactionDate : ethereumTransactionDate)" />
            <info-line
              :label="t('bridgeTransaction.networkInfo.amount')"
              :value="`${amount}`"
              :asset-symbol="formatAssetSymbol(assetSymbol, isSoraToEvm)"
            />
            <info-line
              :label="t('bridgeTransaction.networkInfo.transactionFee')"
              :value="!isSoraToEvm ? formattedSoraNetworkFee : formattedEthNetworkFee"
              :asset-symbol="!isSoraToEvm ? KnownSymbols.XOR : EthSymbol"
            />
            <!-- TODO: We don't need this block right now. How we should calculate the total? What for a case with not XOR asset (We can't just add it to soraNetworkFee as usual)? -->
            <!-- <info-line :label="t('bridgeTransaction.networkInfo.total')" :value="!isSoraToEvm ? formattedSoraNetworkFee : ethereumNetworkFee" :asset-symbol="!isSoraToEvm ? KnownSymbols.XOR : EthSymbol" /> -->
            <s-button
              v-if="isTransactionStep2 && !isTransferCompleted"
              type="primary"
              :disabled="(isSoraToEvm && !isValidNetworkType) || isInsufficientXorForFee || isInsufficientEthereumForFee || isTransactionToPending"
              @click="handleSendTransactionTo"
            >
              <template v-if="isSoraToEvm && !isExternalAccountConnected">{{ t('bridgeTransaction.connectWallet') }}</template>
              <template v-else-if="isSoraToEvm && !isValidNetworkType">{{ t('bridgeTransaction.changeNetwork') }}</template>
              <span v-else-if="isTransactionToPending" v-html="t('bridgeTransaction.pending', { network: t(`bridgeTransaction.${!isSoraToEvm ? 'sora' : 'ethereum'}`) })" />
              <template v-else-if="isInsufficientXorForFee">{{ t('confirmBridgeTransactionDialog.insufficientBalance', { assetSymbol : KnownSymbols.XOR }) }}</template>
              <template v-else-if="isInsufficientEthereumForFee">{{ t('confirmBridgeTransactionDialog.insufficientBalance', { assetSymbol : EthSymbol }) }}</template>
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
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'
import { AccountAsset, RegisteredAccountAsset, KnownSymbols, CodecString, BridgeHistory } from '@sora-substrate/util'
import { interpret } from 'xstate'

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin'
import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'
import router, { lazyComponent } from '@/router'
import { Components, PageNames, EthSymbol, MetamaskCancellationCode } from '@/consts'
import { formatAssetSymbol, copyToClipboard, formatDateItem, hasInsufficientBalance, hasInsufficientXorForFee, hasInsufficientEthForFee } from '@/utils'
import { createFSM, EVENTS, SORA_ETHEREUM_STATES, ETHEREUM_SORA_STATES, STATES } from '@/utils/fsm'

const namespace = 'bridge'

@Component({
  components: {
    InfoLine: lazyComponent(Components.InfoLine),
    ConfirmBridgeTransactionDialog: lazyComponent(Components.ConfirmBridgeTransactionDialog)
  }
})
export default class BridgeTransaction extends Mixins(WalletConnectMixin, LoadingMixin, NetworkFormatterMixin, NumberFormatterMixin) {
  @Getter('isValidNetworkType', { namespace: 'web3' }) isValidNetworkType!: boolean

  @Getter('isSoraToEvm', { namespace }) isSoraToEvm!: boolean
  @Getter('asset', { namespace }) asset!: AccountAsset | RegisteredAccountAsset | null
  @Getter('tokenXOR', { namespace: 'assets' }) tokenXOR!: any
  @Getter('amount', { namespace }) amount!: string
  @Getter('ethBalance', { namespace: 'web3' }) ethBalance!: CodecString
  @Getter('soraNetworkFee', { namespace }) soraNetworkFee!: CodecString
  @Getter('ethereumNetworkFee', { namespace }) ethereumNetworkFee!: CodecString
  @Getter('isTransactionConfirmed', { namespace }) isTransactionConfirmed!: boolean
  @Getter('soraTransactionHash', { namespace }) soraTransactionHash!: string
  @Getter('ethereumTransactionHash', { namespace }) ethereumTransactionHash!: string
  @Getter('soraTransactionDate', { namespace }) soraTransactionDate!: string
  @Getter('ethereumTransactionDate', { namespace }) ethereumTransactionDate!: string
  @Getter('currentTransactionState', { namespace }) currentTransactionState!: STATES
  @Getter('initialTransactionState', { namespace }) initialTransactionState!: STATES
  @Getter('transactionStep', { namespace }) transactionStep!: number
  @Getter('historyItem', { namespace }) historyItem!: any

  @Action('getNetworkFee', { namespace }) getNetworkFee
  @Action('getEthNetworkFee', { namespace }) getEthNetworkFee
  @Action('setCurrentTransactionState', { namespace }) setCurrentTransactionState
  @Action('setInitialTransactionState', { namespace }) setInitialTransactionState
  @Action('setTransactionStep', { namespace }) setTransactionStep
  @Action('setTransactionConfirm', { namespace }) setTransactionConfirm
  @Action('setHistoryItem', { namespace }) setHistoryItem

  @Action('signSoraTransactionSoraToEth', { namespace }) signSoraTransactionSoraToEth
  @Action('signEthTransactionSoraToEth', { namespace }) signEthTransactionSoraToEth
  @Action('sendSoraTransactionSoraToEth', { namespace }) sendSoraTransactionSoraToEth
  @Action('sendEthTransactionSoraToEth', { namespace }) sendEthTransactionSoraToEth

  @Action('signSoraTransactionEthToSora', { namespace }) signSoraTransactionEthToSora
  @Action('signEthTransactionEthToSora', { namespace }) signEthTransactionEthToSora
  @Action('sendSoraTransactionEthToSora', { namespace }) sendSoraTransactionEthToSora
  @Action('sendEthTransactionEthToSora', { namespace }) sendEthTransactionEthToSora

  @Action('generateHistoryItem', { namespace }) generateHistoryItem!: ({ date: Date }) => Promise<BridgeHistory>
  @Action('updateHistoryParams', { namespace }) updateHistoryParams
  @Action('removeHistoryById', { namespace }) removeHistoryById
  @Action('setSoraTransactionHash', { namespace }) setSoraTransactionHash
  @Action('setEthereumTransactionHash', { namespace }) setEthereumTransactionHash

  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean

  EthSymbol = EthSymbol
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
    return this.currentState === (this.isSoraToEvm ? STATES.SORA_PENDING : STATES.ETHEREUM_PENDING)
  }

  get isTransactionToPending (): boolean {
    return this.currentState === (!this.isSoraToEvm ? STATES.SORA_PENDING : STATES.ETHEREUM_PENDING)
  }

  get isTransactionFromFailed (): boolean {
    return this.currentState === (this.isSoraToEvm ? STATES.SORA_REJECTED : STATES.ETHEREUM_REJECTED)
  }

  get isTransactionToFailed (): boolean {
    return this.currentState === (!this.isSoraToEvm ? STATES.SORA_REJECTED : STATES.ETHEREUM_REJECTED)
  }

  get isTransactionFromCompleted (): boolean {
    return !this.isTransactionStep1
  }

  get isTransferCompleted (): boolean {
    const isTransactionCompleted = this.currentState === (!this.isSoraToEvm ? STATES.SORA_COMMITED : STATES.ETHEREUM_COMMITED)
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

  get transactionDetails (): string {
    // TODO: Check asset for null value
    return this.t('bridgeTransaction.details', {
      from: `${this.amount} ${formatAssetSymbol(this.assetSymbol, !this.isSoraToEvm)}`,
      to: `${this.amount} ${formatAssetSymbol(this.assetSymbol, this.isSoraToEvm)}`
    })
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
      if (this.currentState === (this.isSoraToEvm ? STATES.SORA_PENDING : STATES.ETHEREUM_PENDING)) {
        return this.t('bridgeTransaction.statuses.pending') + '...'
      }
      if (this.currentState === (this.isSoraToEvm ? STATES.SORA_REJECTED : STATES.ETHEREUM_REJECTED)) {
        return this.t('bridgeTransaction.statuses.failed')
      }
    }
    return this.t('bridgeTransaction.statuses.done')
  }

  get statusTo (): string {
    if (!this.currentState || !this.isTransactionFromCompleted) {
      return this.t('bridgeTransaction.statuses.waiting') + '...'
    }
    if (this.currentState === (!this.isSoraToEvm ? STATES.SORA_PENDING : STATES.ETHEREUM_PENDING)) {
      return `${this.t('bridgeTransaction.statuses.pending')}... (${this.t('bridgeTransaction.wait30Block')})`
    }
    if (this.currentState === (!this.isSoraToEvm ? STATES.SORA_REJECTED : STATES.ETHEREUM_REJECTED)) {
      return this.t('bridgeTransaction.statuses.failed')
    }
    if (this.isTransferCompleted) {
      return this.t('bridgeTransaction.statuses.done')
    }
    return this.t('bridgeTransaction.statuses.waitingForConfirmation')
  }

  get transactionFromHash (): string {
    if (this.isSoraToEvm) {
      return this.soraTransactionHash
    }
    return this.ethereumTransactionHash
  }

  get transactionToHash (): string {
    if (!this.isSoraToEvm) {
      return this.soraTransactionHash
    }
    return this.ethereumTransactionHash
  }

  get transactionFromDate (): string {
    return this.transactionDate(this.isSoraToEvm ? this.soraTransactionDate : this.ethereumTransactionDate)
  }

  get formattedSoraNetworkFee (): string {
    return this.formatCodecNumber(this.soraNetworkFee)
  }

  get formattedEthNetworkFee (): string {
    return this.formatCodecNumber(this.ethereumNetworkFee)
  }

  get isInsufficientBalance (): boolean {
    if (!this.asset) return false

    const fee = this.isSoraToEvm ? this.soraNetworkFee : this.ethereumNetworkFee

    return hasInsufficientBalance(this.asset, this.amount, fee, !this.isSoraToEvm)
  }

  get isInsufficientXorForFee (): boolean {
    return hasInsufficientXorForFee(this.tokenXOR, this.soraNetworkFee)
  }

  get isInsufficientEthereumForFee (): boolean {
    return hasInsufficientEthForFee(this.ethBalance, this.ethereumNetworkFee)
  }

  handleOpenEtherscan (): void {
    const hash = this.isSoraToEvm ? this.transactionToHash : this.transactionFromHash
    const url = this.getEtherscanLink(hash, true)
    const win = window.open(url, '_blank')
    win && win.focus()
  }

  handleViewTransactionsHistory (): void {
    router.push({ name: PageNames.BridgeTransactionsHistory })
  }

  handleCreateTransaction (): void {
    router.push({ name: PageNames.Bridge })
  }

  async created (): Promise<void> {
    if (this.isTransactionConfirmed) {
      await this.getNetworkFee()
      await this.getEthNetworkFee()
      this.initializeTransactionStateMachine()
      this.isInitRequestCompleted = true
      this.currentTransactionStep = this.transactionStep
      await this.handleSendTransactionFrom()
    } else {
      router.push({ name: PageNames.Bridge })
    }
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
    const machineStates = this.isSoraToEvm ? SORA_ETHEREUM_STATES : ETHEREUM_SORA_STATES
    const initialState = this.initialTransactionState === this.currentTransactionState
      ? this.initialTransactionState
      : this.currentTransactionState
    this.sendService = interpret(
      createFSM(
        {
          history: historyItem,
          SORA_ETH: {
            sora: {
              sign: this.signSoraTransactionSoraToEth,
              send: this.sendSoraTransactionSoraToEth
            },
            ethereum: {
              sign: this.signEthTransactionSoraToEth,
              send: this.sendEthTransactionSoraToEth
            }
          },
          ETH_SORA: {
            sora: {
              sign: this.signSoraTransactionEthToSora,
              send: this.sendSoraTransactionEthToSora
            },
            ethereum: {
              sign: this.signEthTransactionEthToSora,
              send: this.sendEthTransactionEthToSora
            }
          }
        },
        machineStates,
        initialState
      )
    )

    this.callFirstTransition = () => machineStates === SORA_ETHEREUM_STATES
      ? this.sendService.send(EVENTS.SEND_SORA)
      : this.sendService.send(EVENTS.SEND_ETHEREUM)

    this.callSecondTransition = () => machineStates === SORA_ETHEREUM_STATES
      ? this.sendService.send(EVENTS.SEND_ETHEREUM)
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
          [STATES.SORA_REJECTED, STATES.ETHEREUM_REJECTED].includes(state.value)
        ) {
          if (
            state.event.data.message.includes('Cancelled') ||
            state.event.data.code === MetamaskCancellationCode
          ) {
            await this.removeHistoryById(state.context.history.id)
          }
        }

        if (state.context.history.hash && !this.soraTransactionHash.length) {
          await this.setSoraTransactionHash(state.context.history.hash)
        }
        if (state.context.history.ethereumHash && !this.ethereumTransactionHash.length) {
          await this.setEthereumTransactionHash(state.context.history.ethereumHash)
        }

        if (
          (machineStates === SORA_ETHEREUM_STATES && state.value === STATES.SORA_COMMITED) ||
          (machineStates === ETHEREUM_SORA_STATES && state.value === STATES.ETHEREUM_COMMITED)
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
      if (this.currentState === (!this.isSoraToEvm ? STATES.SORA_REJECTED : STATES.ETHEREUM_REJECTED)) {
        classes.push(`${iconClass}--error`)
        return classes.join(' ')
      }
      if (this.isTransferCompleted) {
        classes.push(`${iconClass}--success`)
        return classes.join(' ')
      }
    } else {
      if (this.currentState === (this.isSoraToEvm ? STATES.SORA_REJECTED : STATES.ETHEREUM_REJECTED)) {
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

  hashContainerClasses (hasMenuDropdown: boolean): string {
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
      return this.currentState === (this.isSoraToEvm ? STATES.SORA_REJECTED : STATES.ETHEREUM_REJECTED) ? 'info-line--error' : ''
    }
    return this.currentState === (!this.isSoraToEvm ? STATES.SORA_REJECTED : STATES.ETHEREUM_REJECTED) ? 'info-line--error' : ''
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
$collapse-header-title-line-height: $s-line-height-base;
$collapse-header-title-height: #{$collapse-header-title-font-size * $collapse-header-title-line-height};
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
          .network-info-title {
            padding-left: #{$collapse-horisontal-padding + $inner-spacing-mini / 2};
            h3 {
              font-size: $s-heading3-caps-font-size;
              line-height: $s-line-height-base;
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
    &--with-dropdown {
      .s-button--hash-copy {
        right: calc(#{$inner-spacing-medium * 2} + var(--s-size-mini));
      }
    }
    i {
      font-weight: 600;
    }
  }
}
.s-button--hash-copy {
  padding: 0;
  .s-icon-copy {
    margin-right: 0 !important;
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
        font-feature-settings: $s-font-feature-settings-title;
        letter-spacing: $s-letter-spacing-big;
      }
      &--view-transactions-history,
      &--create-transaction {
        font-weight: 700;
      }
      &--view-transactions-history {
        line-height: $s-line-height-medium;
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
      width: var(--s-size-mini);
      height: var(--s-size-mini);
      line-height: 1;
    }
  }
}
.header {
  margin-bottom: $basic-spacing * 2;
  text-align: center;
  &-icon {
    margin: 0 auto $inner-spacing-medium;
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
  }
  &-details {
    margin-bottom: $inner-spacing-mini;
    font-feature-settings: $s-font-feature-settings-title;
    font-weight: 700;
    line-height: $s-line-height-medium;
  }
}
.network-info {
  &-title {
    color: var(--s-color-base-content-secondary);
    display: flex;
    align-items: baseline;
    font-size: var(--s-font-size-mini);
    line-height: $s-line-height-big;
    h3 {
      padding-right: $inner-spacing-mini;
      padding-left: $inner-spacing-mini;
      font-feature-settings: $s-font-feature-settings-type;
      font-weight: 700;
      letter-spacing: $s-letter-spacing-type;
      text-transform: uppercase;
    }
  }
  @include status-icon(true);
}
</style>
