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
            <formatted-amount
              class="info-line-value"
              value-can-be-hidden
              :value="formattedAmount"
              :asset-symbol="assetSymbol"
            >
              <i :class="firstNetworkIcon" />
            </formatted-amount>
            <span class="header-details-separator">{{ t('bridgeTransaction.for') }}</span>
            <formatted-amount
              class="info-line-value"
              value-can-be-hidden
              :value="formattedAmount"
              :asset-symbol="assetSymbol"
            >
              <i :class="secondNetworkIcon" />
            </formatted-amount>
          </h5>
          <p class="header-status">{{ headerStatus }}</p>
        </div>
        <s-collapse borders :value="activeCollapseItems">
          <s-collapse-item :name="collapseItems.from">
            <template #title>
              <div class="network-info-title">
                <h3>
                  {{
                    `${t('bridgeTransaction.steps.step', { step: '1' })} ${t('bridgeTransaction.networkTitle', {
                      network: formattedNetworkStep1,
                    })}`
                  }}
                </h3>
                <span :class="firstTxIconStatusClasses" />
              </div>
            </template>
            <div v-if="transactionFromHash" :class="firstTxHashContainerClasses">
              <s-input :placeholder="t('bridgeTransaction.transactionHash')" :value="firstTxHash" readonly />
              <s-button
                class="s-button--hash-copy"
                type="action"
                alternative
                icon="basic-copy-24"
                @click="handleCopyTransactionHash(transactionFromHash)"
              />
              <s-dropdown
                class="s-dropdown--hash-menu"
                borderRadius="mini"
                type="ellipsis"
                icon="basic-more-vertical-24"
                placement="bottom-end"
                @select="isSoraToEvm ? undefined : handleOpenEtherscan()"
              >
                <template slot="menu">
                  <template v-if="isSoraToEvm">
                    <a
                      v-for="link in soraExpolrerLinks"
                      :key="link.type"
                      class="transaction-link"
                      :href="link.value"
                      target="_blank"
                      rel="nofollow noopener"
                    >
                      <s-dropdown-item class="s-dropdown-menu__item" :disabled="!(soraTxId || soraTxBlockId)">
                        {{ t(`transaction.viewIn.${link.type}`) }}
                      </s-dropdown-item>
                    </a>
                  </template>
                  <s-dropdown-item v-else class="s-dropdown-menu__item">
                    <span>{{ t('bridgeTransaction.viewInEtherscan') }}</span>
                  </s-dropdown-item>
                </template>
              </s-dropdown>
            </div>
            <info-line
              :class="failedClassStep1"
              :label="t('bridgeTransaction.networkInfo.status')"
              :value="statusFrom"
            />
            <info-line :label="t('bridgeTransaction.networkInfo.date')" :value="transactionFirstDate" />
            <info-line
              v-if="amount"
              is-formatted
              value-can-be-hidden
              :label="t('bridgeTransaction.networkInfo.amount')"
              :value="`-${formattedAmount}`"
              :asset-symbol="assetSymbol"
              :fiat-value="firstAmountFiatValue"
            />
            <info-line
              is-formatted
              :label="t('bridgeTransaction.networkInfo.transactionFee')"
              :value="isSoraToEvm ? formattedSoraNetworkFee : formattedEvmNetworkFee"
              :asset-symbol="isSoraToEvm ? KnownSymbols.XOR : evmTokenSymbol"
              :fiat-value="soraFeeFiatValue"
            >
              <template v-if="!isSoraToEvm && formattedEvmNetworkFee" #info-line-value-prefix>
                <span class="info-line-value-prefix">~</span>
              </template>
            </info-line>
            <s-button
              v-if="!isTransactionFromCompleted"
              type="primary"
              class="s-typograhy-button--big"
              :disabled="isFirstConfirmationButtonDisabled"
              @click="handleSendTransactionFrom"
            >
              <template v-if="!(isSoraToEvm || isExternalAccountConnected)">{{
                t('bridgeTransaction.connectWallet')
              }}</template>
              <template v-else-if="!(isSoraToEvm || isValidNetworkType)">{{
                t('bridgeTransaction.changeNetwork')
              }}</template>
              <template v-else-if="isInsufficientBalance">{{
                t('confirmBridgeTransactionDialog.insufficientBalance', { tokenSymbol: assetSymbol })
              }}</template>
              <template v-else-if="isInsufficientXorForFee">{{
                t('confirmBridgeTransactionDialog.insufficientBalance', { tokenSymbol: KnownSymbols.XOR })
              }}</template>
              <template v-else-if="isInsufficientEvmNativeTokenForFee">{{
                t('confirmBridgeTransactionDialog.insufficientBalance', { tokenSymbol: evmTokenSymbol })
              }}</template>
              <template v-else-if="isTransactionFromFailed">{{ t('bridgeTransaction.retry') }}</template>
              <template v-else-if="waitingForApprove">{{
                t('bridgeTransaction.allowToken', { tokenSymbol: assetSymbol })
              }}</template>
              <span
                v-else-if="isTransactionFromPending"
                v-html="
                  t('bridgeTransaction.pending', {
                    network: t(`bridgeTransaction.${isSoraToEvm ? 'sora' : 'ethereum'}`),
                  })
                "
              />
              <template v-else>{{
                t('bridgeTransaction.confirm', {
                  direction: t(`bridgeTransaction.${isSoraToEvm ? 'sora' : 'metamask'}`),
                })
              }}</template>
            </s-button>

            <div v-if="waitingForApprove" class="transaction-approval-text">
              {{ t('bridgeTransaction.approveToken') }}
            </div>
          </s-collapse-item>
          <s-collapse-item :name="collapseItems.to">
            <template #title>
              <div class="network-info-title">
                <h3>
                  {{
                    `${t('bridgeTransaction.steps.step', { step: '2' })} ${t('bridgeTransaction.networkTitle', {
                      network: formattedNetworkStep2,
                    })}`
                  }}
                </h3>
                <span v-if="isTransactionFromCompleted" :class="secondTxIconStatusClasses" />
              </div>
            </template>
            <div v-if="isSoraToEvm && !isTxEvmAccount" class="transaction-error">
              <span class="transaction-error__title">{{ t('bridgeTransaction.expectedMetaMaskAddress') }}</span>
              <span class="transaction-error__value">{{ transactionEvmAddress }}</span>
            </div>
            <div v-if="isTransactionFromCompleted && transactionToHash" :class="secondTxHashContainerClasses">
              <s-input :placeholder="t('bridgeTransaction.transactionHash')" :value="secondTxHash" readonly />
              <s-button
                class="s-button--hash-copy"
                type="action"
                alternative
                icon="basic-copy-24"
                @click="handleCopyTransactionHash(transactionToHash)"
              />
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
              is-formatted
              value-can-be-hidden
              :label="t('bridgeTransaction.networkInfo.amount')"
              :value="formattedAmount"
              :asset-symbol="assetSymbol"
              :fiat-value="secondAmountFiatValue"
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
            <s-button
              v-if="isTransactionFromCompleted && !isTransactionToCompleted"
              type="primary"
              class="s-typograhy-button--big"
              :disabled="isSecondConfirmationButtonDisabled"
              @click="handleSendTransactionTo"
            >
              <template v-if="isSoraToEvm && !isExternalAccountConnected">{{
                t('bridgeTransaction.connectWallet')
              }}</template>
              <template v-else-if="isSoraToEvm && !isTxEvmAccount">{{ t('bridgeTransaction.changeAccount') }}</template>
              <template v-else-if="isSoraToEvm && !isValidNetworkType">{{
                t('bridgeTransaction.changeNetwork')
              }}</template>
              <span
                v-else-if="isTransactionToPending"
                v-html="
                  t('bridgeTransaction.pending', {
                    network: t(`bridgeTransaction.${!isSoraToEvm ? 'sora' : 'ethereum'}`),
                  })
                "
              />
              <template v-else-if="isSoraToEvm ? isInsufficientEvmNativeTokenForFee : isInsufficientXorForFee">{{
                t('confirmBridgeTransactionDialog.insufficientBalance', {
                  tokenSymbol: isSoraToEvm ? evmTokenSymbol : KnownSymbols.XOR,
                })
              }}</template>
              <template v-else-if="isTransactionToFailed">{{ t('bridgeTransaction.retry') }}</template>
              <template v-else>{{
                t('bridgeTransaction.confirm', {
                  direction: t(`bridgeTransaction.${!isSoraToEvm ? 'sora' : 'metamask'}`),
                })
              }}</template>
            </s-button>
          </s-collapse-item>
        </s-collapse>
      </template>
    </div>
    <s-button
      v-if="isInitRequestCompleted && isTransactionToCompleted"
      class="s-typography-button--large"
      type="secondary"
      @click="handleCreateTransaction"
    >
      {{ t('bridgeTransaction.newTransaction') }}
    </s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { Getter, Action } from 'vuex-class';
