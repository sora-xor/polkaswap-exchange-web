<template>
  <div v-loading="!isInitRequestCompleted" class="transaction-container">
    <s-button
      v-if="isInitRequestCompleted"
      class="s-button--view-transactions-history"
      type="link"
      icon="arrow-left"
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
                <h3>{{ t('bridgeTransaction.networkTitle', { network: t(formatNetwork(isSoraToEthereum, true)) }) }}</h3>
                <span :class="transactionIconStatusClasses()" />
              </div>
            </template>
            <div v-if="transactionFromHash" :class="hashContainerClasses(!isSoraToEthereum)">
              <s-input :placeholder="t('bridgeTransaction.transactionHash')" :value="formatAddress(transactionFromHash)" readonly />
              <s-button class="s-button--hash-copy" size="medium" type="link" icon="copy" @click="handleCopyTransactionHash(transactionFromHash)" />
              <!-- TODO: Add work with Polkascan -->
              <s-dropdown
                v-if="!isSoraToEthereum"
                class="s-dropdown--hash-menu"
                borderRadius="mini"
                type="ellipsis"
                icon="more-vertical"
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
              :asset-symbol="formatAssetSymbol(asset ? asset.symbol : '', !isSoraToEthereum)"
            />
            <info-line
              :label="t('bridgeTransaction.networkInfo.transactionFee')"
              :value="isSoraToEthereum ? formattedSoraNetworkFee : ethereumNetworkFee"
              :asset-symbol="isSoraToEthereum ? KnownSymbols.XOR : EthSymbol"
            />
            <!-- TODO: We don't need this block right now. How we should calculate the total? What for a case with not XOR asset (We can't just add it to soraNetworkFee as usual)? -->
            <!-- <info-line :label="t('bridgeTransaction.networkInfo.total')" :value="isSoraToEthereum ? formattedSoraNetworkFee : ethereumNetworkFee" :asset-symbol="isSoraToEthereum ? KnownSymbols.XOR : EthSymbol" /> -->
            <s-button
              v-if="isTransactionStep1"
              type="primary"
              :disabled="!(isSoraToEthereum || isValidEthNetwork) || currentState === STATES.INITIAL || isTransactionFromPending"
              @click="handleSendTransactionFrom"
            >
              <template v-if="!(isSoraToEthereum || isValidEthNetwork)">{{ t('bridgeTransaction.changeNetwork') }}</template>
              <span v-else-if="isTransactionFromPending" v-html="t('bridgeTransaction.pending', { network: t(`bridgeTransaction.${isSoraToEthereum ? 'sora' : 'ethereum'}`) })" />
              <template v-else-if="isTransactionFromFailed">{{ t('bridgeTransaction.retry') }}</template>
              <template v-else>{{ t('bridgeTransaction.confirm', { direction: t(`bridgeTransaction.${isSoraToEthereum ? 'sora' : 'metamask'}`) }) }}</template>
            </s-button>
          </s-collapse-item>
          <s-collapse-item :name="transactionSteps.to">
            <template #title>
              <div class="network-info-title">
                <span>{{ t('bridgeTransaction.steps.step', { step: '2' }) }}</span>
                <h3>{{ t('bridgeTransaction.networkTitle', { network: t(formatNetwork(!isSoraToEthereum, true)) }) }}</h3>
                <span v-if="isTransactionStep2" :class="transactionIconStatusClasses(true)" />
              </div>
            </template>
            <div v-if="isTransactionStep2 && transactionToHash" :class="hashContainerClasses(isSoraToEthereum)">
              <s-input :placeholder="t('bridgeTransaction.transactionHash')" :value="formatAddress(transactionToHash)" readonly />
              <s-button class="s-button--hash-copy" size="medium" type="link" icon="copy" @click="handleCopyTransactionHash(transactionToHash)" />
              <s-dropdown
                v-if="isSoraToEthereum"
                class="s-dropdown--hash-menu"
                borderRadius="mini"
                type="ellipsis"
                icon="more-vertical"
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
            <info-line :label="t('bridgeTransaction.networkInfo.date')" :value="transactionDate(!isSoraToEthereum ? soraTransactionDate : ethereumTransactionDate)" />
            <info-line
              :label="t('bridgeTransaction.networkInfo.amount')"
              :value="`${amount}`"
              :asset-symbol="formatAssetSymbol(asset ? asset.symbol : '', isSoraToEthereum)"
            />
            <info-line
              :label="t('bridgeTransaction.networkInfo.transactionFee')"
              :value="!isSoraToEthereum ? formattedSoraNetworkFee : ethereumNetworkFee"
              :asset-symbol="!isSoraToEthereum ? KnownSymbols.XOR : EthSymbol"
            />
            <!-- TODO: We don't need this block right now. How we should calculate the total? What for a case with not XOR asset (We can't just add it to soraNetworkFee as usual)? -->
            <!-- <info-line :label="t('bridgeTransaction.networkInfo.total')" :value="!isSoraToEthereum ? formattedSoraNetworkFee : ethereumNetworkFee" :asset-symbol="!isSoraToEthereum ? KnownSymbols.XOR : EthSymbol" /> -->
            <s-button
              v-if="isTransactionStep2 && !isTransferCompleted"
              type="primary"
              :disabled="(isSoraToEthereum && !isValidEthNetwork) || isTransactionToPending"
              @click="handleSendTransactionTo"
            >
              <template v-if="isSoraToEthereum && !isValidEthNetwork">{{ t('bridgeTransaction.changeNetwork') }}</template>
              <span v-else-if="isTransactionToPending" v-html="t('bridgeTransaction.pending', { network: t(`bridgeTransaction.${!isSoraToEthereum ? 'sora' : 'ethereum'}`) })" />
              <template v-else-if="isTransactionToFailed">{{ t('bridgeTransaction.retry') }}</template>
              <template v-else>{{ t('bridgeTransaction.confirm', { direction: t(`bridgeTransaction.${!isSoraToEthereum ? 'sora' : 'metamask'}`) }) }}</template>
            </s-button>
          </s-collapse-item>
        </s-collapse>
      </template>
    </s-card>
    <s-button
      v-if="isInitRequestCompleted && isTransferCompleted"
      class="s-button--create-transaction"
      size="big"
      type="link"
      @click="handleCreateTransaction"
    >
      {{ t('bridgeTransaction.newTransaction') }}
    </s-button>
    <!-- TODO: Check isInsufficientBalance -->
    <confirm-bridge-transaction-dialog :visible.sync="showConfirmTransactionDialog" @confirm="confirmTransaction" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'
