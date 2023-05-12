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
      </div>

      <div v-if="txEvmAddress" class="transaction-hash-container transaction-hash-container--with-dropdown">
        <s-input :placeholder="txEvmAddressPlaceholder" :value="txEvmAddressFormatted" readonly />
        <s-button
          class="s-button--hash-copy"
          type="action"
          alternative
          icon="basic-copy-24"
          :tooltip="txEvmAddressCopyTooltip"
          @click="handleCopyAddress(txEvmAddress, $event)"
        />

        <s-dropdown
          class="s-dropdown--hash-menu"
          borderRadius="mini"
          type="ellipsis"
          icon="basic-more-vertical-24"
          placement="bottom-end"
          @select="handleOpenEvmExplorer(txEvmAddress, EvmLinkType.Account, externalNetworkId)"
        >
          <template slot="menu">
            <s-dropdown-item class="s-dropdown-menu__item">
              <span>{{ viewInEtherscan }}</span>
            </s-dropdown-item>
          </template>
        </s-dropdown>
      </div>

      <info-line :class="failedClass" :label="t('bridgeTransaction.networkInfo.status')" :value="transactionStatus" />
      <info-line :label="t('bridgeTransaction.networkInfo.date')" :value="txStartDate" />
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
        is-formatted
        :label="getNetworkText(true, 'bridgeTransaction.networkInfo.transactionFee')"
        :value="txSoraNetworkFeeFormatted"
        :asset-symbol="KnownSymbols.XOR"
        :fiat-value="txSoraNetworkFeeFiatValue"
      />
      <info-line
        is-formatted
        :label="getNetworkText(false, 'bridgeTransaction.networkInfo.transactionFee')"
        :value="txEvmNetworkFeeFormatted"
        :asset-symbol="evmTokenSymbol"
      >
        <template v-if="txEvmNetworkFeeFormatted" #info-line-value-prefix>
          <span class="info-line-value-prefix">~</span>
        </template>
      </info-line>

      <div v-if="txSoraHash" class="transaction-hash-container transaction-hash-container--with-dropdown">
        <s-input
          :placeholder="getNetworkText(true, 'bridgeTransaction.transactionHash')"
          :value="txSoraHashFormatted"
          readonly
        />
        <s-button
          class="s-button--hash-copy"
          type="action"
          alternative
          icon="basic-copy-24"
          :tooltip="hashCopyTooltip"
          @click="handleCopyAddress(txSoraHash, $event)"
        />
        <s-dropdown
          v-if="soraExplorerLinks.length"
          class="s-dropdown--hash-menu"
          borderRadius="mini"
          type="ellipsis"
          icon="basic-more-vertical-24"
          placement="bottom-end"
        >
          <template slot="menu">
            <a
              v-for="link in soraExplorerLinks"
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
        </s-dropdown>
      </div>

      <div v-if="txEvmHash" class="transaction-hash-container transaction-hash-container--with-dropdown">
        <s-input
          :placeholder="getNetworkText(false, 'bridgeTransaction.transactionHash')"
          :value="txEvmHashFormatted"
          readonly
        />
        <s-button
          class="s-button--hash-copy"
          type="action"
          alternative
          icon="basic-copy-24"
          :tooltip="hashCopyTooltip"
          @click="handleCopyAddress(txEvmHash, $event)"
        />
        <s-dropdown
          class="s-dropdown--hash-menu"
          borderRadius="mini"
          type="ellipsis"
          icon="basic-more-vertical-24"
          placement="bottom-end"
          @select="handleOpenEvmExplorer(txEvmHash, EvmLinkType.Transaction, externalNetworkId)"
        >
          <template slot="menu">
            <s-dropdown-item class="s-dropdown-menu__item">
              <span>{{ viewInEtherscan }}</span>
            </s-dropdown-item>
          </template>
        </s-dropdown>
      </div>

      <s-button
        v-if="!isTxCompleted"
        type="primary"
        class="s-typograhy-button--big"
        :disabled="confirmationButtonDisabled"
        @click="handleTransaction"
      >
        <template v-if="comfirmationBlocksLeft">
          {{ t('bridgeTransaction.blocksLeft', { count: comfirmationBlocksLeft }) }}
        </template>
        <template v-else-if="isTxPending">{{ t('bridgeTransaction.pending') }}</template>
        <template v-else-if="!(isSoraToEvm || isExternalAccountConnected)">{{
          t('bridgeTransaction.connectWallet')
        }}</template>
        <template v-else-if="!(isSoraToEvm || isValidNetwork)">{{ t('bridgeTransaction.changeNetwork') }}</template>
        <template v-else-if="isInsufficientBalance">{{
          t('confirmBridgeTransactionDialog.insufficientBalance', { tokenSymbol: assetSymbol })
        }}</template>
        <template v-else-if="isInsufficientXorForFee">{{
          t('confirmBridgeTransactionDialog.insufficientBalance', { tokenSymbol: KnownSymbols.XOR })
        }}</template>
        <template v-else-if="isInsufficientEvmNativeTokenForFee">{{
          t('confirmBridgeTransactionDialog.insufficientBalance', { tokenSymbol: evmTokenSymbol })
        }}</template>
        <template v-else-if="isTxWaiting">{{ t('bridgeTransaction.confirm', { direction: 'metamask' }) }}</template>
        <template v-else-if="isTxFailed">{{ t('bridgeTransaction.retry') }}</template>
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
    </div>
    <s-button v-if="isTxCompleted" class="s-typography-button--large" type="secondary" @click="navigateToBridge">
      {{ t('bridgeTransaction.newTransaction') }}
    </s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components, mixins, getExplorerLinks, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { KnownSymbols } from '@sora-substrate/util/build/assets/consts';