import { KnownSymbols, FPNumber, BridgeHistory } from '@sora-substrate/util';
import { api, components, mixins, getExplorerLinks, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { interpret } from 'xstate';

import BridgeMixin from '@/components/mixins/BridgeMixin';
import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin';

import router, { lazyComponent } from '@/router';
import { Components, PageNames, MetamaskCancellationCode } from '@/consts';
import {
  copyToClipboard,
  hasInsufficientBalance,
  hasInsufficientXorForFee,
  hasInsufficientEvmNativeTokenForFee,
} from '@/utils';
import { createFSM, EVENTS, SORA_EVM_STATES, EVM_SORA_STATES, STATES } from '@/utils/fsm';

import type { CodecString } from '@sora-substrate/util';

const FORMATTED_HASH_LENGTH = 24;
const namespace = 'bridge';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    ConfirmBridgeTransactionDialog: lazyComponent(Components.ConfirmBridgeTransactionDialog),
    FormattedAmount: components.FormattedAmount,
    InfoLine: components.InfoLine,
  },
})
export default class BridgeTransaction extends Mixins(mixins.FormattedAmountMixin, BridgeMixin, NetworkFormatterMixin) {
  @Getter soraNetwork!: WALLET_CONSTS.SoraNetwork;
  @Getter('prev', { namespace: 'router' }) prevRoute!: PageNames;

