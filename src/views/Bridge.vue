<template>
  <div class="bridge s-flex">
    <s-form class="bridge-form" :show-message="false">
      <s-card
        v-loading="parentLoading"
        class="bridge-content"
        border-radius="medium"
        shadow="always"
        size="big"
        primary
      >
        <generic-page-header class="header--bridge" :title="t('bridgeText')">
          <div class="bridge-header-buttons">
            <s-button
              v-if="isLoggedIn"
              class="history-button"
              type="action"
              alternative
              size="small"
              icon="time-time-history-24"
              :tooltip="t('bridgeHistory.showHistory')"
              tooltip-placement="bottom-end"
              @click="handleViewTransactionsHistory"
            >
              <span v-if="hasWaitingForActionTx" class="history-button-icon" />
            </s-button>

            <bridge-network-selector />
          </div>
        </generic-page-header>

        <token-input
          id="bridgeFrom"
          data-test-name="bridgeFrom"
          with-address
          :balance="firstBalance ? firstBalance.toCodecString() : null"
          :decimals="amountDecimals"
          :disabled="!(areAccountsConnected && isAssetSelected)"
          :external="!isSoraToEvm"
          :is-max-available="isMaxAvailable"
          :is-select-available="!autoselectedAssetAddress"
          :loading="isConfirmTxLoading"
          :value="amountSend"
          :title="t('transfers.from')"
          :token="asset"
          @input="setSendedAmount"
          @focus="setFocusedField(FocusedField.Sended)"
          @max="handleMaxValue"
          @select="openSelectAssetDialog"
        >
          <template #title-append>
            <span class="input-title--network">{{ formatSelectedNetwork(isSoraToEvm) }}</span>
            <i :class="`network-icon network-icon--${getNetworkIcon(isSoraToEvm ? 0 : networkSelected)}`" />
            <bridge-node-icon
              v-if="isSubBridge && !isSoraToEvm"
              :connection="subConnection"
              @click="handleChangeSubNode"
            />
          </template>

          <bridge-account-panel
            data-test-name="connectPolkadot"
            :address="sender"
            :name="senderName"
            :tooltip="getCopyTooltip(isSoraToEvm)"
            :icon="getProviderIcon(isSoraToEvm)"
            @connect="connectWallet(isSoraToEvm)"
            @disconnect="disconnectWallet(isSoraToEvm)"
          />
        </token-input>

        <div class="switch-block">
          <s-button
            class="s-button--switch"
            data-test-name="switchToken"
            type="action"
            icon="arrows-swap-90-24"
            :disabled="isConfirmTxLoading"
            @click="switchDirection"
          />
        </div>

        <token-input
          id="bridgeTo"
          data-test-name="bridgeTo"
          with-address
          :balance="secondBalance ? secondBalance.toCodecString() : null"
          :decimals="amountDecimals"
          :disabled="!(areAccountsConnected && isAssetSelected)"
          :external="isSoraToEvm"
          :loading="isConfirmTxLoading"
          :value="amountReceived"
          :title="t('transfers.to')"
          :token="asset"
          @input="setReceivedAmount"
          @focus="setFocusedField(FocusedField.Received)"
          @select="openSelectAssetDialog"
        >
          <template #title-append>
            <span class="input-title--network">{{ formatSelectedNetwork(!isSoraToEvm) }}</span>
            <i :class="`network-icon network-icon--${getNetworkIcon(!isSoraToEvm ? 0 : networkSelected)}`" />
            <bridge-node-icon
              v-if="isSubBridge && isSoraToEvm"
              :connection="subConnection"
              @click="handleChangeSubNode"
            />
          </template>

          <bridge-account-panel
            data-test-name="useMetamaskProvider"
            :address="recipient"
            :name="recipientName"
            :tooltip="getCopyTooltip(!isSoraToEvm)"
            :icon="getProviderIcon(!isSoraToEvm)"
            @connect="connectWallet(!isSoraToEvm)"
            @disconnect="disconnectWallet(!isSoraToEvm)"
          />
        </token-input>

        <s-button
          v-if="!isValidNetwork && areAccountsConnected"
          class="el-button--next s-typography-button--big"
          type="primary"
          @click="changeEvmNetworkProvided"
        >
          {{ t('changeNetworkText') }}
        </s-button>

        <template v-else-if="areAccountsConnected">
          <s-button
            class="el-button--next s-typography-button--medium"
            data-test-name="nextButton"
            type="primary"
            :disabled="isTxConfirmDisabled"
            :loading="isConfirmTxLoading"
            @click="handleConfirmButtonClick"
          >
            <template v-if="!isAssetSelected">
              {{ t('buttons.chooseAToken') }}
            </template>
            <template v-else-if="!isRegisteredAsset">
              {{ t('bridge.notRegisteredAsset', { assetSymbol }) }}
            </template>
            <template v-else-if="isZeroAmountSend">
              {{ t('buttons.enterAmount') }}
            </template>
            <template v-else-if="isZeroAmountReceived">
              {{ t('swap.insufficientAmount', { tokenSymbol: assetSymbol }) }}
            </template>
            <template v-else-if="isInsufficientBalance">
              {{ t('insufficientBalanceText', { tokenSymbol: assetSymbol }) }}
            </template>
            <template v-else-if="isInsufficientXorForFee">
              {{ t('insufficientBalanceText', { tokenSymbol: ANLOG.symbol }) }}
            </template>
            <template v-else-if="isInsufficientNativeTokenForFee">
              {{ t('insufficientBalanceText', { tokenSymbol: nativeTokenSymbol }) }}
            </template>
            <template v-else-if="isGreaterThanMaxAmount">
              {{ t('exceededAmountText', { amount: t('maxAmountText') }) }}
            </template>
            <template v-else-if="isLowerThanMinAmount">
              {{ t('exceededAmountText', { amount: t('minAmountText') }) }}
            </template>
            <template v-else>
              {{ t('bridge.next') }}
            </template>
          </s-button>

          <bridge-limit-card
            v-if="isLowerThanMinAmount || isGreaterThanMaxAmount"
            class="bridge-limit-card"
            :max="isGreaterThanMaxAmount"
            :amount="limitCardAmount"
            :symbol="assetSymbol"
          />

          <bridge-transaction-details
            v-if="!isZeroAmountReceived && isRegisteredAsset"
            class="info-line-container"
            :asset="asset"
            :native-token="nativeToken"
            :external-transfer-fee="formattedExternalTransferFee"
            :external-network-fee="formattedExternalNetworkFee"
            :external-min-balance="formattedExternalMinBalance"
            :sora-network-fee="formattedSoraNetworkFee"
            :network-name="networkName"
          />
        </template>
      </s-card>
    </s-form>

    <!-- <div v-if="!areAccountsConnected" class="bridge-footer">{{ t('bridge.connectWallets') }}</div> -->

    <bridge-select-asset :visible.sync="showSelectTokenDialog" :asset="asset" @select="selectAsset" />
    <bridge-select-sub-account />
    <select-node-dialog
      v-if="subConnection"
      :connection="subConnection"
      :network="selectedNetworkName"
      :visibility="selectSubNodeDialogVisibility"
      :set-visibility="setSelectSubNodeDialogVisibility"
    />
    <confirm-bridge-transaction-dialog
      :visible.sync="confirmDialogVisibility"
      :is-sora-to-evm="isSoraToEvm"
      :asset="asset"
      :amount-send="amountSend"
      :amount-received="amountReceived"
      :network="networkSelected"
      :network-type="networkType"
      :native-token="nativeToken"
      :external-transfer-fee="formattedExternalTransferFee"
      :external-network-fee="formattedExternalNetworkFee"
      :sora-network-fee="formattedSoraNetworkFee"
      @confirm="confirmTransaction"
    />
    <network-fee-warning-dialog
      :visible.sync="showWarningFeeDialog"
      :fee="formatStringValue(formattedSoraNetworkFee)"
      @confirm="confirmNetworkFeeWariningDialog"
    />
    <network-fee-warning-dialog
      :visible.sync="showWarningExternalFeeDialog"
      :fee="formatStringValue(formattedExternalNetworkFee)"
      :symbol="nativeTokenSymbol"
      :payoff="false"
      @confirm="confirmExternalNetworkFeeWarningDialog"
    />
  </div>
