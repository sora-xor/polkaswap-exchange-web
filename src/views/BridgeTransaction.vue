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
      <div class="header">
        <div v-loading="isTxPending" :class="headerIconClasses" />
        <h5 class="header-details">
          <formatted-amount
            class="info-line-value"
            value-can-be-hidden
            :value="formattedAmount"
            :asset-symbol="assetSymbol"
          >
            <i :class="`network-icon network-icon--${getNetworkIcon(isOutgoing ? 0 : externalNetworkId)}`" />
          </formatted-amount>
          <span class="header-details-separator">{{ t('bridgeTransaction.for') }}</span>
          <formatted-amount
            class="info-line-value"
            value-can-be-hidden
            :value="formattedAmountReceived"
            :asset-symbol="assetSymbol"
          >
            <i :class="`network-icon network-icon--${getNetworkIcon(isOutgoing ? externalNetworkId : 0)}`" />
          </formatted-amount>
        </h5>
      </div>

      <div
        v-for="{ value, formatted, placeholder, tooltip, links } in accountLinks"
        class="transaction-hash-container transaction-hash-container--with-dropdown"
        :key="value"
      >
        <s-input :placeholder="placeholder" :value="formatted" readonly />
        <s-button
          class="s-button--hash-copy"
          type="action"
          alternative
          icon="basic-copy-24"
          :tooltip="tooltip"
          @click="handleCopyAddress(value, $event)"
        />
        <links-dropdown v-if="links.length" :links="links" />
      </div>

      <info-line :class="failedClass" :label="t('bridgeTransaction.networkInfo.status')" :value="transactionStatus" />
      <info-line :label="t('bridgeTransaction.networkInfo.date')" :value="txDate" />
      <info-line
        v-if="amount"
        is-formatted
        value-can-be-hidden
        :label="t('bridgeTransaction.networkInfo.amount')"
        :value="formattedAmount"
        :asset-symbol="assetSymbol"
        :fiat-value="amountFiatValue"
      />
      <info-line
        v-if="amountReceived"
        is-formatted
        value-can-be-hidden
        :label="t('receivedText')"
        :value="formattedAmountReceived"
        :asset-symbol="assetSymbol"
        :fiat-value="amountReceivedFiatValue"
      />
      <info-line
        is-formatted
        :label="getNetworkText(t('bridgeTransaction.networkInfo.transactionFee'))"
        :value="txSoraNetworkFeeFormatted"
        :asset-symbol="ANLOG.symbol"
        :fiat-value="txSoraNetworkFeeFiatValue"
      />
      <info-line
        is-formatted
        :label="
          getNetworkText(
            t('bridgeTransaction.networkInfo.transactionFee'),
            externalNetworkId,
            txExternalNetworkFeeApproximation
          )
        "
        :value="txExternalNetworkFeeFormatted"
        :asset-symbol="nativeTokenSymbol"
        :fiat-value="txExternalNetworkFeeFiatValue"
      />
      <info-line
        v-if="txExternalTransferFeeNotZero"
        is-formatted
        :label="t('bridge.externalTransferFee', { network: externalNetworkName })"
        :value="txExternalTransferFeeFormatted"
        :asset-symbol="assetSymbol"
        :fiat-value="txExternalTransferFeeFiatValue"
      />

      <div
        v-for="{ value, formatted, placeholder, tooltip, links } in transactionLinks"
        class="transaction-hash-container transaction-hash-container--with-dropdown"
        :key="value"
      >
        <s-input :placeholder="placeholder" :value="formatted" readonly />
        <s-button
          class="s-button--hash-copy"
          type="action"
          alternative
          icon="basic-copy-24"
          :tooltip="tooltip"
          @click="handleCopyAddress(value, $event)"
        />
        <links-dropdown v-if="links.length" :links="links" />
      </div>

      <template v-if="!txIsFinilized">
        <s-button v-if="isAnotherEvmAddress" type="primary" @click="connectEvmWallet">
          <template v-if="!externalAccount">
            {{ t('connectWalletText') }}
          </template>
          <template v-else>
            {{ t('changeAccountText') }}
          </template>
        </s-button>

        <s-button
          v-else
          type="primary"
          class="s-typograhy-button--big"
          :disabled="confirmationButtonDisabled"
          @click="handleTransaction"
        >
          <template v-if="confirmationBlocksLeft">
            {{ t('bridgeTransaction.blocksLeft', { count: confirmationBlocksLeft }) }}
          </template>
          <template v-else-if="txWaitingForApprove">{{
            t('bridgeTransaction.allowToken', { tokenSymbol: assetSymbol })
          }}</template>
          <template v-else-if="isTxPending">{{ t('bridgeTransaction.pending') }}</template>
          <template v-else-if="!(isOutgoing || isValidNetwork)">{{ t('changeNetworkText') }}</template>
          <template v-else-if="isInsufficientBalance">{{
            t('insufficientBalanceText', { tokenSymbol: assetSymbol })
          }}</template>
          <template v-else-if="isInsufficientXorForFee">{{
            t('insufficientBalanceText', { tokenSymbol: ANLOG.symbol })
          }}</template>
          <template v-else-if="isInsufficientEvmNativeTokenForFee">{{
            t('insufficientBalanceText', { tokenSymbol: nativeTokenSymbol })
          }}</template>
          <template v-else-if="isGreaterThanMaxAmount">
            {{ t('exceededAmountText', { amount: t('maxAmountText') }) }}
          </template>
          <template v-else-if="isLowerThanMinAmount">
            {{ t('exceededAmountText', { amount: t('minAmountText') }) }}
          </template>
          <template v-else-if="isTxWaiting">{{ t('confirmTransactionText') }}</template>
          <template v-else-if="hasRetry">{{ t('retryText') }}</template>
        </s-button>

        <div v-if="txWaitingForApprove" class="transaction-approval-text">
          {{ t('bridgeTransaction.approveToken') }}
        </div>
      </template>
    </div>
    <s-button v-if="txIsFinilized" class="s-typography-button--big" type="secondary" @click="navigateToBridge">
      {{ t('bridgeTransaction.newTransaction') }}
    </s-button>
  </div>