  @Getter('isTransactionConfirmed', { namespace }) isTransactionConfirmed!: boolean;
  @Getter('transactionFromHash', { namespace }) transactionFromHash!: string;
  @Getter('transactionToHash', { namespace }) transactionToHash!: string;
  @Getter('transactionFromDate', { namespace }) transactionFromDate!: string;
  @Getter('transactionToDate', { namespace }) transactionToDate!: string;

  @Getter('currentState', { namespace }) currentState!: STATES;
  @Getter('historyItem', { namespace }) historyItem!: any;
  @Getter('isTxEvmAccount', { namespace }) isTxEvmAccount!: boolean;
  @Getter('waitingForApprove', { namespace }) waitingForApprove!: boolean;

  @Action('setHistoryItem', { namespace }) setHistoryItem;

  @Action('signSoraTransactionSoraToEvm', { namespace }) signSoraTransactionSoraToEvm;
  @Action('signEvmTransactionSoraToEvm', { namespace }) signEvmTransactionSoraToEvm;
  @Action('sendSoraTransactionSoraToEvm', { namespace }) sendSoraTransactionSoraToEvm;
  @Action('sendEvmTransactionSoraToEvm', { namespace }) sendEvmTransactionSoraToEvm;

  @Action('signSoraTransactionEvmToSora', { namespace }) signSoraTransactionEvmToSora;
  @Action('signEvmTransactionEvmToSora', { namespace }) signEvmTransactionEvmToSora;
  @Action('sendSoraTransactionEvmToSora', { namespace }) sendSoraTransactionEvmToSora;
  @Action('sendEvmTransactionEvmToSora', { namespace }) sendEvmTransactionEvmToSora;

  @Action('generateHistoryItem', { namespace }) generateHistoryItem!: () => Promise<BridgeHistory>;
  @Action('updateHistoryParams', { namespace }) updateHistoryParams;
  @Action('removeHistoryById', { namespace }) removeHistoryById;

  readonly KnownSymbols = KnownSymbols;
  readonly collapseItems = {
    from: 'step-from',
    to: 'step-to',
  };

