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
          <s-button
            v-if="areNetworksConnected"
            class="el-button--history"
            type="action"
            icon="time-time-history-24"
            :tooltip="t('bridgeHistory.showHistory')"
            tooltip-placement="bottom-end"
            @click="handleViewTransactionsHistory"
          />
          <!-- <s-button
            v-if="areNetworksConnected"
            class="el-button--networks"
            type="action"
            icon="connection-broadcasting-24"
            :tooltip="t('bridge.selectNetwork')"
            tooltip-placement="bottom-end"
            @click="handleChangeNetwork"
          /> -->
        </generic-page-header>
        <s-float-input
          :value="amount"
          :decimals="getDecimals(isSoraToEvm)"
          :delimiters="delimiters"
          :max="getMax((asset || {}).address)"
          :disabled="!areNetworksConnected || !isAssetSelected"
          class="s-input--token-value"
          has-locale-string
          size="medium"
          @input="setAmount"
        >
          <div slot="top" class="input-line">
            <div class="input-title">
              <span class="input-title--uppercase input-title--primary">{{ t('transfers.from') }}</span>
              <span class="input-title--network">{{ getBridgeItemTitle(isSoraToEvm) }}</span>
              <i :class="`s-icon-${isSoraToEvm ? 'sora' : getEvmIcon(evmNetwork)}`" />
            </div>
            <div v-if="isNetworkAConnected && isAssetSelected" class="input-value">
              <span class="input-value--uppercase">{{ t('bridge.balance') }}</span>
              <formatted-amount-with-fiat-value
                value-can-be-hidden
                with-left-shift
                value-class="input-value--primary"
                :value="formatBalance(isSoraToEvm)"
                :fiat-value="isSoraToEvm ? getFiatBalance(asset) : undefined"
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
              <span>{{ formatAddress(!isSoraToEvm ? evmAddress : getWalletAddress(), 8) }}</span>
              <span>{{ t('bridge.connected') }}</span>
            </div>
            <s-button
              v-else
              class="el-button--connect s-typography-button--large"
              type="primary"
              @click="isSoraToEvm ? connectInternalWallet() : connectExternalWallet()"
            >
              {{ t('bridge.connectWallet') }}
            </s-button>
          </template>
        </s-float-input>

        <s-button class="s-button--switch" type="action" icon="arrows-swap-90-24" @click="handleSwitchItems" />

        <s-float-input
          :value="amount"
          :decimals="getDecimals(!isSoraToEvm)"
          :delimiters="delimiters"
          :max="getMax((asset || {}).address)"
          class="s-input--token-value"
          has-locale-string
          size="medium"
          disabled
        >
          <div slot="top" class="input-line">
            <div class="input-title" @click="handleChangeNetwork">
              <span class="input-title--uppercase input-title--primary">{{ t('transfers.to') }}</span>
              <span class="input-title--network">{{ getBridgeItemTitle(!isSoraToEvm) }}</span>
              <i :class="`s-icon-${!isSoraToEvm ? 'sora' : getEvmIcon(evmNetwork)}`" />
            </div>
            <div v-if="isNetworkAConnected && isAssetSelected" class="input-value">
              <span class="input-value--uppercase">{{ t('bridge.balance') }}</span>
              <formatted-amount-with-fiat-value
                value-can-be-hidden
                with-left-shift
                value-class="input-value--primary"
                :value="formatBalance(!isSoraToEvm)"
                :fiat-value="!isSoraToEvm ? getFiatBalance(asset) : undefined"
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
              <span>{{ formatAddress(isSoraToEvm ? evmAddress : getWalletAddress(), 8) }}</span>
              <span>{{ t('bridge.connected') }}</span>
            </div>
            <s-button
              v-else
              class="el-button--connect s-typography-button--large"
              type="primary"
              @click="!isSoraToEvm ? connectInternalWallet() : connectExternalWallet()"
            >
              {{ t('bridge.connectWallet') }}
            </s-button>
          </template>
        </s-float-input>

        <s-button
          class="el-button--next s-typography-button--large"
          type="primary"
          :disabled="isConfirmTxDisabled"
          @click="handleConfirmTransaction"
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
          <template v-else-if="!isValidNetworkType">
            {{ t('bridge.changeNetwork') }}
          </template>
          <template v-else-if="isZeroAmount">
            {{ t('buttons.enterAmount') }}
          </template>
          <template v-else-if="isInsufficientBalance">
            {{ t('confirmBridgeTransactionDialog.insufficientBalance', { tokenSymbol: assetSymbol }) }}
          </template>
          <template v-else-if="isInsufficientXorForFee">
            {{ t('confirmBridgeTransactionDialog.insufficientBalance', { tokenSymbol: KnownSymbols.XOR }) }}
          </template>
          <template v-else-if="isInsufficientEvmNativeTokenForFee">
            {{ t('confirmBridgeTransactionDialog.insufficientBalance', { tokenSymbol: evmTokenSymbol }) }}
          </template>
          <template v-else>
            {{ t('bridge.next') }}
          </template>
        </s-button>
        <bridge-transaction-details
          v-if="areNetworksConnected && !isZeroAmount && isRegisteredAsset"
          class="info-line-container"
          :info-only="false"
          :evm-token-symbol="evmTokenSymbol"
          :evm-network-fee="evmNetworkFee"
          :sora-network-fee="soraNetworkFee"
        />
      </s-card>
      <select-registered-asset :visible.sync="showSelectTokenDialog" :asset="asset" @select="selectAsset" />
      <!-- <select-network :visible.sync="showSelectNetworkDialog" :value="evmNetwork" :sub-networks="subNetworks" @input="selectNetwork" /> -->
      <confirm-bridge-transaction-dialog
        :visible.sync="showConfirmTransactionDialog"
        :is-valid-network-type="isValidNetworkType"
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
import { Action, Getter, State } from 'vuex-class';
import { KnownSymbols, FPNumber, Operation } from '@sora-substrate/util';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';

