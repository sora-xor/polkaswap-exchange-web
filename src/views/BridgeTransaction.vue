<template>
  <div class="container transaction-container">
    <generic-page-header has-button-back :title="t('bridgeTransaction.title')" @back="handleBack">
      <s-button
        class="el-button--history"
        type="action"
        icon="time-time-history-24"
        :tooltip="t('bridgeHistory.showHistory')"
        tooltip-placement="bottom-end"
        @click="handleViewTransactionsHistory"
      />
    </generic-page-header>
    <div class="transaction-content">
      <template>
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
              <s-input
                :placeholder="t('bridgeTransaction.transactionHash')"
                :value="firstTxHash"
                readonly
                tabindex="-1"
              />
              <s-button
                class="s-button--hash-copy"
                type="action"
                alternative
                icon="basic-copy-24"
                :tooltip="copyTransactionHashTooltip"
                @click="handleCopyAddress(transactionFromHash, $event)"
              />
              <s-dropdown
                v-if="hasExplorerLinksForFirstTx"
                class="s-dropdown--hash-menu"
                borderRadius="mini"
                type="ellipsis"
                icon="basic-more-vertical-24"
                placement="bottom-end"
                tabindex="0"
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
                        {{ t('transaction.viewIn', { explorer: link.type }) }}
                      </s-dropdown-item>
                    </a>
                  </template>
                  <s-dropdown-item v-else class="s-dropdown-menu__item">
                    <span>{{ viewInEtherscan }}</span>
                  </s-dropdown-item>
                </template>
              </s-dropdown>
            </div>
            <info-line
              :class="failedClassStep1"
              :label="t('bridgeTransaction.networkInfo.status')"
              :value="statusFrom"
            />
            <info-line :label="t('bridgeTransaction.networkInfo.date')" :value="transactionFromDate" />
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
              @click="handleTransaction()"
            >
              <span
                v-if="isTransactionFromPending"
                v-html="t('bridgeTransaction.pending', { network: transactionPendingNetwork })"
              />
              <template v-else-if="!(isSoraToEvm || isExternalAccountConnected)">{{
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
              <template v-else-if="txWaitingForApprove">{{
                t('bridgeTransaction.allowToken', { tokenSymbol: assetSymbol })
              }}</template>
              <template v-else>{{
                t('bridgeTransaction.confirm', {
                  direction: t(`bridgeTransaction.${isSoraToEvm ? 'sora' : 'metamask'}`),
                })
              }}</template>
            </s-button>

            <div v-if="txWaitingForApprove" class="transaction-approval-text">
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
            <div v-if="isSoraToEvm && !isTxEvmAccount && !isTransactionToCompleted" class="transaction-error">
              <span class="transaction-error__title">{{ t('bridgeTransaction.expectedMetaMaskAddress') }}</span>
              <span class="transaction-error__value">{{ transactionEvmAddress }}</span>
            </div>
            <div v-if="isTransactionFromCompleted && transactionToHash" :class="secondTxHashContainerClasses">
              <s-input
                :placeholder="t('bridgeTransaction.transactionHash')"
                :value="secondTxHash"
                readonly
                tabindex="-1"
              />
              <s-button
                class="s-button--hash-copy"
                type="action"
                alternative
                icon="basic-copy-24"
                :tooltip="copyTransactionHashTooltip"
                @click="handleCopyAddress(transactionToHash, $event)"
              />
              <s-dropdown
                v-if="hasExplorerLinksForSecondTx"
                class="s-dropdown--hash-menu"
                borderRadius="mini"
                type="ellipsis"
                icon="basic-more-vertical-24"
                placement="bottom-end"
                tabindex="0"
                @select="!isSoraToEvm ? undefined : handleOpenEtherscan()"
              >
                <template slot="menu">
                  <template v-if="!isSoraToEvm">
                    <a
                      v-for="link in soraExpolrerLinks"
                      :key="link.type"
                      class="transaction-link"
                      :href="link.value"
                      target="_blank"
                      rel="nofollow noopener"
                    >
                      <s-dropdown-item class="s-dropdown-menu__item" :disabled="!(soraTxId || soraTxBlockId)">
                        {{ t('transaction.viewIn', { explorer: link.type }) }}
                      </s-dropdown-item>
                    </a>
                  </template>
                  <s-dropdown-item v-else class="s-dropdown-menu__item">
                    <span>{{ viewInEtherscan }}</span>
                  </s-dropdown-item>
                </template>
              </s-dropdown>
            </div>
            <info-line :class="failedClassStep2" :label="t('bridgeTransaction.networkInfo.status')" :value="statusTo" />
            <info-line :label="t('bridgeTransaction.networkInfo.date')" :value="transactionToDate" />
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
              @click="handleTransaction()"
            >
              <template v-if="isSoraToEvm && !isExternalAccountConnected">{{
                t('bridgeTransaction.connectWallet')
              }}</template>
              <template v-else-if="isSoraToEvm && !isTxEvmAccount">{{ t('bridgeTransaction.changeAccount') }}</template>
              <template v-else-if="isSoraToEvm && !isValidNetworkType">{{
                t('bridgeTransaction.changeNetwork')
              }}</template>
              <template v-else-if="comfirmationBlocksLeft">
                {{ t('bridgeTransaction.blocksLeft', { count: comfirmationBlocksLeft }) }}
              </template>
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
      v-if="isTransactionToCompleted"
      class="s-typography-button--large"
      type="secondary"
      @click="navigateToBridge"
    >
      {{ t('bridgeTransaction.newTransaction') }}
    </s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components, mixins, getExplorerLinks, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { KnownSymbols } from '@sora-substrate/util/build/assets/consts';
import type { CodecString, BridgeHistory, BridgeNetworks } from '@sora-substrate/util';

import BridgeMixin from '@/components/mixins/BridgeMixin';
import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin';

import router, { lazyComponent } from '@/router';
import { Components, PageNames } from '@/consts';
import { action, state, getter, mutation } from '@/store/decorators';
import { hasInsufficientBalance, hasInsufficientXorForFee, hasInsufficientEvmNativeTokenForFee } from '@/utils';
import { bridgeApi, STATES, isOutgoingTransaction, isUnsignedFromPart } from '@/utils/bridge';
import type { RegisteredAccountAssetWithDecimals } from '@/store/assets/types';

const FORMATTED_HASH_LENGTH = 24;

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    ConfirmBridgeTransactionDialog: lazyComponent(Components.ConfirmBridgeTransactionDialog),
    FormattedAmount: components.FormattedAmount,
    InfoLine: components.InfoLine,
  },
})
export default class BridgeTransaction extends Mixins(
  mixins.FormattedAmountMixin,
  mixins.CopyAddressMixin,
  BridgeMixin,
  NetworkFormatterMixin
) {
  readonly KnownSymbols = KnownSymbols;
  readonly collapseItems = {
    from: 'step-from',
    to: 'step-to',
  };

  @state.bridge.waitingForApprove private waitingForApprove!: Record<string, boolean>;
  @state.bridge.inProgressIds private inProgressIds!: Record<string, boolean>;
  @state.router.prev private prevRoute!: Nullable<PageNames>;

  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<RegisteredAccountAssetWithDecimals>;
  @getter.bridge.historyItem private historyItem!: Nullable<BridgeHistory>;
  @getter.bridge.isTxEvmAccount isTxEvmAccount!: boolean;

  @mutation.bridge.setHistory setHistory!: FnWithoutArgs;
  @mutation.bridge.setHistoryId private setHistoryId!: (id?: string) => void;
  @action.bridge.handleBridgeTx private handleBridgeTx!: (id: string) => Promise<void>;

  get viewInEtherscan(): string {
    return this.t('transaction.viewIn', { explorer: this.TranslationConsts.Etherscan });
  }

  get txInProcess(): boolean {
    if (!this.historyItem?.id) return false;

    return this.historyItem.id in this.inProgressIds;
  }

  get txWaitingForApprove(): boolean {
    if (!this.historyItem?.id) return false;

    return this.historyItem.id in this.waitingForApprove;
  }

  get amount(): string {
    return this.historyItem?.amount ?? '';
  }

  get asset(): Nullable<RegisteredAccountAssetWithDecimals> {
    if (!this.historyItem?.assetAddress) return null;

    return this.getAsset(this.historyItem.assetAddress);
  }

  get isSoraToEvm(): boolean {
    return isOutgoingTransaction(this.historyItem);
  }

  get formattedAmount(): string {
    return this.amount && this.asset ? this.formatStringValue(this.amount, this.asset.decimals) : '';
  }

  get assetSymbol(): string {
    return this.asset?.symbol ?? '';
  }

  get evmIcon(): string {
    return this.getEvmIcon(this.historyItem?.externalNetwork as BridgeNetworks);
  }

  get txSoraNetworkFee(): CodecString {
    return this.historyItem?.soraNetworkFee ?? this.soraNetworkFee;
  }

  get txEvmNetworkFee(): CodecString {
    return this.historyItem?.ethereumNetworkFee ?? this.evmNetworkFee;
  }

  get transactionFromHash(): string {
    return (this.isSoraToEvm ? this.historyItem?.hash : this.historyItem?.ethereumHash) ?? '';
  }

  get transactionToHash(): string {
    return (!this.isSoraToEvm ? this.historyItem?.hash : this.historyItem?.ethereumHash) ?? '';
  }

  get transactionFromDate(): string {
    return this.formatTransactionDate(this.historyItem?.startTime);
  }

  get transactionToDate(): string {
    return this.formatTransactionDate(this.historyItem?.endTime);
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

  get currentState(): string {
    return this.historyItem?.transactionState ?? STATES.INITIAL;
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
    return this.historyItem?.transactionStep ?? 1;
  }

  get copyTransactionHashTooltip(): string {
    return this.copyTooltip(this.t('bridgeTransaction.transactionHash'));
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
      if (!this.isSoraToEvm && !this.transactionFromHash) {
        return this.t('bridgeTransaction.statuses.waitingForConfirmation');
      }
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
    if (this.isTransactionToPending) {
      if (this.isSoraToEvm && !this.transactionToHash) {
        return this.t('bridgeTransaction.statuses.waitingForConfirmation');
      }
      return this.t('bridgeTransaction.statuses.pending') + '...';
    }
    if (this.isTransactionToFailed) {
      return this.t('bridgeTransaction.statuses.failed');
    }
    if (this.isTransactionToCompleted) {
      return this.t('bridgeTransaction.statuses.done');
    }
    return this.t('bridgeTransaction.statuses.waiting') + '...';
  }

  get transactionEvmAddress(): string {
    return this.historyItem?.to ?? '';
  }

  get soraTxId(): Nullable<string> {
    if (!this.historyItem?.id) {
      return null;
    }
    return this.historyItem.txId;
  }

  get soraTxBlockId(): Nullable<string> {
    if (!this.historyItem?.id) {
      return null;
    }
    return this.historyItem.blockId;
  }

  get formattedSoraNetworkFee(): string {
    return this.getStringFromCodec(this.txSoraNetworkFee, this.xor?.decimals);
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
    return hasInsufficientXorForFee(this.xor, this.txSoraNetworkFee);
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
    if (!this.soraNetwork) {
      return [];
    }
    const baseLinks = getExplorerLinks(this.soraNetwork);
    const txId = this.soraTxId || this.soraTxBlockId;
    if (!(baseLinks.length && txId)) {
      return [];
    }
    if (!this.soraTxId) {
      // txId is block
      return baseLinks.map(({ type, value }) => {
        const link = { type } as WALLET_CONSTS.ExplorerLink;
        if (type === WALLET_CONSTS.ExplorerType.Polkadot) {
          link.value = `${value}/${txId}`;
        } else {
          link.value = `${value}/block/${txId}`;
        }
        return link;
      });
    }
    return baseLinks
      .map(({ type, value }) => {
        const link = { type } as WALLET_CONSTS.ExplorerLink;
        if (type === WALLET_CONSTS.ExplorerType.Sorascan) {
          link.value = `${value}/transaction/${txId}`;
        } else if (WALLET_CONSTS.ExplorerType.Subscan) {
          link.value = `${value}/extrinsic/${txId}`;
        } else if (this.soraTxBlockId) {
          // ExplorerType.Polkadot
          link.value = `${value}/${this.soraTxBlockId}`;
        }
        return link;
      })
      .filter((value) => !!value.value); // Polkadot explorer won't be shown without block
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

  navigateToBridge(): void {
    router.push({ name: PageNames.Bridge });
  }

  async created(): Promise<void> {
    if (!this.historyItem) {
      this.navigateToBridge();
      return;
    }

    await this.withParentLoading(async () => {
      const withAutoStart =
        !this.txInProcess && (!this.isTransferStarted || this.isTransactionFromPending || this.isTransactionToPending);

      await this.handleTransaction(withAutoStart);
    });
  }

  beforeDestroy(): void {
    if (this.historyItem) {
      const tx = { ...this.historyItem };

      if (tx.id && !this.txInProcess && isUnsignedFromPart(tx)) {
        bridgeApi.removeHistory(tx.id);
        this.setHistory(); // hack to update another views because of unknown hooks exucution order
      }
    }

    // reset active history item
    this.setHistoryId();
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

  get hasExplorerLinksForFirstTx(): boolean {
    return (this.isSoraToEvm && !!this.soraExpolrerLinks.length) || !this.isSoraToEvm;
  }

  get hasExplorerLinksForSecondTx(): boolean {
    return (!this.isSoraToEvm && !!this.soraExpolrerLinks.length) || this.isSoraToEvm;
  }

  get firstTxHashContainerClasses(): string {
    return this.getHashContainerClasses(this.hasExplorerLinksForFirstTx);
  }

  get secondTxHashContainerClasses(): string {
    return this.getHashContainerClasses(this.hasExplorerLinksForSecondTx);
  }

  get formattedNetworkStep1(): string {
    return this.formatNetwork(this.isSoraToEvm, true);
  }

  get formattedNetworkStep2(): string {
    return this.formatNetwork(!this.isSoraToEvm, true);
  }

  get comfirmationBlocksLeft(): number {
    if (this.isSoraToEvm || !this.isTransactionToPending || !this.historyItem?.blockHeight || !this.evmBlockNumber)
      return 0;

    const blocksLeft = +this.historyItem.blockHeight + 30 - this.evmBlockNumber;

    return Math.max(blocksLeft, 0);
  }

  get failedClassStep1(): string {
    return this.getFailedClass(this.isTransactionFromFailed);
  }

  get failedClassStep2(): string {
    return this.getFailedClass(this.isTransactionToFailed);
  }

  get transactionPendingNetwork(): string {
    return `<span class="network-title">${this.t(
      `bridgeTransaction.${this.isSoraToEvm ? 'sora' : 'ethereum'}`
    )}</span>`;
  }

  private getFailedClass(transactionFailed?: boolean): string {
    return transactionFailed ? 'info-line--error' : '';
  }

  private formatTransactionDate(transactionDate?: number): string {
    // We use current date if request is failed
    const date = transactionDate ? new Date(transactionDate) : new Date();
    return this.formatDate(date.getTime());
  }

  async handleTransaction(withAutoStart = true): Promise<void> {
    await this.checkConnectionToExternalAccount(async () => {
      if (withAutoStart && this.historyItem?.id) {
        await this.handleBridgeTx(this.historyItem.id);
      }
    });
  }

  handleBack(): void {
    router.push({ name: this.prevRoute as string | undefined });
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
  &,
  .el-tooltip {
    &:focus {
      outline: auto;
    }
  }
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
$network-title-max-width: 250px;

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
      z-index: $app-content-layer;
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
    padding: 0 $inner-spacing-tiny;
    margin-bottom: $inner-spacing-medium;
    line-height: var(--s-line-height-mini);
    text-align: left;

    &__title {
      margin-bottom: $inner-spacing-tiny;
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
      margin-left: calc(#{$inner-spacing-mini} / 4);
    }
    &-separator {
      margin-right: $inner-spacing-tiny;
      margin-left: $inner-spacing-tiny;
      font-size: var(--s-heading3-font-size);
      font-weight: 300;
    }
  }
}
.network-info {
  &-title {
    display: flex;
    align-items: baseline;
    padding-right: $inner-spacing-mini;
    padding-left: $inner-spacing-mini;

    h3 {
      margin-right: $inner-spacing-mini;
      font-size: var(--s-font-size-small);
      line-height: var(--s-line-height-reset);
      font-weight: 600;
      letter-spacing: var(--s-letter-spacing-small);
      text-transform: inherit;
      text-align: left;
      max-width: $network-title-max-width;
    }
  }
  @include status-icon(true);
}
.transaction-link {
  color: inherit;
  text-decoration: none;
}
</style>