  callFirstTransition = () => {};
  callSecondTransition = () => {};
  callRetryTransition = () => {};
  sendService: any = null;
  isInitRequestCompleted = false;

  get formattedAmount(): string {
    return this.amount && this.asset ? new FPNumber(this.amount, this.asset.decimals).toLocaleString() : '';
  }

  get assetSymbol(): string {
    return this.asset?.symbol ?? '';
  }

  get evmIcon(): string {
    return this.getEvmIcon(this.evmNetwork);
  }

  get txSoraNetworkFee(): CodecString {
    return this.historyItem?.soraNetworkFee ?? this.soraNetworkFee;
  }

  get txEvmNetworkFee(): CodecString {
    return this.historyItem?.ethereumNetworkFee ?? this.evmNetworkFee;
  }

  get soraFeeFiatValue(): Nullable<string> {
    if (this.isSoraToEvm) {
      return this.getFiatAmountByCodecString(this.txSoraNetworkFee);
    }
    return null;
  }

  get firstAmountFiatValue(): Nullable<string> {
    if (this.isSoraToEvm && this.asset) {
      return this.getFiatAmountByString(this.amount, this.asset);
    }
    return null;
  }

  get secondAmountFiatValue(): Nullable<string> {
    if (!this.isSoraToEvm && this.asset) {
      return this.getFiatAmountByString(this.amount, this.asset);
    }
    return null;
  }

  get isTransferStarted(): boolean {
    return this.currentState !== STATES.INITIAL;
  }

  get isTransactionFromPending(): boolean {
    return this.currentState === (this.isSoraToEvm ? STATES.SORA_PENDING : STATES.EVM_PENDING);
  }

  get isTransactionToPending(): boolean {
    return this.currentState === (!this.isSoraToEvm ? STATES.SORA_PENDING : STATES.EVM_PENDING);
  }

  get isTransactionFromFailed(): boolean {
    return this.currentState === (this.isSoraToEvm ? STATES.SORA_REJECTED : STATES.EVM_REJECTED);
  }

  get isTransactionToFailed(): boolean {
    return this.currentState === (!this.isSoraToEvm ? STATES.SORA_REJECTED : STATES.EVM_REJECTED);
  }

  get isTransactionFromCompleted(): boolean {
    return this.isTransferStarted && !this.isTransactionFromPending && !this.isTransactionFromFailed;
  }

  get isTransactionToCompleted(): boolean {
    return this.currentState === (!this.isSoraToEvm ? STATES.SORA_COMMITED : STATES.EVM_COMMITED);
  }

  get transactionStep(): number {
    return this.isTransactionFromCompleted ? 2 : 1;
  }

  get activeCollapseItems(): Array<string> {
    if (this.isTransactionToCompleted) {
      return [];
    }
    if (this.isTransactionFromCompleted) {
      return [this.collapseItems.to];
    }

    return [this.collapseItems.from, this.collapseItems.to];
  }

  get headerIconClasses(): string {
    const iconClass = 'header-icon';
    const classes = [iconClass];

    if (this.isTransactionFromFailed || this.isTransactionToFailed) {
      classes.push(`${iconClass}--error`);
    } else if (this.isTransactionToCompleted) {
      classes.push(`${iconClass}--success`);
    } else if (this.isTransactionFromCompleted) {
      classes.push(`${iconClass}--wait`);
    }

    return classes.join(' ');
  }

  get headerStatus(): string {
    const failedAndPendingParams = {
      step: this.t('bridgeTransaction.steps.step', {
        step: this.t(`bridgeTransaction.steps.step${this.transactionStep}`),
      }),
    };
    if (this.isTransactionFromPending || this.isTransactionToPending) {
      return this.t('bridgeTransaction.status.pending', failedAndPendingParams);
    }
    if (this.isTransactionFromFailed || this.isTransactionToFailed) {
      return this.t('bridgeTransaction.status.failed', failedAndPendingParams);
    }
    if (this.isTransactionToCompleted) {
      return this.t('bridgeTransaction.status.convertionComplete');
    }
    return this.t('bridgeTransaction.status.confirm');
  }