import { EvmTxStatus } from '@sora-substrate/util/build/evm/consts';
import type { CodecString, BridgeHistory } from '@sora-substrate/util';
import type { EvmHistory, EvmNetwork } from '@sora-substrate/util/build/evm/types';

import BridgeMixin from '@/components/mixins/BridgeMixin';
import BridgeTransactionMixin from '@/components/mixins/BridgeTransactionMixin';
import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin';

import router, { lazyComponent } from '@/router';
import { Components, PageNames } from '@/consts';
import { action, state, getter, mutation } from '@/store/decorators';
import { hasInsufficientBalance, hasInsufficientXorForFee, hasInsufficientEvmNativeTokenForFee } from '@/utils';
import { isUnsignedTx as isUnsignedEvmTx } from '@/utils/bridge/evm/utils';
import { isUnsignedTx as isUnsignedEthTx } from '@/utils/bridge/eth/utils';

import { isOutgoingTransaction } from '@/utils/bridge/common/utils';

import type { RegisteredAccountAssetWithDecimals } from '@/store/assets/types';
import type { EvmLinkType } from '@/consts/evm';
import type { IBridgeTransaction } from '@/utils/bridge/common/types';

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
  BridgeTransactionMixin,
  NetworkFormatterMixin
) {
  readonly KnownSymbols = KnownSymbols;

  @state.bridge.waitingForApprove private waitingForApprove!: Record<string, boolean>;
  @state.bridge.inProgressIds private inProgressIds!: Record<string, boolean>;
  @state.router.prev private prevRoute!: Nullable<PageNames>;

  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<RegisteredAccountAssetWithDecimals>;
  @getter.bridge.historyItem private historyItem!: Nullable<IBridgeTransaction>;
  @getter.bridge.isEthBridge private isEthBridge!: boolean;

  @action.bridge.removeHistory private removeHistory!: ({ tx, force }: { tx: any; force?: boolean }) => Promise<void>;
  @action.bridge.handleBridgeTransaction private handleBridgeTransaction!: (id: string) => Promise<void>;
  @mutation.bridge.setHistoryId private setHistoryId!: (id?: string) => void;

  get viewInEtherscan(): string {
    return this.t('transaction.viewIn', { explorer: this.TranslationConsts.Etherscan });
  }

  get txIsUnsigned(): boolean {
    if (!this.historyItem?.id) return false;

    return this.isEthBridge
      ? isUnsignedEthTx(this.historyItem as BridgeHistory)
      : isUnsignedEvmTx(this.historyItem as EvmHistory);
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

  get amountFiatValue(): Nullable<string> {
    return this.asset ? this.getFiatAmountByString(this.amount, this.asset) : null;
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

  get externalNetworkId(): Nullable<EvmNetwork> {
    return this.historyItem?.externalNetwork as unknown as EvmNetwork;
  }

  get evmIcon(): string {
    return this.getEvmIcon(this.externalNetworkId);
  }

  get txSoraNetworkFee(): CodecString {
    return this.historyItem?.soraNetworkFee ?? this.soraNetworkFee;
  }

  get txSoraNetworkFeeFormatted(): string {
    return this.getStringFromCodec(this.txSoraNetworkFee, this.xor?.decimals);
  }

  get txSoraNetworkFeeFiatValue(): Nullable<string> {
    return this.getFiatAmountByCodecString(this.txSoraNetworkFee);
  }

  get txEvmNetworkFee(): CodecString {
    return this.historyItem?.externalNetworkFee ?? this.evmNetworkFee;
  }

  get txEvmNetworkFeeFormatted(): string {
    return this.formatCodecNumber(this.txEvmNetworkFee);
  }

  get txSoraHash(): string {
    return this.historyItem?.hash ?? '';
  }

  get txSoraHashFormatted(): string {
    return this.formatAddress(this.txSoraHash, FORMATTED_HASH_LENGTH);
  }

  get txEvmHash(): string {
    return this.historyItem?.externalHash ?? '';
  }

  get txEvmHashFormatted(): string {
    return this.formatAddress(this.txEvmHash, FORMATTED_HASH_LENGTH);
  }

  get txStartDate(): string {
    return this.formatTransactionDate(this.historyItem?.startTime);
  }

  get txState(): string {
    return this.historyItem?.transactionState ?? EvmTxStatus.Pending;
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
    if (this.isTxWaiting) {
      return this.t('bridgeTransaction.statuses.waitingForConfirmation');
    }
    if (this.isTxFailed) {
      return this.t('bridgeTransaction.statuses.failed');
    }
    if (this.isTxCompleted) {
      return this.t('bridgeTransaction.statuses.done');
    }
    if (!this.txId) {
      return this.t('bridgeTransaction.statuses.waitingForConfirmation');
    }

    return this.t('bridgeTransaction.statuses.pending') + '...';
  }

  get txEvmAddress(): string {
    return this.historyItem?.to ?? '';
  }

  get txEvmAddressFormatted(): string {
    return this.formatAddress(this.txEvmAddress, FORMATTED_HASH_LENGTH);
  }

  get txEvmAddressPlaceholder(): string {
    return this.getNetworkText(false, 'accountAddressText');
  }

  get txEvmAddressCopyTooltip(): string {
    return this.copyTooltip(this.txEvmAddressPlaceholder);
  }

  get txId(): Nullable<string> {
    return this.isSoraToEvm ? this.historyItem?.txId : this.historyItem?.externalHash;
  }

  get soraTxId(): Nullable<string> {
    return this.historyItem?.txId;
  }

  get soraTxBlockId(): Nullable<string> {
    return this.historyItem?.blockId;
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

  get confirmationButtonDisabled(): boolean {
    return (
      !(this.isSoraToEvm || this.isValidNetwork) ||
      this.isInsufficientBalance ||
      this.isInsufficientXorForFee ||
      this.isInsufficientEvmNativeTokenForFee ||
      this.isTxPending
    );
  }

  get firstNetworkIcon(): string {
    return `network-icon network-icon--${this.isSoraToEvm ? 'sora' : this.evmIcon}`;
  }

  get secondNetworkIcon(): string {
    return `network-icon network-icon--${this.isSoraToEvm ? this.evmIcon : 'sora'}`;
  }

  get hashCopyTooltip(): string {
    return this.copyTooltip(this.t('bridgeTransaction.transactionHash'));
  }

  getNetworkText(isSora = true, key: string): string {
    const network = isSora ? this.TranslationConsts.Sora : this.TranslationConsts.EVM;
    const text = this.t(key);
    return `${network} ${text}`;
  }

  handleOpenEvmExplorer(hash: string, type: EvmLinkType, networkId: EvmNetwork): void {
    const url = this.getEvmExplorerLink(hash, type, networkId);
    const win = window.open(url, '_blank');
    win && win.focus();
  }

  get soraExplorerLinks(): Array<WALLET_CONSTS.ExplorerLink> {
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

  get comfirmationBlocksLeft(): number {
    if (this.isSoraToEvm || !this.historyItem?.blockHeight || !this.evmBlockNumber) return 0;

    const blocksLeft = +this.historyItem.blockHeight + 30 - this.evmBlockNumber;

    return Math.max(blocksLeft, 0);
  }

  get failedClass(): string {
    return this.isTxFailed && !this.isTxWaiting ? 'info-line--error' : '';
  }

  private formatTransactionDate(transactionDate?: number): string {
    // We use current date if request is failed
    const date = transactionDate ? new Date(transactionDate) : new Date();
    return this.formatDate(date.getTime());
  }

  async handleTransaction(withAutoStart = true): Promise<void> {
    await this.checkConnectionToExternalAccount(async () => {
      if (withAutoStart && this.historyItem?.id) {
        await this.handleBridgeTransaction(this.historyItem.id);
      }
    });
  }

  handleBack(): void {
    router.push({ name: this.prevRoute as string | undefined });
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

    & > *:not(:first-child) {
      margin-top: $inner-spacing-medium;
    }
  }
  &-hash-container {
    position: relative;

    & + & {
      margin-top: $inner-spacing-small;
    }

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
.transaction-link {
  color: inherit;
  text-decoration: none;
}
</style>