import { AccountAsset, KnownSymbols, CodecString } from '@sora-substrate/util'
import { interpret } from 'xstate'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'
import router, { lazyComponent } from '@/router'
import { Components, PageNames, EthSymbol } from '@/consts'
import { RegisteredAccountAsset } from '@/store/assets'
import { formatAddress, formatAssetSymbol, copyToClipboard, formatDateItem } from '@/utils'
import { createFSM, EVENTS, SORA_ETHEREUM_STATES, ETHEREUM_SORA_STATES, STATES } from '@/utils/fsm'

const namespace = 'bridge'

@Component({
  components: {
    InfoLine: lazyComponent(Components.InfoLine),
    ConfirmBridgeTransactionDialog: lazyComponent(Components.ConfirmBridgeTransactionDialog)
  }
})
export default class BridgeTransaction extends Mixins(TranslationMixin, LoadingMixin, NetworkFormatterMixin, NumberFormatterMixin) {
  @Getter('isValidEthNetwork', { namespace: 'web3' }) isValidEthNetwork!: boolean

  @Getter('isSoraToEthereum', { namespace }) isSoraToEthereum!: boolean
  @Getter('asset', { namespace }) asset!: AccountAsset | RegisteredAccountAsset | null
  @Getter('amount', { namespace }) amount!: string | number
  @Getter('soraNetworkFee', { namespace }) soraNetworkFee!: CodecString
  @Getter('ethereumNetworkFee', { namespace }) ethereumNetworkFee!: string | number
  @Getter('isTransactionConfirmed', { namespace }) isTransactionConfirmed!: boolean
  @Getter('soraTransactionHash', { namespace }) soraTransactionHash!: string
  @Getter('ethereumTransactionHash', { namespace }) ethereumTransactionHash!: string
  @Getter('soraTransactionDate', { namespace }) soraTransactionDate!: string
  @Getter('ethereumTransactionDate', { namespace }) ethereumTransactionDate!: string
  @Getter('currentTransactionState', { namespace }) currentTransactionState!: STATES
  @Getter('initialTransactionState', { namespace }) initialTransactionState!: STATES
  @Getter('transactionStep', { namespace }) transactionStep!: number
  // TODO: Remove the next line
  @Getter('historyItem', { namespace }) historyItem!: any

