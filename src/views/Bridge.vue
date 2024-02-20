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
        <generic-page-header class="header--bridge" :title="t('hashiBridgeText')" :tooltip="t('bridge.info')">
          <div class="bridge-header-buttons">
            <s-button
              v-if="areAccountsConnected"
              class="el-button--history"
              type="action"
              icon="time-time-history-24"
              :tooltip="t('bridgeHistory.showHistory')"
              tooltip-placement="bottom-end"
              @click="handleViewTransactionsHistory"
            />

            <swap-status-action-badge>
              <template #value>
                {{ selectedNetworkShortName || '-' }}
              </template>
              <template #action>
                <s-button
                  class="el-button--settings"
                  type="action"
                  icon="basic-settings-24"
                  :tooltip="t('bridge.selectNetwork')"
                  tooltip-placement="bottom-end"
                  @click="handleChangeNetwork"
                />
              </template>
            </swap-status-action-badge>
          </div>
        </generic-page-header>

        <token-input
          id="bridgeFrom"
          data-test-name="bridgeFrom"
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

          <div v-if="sender" class="connect-wallet-panel">
            <s-divider type="tertiary" />
            <bridge-account-panel :address="sender" :name="senderName" :tooltip="getCopyTooltip(isSoraToEvm)">
              <template #icon v-if="changeSenderWalletEvm">
                <img :src="getEvmProviderIcon(evmProvider)" :alt="evmProvider" class="connect-wallet-logo" />
              </template>
            </bridge-account-panel>
            <div class="connect-wallet-group">
              <span v-if="changeSenderWalletEvm" class="connect-wallet-btn" @click="connectExternalWallet">
                {{ t('changeAccountText') }}
              </span>
              <span v-else>{{ t('connectedText') }}</span>
              <span
                v-if="changeSenderWalletEvm"
                class="connect-wallet-btn disconnect"
                @click="resetEvmProviderConnection"
              >
                {{ t('disconnectWalletText') }}
              </span>
            </div>
          </div>
          <s-button
            v-else
            class="el-button--connect s-typography-button--large"
            data-test-name="connectPolkadot"
            type="primary"
            @click="connectSenderWallet"
          >
            {{ t('connectWalletText') }}
          </s-button>
        </token-input>

        <s-button
          class="s-button--switch"
          data-test-name="switchToken"
          type="action"
          icon="arrows-swap-90-24"
          :disabled="isConfirmTxLoading"
          @click="switchDirection"
        />

        <token-input
          id="bridgeTo"
          data-test-name="bridgeTo"
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

          <div v-if="recipient" class="connect-wallet-panel">
            <s-divider type="tertiary" />
            <bridge-account-panel :address="recipient" :name="recipientName" :tooltip="getCopyTooltip(!isSoraToEvm)">
              <template #icon v-if="changeRecipientWalletEvm">
                <img :src="getEvmProviderIcon(evmProvider)" :alt="evmProvider" class="connect-wallet-logo" />
              </template>
            </bridge-account-panel>
            <div class="connect-wallet-group">
              <span
                v-if="isSubBridge || changeRecipientWalletEvm"
                class="connect-wallet-btn"
                @click="connectExternalWallet"
              >
                {{ t('changeAccountText') }}
              </span>
              <span v-else>{{ t('connectedText') }}</span>
              <span
                v-if="changeRecipientWalletEvm"
                class="connect-wallet-btn disconnect"
                @click="resetEvmProviderConnection"
              >
                {{ t('disconnectWalletText') }}
              </span>
            </div>
          </div>
          <s-button
            v-else
            class="el-button--connect s-typography-button--large"
            data-test-name="useMetamaskProvider"
            type="primary"
            @click="connectRecipientWallet"
          >
            {{ t('connectWalletText') }}
          </s-button>
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
            class="el-button--next s-typography-button--large"
            data-test-name="nextButton"
            type="primary"
            :disabled="isConfirmTxDisabled"
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
              {{ t('insufficientBalanceText', { tokenSymbol: KnownSymbols.XOR }) }}
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
            v-if="!isInsufficientBalance && (isLowerThanMinAmount || isGreaterThanMaxAmount)"
            class="bridge-limit-card"
            :max="isGreaterThanMaxAmount"
            :amount="(isGreaterThanMaxAmount ? transferMaxAmount : transferMinAmount).toLocaleString()"
            :symbol="asset.symbol"
          />

          <bridge-transaction-details
            v-if="!isZeroAmountReceived && isRegisteredAsset"
            class="info-line-container"
            :asset="asset"
            :native-token="nativeToken"
            :external-transfer-fee="formattedExternalTransferFee"
            :external-network-fee="formattedExternalNetworkFee"
            :sora-network-fee="formattedSoraNetworkFee"
            :network-name="networkName"
          />
        </template>
      </s-card>
    </s-form>

    <div v-if="!areAccountsConnected" class="bridge-footer">{{ t('bridge.connectWallets') }}</div>

    <bridge-select-asset :visible.sync="showSelectTokenDialog" :asset="asset" @select="selectAsset" />
    <bridge-select-account />
    <bridge-select-network />
    <select-provider-dialog />
    <select-node-dialog
      v-if="subConnection"
      :connection="subConnection"
      :network="selectedNetworkName"
      :visibility="selectSubNodeDialogVisibility"
      :set-visibility="setSelectSubNodeDialogVisibility"
    />
    <confirm-bridge-transaction-dialog
      :visible.sync="showConfirmTransactionDialog"
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
import { FPNumber, Operation } from '@sora-substrate/util';
import { KnownSymbols } from '@sora-substrate/util/build/assets/consts';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import BridgeMixin from '@/components/mixins/BridgeMixin';
import NetworkFeeDialogMixin from '@/components/mixins/NetworkFeeDialogMixin';
import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin';
import TokenSelectMixin from '@/components/mixins/TokenSelectMixin';
import { Components, PageNames, ZeroStringValue } from '@/consts';
import router, { lazyComponent } from '@/router';
import { FocusedField } from '@/store/bridge/types';
import { getter, action, mutation, state } from '@/store/decorators';
import {
  isXorAccountAsset,
  hasInsufficientBalance,
  hasInsufficientXorForFee,
  hasInsufficientNativeTokenForFee,
  getMaxBalance,
  getAssetBalance,
  asZeroValue,
  delay,
  toPrecision,
} from '@/utils';
import { subBridgeConnector } from '@/utils/bridge/sub/classes/adapter';
import type { NodesConnection } from '@/utils/connection';