  get statusFrom(): string {
    if (this.isTransactionFromPending) {
      return this.t('bridgeTransaction.statuses.pending') + '...';
    }
    if (this.isTransactionFromFailed) {
      return this.t('bridgeTransaction.statuses.failed');
    }
    if (this.isTransactionFromCompleted) {
      return this.t('bridgeTransaction.statuses.done');
    }

    return this.t('bridgeTransaction.statuses.waiting') + '...';
  }

  get statusTo(): string {
    if (!this.isTransactionFromCompleted) {
      return this.t('bridgeTransaction.statuses.waiting') + '...';
    }
    if (this.isTransactionToPending) {
      const message = this.t('bridgeTransaction.statuses.pending') + '...';
      if (this.isSoraToEvm) {
        return message;
      }
      return `${message} (${this.t('bridgeTransaction.wait30Block')})`;
    }
    if (this.isTransactionToFailed) {
      return this.t('bridgeTransaction.statuses.failed');
    }
    if (this.isTransactionToCompleted) {
      return this.t('bridgeTransaction.statuses.done');
    }
    return this.t('bridgeTransaction.statuses.waitingForConfirmation');
  }

  get transactionEvmAddress(): string {
    return this.historyItem?.to ?? '';
  }

  get soraTxId(): Nullable<string> {
    if (!this.historyItem?.id) {
      return null;
    }
    return this.historyItem.txId || api.bridge.getHistory(this.historyItem.id)?.txId;
  }

  get soraTxBlockId(): Nullable<string> {
    if (!this.historyItem?.id) {
      return null;
    }
    return this.historyItem.blockId || api.bridge.getHistory(this.historyItem.id)?.blockId;
  }

  get transactionFirstDate(): string {
    return this.formatTransactionDate(this.transactionFromDate);
  }

  get transactionSecondDate(): string {
    return this.formatTransactionDate(this.transactionToDate);
  }

  get formattedSoraNetworkFee(): string {
    return this.getStringFromCodec(this.txSoraNetworkFee, this.tokenXOR?.decimals);
  }

  get soraNetworkFeeFiatValue(): Nullable<string> {
    if (this.isSoraToEvm) {
      return null;
    }
    return this.getFiatAmountByCodecString(this.txSoraNetworkFee);
  }

  get formattedEvmNetworkFee(): string {
    return this.formatCodecNumber(this.txEvmNetworkFee);
  }

  get isInsufficientBalance(): boolean {
    const fee = this.isSoraToEvm ? this.txSoraNetworkFee : this.txEvmNetworkFee;

    if (!this.asset || !this.amount || !fee) return false;

    return hasInsufficientBalance(this.asset, this.amount, fee, !this.isSoraToEvm);
  }

  get isInsufficientXorForFee(): boolean {
    return hasInsufficientXorForFee(this.tokenXOR, this.txSoraNetworkFee);
  }

  get isInsufficientEvmNativeTokenForFee(): boolean {
    return hasInsufficientEvmNativeTokenForFee(this.evmBalance, this.txEvmNetworkFee);
  }

  get isFirstConfirmationButtonDisabled(): boolean {
    return (
      !(this.isSoraToEvm || this.isValidNetworkType) ||
      !this.isTransferStarted ||
      this.isInsufficientBalance ||
      this.isInsufficientXorForFee ||
      this.isInsufficientEvmNativeTokenForFee ||
      this.isTransactionFromPending
    );
  }

  get isSecondConfirmationButtonDisabled(): boolean {
    return (
      (this.isSoraToEvm && !(this.isValidNetworkType && this.isTxEvmAccount)) ||
      (this.isSoraToEvm ? this.isInsufficientEvmNativeTokenForFee : this.isInsufficientXorForFee) ||
      this.isTransactionToPending
    );
  }

  get firstNetworkIcon(): string {
    return `s-icon--network s-icon-${this.isSoraToEvm ? 'sora' : this.evmIcon}`;
  }

  get secondNetworkIcon(): string {
    return `s-icon--network s-icon-${this.isSoraToEvm ? this.evmIcon : 'sora'}`;
  }

