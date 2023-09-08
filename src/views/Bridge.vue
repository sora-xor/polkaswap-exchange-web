<template>
  <div class="bridge s-flex">
    <s-form class="bridge-form el-form--actions" :show-message="false">
      <s-card
        v-loading="parentLoading"
        class="bridge-content"
        border-radius="medium"
        shadow="always"
        size="big"
        primary
      >
        <generic-page-header class="header--bridge" :title="t('bridge.title')" :tooltip="t('bridge.info')">
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
                {{ selectedNetwork ? selectedNetwork.shortName : '-' }}
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
        <s-float-input
          :value="amountSend"
          :decimals="getDecimals(isSoraToEvm)"
          :delimiters="delimiters"
          :max="MaxInputNumber"
          :disabled="!(areAccountsConnected && isAssetSelected)"
          class="s-input--token-value"
          data-test-name="bridgeFrom"
          has-locale-string
          size="medium"
          @input="setSendedAmount"
          @focus="setFocusedField(FocusedField.Sended)"
        >
          <div slot="top" class="input-line">
            <div class="input-title">
              <span class="input-title--uppercase input-title--primary">{{ t('transfers.from') }}</span>
              <span class="input-title--network">{{ getBridgeItemTitle(isSoraToEvm) }}</span>
              <i :class="`network-icon network-icon--${getNetworkIcon(isSoraToEvm ? 0 : networkSelected)}`" />
            </div>
            <div v-if="sender && isAssetSelected" class="input-value">
              <span class="input-value--uppercase">{{ t('bridge.balance') }}</span>
              <formatted-amount-with-fiat-value
                value-can-be-hidden
                with-left-shift
                value-class="input-value--primary"
                :value="formatBalance(firstBalance)"
                :fiat-value="firstFieldFiatBalance"
              />
            </div>
          </div>
          <div slot="right" v-if="sender || recipient" class="s-flex el-buttons">
            <s-button
              v-if="isMaxAvailable"
              class="el-button--max s-typography-button--small"
              type="primary"
              alternative
              size="mini"
              border-radius="mini"
              @click="handleMaxValue"
            >
              {{ t('buttons.max') }}
            </s-button>
            <token-select-button
              class="el-button--select-token"
              icon="chevron-down-rounded-16"
              :token="asset"
              @click="openSelectAssetDialog"
            />
          </div>
          <template #bottom>
            <div class="input-line input-line--footer">
              <template v-if="isAssetSelected">
                <formatted-amount is-fiat-value :value="getFiatAmountByString(amountSend, asset)" />
                <token-address
                  v-if="isSoraToEvm || asset.externalAddress"
                  v-bind="asset"
                  :external="!isSoraToEvm"
                  class="input-value"
                />
              </template>
            </div>
            <div v-if="sender" class="bridge-item-footer">
              <s-divider type="tertiary" />
              <s-tooltip
                :content="getCopyTooltip(isSoraToEvm)"
                border-radius="mini"
                placement="bottom-end"
                tabindex="-1"
              >
                <span class="bridge-network-address" @click="handleCopyAddress(sender, $event)">
                  {{ formatAddress(sender, 8) }}
                </span>
              </s-tooltip>
              <span>{{ t('connectedText') }}</span>
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
          </template>
        </s-float-input>

        <s-button
          class="s-button--switch"
          data-test-name="switchToken"
          type="action"
          icon="arrows-swap-90-24"
          @click="switchDirection"
        />

        <s-float-input
          :value="amountReceived"
          :decimals="getDecimals(!isSoraToEvm)"
          :delimiters="delimiters"
          :disabled="!(areAccountsConnected && isAssetSelected)"
          :max="MaxInputNumber"
          class="s-input--token-value"
          data-test-name="bridgeTo"
          has-locale-string
          size="medium"
          @input="setReceivedAmount"
          @focus="setFocusedField(FocusedField.Received)"
        >
          <div slot="top" class="input-line">
            <div class="input-title">
              <span class="input-title--uppercase input-title--primary">{{ t('transfers.to') }}</span>
              <span class="input-title--network">{{ getBridgeItemTitle(!isSoraToEvm) }}</span>
              <i :class="`network-icon network-icon--${getNetworkIcon(!isSoraToEvm ? 0 : networkSelected)}`" />
            </div>
            <div v-if="recipient && isAssetSelected" class="input-value">
              <span class="input-value--uppercase">{{ t('bridge.balance') }}</span>
              <formatted-amount-with-fiat-value
                value-can-be-hidden
                with-left-shift
                value-class="input-value--primary"
                :value="formatBalance(secondBalance)"
                :fiat-value="secondFieldFiatBalance"
              />
            </div>
          </div>
          <div slot="right" v-if="isAssetSelected" class="s-flex el-buttons">
            <token-select-button class="el-button--select-token" :token="asset" />
          </div>
          <template #bottom>
            <div class="input-line input-line--footer">
              <template v-if="isAssetSelected">
                <formatted-amount is-fiat-value :value="getFiatAmountByString(amountReceived, asset)" />
                <token-address
                  v-if="!isSoraToEvm || asset.externalAddress"
                  v-bind="asset"
                  :external="isSoraToEvm"
                  class="input-value"
                />
              </template>
            </div>
            <div v-if="recipient" class="bridge-item-footer">
              <s-divider type="tertiary" />
              <s-tooltip
                :content="getCopyTooltip(!isSoraToEvm)"
                border-radius="mini"
                placement="bottom-end"
                tabindex="-1"
              >
                <span class="bridge-network-address" @click="handleCopyAddress(recipient, $event)">
                  {{ formatAddress(recipient, 8) }}
                </span>
              </s-tooltip>
              <span v-if="isSubBridge" class="bridge-network-address" @click="connectExternalWallet">
                {{ t('changeAccountText') }}
              </span>
              <span v-else>{{ t('connectedText') }}</span>
            </div>
            <s-button
              v-else
              class="el-button--connect s-typography-button--large"
              data-test-name="connectMetamask"
              type="primary"
              @click="connectRecipientWallet"
            >
              {{ t('connectWalletText') }}
            </s-button>
          </template>
        </s-float-input>

        <s-button
          v-if="!isValidNetwork"
          class="el-button--next s-typography-button--big"
          type="primary"
          @click="updateNetworkProvided"
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
            :amount="
              isGreaterThanMaxAmount ? outgoingLimitBalance.toLocaleString() : incomingMinBalance.toLocaleString()
            "
            :symbol="asset.symbol"
          />

          <bridge-transaction-details
            v-if="!isZeroAmountReceived && isRegisteredAsset"
            class="info-line-container"
            :native-token="nativeToken"
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
    <confirm-bridge-transaction-dialog
      :visible.sync="showConfirmTransactionDialog"
      :is-sora-to-evm="isSoraToEvm"
      :asset="asset"
      :amount-send="amountSend"
      :amount-received="amountReceived"
      :network="networkSelected"
      :network-type="networkType"
      :native-token="nativeToken"
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
} from '@/utils';

