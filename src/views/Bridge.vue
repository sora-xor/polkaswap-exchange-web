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
              v-if="areNetworksConnected"
              class="el-button--history"
              type="action"
              icon="time-time-history-24"
              :tooltip="t('bridgeHistory.showHistory')"
              tooltip-placement="bottom-end"
              @click="handleViewTransactionsHistory"
            />

            <swap-status-action-badge v-if="selectedEvmNetwork">
              <template #value>{{ selectedEvmNetwork.shortName }}</template>
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
          :value="amount"
          :decimals="getDecimals(isSoraToEvm)"
          :delimiters="delimiters"
          :max="MaxInputNumber"
          :disabled="!areNetworksConnected || !isAssetSelected"
          class="s-input--token-value"
          data-test-name="bridgeFrom"
          has-locale-string
          size="medium"
          @input="setAmount"
        >
          <div slot="top" class="input-line">
            <div class="input-title">
              <span class="input-title--uppercase input-title--primary">{{ t('transfers.from') }}</span>
              <span class="input-title--network">{{ getBridgeItemTitle(isSoraToEvm) }}</span>
              <i :class="`network-icon network-icon--${getEvmIcon(isSoraToEvm ? 0 : evmNetwork)}`" />
            </div>
            <div v-if="isNetworkAConnected && isAssetSelected" class="input-value">
              <span class="input-value--uppercase">{{ t('bridge.balance') }}</span>
              <formatted-amount-with-fiat-value
                value-can-be-hidden
                with-left-shift
                value-class="input-value--primary"
                :value="formatBalance(isSoraToEvm)"
                :fiat-value="firstFieldFiatBalance"
              />
            </div>
          </div>
          <div slot="right" v-if="isNetworkAConnected" class="s-flex el-buttons">
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
              <formatted-amount
                v-if="asset && isSoraToEvm"
                is-fiat-value
                :value="getFiatAmountByString(amount, asset)"
              />
              <token-address v-if="isAssetSelected" v-bind="asset" :external="!isSoraToEvm" class="input-value" />
            </div>
            <div v-if="isNetworkAConnected" class="bridge-item-footer">
              <s-divider type="tertiary" />
              <s-tooltip
                :content="getCopyTooltip(isSoraToEvm)"
                border-radius="mini"
                placement="bottom-end"
                tabindex="-1"
              >
                <span class="bridge-network-address" @click="handleCopyAddress(accountAddressFrom, $event)">
                  {{ formatAddress(accountAddressFrom, 8) }}
                </span>
              </s-tooltip>
              <span>{{ t('connectedText') }}</span>
            </div>
            <s-button
              v-else
              class="el-button--connect s-typography-button--large"
              data-test-name="connectPolkadot"
              type="primary"
              @click="isSoraToEvm ? connectInternalWallet() : connectExternalWallet()"
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
          @click="handleSwitchItems"
        />

        <s-float-input
          :value="amount"
          :decimals="getDecimals(!isSoraToEvm)"
          :delimiters="delimiters"
          :max="MaxInputNumber"
          class="s-input--token-value"
          data-test-name="bridgeTo"
          has-locale-string
          size="medium"
          disabled
        >
          <div slot="top" class="input-line">
            <div class="input-title" @click="handleChangeNetwork">
              <span class="input-title--uppercase input-title--primary">{{ t('transfers.to') }}</span>
              <span class="input-title--network">{{ getBridgeItemTitle(!isSoraToEvm) }}</span>
              <i :class="`network-icon network-icon--${getEvmIcon(!isSoraToEvm ? 0 : evmNetwork)}`" />
            </div>
            <div v-if="isNetworkAConnected && isAssetSelected" class="input-value">
              <span class="input-value--uppercase">{{ t('bridge.balance') }}</span>
              <formatted-amount-with-fiat-value
                value-can-be-hidden
                with-left-shift
                value-class="input-value--primary"
                :value="formatBalance(!isSoraToEvm)"
                :fiat-value="secondFieldFiatBalance"
              />
            </div>
          </div>
          <div slot="right" v-if="isNetworkAConnected && isAssetSelected" class="s-flex el-buttons">
            <token-select-button class="el-button--select-token" :token="asset" />
          </div>
          <template #bottom>
            <div class="input-line input-line--footer">
              <formatted-amount
                v-if="asset && !isSoraToEvm"
                :value="getFiatAmountByString(amount, asset)"
                is-fiat-value
              />
              <token-address v-if="isAssetSelected" v-bind="asset" :external="isSoraToEvm" class="input-value" />
            </div>
            <div v-if="isNetworkBConnected" class="bridge-item-footer">
              <s-divider type="tertiary" />
              <s-tooltip
                :content="getCopyTooltip(!isSoraToEvm)"
                border-radius="mini"
                placement="bottom-end"
                tabindex="-1"
              >
                <span class="bridge-network-address" @click="handleCopyAddress(accountAddressTo, $event)">
                  {{ formatAddress(accountAddressTo, 8) }}
                </span>
              </s-tooltip>
              <span>{{ t('connectedText') }}</span>
            </div>
            <s-button
              v-else
              class="el-button--connect s-typography-button--large"
              data-test-name="connectMetamask"
              type="primary"
              @click="!isSoraToEvm ? connectInternalWallet() : connectExternalWallet()"
            >
              {{ t('connectWalletText') }}
            </s-button>
          </template>
        </s-float-input>

        <s-button
          v-if="!isValidNetwork"
          class="el-button--next s-typography-button--big"
          type="primary"
          @click="changeProviderNetwork"
        >
          {{ t('changeNetworkText') }}
        </s-button>

        <s-button
          v-else
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
          <template v-else-if="!areNetworksConnected">
            {{ t('bridge.next') }}
          </template>
          <template v-else-if="isZeroAmount">
            {{ t('buttons.enterAmount') }}
          </template>
          <template v-else-if="isInsufficientBalance">
            {{ t('insufficientBalanceText', { tokenSymbol: assetSymbol }) }}
          </template>
          <template v-else-if="isInsufficientXorForFee">
            {{ t('insufficientBalanceText', { tokenSymbol: KnownSymbols.XOR }) }}
          </template>
          <template v-else-if="isInsufficientEvmNativeTokenForFee">
            {{ t('insufficientBalanceText', { tokenSymbol: evmTokenSymbol }) }}
          </template>
          <template v-else>
            {{ t('bridge.next') }}
          </template>
        </s-button>
        <bridge-transaction-details
          v-if="areNetworksConnected && !isZeroAmount && isRegisteredAsset"
          class="info-line-container"
          :info-only="false"
          :is-sora-to-evm="isSoraToEvm"
          :evm-token-symbol="evmTokenSymbol"
          :evm-network-fee="evmNetworkFee"
          :sora-network-fee="soraNetworkFee"
        />
      </s-card>
      <bridge-select-asset :visible.sync="showSelectTokenDialog" :asset="asset" @select="selectAsset" />
      <bridge-select-network :selected-evm-network="selectedEvmNetwork" @change="changeEvmNetwork" />
      <confirm-bridge-transaction-dialog
        :visible.sync="showConfirmTransactionDialog"
        :is-valid-network-type="isValidNetwork"
        :is-sora-to-evm="isSoraToEvm"
        :is-insufficient-balance="isInsufficientBalance"
        :asset="asset"
        :amount="amount"
        :evm-token-symbol="evmTokenSymbol"
        :evm-network="evmNetwork"
        :evm-network-fee="evmNetworkFee"
        :sora-network-fee="soraNetworkFee"
        @confirm="confirmTransaction"
      />
      <network-fee-warning-dialog
        :visible.sync="showWarningFeeDialog"
        :fee="formattedSoraNetworkFee"
        @confirm="confirmNetworkFeeWariningDialog"
      />
    </s-form>
    <div v-if="!areNetworksConnected" class="bridge-footer">{{ t('bridge.connectWallets') }}</div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { FPNumber, Operation } from '@sora-substrate/util';