  handleOpenEtherscan(): void {
    const hash = this.isSoraToEvm ? this.transactionToHash : this.transactionFromHash;
    const url = this.getEtherscanLink(hash, true);
    const win = window.open(url, '_blank');
    win && win.focus();
  }

  get soraExpolrerLinks(): Array<WALLET_CONSTS.ExplorerLink> {
    const baseLinks = getExplorerLinks(this.soraNetwork);
    const txId = this.soraTxId || this.soraTxBlockId;
    if (!(this.isSoraToEvm && txId)) {
      return [];
    }
    if (!this.soraTxId) {
      return baseLinks.map(({ type, value }) => ({ type, value: `${value}/block/${txId}` }));
    }
    return baseLinks.map(({ type, value }) => {
      const link = { type } as WALLET_CONSTS.ExplorerLink;
      if (type === WALLET_CONSTS.ExplorerType.Sorascan) {
        link.value = `${value}/transaction/${txId}`;
      } else {
        link.value = `${value}/extrinsic/${txId}`;
      }
      return link;
    });
  }

  get firstTxHash(): string {
    return this.formatAddress(this.transactionFromHash, FORMATTED_HASH_LENGTH);
  }

  get secondTxHash(): string {
    return this.formatAddress(this.transactionToHash, FORMATTED_HASH_LENGTH);
  }

  handleViewTransactionsHistory(): void {
    router.push({ name: PageNames.BridgeTransactionsHistory });
  }

  handleCreateTransaction(): void {
    router.push({ name: PageNames.Bridge });
  }

  async created(): Promise<void> {
    if (!this.isTransactionConfirmed) {
      router.push({ name: PageNames.Bridge });
      return;
    }
    this.initializeTransactionStateMachine();
    this.isInitRequestCompleted = true;
    const withAutoRetry = this.prevRoute !== PageNames.BridgeTransactionsHistory;
    await this.handleSendTransactionFrom(withAutoRetry);
  }

  async beforeDestroy(): Promise<void> {
    this.setHistoryItem(null);
    if (this.sendService) {
      this.sendService.stop();
    }
  }

  async initializeTransactionStateMachine() {
    // Create state machine and interpret it
    const historyItem = this.historyItem ? this.historyItem : await this.generateHistoryItem();
    const machineStates = this.isSoraToEvm ? SORA_EVM_STATES : EVM_SORA_STATES;
    const initialState = this.currentState;
    this.sendService = interpret(
      createFSM(
        {
          history: historyItem,
          SORA_EVM: {
            sora: {
              sign: this.signSoraTransactionSoraToEvm,
              send: this.sendSoraTransactionSoraToEvm,
            },
            evm: {
              sign: this.signEvmTransactionSoraToEvm,
              send: this.sendEvmTransactionSoraToEvm,
            },
          },
          EVM_SORA: {
            sora: {
              sign: this.signSoraTransactionEvmToSora,
              send: this.sendSoraTransactionEvmToSora,
            },
            evm: {
              sign: this.signEvmTransactionEvmToSora,
              send: this.sendEvmTransactionEvmToSora,
            },
          },
        },
        machineStates,
        initialState
      )
    );

    this.callFirstTransition = () =>
      machineStates === SORA_EVM_STATES
        ? this.sendService.send(EVENTS.SEND_SORA)
        : this.sendService.send(EVENTS.SEND_EVM);

    this.callSecondTransition = () =>
      machineStates === SORA_EVM_STATES
        ? this.sendService.send(EVENTS.SEND_EVM)
        : this.sendService.send(EVENTS.SEND_SORA);

    this.callRetryTransition = () => this.sendService.send(EVENTS.RETRY);

    // Subscribe to transition events
    this.sendService
      .onTransition(async (state) => {
        await this.updateHistoryParams(state.context.history);

        if (
          !state.context.history.hash?.length &&
          !state.context.history.ethereumHash?.length &&
          [STATES.SORA_REJECTED, STATES.EVM_REJECTED].includes(state.value)
        ) {
          if (state.event.data?.message.includes('Cancelled') || state.event.data?.code === MetamaskCancellationCode) {
            await this.removeHistoryById(state.context.history.id);
          }
        }

        if (
          (machineStates === SORA_EVM_STATES && state.value === STATES.SORA_COMMITED) ||
          (machineStates === EVM_SORA_STATES && state.value === STATES.EVM_COMMITED)
        ) {
          this.callSecondTransition();
        }
      })
      .start();
  }

