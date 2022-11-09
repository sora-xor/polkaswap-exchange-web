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
        <template v-if="BRIDGE_ENABLED">
          <s-float-input
            :value="amount"
            :decimals="getDecimals(isSoraToEvm)"
            :delimiters="delimiters"
            :max="getMax(assetAddress)"
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
                <i :class="`s-icon-${isSoraToEvm ? 'sora' : getEvmIcon(evmNetwork)}`" />
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
                <s-tooltip :content="getCopyTooltip(isSoraToEvm)" border-radius="mini" placement="bottom-end">
                  <span class="bridge-network-address" @click="handleCopyAddress(accountAddressFrom, $event)">
                    {{ formatAddress(accountAddressFrom, 8) }}
                  </span>
                </s-tooltip>
                <span>{{ t('bridge.connected') }}</span>
              </div>
              <s-button
                v-else
                class="el-button--connect s-typography-button--large"
                data-test-name="connectPolkadot"
                type="primary"
                @click="isSoraToEvm ? connectInternalWallet() : connectExternalWallet()"
              >
                {{ t('bridge.connectWallet') }}
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
            :max="getMax(assetAddress)"
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
                <i :class="`s-icon-${!isSoraToEvm ? 'sora' : getEvmIcon(evmNetwork)}`" />
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
                <s-tooltip :content="getCopyTooltip(!isSoraToEvm)" border-radius="mini" placement="bottom-end">
                  <span class="bridge-network-address" @click="handleCopyAddress(accountAddressTo, $event)">
                    {{ formatAddress(accountAddressTo, 8) }}
                  </span>
                </s-tooltip>
                <span>{{ t('bridge.connected') }}</span>
              </div>
              <s-button
                v-else
                class="el-button--connect s-typography-button--large"
                data-test-name="connectMetamask"
                type="primary"
                @click="!isSoraToEvm ? connectInternalWallet() : connectExternalWallet()"
              >
                {{ t('bridge.connectWallet') }}
              </s-button>
            </template>
          </s-float-input>

          <s-button
            class="el-button--next s-typography-button--large"
            data-test-name="nextButton"
            type="primary"
            :disabled="isConfirmTxDisabled"
            :loading="isConfirmTxLoading"
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
        </template>
        <div v-else class="bridge--disabled">
          <div class="logo--disabled">
            <svg
              width="128px"
              height="128px"
              viewBox="0 0 128 128"
              xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink"
              aria-hidden="true"
              role="img"
              class="iconify iconify--noto"
              preserveAspectRatio="xMidYMid meet"
            >
              <path
                d="M53.74 49.78L13 53.92s.22 2.92 1.06 3.59c.8.64 25.28.3 49.72.4c24.45.1 48.69.56 49.25.32c1.12-.48 1.12-4.46 1.12-4.46l-60.41-3.99z"
                fill="#8a1e0c"
              ></path>
              <path
                d="M66.48 27.04L9.67 25.6s1.24 2.75 2.87 3.66c2.35 1.31 16.69 4 51.83 4.13s47.86-1.8 50.93-3.05c2.61-1.07 5.47-7.09 5.47-7.09l-54.29 3.79z"
                fill="#8a1e0c"
              ></path>
              <path fill="#8a1e0c" d="M30.08 36.33V30.2l9.19.56v5.49z"></path>
              <path fill="#8a1e0c" d="M90.78 30.96v6.01l9.79-.39v-6.14z"></path>
              <path
                d="M9.69 23.24s-2.91-1.53-6.2-7.08C1.2 12.3.81 8.7 1.75 8.16s9.69 4.86 25.85 7.27c11.62 1.73 24.59 2.79 36.78 2.9c12.98.12 25.73-.61 37.79-2.9c16.29-3.1 22.08-6.46 23.69-5.92c1.62.54-.49 5.52-1.66 8.01c-.8 1.69-4.25 7.96-6.82 8.41c-1.85.33-89.79-.4-89.79-.4l-17.9-2.29z"
                fill="#474c4f"
              ></path>
              <path fill="#eb2901" d="M58.55 28.49v21.94l10.77-1.48V28.49z"></path>
              <path d="M90.77 35.05h9.8v75.59l-9.93 1.32l.13-76.91z" fill="#eb2901"></path>
              <path fill="#eb2901" d="M30.08 34.98l-.17 76.73l9.36-.93V35.05z"></path>
              <path
                d="M113.81 45.9c-.52-.72-2.17-.62-2.17-.62s-1.88-.02-5.12-.06c.01-1.79-.04-4.11-.35-4.48c-.52-.62-20.44-.41-21.16.21c-.41.35-.49 2.37-.48 4.04c-12.32-.12-26.96-.26-39.74-.34c0-1.73-.05-3.82-.35-4.12c-.52-.52-18.99-.83-19.71-.31c-.51.37-.61 2.91-.62 4.36c-6.23.01-10.24.06-10.53.18c-1.45.62-.62 9.19-.62 9.19l101.15.72c.01.01.22-8.04-.3-8.77z"
                fill="#eb2901"
              ></path>
              <path
                d="M6.9 17.76c-.49.62-.26 2.06.95 4.77c.48 1.07 1.87 3.52 2.38 4.13c0 0 13.42 3.4 53.9 3.15s54.49-2.79 54.49-2.79s4.1-5.75 3.35-5.94c-.43-.11-21.81 4.41-58.09 4.04S6.9 17.76 6.9 17.76z"
                fill="#eb2901"
              ></path>
              <path
                d="M27.12 108.64c-.33.33-.66 10.62-.09 11.09c.56.47 14.13.58 14.6.11c.47-.47.38-10.37.1-10.94s-14.14-.73-14.61-.26z"
                fill="#474c4f"
              ></path>
              <path
                d="M88.1 109.86c-.5.87-.5 10.34-.03 11c.47.66 14.59.47 14.97 0c.38-.47.28-10.71 0-11.09s-14.56-.56-14.94.09z"
                fill="#474c4f"
              ></path>
            </svg>
          </div>
          <h3>{{ t('bridge.disabledTitle') }}</h3>
          <div class="text--disabled">{{ t('bridge.disabledText') }}</div>
        </div>
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
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { FPNumber, Operation } from '@sora-substrate/util';
import { KnownSymbols, XOR, ETH } from '@sora-substrate/util/build/assets/consts';
import type { BridgeHistory } from '@sora-substrate/util';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

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
  isEthereumAddress,
} from '@/utils';
import type { SubNetwork } from '@/utils/ethers-util';
import type { RegisterAssetWithExternalBalance, RegisteredAccountAssetWithDecimals } from '@/store/assets/types';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SelectNetwork: lazyComponent(Components.SelectNetwork),
    SelectRegisteredAsset: lazyComponent(Components.SelectRegisteredAsset),
    ConfirmBridgeTransactionDialog: lazyComponent(Components.ConfirmBridgeTransactionDialog),
    NetworkFeeWarningDialog: lazyComponent(Components.NetworkFeeWarningDialog),
    BridgeTransactionDetails: lazyComponent(Components.BridgeTransactionDetails),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
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
  readonly BRIDGE_ENABLED = false; // TODO [ETH-MERGE]: Remove all these lines, HTML template & CSS block

  readonly delimiters = FPNumber.DELIMITERS_CONFIG;
  readonly KnownSymbols = KnownSymbols;

  @state.bridge.evmNetworkFeeFetching private evmNetworkFeeFetching!: boolean;
  @state.web3.subNetworks subNetworks!: Array<SubNetwork>;
  @state.bridge.amount amount!: string;
  @state.bridge.isSoraToEvm isSoraToEvm!: boolean;
  @state.assets.registeredAssetsFetching registeredAssetsFetching!: boolean;

  @getter.bridge.asset asset!: Nullable<RegisteredAccountAssetWithDecimals>;
  @getter.bridge.isRegisteredAsset isRegisteredAsset!: boolean;
  @getter.settings.nodeIsConnected nodeIsConnected!: boolean;

  @mutation.bridge.setSoraToEvm private setSoraToEvm!: (value: boolean) => void;
  @mutation.bridge.setHistoryId private setHistoryId!: (id?: string) => void;
  @mutation.bridge.setAmount setAmount!: (value: string) => void;

  @action.bridge.setAssetAddress private setAssetAddress!: (value?: string) => Promise<void>;
  @action.bridge.resetBridgeForm private resetBridgeForm!: (withAddress?: boolean) => Promise<void>;
  @action.bridge.resetBalanceSubscription private resetBalanceSubscription!: AsyncVoidFn;
  @action.bridge.updateBalanceSubscription private updateBalanceSubscription!: AsyncVoidFn;
  @action.bridge.getEvmNetworkFee private getEvmNetworkFee!: AsyncVoidFn;
  @action.bridge.generateHistoryItem private generateHistoryItem!: (history?: any) => Promise<BridgeHistory>;
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
  showSelectNetworkDialog = false;
  showConfirmTransactionDialog = false;

  get assetAddress(): string {
    if (!this.asset) return '';

    return this.asset.address;
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
    if (!this.areNetworksConnected || !this.isRegisteredAsset || !this.asset) {
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
      !this.isValidNetworkType ||
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
      type: this.isSoraToEvm ? Operation.EthBridgeOutgoing : Operation.EthBridgeIncoming,
      isXorAccountAsset: isXorAccountAsset(this.asset),
      amount: this.getFPNumber(this.amount),
    });
  }

  getDecimals(isSora = true): number | undefined {
    if (!this.asset) {
      return undefined;
    }
    return isSora ? this.asset.decimals : this.asset.externalDecimals;
  }

  get accountAddressFrom(): string {
    return !this.isSoraToEvm ? this.evmAddress : this.getWalletAddress();
  }

  get accountAddressTo(): string {
    return this.isSoraToEvm ? this.evmAddress : this.getWalletAddress();
  }

  formatBalance(isSora = true): string {
    if (!this.isRegisteredAsset || !this.asset) {
      return '-';
    }
    const balance = getAssetBalance(this.asset, { internal: isSora });
    if (!balance) {
      return '-';
    }
    const decimals = this.getDecimals(isSora);
    return this.formatCodecNumber(balance, decimals);
  }

  created(): void {
    // we should reset data only on created, because it's used on another bridge views
    this.resetBridgeForm(!!router.currentRoute.params?.address);
  }

  destroyed(): void {
    this.resetBalanceSubscription();
  }

  getBridgeItemTitle(isSoraNetwork = false): string {
    return this.t(this.formatNetwork(isSoraNetwork));
  }

  getCopyTooltip(isSoraNetwork = false): string {
    return this.copyTooltip(this.t(`bridge.${isSoraNetwork ? 'soraAddress' : 'ethereumAddress'}`));
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
    this.setEvmNetwork(network);
  }

  async selectAsset(selectedAsset?: RegisterAssetWithExternalBalance): Promise<void> {
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
      const tx = await this.generateHistoryItem();
      const { assetAddress, type, id } = tx;
      if (type === Operation.EthBridgeOutgoing && assetAddress) {
        const asset = this.accountAssetsAddressTable[assetAddress];
        if (!asset) {
          // Add asset to account assets for balances subscriptions
          await this.addAssetToAccountAssets(assetAddress);
        }
      }
      this.setHistoryId(id);
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
// TODO [ETH-MERGE]: Remove this block below
.bridge--disabled {
  background-color: var(--s-color-base-border-primary);
  height: 332px;
  width: 411px;
  border-radius: 30px;
  box-shadow: var(--s-shadow-element-pressed);
  > .logo--disabled {
    display: flex;
    justify-content: center;
    margin-top: 32px;
  }
  > h3 {
    @include page-header-title;
    color: var(--s-color-base-content-primary);
    text-transform: none;
    padding: 32px 16px 0 16px;
    margin: 0 16px;
    text-align: center;
  }
  > .text--disabled {
    color: var(--s-color-base-content-primary);
    padding: 14px 16px;
    margin: 0 16px;
    text-align: center;
    font-weight: 300;
    font-size: 14px;
  }
}
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
        font-size: $s-heading3-caps-font-size;
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