import { KnownSymbols } from '@sora-substrate/util/build/assets/consts';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type { EvmNetwork } from '@sora-substrate/util/build/evm/types';
import type { IBridgeTransaction, RegisteredAccountAsset } from '@sora-substrate/util';

import BridgeMixin from '@/components/mixins/BridgeMixin';
import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin';
import NetworkFeeDialogMixin from '@/components/mixins/NetworkFeeDialogMixin';
import TokenSelectMixin from '@/components/mixins/TokenSelectMixin';

import { getter, action, mutation, state } from '@/store/decorators';
import router, { lazyComponent } from '@/router';
import { Components, PageNames } from '@/consts';
import {
  isXorAccountAsset,
  hasInsufficientBalance,
  hasInsufficientXorForFee,
  hasInsufficientEvmNativeTokenForFee,
  getMaxValue,
  getAssetBalance,
  asZeroValue,
} from '@/utils';
import ethersUtil from '@/utils/ethers-util';

@Component({
  components: {
    BridgeSelectAsset: lazyComponent(Components.BridgeSelectAsset),
    BridgeSelectNetwork: lazyComponent(Components.BridgeSelectNetwork),
    BridgeTransactionDetails: lazyComponent(Components.BridgeTransactionDetails),
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

  @state.bridge.evmNetworkFeeFetching private evmNetworkFeeFetching!: boolean;
  @state.bridge.amount amount!: string;
  @state.bridge.isSoraToEvm isSoraToEvm!: boolean;
  @state.assets.registeredAssetsFetching registeredAssetsFetching!: boolean;

  @getter.bridge.asset asset!: Nullable<RegisteredAccountAsset>;
  @getter.bridge.isRegisteredAsset isRegisteredAsset!: boolean;
  @getter.bridge.operation private operation!: Operation;
  @getter.settings.nodeIsConnected nodeIsConnected!: boolean;

  @mutation.bridge.setSoraToEvm private setSoraToEvm!: (value: boolean) => void;
  @mutation.bridge.setHistoryId private setHistoryId!: (id?: string) => void;
  @mutation.bridge.setAmount setAmount!: (value?: string) => void;

  @action.bridge.setAssetAddress private setAssetAddress!: (value?: string) => Promise<void>;
  @action.bridge.resetBalanceSubscription private resetBalanceSubscription!: AsyncFnWithoutArgs;
  @action.bridge.updateBalanceSubscription private updateBalanceSubscription!: AsyncFnWithoutArgs;
  @action.bridge.getEvmNetworkFee private getEvmNetworkFee!: AsyncFnWithoutArgs;
  @action.bridge.generateHistoryItem private generateHistoryItem!: (history?: any) => Promise<IBridgeTransaction>;
  @action.wallet.account.addAsset private addAssetToAccountAssets!: (address?: string) => Promise<void>;

  @Watch('nodeIsConnected')
  private updateConnectionSubsriptions(nodeConnected: boolean) {
    if (nodeConnected) {
      this.updateBalanceSubscription();
    } else {
      this.resetBalanceSubscription();
    }
  }

  showSelectTokenDialog = false;
  showConfirmTransactionDialog = false;

  get assetAddress(): string {
    return this.asset?.address ?? '';
  }

  get firstFieldFiatBalance(): Nullable<string> {
    return this.isSoraToEvm ? this.getFiatBalance(this.asset as AccountAsset) : undefined;
  }

  get secondFieldFiatBalance(): Nullable<string> {
    return !this.isSoraToEvm ? this.getFiatBalance(this.asset as AccountAsset) : undefined;
  }

  get isNetworkAConnected() {
    return this.isSoraToEvm ? this.isSoraAccountConnected : this.isExternalAccountConnected;
  }

  get isNetworkBConnected() {
    return this.isSoraToEvm ? this.isExternalAccountConnected : this.isSoraAccountConnected;
  }

  get isZeroAmount(): boolean {
    return +this.amount === 0;
  }

  get isMaxAvailable(): boolean {
    if (!(this.areNetworksConnected && this.asset)) {
      return false;
    }
    if (!this.isRegisteredAsset && !this.isSoraToEvm) {
      return false;
    }
    const balance = getAssetBalance(this.asset, { internal: this.isSoraToEvm });
    if (asZeroValue(balance)) {
      return false;
    }
    const decimals = this.asset.decimals;
    const fpBalance = this.getFPNumberFromCodec(balance, decimals);
    const fpAmount = this.getFPNumber(this.amount, decimals);
    if (isXorAccountAsset(this.asset) && this.isSoraToEvm) {
      const fpFee = this.getFPNumberFromCodec(this.soraNetworkFee, decimals);
      return !FPNumber.eq(fpFee, fpBalance.sub(fpAmount)) && FPNumber.gt(fpBalance, fpFee);
    }
    if (ethersUtil.isNativeEvmTokenAddress(this.asset.externalAddress) && !this.isSoraToEvm) {
      const fpFee = this.getFPNumberFromCodec(this.evmNetworkFee);
      return !FPNumber.eq(fpFee, fpBalance.sub(fpAmount)) && FPNumber.gt(fpBalance, fpFee);
    }
    return !FPNumber.eq(fpBalance, fpAmount);
  }

  get isInsufficientXorForFee(): boolean {
    return hasInsufficientXorForFee(this.xor, this.soraNetworkFee);
  }

  get isInsufficientEvmNativeTokenForFee(): boolean {
    return hasInsufficientEvmNativeTokenForFee(this.evmBalance, this.evmNetworkFee);
  }

  get isInsufficientBalance(): boolean {
    if (!this.asset) return false;

    const fee = this.isSoraToEvm ? this.soraNetworkFee : this.evmNetworkFee;

    return (
      this.isNetworkAConnected &&
      this.isRegisteredAsset &&
      hasInsufficientBalance(this.asset, this.amount, fee, !this.isSoraToEvm)
    );
  }

  get isAssetSelected(): boolean {
    return !!this.asset;
  }

  get assetSymbol(): string {
    return this.asset?.symbol ?? '';
  }

  get formattedSoraNetworkFee(): string {
    return this.formatCodecNumber(this.soraNetworkFee);
  }

  get isConfirmTxDisabled(): boolean {
    return (
      !this.isAssetSelected ||
      !this.isRegisteredAsset ||
      !this.areNetworksConnected ||
      !this.isValidNetwork ||
      this.isZeroAmount ||
      this.isInsufficientXorForFee ||
      this.isInsufficientEvmNativeTokenForFee ||
      this.isInsufficientBalance
    );
  }

  get isConfirmTxLoading(): boolean {
    return this.isSelectAssetLoading || this.evmNetworkFeeFetching || this.registeredAssetsFetching;
  }

  get isXorSufficientForNextOperation(): boolean {
    if (!this.asset) return false;

    return this.isXorSufficientForNextTx({
      type: this.operation,
      isXor: isXorAccountAsset(this.asset),
      amount: this.getFPNumber(this.amount),
    });
  }

  getDecimals(isSora = true): number | undefined {
    return isSora ? this.asset?.decimals : this.asset?.externalDecimals;
  }

  get accountAddressFrom(): string {
    return !this.isSoraToEvm ? this.evmAddress : this.getWalletAddress();
  }

  get accountAddressTo(): string {
    return this.isSoraToEvm ? this.evmAddress : this.getWalletAddress();
  }

  formatBalance(isSora = true): string {
    if (!this.asset || (!this.isRegisteredAsset && !isSora)) {
      return '-';
    }
    const balance = getAssetBalance(this.asset, { internal: isSora });
    if (!balance) {
      return '-';
    }
    const decimals = this.getDecimals(isSora);
    return this.formatCodecNumber(balance, decimals);
  }

  async created(): Promise<void> {
    if (this.$route.params.xorToDeposit) {
      await this.selectAsset(this.xor);
      this.setSoraToEvm(false);
      this.setAmount(this.$route.params.xorToDeposit);
    } else {
      this.setAmount();
      this.updateBalanceSubscription();
    }
  }

  destroyed(): void {
    this.resetBalanceSubscription();
  }

  getBridgeItemTitle(isSoraNetwork = false): string {
    return this.formatNetwork(isSoraNetwork);
  }

  getCopyTooltip(isSoraNetwork = false): string {
    return this.copyTooltip(isSoraNetwork ? this.t('bridge.soraAddress') : this.t('bridge.ethereumAddress'));
  }

  async handleSwitchItems(): Promise<void> {
    this.setSoraToEvm(!this.isSoraToEvm);
    await this.getEvmNetworkFee();
  }

  handleMaxValue(): void {
    if (this.asset && this.isRegisteredAsset) {
      const fee = this.isSoraToEvm ? this.soraNetworkFee : this.evmNetworkFee;
      const max = getMaxValue(this.asset, fee, !this.isSoraToEvm);
      this.setAmount(max);
    }
  }

  async handleConfirmButtonClick(): Promise<void> {
    if (!this.isValidNetwork) {
      this.changeProviderNetwork();
      return;
    }

    if (!this.isXorSufficientForNextOperation) {
      this.openWarningFeeDialog();
      await this.waitOnNextTxFailureConfirmation();
      if (!this.isWarningFeeDialogConfirmed) {
        return;
      }
      this.isWarningFeeDialogConfirmed = false;
    }

    await this.checkConnectionToExternalAccount(() => {
      this.showConfirmTransactionDialog = true;
    });
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
      await this.getEvmNetworkFee();
    });
  }

  async confirmTransaction(isTransactionConfirmed: boolean): Promise<void> {
    if (!isTransactionConfirmed) return;

    await this.checkConnectionToExternalAccount(async () => {
      // create new history item
      const { assetAddress, id } = await this.generateHistoryItem();

      // Add asset to account assets for balances subscriptions
      if (assetAddress && !this.accountAssetsAddressTable[assetAddress]) {
        await this.addAssetToAccountAssets(assetAddress);
      }

      this.setHistoryId(id);
      router.push({ name: PageNames.BridgeTransaction });
    });
  }

  changeEvmNetwork(evmNetwork: EvmNetwork): void {
    this.selectEvmNetwork(evmNetwork);
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
    padding: $inner-spacing-medium $inner-spacing-medium $inner-spacing-big;
  }
  .bridge-item {
    &--evm {
      .s-input {
        .el-input > input {
          // TODO: remove user select
          cursor: initial;
        }
      }
    }
    > .el-card__body {
      padding: 0;
    }
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
      width: 16px;
      height: 16px;
    }
  }

  &-header-buttons {
    display: flex;
    align-items: center;
    margin-left: auto;

    & > *:not(:first-child) {
      margin-left: $inner-spacing-mini;
    }
  }

  .bridge-item {
    &-footer {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      font-size: var(--s-font-size-mini);
      line-height: var(--s-line-height-medium);
      color: var(--s-color-base-content-primary);
    }
    & + .bridge-info {
      margin-top: $basic-spacing * 2;
    }
  }
  .bridge-network-address {
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
}
</style>