</template>

<script lang="ts">
import { BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { components, mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import BridgeMixin from '@/components/mixins/BridgeMixin';
import BridgeTransactionMixin from '@/components/mixins/BridgeTransactionMixin';
import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin';
import { Components, PageNames, ZeroStringValue } from '@/consts';
import { ANLOG_TIMECHAIN } from '@/consts/analog';
import router, { lazyComponent } from '@/router';
import { action, state, getter, mutation } from '@/store/decorators';
import { hasInsufficientBalance, hasInsufficientXorForFee, hasInsufficientNativeTokenForFee } from '@/utils';
import { isUnsignedTx } from '@/utils/bridge/common/utils';
import { subBridgeApi } from '@/utils/bridge/sub/api';

import type { CodecString, IBridgeTransaction } from '@sora-substrate/sdk';
import type { SubNetwork, SubHistory } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';

const FORMATTED_HASH_LENGTH = 24;

type LinkData = {
  value: string;
  formatted: string;
  placeholder: string;
  tooltip: string;
  links: Array<WALLET_CONSTS.ExplorerLink>;
};

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    ConfirmBridgeTransactionDialog: lazyComponent(Components.ConfirmBridgeTransactionDialog),
    LinksDropdown: lazyComponent(Components.LinksDropdown),
    FormattedAmount: components.FormattedAmount,
    InfoLine: components.InfoLine,
  },
})
export default class BridgeTransaction extends Mixins(
  mixins.FormattedAmountMixin,
  mixins.CopyAddressMixin,
  BridgeMixin,
  BridgeTransactionMixin,
  NetworkFormatterMixin
) {
  readonly ANLOG = ANLOG_TIMECHAIN;

  @state.bridge.externalBlockNumber private externalBlockNumber!: number;
  @state.bridge.waitingForApprove private waitingForApprove!: Record<string, boolean>;
  @state.bridge.inProgressIds private inProgressIds!: Record<string, boolean>;
  @state.router.prev private prevRoute!: Nullable<PageNames>;

  @getter.bridge.historyItem private historyItem!: Nullable<IBridgeTransaction>;
  @getter.bridge.externalAccount private externalAccount!: string;

  @action.bridge.removeHistory private removeHistory!: ({ tx, force }: { tx: any; force?: boolean }) => Promise<void>;
  @action.bridge.handleBridgeTransaction private handleBridgeTransaction!: (id: string) => Promise<void>;
  @mutation.bridge.setHistoryId private setHistoryId!: (id?: string) => void;

  // BridgeTransactionMixin override
  get tx(): Nullable<IBridgeTransaction> {
    return this.historyItem;
  }

  get txIsUnsigned(): boolean {
    if (!this.historyItem?.id) return false;

    return isUnsignedTx(this.historyItem);
  }

  get hasRetry(): boolean {
    if (!this.isTxFailed) return false;
    // failed evm transaction could be retried
    return this.txIsUnsigned || this.isEvmTxType;
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

  get amountReceived(): string {
    return this.historyItem?.amount2 ?? this.amount;
  }

  get amountFiatValue(): Nullable<string> {
    return this.asset ? this.getFiatAmountByString(this.amount, this.asset) : null;
  }

  get amountReceivedFiatValue(): Nullable<string> {
    return this.asset ? this.getFiatAmountByString(this.amountReceived, this.asset) : null;
  }

  get formattedAmount(): string {
    return this.amount && this.asset ? this.formatStringValue(this.amount, this.asset.decimals) : '';
  }

  get formattedAmountReceived(): string {
    return this.amountReceived && this.asset ? this.formatStringValue(this.amountReceived, this.asset.decimals) : '';
  }

  get assetSymbol(): string {
    return this.asset?.symbol ?? '';
  }

  get parachainNetworkId(): Nullable<SubNetwork> {
    try {
      return subBridgeApi.getSoraParachain(this.externalNetworkId as SubNetwork);
    } catch {
      return null;
    }
  }

  get txSoraNetworkFee(): CodecString {
    return this.historyItem?.soraNetworkFee ?? this.soraNetworkFee;
  }

  get txSoraNetworkFeeFormatted(): string {
    return this.formatCodecNumber(this.txSoraNetworkFee, this.xor?.decimals);
  }

  get txSoraNetworkFeeFiatValue(): Nullable<string> {
    return this.getFiatAmountByCodecString(this.txSoraNetworkFee);
  }

  get txExternalNetworkFee(): CodecString {
    return this.historyItem?.externalNetworkFee ?? this.externalNetworkFee;
  }

  get txExternalNetworkFeeFormatted(): string {
    return this.formatCodecNumber(this.txExternalNetworkFee, this.nativeTokenDecimals);
  }

  get txExternalNetworkFeeApproximation(): boolean {
    if (this.txExternalNetworkFeeFormatted === ZeroStringValue) return false;

    return !this.historyItem?.externalNetworkFee;
  }

  get txExternalNetworkFeeFiatValue(): Nullable<string> {
    return this.nativeToken ? this.getFiatAmountByCodecString(this.txExternalNetworkFee, this.nativeToken) : null;
  }

  get txExternalTransferFee(): CodecString {
    return (this.historyItem as SubHistory)?.externalTransferFee ?? ZeroStringValue;
  }

  get txExternalTransferFeeFormatted(): string {
    return this.formatCodecNumber(this.txExternalTransferFee, this.asset?.externalDecimals);
  }

  get txExternalTransferFeeNotZero(): boolean {
    return this.txExternalTransferFee !== ZeroStringValue;
  }

  get txExternalTransferFeeFiatValue(): Nullable<string> {
    return this.asset ? this.getFiatAmountByCodecString(this.txExternalTransferFee, this.asset) : null;
  }

  get txParachainBlockId(): string {
    return (this.historyItem as SubHistory)?.parachainBlockId ?? '';
  }

  get txParachainBlockNumber(): number | undefined {
    return (this.historyItem as SubHistory)?.parachainBlockHeight;
  }

  get txDate(): string {
    return this.formatDatetime(this.historyItem);
  }

  get txState(): string {
    return this.historyItem?.transactionState ?? BridgeTxStatus.Pending;
  }

  get isTxFailed(): boolean {
    return this.isFailedState(this.historyItem);
  }

  get isTxCompleted(): boolean {
    return this.isSuccessState(this.historyItem);
  }

  get isTxWaiting(): boolean {
    return this.isWaitingForAction(this.historyItem);
  }

  get isTxPending(): boolean {
    return !this.isTxFailed && !this.isTxCompleted;
  }

  get txIsFinilized(): boolean {
    return !this.isTxPending && !this.isTxWaiting && !this.hasRetry;
  }

  get headerIconClasses(): string {
    const iconClass = 'header-icon';
    const classes = [iconClass];

    if (this.isTxWaiting) {
      classes.push(`${iconClass}--wait`);
    } else if (this.isTxFailed) {
      classes.push(`${iconClass}--error`);
    } else if (this.isTxCompleted) {
      classes.push(`${iconClass}--success`);
    } else {
      classes.push(`${iconClass}--wait`);
    }

    return classes.join(' ');
  }

  get transactionStatus(): string {
    if (this.txIsUnsigned || this.isTxWaiting) {
      return this.t('bridgeTransaction.statuses.waitingForConfirmation');
    }
    if (this.isTxFailed) {
      return this.t('bridgeTransaction.statuses.failed');
    }
    if (this.isTxCompleted) {
      return this.t('bridgeTransaction.statuses.done');
    }

    return this.t('bridgeTransaction.statuses.pending') + '...';
  }

  get isGreaterThanMaxAmount(): boolean {
    return this.txIsUnsigned && this.isGreaterThanTransferMaxAmount(this.amount, this.asset, this.isOutgoing);
  }

  get isLowerThanMinAmount(): boolean {
    return this.txIsUnsigned && this.isLowerThanTransferMinAmount(this.amount, this.asset, this.isOutgoing);
  }

  get isInsufficientBalance(): boolean {
    const fee = this.isOutgoing ? this.txSoraNetworkFee : this.txExternalNetworkFee;

    if (!this.asset || !this.amount || !fee) return false;

    return (
      this.txIsUnsigned &&
      hasInsufficientBalance(this.asset, this.amount, fee, {
        isExternalBalance: !this.isOutgoing,
        isExternalNative: this.isNativeTokenSelected,
      })
    );
  }

  get isInsufficientXorForFee(): boolean {
    return this.txIsUnsigned && hasInsufficientXorForFee(this.xor, this.txSoraNetworkFee);
  }

  get isInsufficientEvmNativeTokenForFee(): boolean {
    return (
      ((this.txIsUnsigned && !this.isOutgoing) || (!this.txIsUnsigned && this.isOutgoing)) &&
      hasInsufficientNativeTokenForFee(this.externalNativeBalance, this.txExternalNetworkFee)
    );
  }

  get isAnotherEvmAddress(): boolean {
    if (!this.isEvmTxType) return false;

    return this.txExternalAccount.toLowerCase() !== this.externalAccount.toLowerCase();
  }

  get confirmationButtonDisabled(): boolean {
    return (
      !(this.isOutgoing || this.isValidNetwork) ||
      this.isAnotherEvmAddress ||
      this.isInsufficientBalance ||
      this.isGreaterThanMaxAmount ||
      this.isLowerThanMinAmount ||
      this.isInsufficientXorForFee ||
      this.isInsufficientEvmNativeTokenForFee ||
      this.isTxPending
    );
  }

  get externalNetworkName(): string {
    return this.externalNetworkType && this.externalNetworkId
      ? this.getNetworkName(this.externalNetworkType, this.externalNetworkId)
      : '';
  }

  get parachainExplorerLinks(): Array<WALLET_CONSTS.ExplorerLink> {
    if (!(this.externalNetworkType && this.parachainNetworkId)) return [];

    return this.getNetworkExplorerLinks(
      this.externalNetworkType,
      this.parachainNetworkId,
      '',
      this.txParachainBlockNumber
    );
  }

  async created(): Promise<void> {
    if (!this.historyItem) {
      this.navigateToBridge();
      return;
    }

    await this.withParentLoading(async () => {
      const withAutoStart = !this.txInProcess && this.isTxPending;

      await this.handleTransaction(withAutoStart);
    });
  }

  beforeDestroy(): void {
    if (!this.txInProcess && this.txIsUnsigned) {
      const tx = { ...this.historyItem };
      this.removeHistory({ tx, force: true });
    }

    // reset active history item
    this.setHistoryId();
  }

  get confirmationBlocksLeft(): number {
    if (!(this.isEvmTxType && !this.isOutgoing && this.txExternalBlockNumber && this.externalBlockNumber)) return 0;

    const blocksLeft = this.txExternalBlockNumber + 30 - this.externalBlockNumber;

    return Math.max(blocksLeft, 0);
  }

  get failedClass(): string {
    return this.isTxFailed && !this.isTxWaiting ? 'info-line--error' : '';
  }

  async handleTransaction(withAutoStart = true): Promise<void> {
    if (withAutoStart && this.historyItem?.id) {
      await this.handleBridgeTransaction(this.historyItem.id);
    }
  }

  handleBack(): void {
    router.push({ name: this.prevRoute as string | undefined });
  }

  get txInternalHash(): string {
    if (!this.isOutgoing) return this.txSoraHash;

    return this.txSoraHash || this.txInternalBlockId || this.txSoraId;
  }

  get accountLinks(): LinkData[] {
    const name = this.t('accountAddressText');
    const internal = this.getLinkData(this.txInternalAccount, this.internalAccountLinks, name);
    const external = this.getLinkData(this.txExternalAccount, this.externalAccountLinks, name, this.externalNetworkId);

    return this.sortLinksByTxDirection([internal, external]);
  }

  get transactionLinks(): LinkData[] {
    const txHashName = this.t('bridgeTransaction.transactionHash');
    const txBlockName = this.t('transaction.blockId');
    const internal = this.getLinkData(this.txInternalHash, this.internalExplorerLinks, txHashName);
    const parachain = this.getLinkData(
      this.txParachainBlockId,
      this.parachainExplorerLinks,
      txBlockName,
      this.parachainNetworkId
    );
    const external = this.getLinkData(
      this.txExternalHash ?? this.txExternalBlockId,
      this.externalExplorerLinks,
      this.txExternalHash ? txHashName : txBlockName,
      this.externalNetworkId
    );

    return this.sortLinksByTxDirection([internal, parachain, external]);
  }

  private sortLinksByTxDirection(outgoingOrderedLinks: Array<LinkData | null>): LinkData[] {
    const links = outgoingOrderedLinks.filter((link) => !!link) as LinkData[];

    return this.isOutgoing ? links : [...links].reverse();
  }

  private getLinkData(
    value: string,
    links: Array<WALLET_CONSTS.ExplorerLink>,
    name: string,
    networkId?: Nullable<BridgeNetworkId>
  ): LinkData | null {
    if (!value) return null;

    const placeholder = this.getNetworkText(name, networkId);

    return {
      value,
      formatted: this.formatAddress(value, FORMATTED_HASH_LENGTH),
      placeholder,
      tooltip: this.copyTooltip(placeholder),
      links,
    };
  }
}
</script>

<style lang="scss">
$header-icon-size: 52px;
$header-spinner-size: 62px;
$header-font-size: var(--s-heading3-font-size);

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
      .s-dropdown--hash-menu {
        position: absolute;
        z-index: $app-content-layer;
        top: 0;
        bottom: 0;
        right: $inner-spacing-medium;
      }
    }
    i {
      font-weight: 600;
      @include icon-styles;
    }
  }
}
.s-button--hash-copy {
  right: $inner-spacing-medium;
  &,
  .el-tooltip {
    &:focus {
      outline: auto;
    }
  }
}
[design-system-theme='dark'] {
  .transaction-content .s-input {
    background-color: var(--s-color-base-on-accent);
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
  &-container .s-typography-button--big {
    width: 100%;
    margin-top: $inner-spacing-medium;
  }
  &-content {
    @include bridge-content(285px);
    margin-top: $inner-spacing-big;

    & > *:not(:first-child) {
      margin-top: $inner-spacing-medium;
    }
  }

  &-hash-container {
    position: relative;

    .s-button--hash-copy {
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
      background-image: url('@/assets/img/status-success.svg');
      background-size: 110%;
    }
    &--wait {
      background-image: url('@/assets/img/header-wait.svg');
    }
    &--error {
      background-image: url('@/assets/img/header-error.svg');
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
    .network-icon {
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
</style>