import type { IBridgeTransaction } from '@sora-substrate/util';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    BridgeSelectAsset: lazyComponent(Components.BridgeSelectAsset),
    BridgeSelectNetwork: lazyComponent(Components.BridgeSelectNetwork),
    BridgeSelectAccount: lazyComponent(Components.BridgeSelectAccount),
    BridgeAccountPanel: lazyComponent(Components.BridgeAccountPanel),
    BridgeNodeIcon: lazyComponent(Components.BridgeNodeIcon),
    BridgeTransactionDetails: lazyComponent(Components.BridgeTransactionDetails),
    BridgeLimitCard: lazyComponent(Components.BridgeLimitCard),
    SelectProviderDialog: lazyComponent(Components.SelectProviderDialog),
    SelectNodeDialog: lazyComponent(Components.SelectNodeDialog),
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    ConfirmBridgeTransactionDialog: lazyComponent(Components.ConfirmBridgeTransactionDialog),
    NetworkFeeWarningDialog: lazyComponent(Components.NetworkFeeWarningDialog),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    SwapStatusActionBadge: lazyComponent(Components.SwapStatusActionBadge),
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
  NetworkFormatterMixin,
  NetworkFeeDialogMixin,
  TokenSelectMixin
) {
  readonly KnownSymbols = KnownSymbols;
  readonly FocusedField = FocusedField;

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
  @getter.settings.nodeIsConnected nodeIsConnected!: boolean;

  @mutation.bridge.setSoraToEvm private setSoraToEvm!: (value: boolean) => void;
  @mutation.bridge.setHistoryId private setHistoryId!: (id?: string) => void;
  @mutation.bridge.setFocusedField setFocusedField!: (field: FocusedField) => void;
  @mutation.web3.setSelectNetworkDialogVisibility private setSelectNetworkDialogVisibility!: (flag: boolean) => void;

  @action.bridge.setSendedAmount setSendedAmount!: (value?: string) => void;
  @action.bridge.setReceivedAmount setReceivedAmount!: (value?: string) => void;
  @action.bridge.switchDirection switchDirection!: AsyncFnWithoutArgs;
  @action.bridge.setAssetAddress private setAssetAddress!: (value?: string) => Promise<void>;
  @action.bridge.generateHistoryItem private generateHistoryItem!: (history?: any) => Promise<IBridgeTransaction>;
  @action.wallet.account.addAsset private addAssetToAccountAssets!: (address?: string) => Promise<void>;

  showSelectTokenDialog = false;
  showConfirmTransactionDialog = false;

  showWarningExternalFeeDialog = false;
  isWarningExternalFeeDialogConfirmed = false;

  // Sub Node Select
  @state.web3.selectSubNodeDialogVisibility selectSubNodeDialogVisibility!: boolean;
  @mutation.web3.setSelectSubNodeDialogVisibility private setSelectSubNodeDialogVisibility!: (flag: boolean) => void;

  private readonly subBridgeConnector = subBridgeConnector;

  get subConnection(): Nullable<NodesConnection> {
    if (!this.isSubBridge) return null;
    if (this.networkSelected !== this.subBridgeConnector.network?.subNetwork) return null;

    return this.subBridgeConnector.network?.subNetworkConnection;
  }

  get isExternalNetworkLoading(): boolean {
    return this.isSubBridge ? !this.subConnection?.nodeIsConnected : !!this.evmProviderLoading;
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

  get maxValue(): string {
    if (!(this.asset && this.isRegisteredAsset)) return ZeroStringValue;

    const fee = this.isSoraToEvm ? this.soraNetworkFee : this.externalNetworkFee;
    let maxBalance = getMaxBalance(this.asset, fee, {
      isExternalBalance: !this.isSoraToEvm,
      isExternalNative: this.isNativeTokenSelected,
    });

    if (this.isNativeTokenSelected) {
      maxBalance = maxBalance.sub(this.externalTransferFeeFP).max(FPNumber.ZERO);
    }

    if (this.transferMaxAmount && FPNumber.gt(maxBalance, this.transferMaxAmount)) {
      maxBalance = this.transferMaxAmount;
    }

    return toPrecision(maxBalance, this.amountDecimals).toString();
  }

  get isMaxAvailable(): boolean {
    if (!(this.asset && this.isRegisteredAsset && this.areAccountsConnected && !asZeroValue(this.maxValue)))
      return false;

    return this.maxValue !== this.amountSend;
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
    if (!this.asset) return false;

    const fee = this.isSoraToEvm ? this.soraNetworkFee : this.externalNetworkFee;

    return (
      !!this.sender &&
      this.isRegisteredAsset &&
      hasInsufficientBalance(this.asset, this.amountSend, fee, !this.isSoraToEvm)
    );
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

  get isConfirmTxDisabled(): boolean {
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

    const fpBalance = FPNumber.fromCodecValue(this.externalNativeBalance);
    const fpFee = FPNumber.fromCodecValue(this.externalNetworkFee);
    const fpAfterFee = fpBalance.sub(fpFee);

    if (!this.isNativeTokenSelected) return FPNumber.gte(fpAfterFee, fpFee);

    const fpAmount = new FPNumber(this.amountSend, this.asset.externalDecimals);
    const fpAfterFeeNative = FPNumber.fromCodecValue(fpAfterFee.toCodecString(), this.asset.externalDecimals);
    const fpAfterTransfer = this.isSoraToEvm ? fpAfterFeeNative.add(fpAmount) : fpAfterFeeNative.sub(fpAmount);

    return FPNumber.gte(fpAfterTransfer, fpFee);
  }

  get amountDecimals(): number {
    const internal = this.asset?.decimals ?? FPNumber.DEFAULT_PRECISION;
    const external = this.asset?.externalDecimals ?? FPNumber.DEFAULT_PRECISION;

    return Math.min(internal, external);
  }

  get changeSenderWalletEvm(): boolean {
    return !this.isSubBridge && !!this.evmProvider && !this.isSoraToEvm;
  }

  get changeRecipientWalletEvm(): boolean {
    return !this.isSubBridge && !!this.evmProvider && this.isSoraToEvm;
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
    });
  }

  getCopyTooltip(isSoraNetwork = false): string {
    const networkName = this.formatNetworkShortName(isSoraNetwork);
    return `${networkName} ${this.t('addressText')}`;
  }

  handleMaxValue(): void {
    this.setSendedAmount(this.maxValue);
  }

  async handleConfirmButtonClick(): Promise<void> {
    // XOR check
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

    this.showConfirmTransactionDialog = true;
  }

  handleChangeNetwork(): void {
    this.setSelectNetworkDialogVisibility(true);
  }

  handleChangeSubNode(): void {
    if (!this.isSubBridge) return;

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

  async confirmTransaction(isTransactionConfirmed: boolean): Promise<void> {
    if (!isTransactionConfirmed) return;

    // create new history item
    const { assetAddress, id } = await this.generateHistoryItem();

    // Add asset to account assets for balances subscriptions
    if (assetAddress && !this.accountAssetsAddressTable[assetAddress]) {
      await this.addAssetToAccountAssets(assetAddress);
    }

    this.setHistoryId(id);

    router.push({ name: PageNames.BridgeTransaction });
  }

  connectExternalWallet(): void {
    if (this.isSubBridge) {
      this.connectSubWallet();
    } else {
      this.connectEvmWallet();
    }
  }

  connectSenderWallet() {
    if (this.isSoraToEvm || this.isSubBridge) {
      this.connectSoraWallet();
    } else {
      this.connectExternalWallet();
    }
  }

  connectRecipientWallet(): void {
    if (this.isSoraToEvm) {
      this.connectExternalWallet();
    } else {
      this.connectInternalWallet();
    }
  }

  private connectInternalWallet(): void {
    if (this.isSubBridge) {
      this.connectSubWallet();
    } else {
      this.connectSoraWallet();
    }
  }
}
</script>

<style lang="scss">
.bridge {
  &-content > .el-card__body {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &-form {
    @include bridge-container;
  }
}
</style>

<style lang="scss" scoped>
.connect-wallet {
  &-panel {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    font-size: var(--s-font-size-mini);
    line-height: var(--s-line-height-medium);
    color: var(--s-color-base-content-primary);
  }

  &-logo {
    width: 18px;
    height: 18px;
  }

  &-group {
    display: flex;
    align-items: center;
    gap: $inner-spacing-mini;
  }

  &-btn {
    @include copy-address;

    &.disconnect {
      color: var(--s-color-status-error);
    }
  }
}

.bridge {
  flex-direction: column;
  align-items: center;

  &-content {
    @include bridge-content;
    @include vertical-divider('s-button--switch', $inner-spacing-medium);
    @include vertical-divider('s-divider-tertiary');
    @include buttons;
    @include full-width-button('el-button--connect', $inner-spacing-mini);
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