  @Action('setCurrentTransactionState', { namespace }) setCurrentTransactionState
  @Action('setInitialTransactionState', { namespace }) setInitialTransactionState
  @Action('setTransactionStep', { namespace }) setTransactionStep
  @Action('setTransactionConfirm', { namespace }) setTransactionConfirm
  @Action('setHistoryItem', { namespace }) setHistoryItem
  @Action('sendTransferSoraToEth', { namespace }) sendTransferSoraToEth
  @Action('sendTransferEthToSora', { namespace }) sendTransferEthToSora
  @Action('receiveTransaction', { namespace }) receiveTransaction
  @Action('setSoraTransactionHash', { namespace }) setSoraTransactionHash

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
  historyHash: string | undefined
  transactionSteps = {
    from: 'step-from',
    to: 'step-to'
  }

  activeTransactionStep: any = [this.transactionSteps.from, this.transactionSteps.to]
  currentTransactionStep = 1
  showConfirmTransactionDialog = false

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
    return this.currentState === (this.isSoraToEthereum ? STATES.SORA_PENDING : STATES.ETHEREUM_PENDING)
  }

  get isTransactionToPending (): boolean {
    return this.currentState === (!this.isSoraToEthereum ? STATES.SORA_PENDING : STATES.ETHEREUM_PENDING)
  }

  get isTransactionFromFailed (): boolean {
    return this.currentState === (this.isSoraToEthereum ? STATES.SORA_REJECTED : STATES.ETHEREUM_REJECTED)
  }

  get isTransactionToFailed (): boolean {
    return this.currentState === (!this.isSoraToEthereum ? STATES.SORA_REJECTED : STATES.ETHEREUM_REJECTED)
  }

  get isTransactionFromCompleted (): boolean {
    return !this.isTransactionStep1
  }

  get isTransferCompleted (): boolean {
    const isTransactionCompleted = this.currentState === (!this.isSoraToEthereum ? STATES.SORA_COMMITED : STATES.ETHEREUM_COMMITED)
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
      from: `${this.amount} ${formatAssetSymbol(this.asset?.symbol, !this.isSoraToEthereum)}`,
      to: `${this.amount} ${formatAssetSymbol(this.asset?.symbol, this.isSoraToEthereum)}`
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
      if (this.currentState === (this.isSoraToEthereum ? STATES.SORA_PENDING : STATES.ETHEREUM_PENDING)) {
        return this.t('bridgeTransaction.statuses.pending') + '...'
      }
      if (this.currentState === (this.isSoraToEthereum ? STATES.SORA_REJECTED : STATES.ETHEREUM_REJECTED)) {
        return this.t('bridgeTransaction.statuses.failed')
      }
    }
    return this.t('bridgeTransaction.statuses.done')
  }

  get statusTo (): string {
    if (!this.currentState || !this.isTransactionFromCompleted) {
      return this.t('bridgeTransaction.statuses.waiting') + '...'
    }
    if (this.currentState === (!this.isSoraToEthereum ? STATES.SORA_PENDING : STATES.ETHEREUM_PENDING)) {
      return this.t('bridgeTransaction.statuses.pending') + '...'
    }
    if (this.currentState === (!this.isSoraToEthereum ? STATES.SORA_REJECTED : STATES.ETHEREUM_REJECTED)) {
      return this.t('bridgeTransaction.statuses.failed')
    }
    if (this.isTransferCompleted) {
      return this.t('bridgeTransaction.statuses.done')
    }
    return this.t('bridgeTransaction.statuses.waitingForConfirmation')
  }

  get transactionFromHash (): string {
    if (this.isSoraToEthereum) {
      return this.soraTransactionHash
    }
    return this.ethereumTransactionHash
  }

  get transactionToHash (): string {
    if (!this.isSoraToEthereum) {
      return this.soraTransactionHash
    }
    return this.ethereumTransactionHash
  }

  get transactionFromDate (): string {
    return this.transactionDate(this.isSoraToEthereum ? this.soraTransactionDate : this.ethereumTransactionDate)
  }

  get formattedSoraNetworkFee (): string {
    return this.formatCodecNumber(this.soraNetworkFee)
  }

  handleOpenEtherscan (): void {
    const hash = this.isSoraToEthereum ? this.transactionToHash : this.transactionFromHash
    const url = this.getEtherscanLink(hash, true)
    const win = window.open(url, '_blank')
    win && win.focus()
  }

  handleViewTransactionsHistory (): void {
    // TODO: Go to appropriate transaction instead of history page
    router.push({ name: PageNames.BridgeTransactionsHistory })
  }

  handleCreateTransaction (): void {
    router.push({ name: PageNames.Bridge })
  }

  async created (): Promise<void> {
    this.historyHash = this.$route.params.hash
    this.initializeTransactionStateMachine()
    if (this.isTransactionConfirmed) {
      this.isInitRequestCompleted = true
      this.currentTransactionStep = this.transactionStep
      if (this.transactionStep === 1) {
        this.handleSendTransactionFrom()
      }
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

  initializeTransactionStateMachine () {
    // Create state machine and interpret it
    const machineStates = this.isSoraToEthereum ? SORA_ETHEREUM_STATES : ETHEREUM_SORA_STATES
    const initialState = this.initialTransactionState === this.currentTransactionState
      ? this.initialTransactionState
      : this.currentTransactionState
    this.sendService = interpret(
      createFSM(
        {
          sendFirstTransaction: this.sendTransaction,
          sendSecondTransaction: this.receiveTransaction
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
      .onTransition(state => {
        // Update vuex state on transition
        this.setCurrentTransactionState(state.value)

        if (
          (machineStates === SORA_ETHEREUM_STATES && state.value === STATES.SORA_COMMITED) ||
          (machineStates === ETHEREUM_SORA_STATES && state.value === STATES.ETHEREUM_COMMITED)
        ) {
          this.setFromTransactionCompleted()
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

  async sendTransaction (): Promise<void> {
    if (this.isSoraToEthereum) {
      await this.sendTransferSoraToEth()
    } else {
      await this.sendTransferEthToSora()
    }
  }

  transactionIconStatusClasses (isSecondTransaction: boolean): string {
    const iconClass = 'network-info-icon'
    const classes = [iconClass]
    if (isSecondTransaction) {
      if (this.currentState === (!this.isSoraToEthereum ? STATES.SORA_REJECTED : STATES.ETHEREUM_REJECTED)) {
        classes.push(`${iconClass}--error`)
        return classes.join(' ')
      }
      if (this.isTransferCompleted) {
        classes.push(`${iconClass}--success`)
        return classes.join(' ')
      }
    } else {
      if (this.currentState === (this.isSoraToEthereum ? STATES.SORA_REJECTED : STATES.ETHEREUM_REJECTED)) {
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

  formatAddress (address: string): string {
    return formatAddress(address, 32)
  }

  failedClass (isSecondTransaction: boolean): string {
    if (!isSecondTransaction) {
      return this.currentState === (this.isSoraToEthereum ? STATES.SORA_REJECTED : STATES.ETHEREUM_REJECTED) ? 'info-line--error' : ''
    }
    return this.currentState === (!this.isSoraToEthereum ? STATES.SORA_REJECTED : STATES.ETHEREUM_REJECTED) ? 'info-line--error' : ''
  }

  transactionDate (transactionDate: string): string {
    // We use current date if request is failed
    const date = transactionDate ? new Date(transactionDate) : new Date()
    return `${date.getDate()} ${this.t(`months[${date.getMonth()}]`)} ${date.getFullYear()}, ${formatDateItem(date.getHours())}:${formatDateItem(date.getMinutes())}:${formatDateItem(date.getSeconds())}`
  }

  async handleSendTransactionFrom (): Promise<void> {
    if (this.isTransactionFromFailed) {
      this.callRetryTransition()
    } else {
      this.callFirstTransition()
    }
  }

  async handleSendTransactionTo (): Promise<void> {
    if (this.isTransactionToFailed) {
      this.callRetryTransition()
    } else {
      this.callSecondTransition()
    }
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
    .s-button--create-transaction {
      span {
        position: relative;
        padding-left: $inner-spacing-mini * 4;
        &:before {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          margin-top: auto;
          margin-bottom: auto;
          display: block;
          height: var(--s-size-mini);
          width: var(--s-size-mini);
          content: '';
          background: url("~@/assets/img/icon-circle-plus.svg") center 100% no-repeat;
        }
      }
      &:hover,
      &:active {
        span:before {
          background-image: url("~@/assets/img/icon-circle-plus--hover.svg");
        }
      }
    }
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
        @include font-weight(700, true);
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
      @include font-weight(600, true);
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
    @include font-weight(700, true);
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
      @include font-weight(700, true);
      letter-spacing: $s-letter-spacing-type;
      text-transform: uppercase;
    }
  }
  @include status-icon(true);
}
</style>