  private getTxIconStatusClasses(isSecondTransaction?: boolean): string {
    const iconClass = 'network-info-icon';
    const classes = [iconClass];
    const isError = isSecondTransaction ? this.isTransactionToFailed : this.isTransactionFromFailed;
    const isCompleted = isSecondTransaction ? this.isTransactionToCompleted : this.isTransactionFromCompleted;

    if (isError) {
      classes.push(`${iconClass}--error`);
    } else if (isCompleted) {
      classes.push(`${iconClass}--success`);
    } else {
      classes.push(`${iconClass}--pending`);
    }

    return classes.join(' ');
  }

  get firstTxIconStatusClasses(): string {
    return this.getTxIconStatusClasses();
  }

  get secondTxIconStatusClasses(): string {
    return this.getTxIconStatusClasses(true);
  }

  private getHashContainerClasses(hasMenuDropdown = true): string {
    const container = 'transaction-hash-container';
    const classes = [container];
    if (hasMenuDropdown) {
      classes.push(`${container}--with-dropdown`);
    }
    return classes.join(' ');
  }

  get firstTxHashContainerClasses(): string {
    return this.getHashContainerClasses();
  }

  get secondTxHashContainerClasses(): string {
    // cuz we don't show SORA tx for ETH->SORA flow
    return this.getHashContainerClasses(this.isSoraToEvm);
  }

  get formattedNetworkStep1(): string {
    return this.t(this.formatNetwork(this.isSoraToEvm, true));
  }

  get formattedNetworkStep2(): string {
    return this.t(this.formatNetwork(!this.isSoraToEvm, true));
  }

  async handleCopyTransactionHash(hash: string): Promise<void> {
    try {
      await copyToClipboard(hash);
      this.$notify({
        message: this.t('bridgeTransaction.successCopy'),
        type: 'success',
        title: '',
      });
    } catch (error) {
      this.$notify({
        message: `${this.t('warningText')} ${error}`,
        type: 'warning',
        title: '',
      });
    }
  }

  get failedClassStep1(): string {
    return this.getFailedClass(this.isTransactionFromFailed);
  }

  get failedClassStep2(): string {
    return this.getFailedClass(this.isTransactionToFailed);
  }

  private getFailedClass(transactionFailed?: boolean): string {
    return transactionFailed ? 'info-line--error' : '';
  }

  private formatTransactionDate(transactionDate: string): string {
    // We use current date if request is failed
    const date = transactionDate ? new Date(transactionDate) : new Date();
    return this.formatDate(date.getTime());
  }

  async handleSendTransactionFrom(withAutoRetry = true): Promise<void> {
    await this.checkConnectionToExternalAccount(() => {
      if (this.isTransactionFromFailed && withAutoRetry) {
        this.callRetryTransition();
      } else {
        this.callFirstTransition();
      }
    });
  }

  async handleSendTransactionTo(): Promise<void> {
    await this.checkConnectionToExternalAccount(() => {
      if (this.isTransactionToFailed) {
        this.callRetryTransition();
      } else {
        this.callSecondTransition();
      }
    });
  }

  handleBack(): void {
    router.push({ name: this.prevRoute });
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
[design-system-theme='dark'] {
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
    @include bridge-content(285px);
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
  &-approval-text {
    margin-top: $inner-spacing-medium;
    font-size: var(--s-font-size-mini);
  }
}
.header {
  margin-bottom: $inner-spacing-medium;
  text-align: center;
  &-icon {
    margin: $inner-spacing-medium auto;
    &--success {
      background-image: url('~@/assets/img/status-success.svg');
      background-size: 110%;
    }
    &--wait {
      background-image: url('~@/assets/img/header-wait.svg');
    }
    &--error {
      background-image: url('~@/assets/img/header-error.svg');
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
.transaction-link {
  color: inherit;
  text-decoration: none;
}
</style>