import BridgeMixin from '@/components/mixins/BridgeMixin';
import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import NetworkFeeDialogMixin from '@/components/mixins/NetworkFeeDialogMixin';

import router, { lazyComponent } from '@/router';
import { Components, PageNames } from '@/consts';
import { SubNetwork } from '@/utils/ethers-util';
import {
  isXorAccountAsset,
  hasInsufficientBalance,
  hasInsufficientXorForFee,
  hasInsufficientEvmNativeTokenForFee,
  getMaxValue,
  getAssetBalance,
  asZeroValue,
  isEthereumAddress,
} from '@/utils';
import { bridgeApi } from '@/utils/bridge';

const namespace = 'bridge';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    TokenLogo: lazyComponent(Components.TokenLogo),
    SelectNetwork: lazyComponent(Components.SelectNetwork),
    SelectRegisteredAsset: lazyComponent(Components.SelectRegisteredAsset),
    ConfirmBridgeTransactionDialog: lazyComponent(Components.ConfirmBridgeTransactionDialog),
    NetworkFeeWarningDialog: lazyComponent(Components.NetworkFeeWarningDialog),
    BridgeTransactionDetails: lazyComponent(Components.BridgeTransactionDetails),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    TokenAddress: lazyComponent(Components.TokenAddress),
    FormattedAmount: components.FormattedAmount,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
    InfoLine: components.InfoLine,
  },
})
export default class Bridge extends Mixins(
  mixins.FormattedAmountMixin,
  mixins.NetworkFeeWarningMixin,
  BridgeMixin,
  TranslationMixin,
  NetworkFormatterMixin,
  NetworkFeeDialogMixin
) {
  @State((state) => state[namespace].evmNetworkFeeFetching) evmNetworkFeeFetching!: boolean;

  @Action('setSoraToEvm', { namespace }) setSoraToEvm!: (value: boolean) => Promise<void>;
  @Action('setAssetAddress', { namespace }) setAssetAddress!: (value: string) => Promise<void>;
  @Action('setAmount', { namespace }) setAmount;
  @Action('resetBridgeForm', { namespace }) resetBridgeForm;
  @Action('resetBalanceSubscription', { namespace }) resetBalanceSubscription!: AsyncVoidFn;
  @Action('updateBalanceSubscription', { namespace }) updateBalanceSubscription!: AsyncVoidFn;
  @Action('setTransactionConfirm', { namespace }) setTransactionConfirm!: (flag: boolean) => Promise<void>;
  @Action('setTransactionStep', { namespace }) setTransactionStep!: (step: number) => Promise<void>;

  @Getter('subNetworks', { namespace: 'web3' }) subNetworks!: Array<SubNetwork>;
  @Getter('isRegisteredAsset', { namespace }) isRegisteredAsset!: boolean;
  @Getter nodeIsConnected!: boolean;

  @Watch('nodeIsConnected')
  private updateConnectionSubsriptions(nodeConnected: boolean) {
    if (nodeConnected) {
      this.updateBalanceSubscription();
    } else {
      this.resetBalanceSubscription();
    }
  }

  readonly delimiters = FPNumber.DELIMITERS_CONFIG;

  KnownSymbols = KnownSymbols;
  showSelectTokenDialog = false;
  showSelectNetworkDialog = false;
  showConfirmTransactionDialog = false;

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
    if (!this.areNetworksConnected || !this.isRegisteredAsset) {
      return false;
    }
    const balance = getAssetBalance(this.asset, { internal: this.isSoraToEvm });
    if (asZeroValue(balance)) {
      return false;
    }
    const decimals = this.asset.decimals;
    const fpBalance = this.getFPNumberFromCodec(balance, decimals);
    const fpAmount = this.getFPNumber(this.amount, decimals);
    // TODO: Check if we have appropriate network fee currency (XOR/ETH) for both networks
    if (isXorAccountAsset(this.asset) && this.isSoraToEvm) {
      const fpFee = this.getFPNumberFromCodec(this.soraNetworkFee, decimals);
      return !FPNumber.eq(fpFee, fpBalance.sub(fpAmount)) && FPNumber.gt(fpBalance, fpFee);
    }
    if (isEthereumAddress(this.asset.externalAddress) && !this.isSoraToEvm) {
      const fpFee = this.getFPNumberFromCodec(this.evmNetworkFee);
      return !FPNumber.eq(fpFee, fpBalance.sub(fpAmount)) && FPNumber.gt(fpBalance, fpFee);
    }
    return !FPNumber.eq(fpBalance, fpAmount);
  }

  get isInsufficientXorForFee(): boolean {
    return hasInsufficientXorForFee(this.tokenXOR, this.soraNetworkFee);
  }

  get isInsufficientEvmNativeTokenForFee(): boolean {
    return hasInsufficientEvmNativeTokenForFee(this.evmBalance, this.evmNetworkFee);
  }

  get isInsufficientBalance(): boolean {
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
      !this.areNetworksConnected ||
      !this.isValidNetworkType ||
      !this.isAssetSelected ||
      this.isZeroAmount ||
      this.isInsufficientXorForFee ||
      this.isInsufficientEvmNativeTokenForFee ||
      this.isInsufficientBalance ||
      !this.isRegisteredAsset ||
      this.evmNetworkFeeFetching
    );
  }

  get isXorSufficientForNextOperation(): boolean {
    return this.isXorSufficientForNextTx({
      type: this.isSoraToEvm ? Operation.EthBridgeOutgoing : Operation.EthBridgeIncoming,
      isXorAccountAsset: isXorAccountAsset(this.asset),
      amount: this.getFPNumber(this.amount),
      xorBalance: this.getFPNumberFromCodec(getAssetBalance(this.tokenXOR)),
    });
  }

  getDecimals(isSora = true): number | undefined {
    if (!this.asset) {
      return undefined;
    }
    return isSora ? this.asset.decimals : this.asset.externalDecimals;
  }

  formatBalance(isSora = true): string {
    if (!this.isRegisteredAsset) {
      return '-';
    }
    const balance = getAssetBalance(this.asset, { internal: isSora });
    if (!balance) {
      return '-';
    }
    const decimals = this.getDecimals(isSora);
    return this.formatCodecNumber(balance, decimals);
  }

  async onEvmNetworkChange(network: number): Promise<void> {
    await Promise.all([this.setEvmNetwork(network), this.getRegisteredAssets(), this.getEvmNetworkFee()]);
  }

  created(): void {
    // we should reset data only on created, because it's used on another bridge views
    this.resetBridgeForm(!!router.currentRoute.params?.address);
    this.withApi(async () => {
      await this.onEvmNetworkChange(bridgeApi.externalNetwork);
    });
  }

  destroyed(): void {
    this.resetBalanceSubscription();
  }

  getBridgeItemTitle(isSoraNetwork = false): string {
    return this.t(this.formatNetwork(isSoraNetwork));
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

  async handleConfirmTransaction(): Promise<void> {
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
    this.showSelectNetworkDialog = true;
  }

  openSelectAssetDialog(): void {
    this.showSelectTokenDialog = true;
  }

  async selectNetwork(network: number): Promise<void> {
    this.showSelectNetworkDialog = false;
    await this.onEvmNetworkChange(network);
  }

  async selectAsset(selectedAsset: any): Promise<void> {
    if (selectedAsset) {
      await this.setAssetAddress(selectedAsset?.address ?? '');
      await this.getEvmNetworkFee();
    }
  }

  async confirmTransaction(isTransactionConfirmed: boolean): Promise<void> {
    if (!isTransactionConfirmed) return;

    await this.checkConnectionToExternalAccount(async () => {
      await this.setTransactionConfirm(true);
      await this.setTransactionStep(1);
      router.push({ name: PageNames.BridgeTransaction });
    });
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
    .el-button--history {
      margin-left: auto;
    }
    @include buttons;
    @include full-width-button('el-button--connect', $inner-spacing-mini);
    @include full-width-button('el-button--next');
    .input-title {
      &--network {
        white-space: nowrap;
      }
      i {
        margin-top: 1px;
        font-size: 10px;
        @include icon-styles;
      }
    }
  }
  .bridge-item {
    &-footer {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      font-size: var(--s-font-size-mini);
      letter-spacing: var(--s-letter-spacing-small);
      line-height: var(--s-line-height-medium);
      color: var(--s-color-base-content-primary);
    }
    & + .bridge-info {
      margin-top: $basic-spacing * 2;
    }
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