import type { IBridgeTransaction } from '@sora-substrate/util';
import type { AccountAsset, RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    BridgeSelectAsset: lazyComponent(Components.BridgeSelectAsset),
    BridgeSelectNetwork: lazyComponent(Components.BridgeSelectNetwork),
    BridgeSelectAccount: lazyComponent(Components.BridgeSelectAccount),
    BridgeTransactionDetails: lazyComponent(Components.BridgeTransactionDetails),
    BridgeLimitCard: lazyComponent(Components.BridgeLimitCard),
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    ConfirmBridgeTransactionDialog: lazyComponent(Components.ConfirmBridgeTransactionDialog),
    NetworkFeeWarningDialog: lazyComponent(Components.NetworkFeeWarningDialog),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    SwapStatusActionBadge: lazyComponent(Components.SwapStatusActionBadge),
    FormattedAmount: components.FormattedAmount,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
    InfoLine: components.InfoLine,
    TokenAddress: components.TokenAddress,
  },
})
export default class Bridge extends Mixins(
  mixins.FormattedAmountMixin,
  mixins.NetworkFeeWarningMixin,
  mixins.CopyAddressMixin,
  BridgeMixin,
  NetworkFormatterMixin,
  NetworkFeeDialogMixin,
  TokenSelectMixin
) {
  readonly delimiters = FPNumber.DELIMITERS_CONFIG;
  readonly KnownSymbols = KnownSymbols;
  readonly FocusedField = FocusedField;

  @state.bridge.balancesAndFeesFetching private balancesAndFeesFetching!: boolean;
  @state.bridge.amountSend amountSend!: string;
  @state.bridge.amountReceived amountReceived!: string;
  @state.bridge.isSoraToEvm isSoraToEvm!: boolean;
  @state.assets.registeredAssetsFetching registeredAssetsFetching!: boolean;

  @getter.bridge.isRegisteredAsset isRegisteredAsset!: boolean;
  @getter.bridge.operation private operation!: Operation;
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

  showSelectTokenDialog = false;
  showConfirmTransactionDialog = false;

  showWarningExternalFeeDialog = false;
  isWarningExternalFeeDialogConfirmed = false;

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

  get assetAddress(): string {
    return this.asset?.address ?? '';
  }

  get firstBalance(): Nullable<FPNumber> {
    return this.getBalance(this.isSoraToEvm);
  }

  get secondBalance(): Nullable<FPNumber> {
    return this.getBalance(!this.isSoraToEvm);
  }

  get firstFieldFiatBalance(): Nullable<string> {
    return this.firstBalance ? this.getFiatAmountByFPNumber(this.firstBalance, this.asset as AccountAsset) : undefined;
  }

  get secondFieldFiatBalance(): Nullable<string> {
    return this.secondBalance
      ? this.getFiatAmountByFPNumber(this.secondBalance, this.asset as AccountAsset)
      : undefined;
  }

  get isZeroAmountSend(): boolean {
    return asZeroValue(this.amountSend);
  }

  get isZeroAmountReceived(): boolean {
    return asZeroValue(this.amountReceived);
  }

  get maxValue(): string {
    if (!(this.asset && this.isRegisteredAsset)) return ZeroStringValue;

    const fee = this.isSoraToEvm ? this.soraNetworkFee : this.externalNetworkFee;
    const maxBalance = getMaxBalance(this.asset, fee, {
      isExternalBalance: !this.isSoraToEvm,
      isExternalNative: this.isNativeTokenSelected,
    });

    if (this.isSoraToEvm && this.outgoingLimitBalance) {
      if (FPNumber.gt(maxBalance, this.outgoingLimitBalance)) return this.outgoingLimitBalance.toString();
    }

    return maxBalance.toString();
  }

  get isMaxAvailable(): boolean {
    if (!(this.asset && this.isRegisteredAsset && this.areAccountsConnected && !asZeroValue(this.maxValue)))
      return false;

    return this.maxValue !== this.amountSend;
  }

  get isGreaterThanMaxAmount(): boolean {
    return this.isGreaterThanOutgoingMaxAmount(this.amountSend, this.asset, this.isSoraToEvm, this.isRegisteredAsset);
  }

  get isLowerThanMinAmount(): boolean {
    return this.isLowerThanIncomingMinAmount(this.amountSend, this.asset, this.isSoraToEvm, this.isRegisteredAsset);
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
    return this.isSelectAssetLoading || this.balancesAndFeesFetching || this.registeredAssetsFetching;
  }

  get isXorSufficientForNextOperation(): boolean {
    if (!this.asset) return false;

    return this.isXorSufficientForNextTx({
      type: this.operation,
      isXor: isXorAccountAsset(this.asset),
      amount: this.getFPNumber(this.amountSend),
    });
  }

  get isNativeTokenSelected(): boolean {
    return this.nativeToken?.address === this.asset?.address;
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

  getDecimals(isSora = true): number | undefined {
    return isSora ? this.asset?.decimals : this.asset?.externalDecimals;
  }

  private getBalance(isSora = true): Nullable<FPNumber> {
    if (!(this.asset && (this.isRegisteredAsset || isSora))) {
      return null;
    }
    const balance = getAssetBalance(this.asset, { internal: isSora });
    if (!balance) {
      return null;
    }
    const decimals = this.getDecimals(isSora);
    return this.getFPNumberFromCodec(balance, decimals);
  }

  formatBalance(balance: Nullable<FPNumber>): string {
    return balance ? balance.toLocaleString() : '-';
  }

  async created(): Promise<void> {
    const { address, amount, isIncoming } = this.$route.params;
    if (address) {
      this.setAssetAddress(address);
    }
    if (isIncoming) {
      this.setSoraToEvm(false);
    }
    this.setSendedAmount(amount);
  }

  getBridgeItemTitle(isSoraNetwork = false): string {
    return this.formatSelectedNetwork(isSoraNetwork);
  }

  getCopyTooltip(isSoraNetwork = false): string {
    const networkName = this.formatNetworkShortName(isSoraNetwork);
    const text = `${networkName} ${this.t('addressText')}`;

    return this.copyTooltip(text);
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

  handleViewTransactionsHistory(): void {
    router.push({ name: PageNames.BridgeTransactionsHistory });
  }

  handleChangeNetwork(): void {
    this.setSelectNetworkDialogVisibility(true);
  }

  openSelectAssetDialog(): void {
    this.showSelectTokenDialog = true;
  }

  async selectAsset(selectedAsset?: RegisteredAccountAsset): Promise<void> {
    if (!selectedAsset) return;

    await this.withSelectAssetLoading(async () => {
      await this.setAssetAddress(selectedAsset.address);
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
$bridge-input-class: '.el-input';
$bridge-input-color: var(--s-color-base-content-tertiary);

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
.bridge {
  flex-direction: column;
  align-items: center;

  &-content {
    @include bridge-content;
    @include token-styles;
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

  &-item-footer {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    font-size: var(--s-font-size-mini);
    line-height: var(--s-line-height-medium);
    color: var(--s-color-base-content-primary);
  }

  &-network-address {
    @include copy-address;
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