</template>

<script lang="ts">
import { FPNumber, Operation } from '@sora-substrate/sdk';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import BridgeMixin from '@/components/mixins/BridgeMixin';
import ConfirmDialogMixin from '@/components/mixins/ConfirmDialogMixin';
import NetworkFeeDialogMixin from '@/components/mixins/NetworkFeeDialogMixin';
import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin';
import TokenSelectMixin from '@/components/mixins/TokenSelectMixin';
import { Components, PageNames } from '@/consts';
import { ANLOG_TIMECHAIN } from '@/consts/analog';
import router, { lazyComponent } from '@/router';
import { FocusedField } from '@/store/bridge/types';
import { getter, action, mutation, state } from '@/store/decorators';
import {
  isXorAccountAsset,
  hasInsufficientXorForFee,
  hasInsufficientNativeTokenForFee,
  getMaxBalance,
  getAssetBalance,
  asZeroValue,
  delay,
} from '@/utils';
import type { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';
import type { NodesConnection } from '@/utils/connection';

import type { IBridgeTransaction } from '@sora-substrate/sdk';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

@Component({
  components: {
    BridgeSelectAsset: lazyComponent(Components.BridgeSelectAsset),
    BridgeSelectSubAccount: lazyComponent(Components.BridgeSelectSubAccount),
    BridgeAccountPanel: lazyComponent(Components.BridgeAccountPanel),
    BridgeNodeIcon: lazyComponent(Components.BridgeNodeIcon),
    BridgeTransactionDetails: lazyComponent(Components.BridgeTransactionDetails),
    BridgeLimitCard: lazyComponent(Components.BridgeLimitCard),
    BridgeNetworkSelector: lazyComponent(Components.BridgeNetworkSelector),
    SelectNodeDialog: lazyComponent(Components.SelectNodeDialog),
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    ConfirmBridgeTransactionDialog: lazyComponent(Components.ConfirmBridgeTransactionDialog),
    NetworkFeeWarningDialog: lazyComponent(Components.NetworkFeeWarningDialog),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    TokenInput: lazyComponent(Components.TokenInput),
    FormattedAmount: components.FormattedAmount,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
    InfoLine: components.InfoLine,
    TokenAddress: components.TokenAddress,
  },
})
export default class Bridge extends Mixins(
  mixins.FormattedAmountMixin,
  mixins.NetworkFeeWarningMixin,
  BridgeMixin,
  ConfirmDialogMixin,
  NetworkFormatterMixin,
  NetworkFeeDialogMixin,
  TokenSelectMixin
) {
  readonly ANLOG = ANLOG_TIMECHAIN;
  readonly FocusedField = FocusedField;

  @state.bridge.subBridgeConnector private subBridgeConnector!: SubNetworksConnector;
  @state.bridge.balancesFetching private balancesFetching!: boolean;
  @state.bridge.feesAndLockedFundsFetching private feesAndLockedFundsFetching!: boolean;
  @state.assets.registeredAssetsFetching private registeredAssetsFetching!: boolean;
  @state.bridge.amountSend amountSend!: string;
  @state.bridge.amountReceived amountReceived!: string;

  @getter.bridge.senderName senderName!: string;
  @getter.bridge.recipientName recipientName!: string;
  @getter.bridge.isRegisteredAsset isRegisteredAsset!: boolean;
  @getter.bridge.operation private operation!: Operation;
  @getter.bridge.autoselectedAssetAddress autoselectedAssetAddress!: Nullable<string>;
  @getter.bridge.hasWaitingForActionTx hasWaitingForActionTx!: boolean;
  @getter.settings.nodeIsConnected nodeIsConnected!: boolean;

  @mutation.bridge.setSoraToEvm private setSoraToEvm!: (value: boolean) => void;
  @mutation.bridge.setHistoryId private setHistoryId!: (id?: string) => void;
  @mutation.bridge.setFocusedField setFocusedField!: (field: FocusedField) => void;

  @action.bridge.setSendedAmount setSendedAmount!: (value?: string) => void;
  @action.bridge.setReceivedAmount setReceivedAmount!: (value?: string) => void;
  @action.bridge.switchDirection switchDirection!: AsyncFnWithoutArgs;
  @action.bridge.setAssetAddress private setAssetAddress!: (value?: string) => Promise<void>;
  @action.bridge.generateHistoryItem private generateHistoryItem!: (history?: any) => Promise<IBridgeTransaction>;
  @action.wallet.account.addAsset private addAssetToAccountAssets!: (address?: string) => Promise<void>;
  @action.bridge.updateBridgeHistory private updateBridgeHistory!: FnWithoutArgs;

  showSelectTokenDialog = false;

  showWarningExternalFeeDialog = false;
  isWarningExternalFeeDialogConfirmed = false;

  // Sub Node Select
  @state.web3.selectSubNodeDialogVisibility selectSubNodeDialogVisibility!: boolean;
  @mutation.web3.setSelectSubNodeDialogVisibility private setSelectSubNodeDialogVisibility!: (flag: boolean) => void;

  get subConnection(): Nullable<NodesConnection> {
    if (!this.isSubBridge) return null;
    if (this.networkSelected !== this.subBridgeConnector.network?.subNetwork) return null;

    return this.subBridgeConnector.network?.subNetworkConnection;
  }

  get isExternalNetworkLoading(): boolean {
    return this.isSubBridge ? !this.subConnection?.nodeIsConnected : !!this.evmProviderLoading;
  }

  get limitCardAmount(): string {
    return (this.isGreaterThanMaxAmount ? this.transferMaxAmount : this.transferMinAmount)?.toLocaleString() ?? '';
  }

  confirmExternalNetworkFeeWarningDialog(): void {
    this.isWarningExternalFeeDialogConfirmed = true;
  }

  openWarningExternalFeeDialog(): void {
    this.showWarningExternalFeeDialog = true;
  }

  async waitOnExternalFeeWarningConfirmation(ms = 500): Promise<void> {
    if (!this.showWarningExternalFeeDialog) return;

    await delay(ms);
    return await this.waitOnExternalFeeWarningConfirmation();
  }

  get areAccountsConnected(): boolean {
    return !!this.sender && !!this.recipient;
  }

  get networkName(): string {
    return this.formatNetworkShortName(false);
  }

  get firstBalance(): Nullable<FPNumber> {
    return this.sender ? this.getBalance(this.isSoraToEvm) : null;
  }

  get secondBalance(): Nullable<FPNumber> {
    return this.recipient ? this.getBalance(!this.isSoraToEvm) : null;
  }

  get isZeroAmountSend(): boolean {
    return asZeroValue(this.amountSend);
  }

  get isZeroAmountReceived(): boolean {
    return asZeroValue(this.amountReceived);
  }

  get transferMaxAmount(): FPNumber | null {
    return this.getTransferMaxAmount(this.isSoraToEvm);
  }

  get transferMinAmount(): FPNumber | null {
    return this.getTransferMinAmount(this.isSoraToEvm);
  }

  get transferableAmount(): FPNumber {
    if (!(this.asset && this.isRegisteredAsset && this.areAccountsConnected)) return FPNumber.ZERO;

    const fee = this.isSoraToEvm ? this.soraNetworkFee : this.externalNetworkFee;

    const minBalance = FPNumber.fromCodecValue(this.assetExternalMinBalance, this.asset.externalDecimals);
    const maxBalance = getMaxBalance(this.asset, fee, {
      isExternalBalance: !this.isSoraToEvm,
      isExternalNative: this.isNativeTokenSelected,
    });
    const result = maxBalance.sub(minBalance).max(FPNumber.ZERO);

    return result;
  }

  get maxValue(): string {
    let amount = this.transferableAmount;

    if (this.transferMaxAmount && FPNumber.gt(amount, this.transferMaxAmount)) {
      amount = this.transferMaxAmount;
    }

    return amount.dp(this.amountDecimals).toString();
  }

  get isMaxAvailable(): boolean {
    return !asZeroValue(this.maxValue) && this.maxValue !== this.amountSend;
  }

  get isGreaterThanMaxAmount(): boolean {
    return this.isGreaterThanTransferMaxAmount(this.amountSend, this.asset, this.isSoraToEvm, this.isRegisteredAsset);
  }

  get isLowerThanMinAmount(): boolean {
    return this.isLowerThanTransferMinAmount(this.amountSend, this.asset, this.isSoraToEvm, this.isRegisteredAsset);
  }

  get isInsufficientXorForFee(): boolean {
    return hasInsufficientXorForFee(this.xor, this.soraNetworkFee);
  }

  get isInsufficientNativeTokenForFee(): boolean {
    return hasInsufficientNativeTokenForFee(this.externalNativeBalance, this.externalNetworkFee);
  }

  get isInsufficientBalance(): boolean {
    if (!(this.asset && this.isRegisteredAsset && this.sender)) return false;

    return FPNumber.gt(FPNumber.fromNatural(this.amountSend), FPNumber.fromNatural(this.maxValue));
  }

  get isAssetSelected(): boolean {
    return !!this.asset;
  }

  get assetSymbol(): string {
    return this.asset?.symbol ?? '';
  }

  get formattedSoraNetworkFee(): string {
    return this.getStringFromCodec(this.soraNetworkFee);
  }

  get formattedExternalNetworkFee(): string {
    return this.getStringFromCodec(this.externalNetworkFee, this.nativeTokenDecimals);
  }

  get formattedExternalTransferFee(): string {
    return this.getStringFromCodec(this.externalTransferFee, this.asset?.externalDecimals);
  }

  get formattedExternalMinBalance(): string {
    return this.getStringFromCodec(this.assetExternalMinBalance, this.asset?.externalDecimals);
  }

  get isTxConfirmDisabled(): boolean {
    return (
      !this.isAssetSelected ||
      !this.isRegisteredAsset ||
      !this.areAccountsConnected ||
      !this.isValidNetwork ||
      this.isZeroAmountSend ||
      this.isZeroAmountReceived ||
      this.isInsufficientXorForFee ||
      this.isInsufficientNativeTokenForFee ||
      this.isInsufficientBalance ||
      this.isGreaterThanMaxAmount ||
      this.isLowerThanMinAmount
    );
  }

  get isConfirmTxLoading(): boolean {
    return (
      this.isExternalNetworkLoading ||
      this.isSelectAssetLoading ||
      this.balancesFetching ||
      this.feesAndLockedFundsFetching ||
      this.registeredAssetsFetching
    );
  }

  get isXorSufficientForNextOperation(): boolean {
    if (!this.asset) return false;

    return this.isXorSufficientForNextTx({
      type: this.operation,
      isXor: isXorAccountAsset(this.asset),
      amount: this.getFPNumber(this.amountSend),
    });
  }

  get isNativeTokenSufficientForNextOperation(): boolean {
    if (!this.asset || this.isZeroAmountSend) return false;

    const fpFee = FPNumber.fromCodecValue(this.externalNetworkFee, this.nativeTokenDecimals);
    const fpBalance = FPNumber.fromCodecValue(this.externalNativeBalance, this.nativeTokenDecimals);

    let fpBalanceAfter = fpBalance.sub(fpFee);

    if (this.isNativeTokenSelected) {
      const fpAmount = new FPNumber(this.amountSend, this.nativeTokenDecimals);
      fpBalanceAfter = this.isSoraToEvm ? fpBalanceAfter.add(fpAmount) : fpBalanceAfter.sub(fpAmount);
    }

    return FPNumber.gte(fpBalanceAfter, fpFee);
  }

  get amountDecimals(): number {
    const internal = this.asset?.decimals ?? FPNumber.DEFAULT_PRECISION;
    const external = this.asset?.externalDecimals ?? FPNumber.DEFAULT_PRECISION;

    return Math.min(internal, external);
  }

  private getBalance(isSora = true): Nullable<FPNumber> {
    if (!(this.asset && (this.isRegisteredAsset || isSora))) {
      return null;
    }
    const balance = getAssetBalance(this.asset, { internal: isSora });
    if (!balance) {
      return null;
    }
    const decimals = isSora ? this.asset?.decimals : this.asset?.externalDecimals;
    return this.getFPNumberFromCodec(balance, decimals);
  }

  async created(): Promise<void> {
    await this.withParentLoading(async () => {
      const { address, amount, isIncoming } = this.$route.params;
      this.setSendedAmount(amount);
      if (isIncoming) {
        this.setSoraToEvm(false);
      }
      if (address) {
        this.updateAssetAddress(address);
      }
      if (this.isLoggedIn) {
        this.updateBridgeHistory();
      }
    });
  }

  getCopyTooltip(isSoraNetwork = false): string {
    const networkName = this.formatNetworkShortName(isSoraNetwork);
    return `${networkName} ${this.t('addressText')}`;
  }

  getProviderIcon(isSoraNetwork = false): string {
    if (this.isSubBridge || isSoraNetwork) return '';

    return this.evmProvider ? this.getEvmProviderIcon(this.evmProvider) : '';
  }

  handleMaxValue(): void {
    this.setSendedAmount(this.maxValue);
  }

  async handleConfirmButtonClick(): Promise<void> {
    // Own native check
    if (this.allowFeePopup && !this.isXorSufficientForNextOperation) {
      this.openWarningFeeDialog();
      await this.waitOnFeeWarningConfirmation();
      if (!this.isWarningFeeDialogConfirmed) {
        return;
      }
      this.isWarningFeeDialogConfirmed = false;
    }

    // Native token check
    if (this.allowFeePopup && !this.isNativeTokenSufficientForNextOperation) {
      this.openWarningExternalFeeDialog();
      await this.waitOnExternalFeeWarningConfirmation();
      if (!this.isWarningExternalFeeDialogConfirmed) {
        return;
      }
      this.isWarningExternalFeeDialogConfirmed = false;
    }

    this.confirmOrExecute(this.confirmTransaction);
  }

  handleChangeSubNode(): void {
    this.setSelectSubNodeDialogVisibility(true);
  }

  openSelectAssetDialog(): void {
    this.showSelectTokenDialog = true;
  }

  async selectAsset(selectedAsset?: RegisteredAccountAsset): Promise<void> {
    if (!selectedAsset) return;

    await this.updateAssetAddress(selectedAsset.address);
  }

  private async updateAssetAddress(address: string): Promise<void> {
    await this.withSelectAssetLoading(async () => {
      await this.setAssetAddress(address);
    });
  }

  async confirmTransaction(): Promise<void> {
    // create new history item
    const { assetAddress, id } = await this.generateHistoryItem();

    // Add asset to account assets for balances subscriptions
    if (assetAddress && !this.accountAssetsAddressTable[assetAddress]) {
      await this.addAssetToAccountAssets(assetAddress);
    }

    this.setHistoryId(id);

    router.push({ name: PageNames.BridgeTransaction });
  }

  connectWallet(isSoraToEvm: boolean): void {
    if (isSoraToEvm) {
      this.connectSoraWallet();
    } else {
      this.connectExternalWallet();
    }
  }

  disconnectWallet(isSoraToEvm: boolean): void {
    if (isSoraToEvm) {
      this.disconnectSoraWallet();
    } else {
      this.disconnectExternalWallet();
    }
  }

  private connectExternalWallet(): void {
    if (this.isSubAccountType) {
      this.connectSubWallet();
    } else {
      this.connectEvmWallet();
    }
  }

  private disconnectExternalWallet(): void {
    if (this.isSubAccountType) {
      this.disconnectSubWallet();
    } else {
      this.disconnectEvmWallet();
    }
  }
}
</script>

<style lang="scss">
.bridge {
  &-content {
    background: var(--analog-background-surface) !important;

    > .el-card__body {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
  }

  &-form {
    @include bridge-container;
  }
}
</style>

<style lang="scss" scoped>
@keyframes pulse-animation {
  0% {
    box-shadow: 0 0 0 0px rgba(255, 255, 255, 0.25);
  }
  100% {
    box-shadow: 0 0 0 10px rgba(255, 255, 255, 0);
  }
}

.switch-block {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  position: relative;
  width: 100%;

  &::before,
  &::after {
    content: '';
    display: block;
    position: absolute;
    top: 50%;
    width: calc((100% - var(--s-size-medium)) / 2);
    height: 1px;
    background-color: var(--s-color-base-border-primary);
  }
  &::before {
    left: 0;
  }
  &::after {
    right: 0;
  }

  .s-button--switch {
    border: 1px solid var(--s-color-base-border-primary) !important;
  }
}

.connect-wallet-logo {
  width: 18px;
  height: 18px;
}

.history-button {
  &-icon {
    position: absolute;
    bottom: 4px;
    right: 2px;

    width: 12px;
    height: 12px;
    background: var(--s-color-status-info);
    border-radius: 50%;
    animation: pulse-animation 2s infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  }
}

.bridge {
  flex-direction: column;
  align-items: center;

  &-content {
    @include bridge-content;
    @include vertical-divider('switch-block', $inner-spacing-medium);
    @include vertical-divider('s-divider-tertiary');
    @include buttons;
    @include full-width-button('el-button--next');
    .input-title {
      &--network {
        white-space: nowrap;
      }
    }
    .network-icon {
      width: calc(var(--s-size-small) / 2);
      height: calc(var(--s-size-small) / 2);
    }
  }

  &-header-buttons {
    display: flex;
    align-items: center;
    gap: $inner-spacing-mini;
    margin-left: auto;
  }

  &-footer {
    display: flex;
    align-items: center;
    margin-top: $inner-spacing-medium;
    font-size: var(--s-font-size-mini);
    line-height: var(--s-line-height-big);
    color: var(--s-color-base-content-secondary);
  }

  &-limit-card {
    margin-top: $inner-spacing-medium;
  }
}
</style>
