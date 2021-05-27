<template>
  <div class="bridge s-flex">
    <s-form class="bridge-form" :show-message="false">
      <s-card
        v-loading="parentLoading"
        class="bridge-content"
        border-radius="medium"
        shadow="never"
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
          <s-button
            v-if="areNetworksConnected"
            class="el-button--networks"
            type="action"
            icon="connection-broadcasting-24"
            :tooltip="t('bridge.selectNetwork')"
            tooltip-placement="bottom-end"
            @click="handleChangeNetwork"
          />
        </generic-page-header>
        <s-card :class="isSoraToEvm ? 'bridge-item' : 'bridge-item bridge-item--evm'" border-radius="mini" shadow="never">
          <div class="bridge-item-header">
            <div class="bridge-item-title">
              <span class="bridge-item-title-label">{{ t('transfers.from') }}</span>
              <span>{{ getBridgeItemTitle() }}</span>
              <i :class="`s-icon-${isSoraToEvm ? 'sora' : getEvmIcon(evmNetwork)}`" />
            </div>
            <div v-if="isNetworkAConnected && isAssetSelected" class="token-balance">
              <span class="token-balance-title">{{ t('bridge.balance') }}</span>
              <span class="token-balance-value">{{ formatBalance(isSoraToEvm) }}</span>
            </div>
          </div>
          <div class="bridge-item-content">
            <s-form-item>
              <s-float-input
                :value="amount"
                :decimals="(asset || {}).externalDecimals"
                :max="getMax((asset || {}).address)"
                :class="inputClasses"
                :placeholder="isFieldAmountFocused ? '' : inputPlaceholder"
                :disabled="!areNetworksConnected || !isAssetSelected"
                @input="setAmount"
                @focus="handleFocus"
                @blur="handleBlur"
              />
            </s-form-item>
            <div v-if="isNetworkAConnected && isAssetSelected" class="asset">
              <s-button v-if="isMaxAvailable" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleMaxValue">
                {{ t('buttons.max') }}
              </s-button>
              <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium" icon="chevron-down-rounded-16" icon-position="right" @click="openSelectAssetDialog">
                <token-logo :token="asset" size="small" />
                {{ formatAssetSymbol(assetSymbol) }}
              </s-button>
            </div>
            <s-button v-else class="el-button--empty-token" type="tertiary" size="small" border-radius="mini" icon="chevron-down-rounded-16" icon-position="right" :disabled="!areNetworksConnected" @click="openSelectAssetDialog">
              {{ t('buttons.chooseToken') }}
            </s-button>
          </div>
          <div v-if="isNetworkAConnected && !isSoraToEvm" class="bridge-item-footer">
            <s-divider />
            <s-button class="el-button--change-wallet" type="link" size="mini" @click="isSoraToEvm ? connectInternalWallet() : changeExternalWallet()">
              <span class="bridge-item-id">{{ formatAddress(isSoraToEvm ? getWalletAddress() : evmAddress, 8) }}</span>
              <span class="change-wallet">{{ t('bridge.changeAccount') }}</span>
            </s-button>
            <span>{{ t('bridge.connected') }}</span>
          </div>
          <s-button v-else-if="!isNetworkAConnected" class="el-button--connect" type="primary" @click="isSoraToEvm ? connectInternalWallet() : connectExternalWallet()">
            {{ t('bridge.connectWallet') }}
          </s-button>
        </s-card>
        <s-button class="s-button--switch" type="action" icon="arrows-swap-90-24" @click="handleSwitchItems" />
        <s-card :class="!isSoraToEvm ? 'bridge-item' : 'bridge-item bridge-item--evm'" border-radius="mini" shadow="never">
          <div class="bridge-item-header">
            <div class="bridge-item-title bridge-item-title--to" @click="handleChangeNetwork">
              <span class="bridge-item-title-label">{{ t('transfers.to') }}</span>
              <span>{{ getBridgeItemTitle(true) }}</span>
              <i :class="`s-icon-${!isSoraToEvm ? 'sora' : getEvmIcon(evmNetwork)}`" />
            </div>
            <div v-if="areNetworksConnected && isAssetSelected" class="token-balance">
              <span class="token-balance-title">{{ t('bridge.balance') }}</span>
              <span class="token-balance-value">{{ formatBalance(!isSoraToEvm) }}</span>
            </div>
          </div>
          <div class="bridge-item-content">
            <s-form-item>
              <s-float-input
                :value="amount"
                :decimals="(asset || {}).externalDecimals"
                :max="getMax((asset || {}).address)"
                :class="inputClasses"
                :placeholder="inputPlaceholder"
                disabled
              />
            </s-form-item>
            <div v-if="areNetworksConnected && isAssetSelected" class="asset">
              <s-button class="el-button--choose-token el-button--disabled" type="tertiary" size="small" border-radius="medium">
                <token-logo :token="asset" size="small" />
                {{ formatAssetSymbol(assetSymbol) }}
              </s-button>
            </div>
          </div>
          <div v-if="isNetworkBConnected && isSoraToEvm" class="bridge-item-footer">
            <s-divider />
            <s-button class="el-button--change-wallet" type="link" size="mini" @click="!isSoraToEvm ? connectInternalWallet() : changeExternalWallet()">
              <span class="bridge-item-id">{{ formatAddress(isSoraToEvm ? evmAddress : getWalletAddress(), 8) }}</span>
              <span class="change-wallet">{{ t('bridge.changeAccount') }}</span>
            </s-button>
            <span>{{ t('bridge.connected') }}</span>
          </div>
          <s-button v-else-if="!isNetworkBConnected" class="el-button--connect" type="primary" @click="!isSoraToEvm ? connectInternalWallet() : connectExternalWallet()">
            {{ t('bridge.connectWallet') }}
          </s-button>
        </s-card>
        <s-button
          class="el-button--next"
          type="primary"
          :disabled="!isAssetSelected || !areNetworksConnected || !isValidNetworkType || !isAssetSelected || isZeroAmount || isInsufficientXorForFee || isInsufficientEvmNativeTokenForFee || isInsufficientBalance || !isRegisteredAsset"
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
            {{ t('confirmBridgeTransactionDialog.insufficientBalance', { tokenSymbol : formatAssetSymbol(assetSymbol) }) }}
          </template>
          <template v-else-if="isInsufficientXorForFee">
            {{ t('confirmBridgeTransactionDialog.insufficientBalance', { tokenSymbol : KnownSymbols.XOR }) }}
          </template>
          <template v-else-if="isInsufficientEvmNativeTokenForFee">
            {{ t('confirmBridgeTransactionDialog.insufficientBalance', { tokenSymbol : currentEvmTokenSymbol }) }}
          </template>
          <template v-else>
            {{ t('bridge.next') }}
          </template>
        </s-button>
        <div v-if="areNetworksConnected && !isZeroAmount && isRegisteredAsset" class="info-line-container">
          <info-line
            :label="t('bridge.soraNetworkFee')"
            :tooltip-content="t('networkFeeTooltipText')"
            :value="formatFee(soraNetworkFee, formattedSoraNetworkFee)"
            :asset-symbol="KnownSymbols.XOR"
          />
          <info-line
            :label="t('bridge.ethereumNetworkFee')"
            :tooltip-content="t('ethNetworkFeeTooltipText')"
            :value="formatFee(evmNetworkFee, formattedEvmNetworkFee)"
            :asset-symbol="currentEvmTokenSymbol"
          />
          <!-- TODO: We don't need this block right now. How we should calculate the total? What for a case with not XOR asset (We can't just add it to soraNetworkFee as usual)? -->
          <!-- <info-line
            :label="t('bridge.total')"
            :tooltip-content="t('bridge.tooltipValue')"
            :value="`~${soraTotal}`"
            :asset-symbol="KnownSymbols.XOR"
          /> -->
        </div>
      </s-card>
      <select-registered-asset :visible.sync="showSelectTokenDialog" :asset="asset" @select="selectAsset" />
      <select-network :visible.sync="showSelectNetworkDialog" @select="selectNetwork" />
      <confirm-bridge-transaction-dialog :visible.sync="showConfirmTransactionDialog" :isInsufficientBalance="isInsufficientBalance" @confirm="confirmTransaction" />
    </s-form>
    <div v-if="!areNetworksConnected" class="bridge-footer">{{ t('bridge.connectWallets') }}</div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { RegisteredAccountAsset, BridgeNetworks, KnownSymbols, FPNumber, CodecString } from '@sora-substrate/util'

import BridgeMixin from '@/components/mixins/BridgeMixin'
import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'
import router, { lazyComponent } from '@/router'
import { Components, PageNames, EvmSymbol, ZeroStringValue } from '@/consts'
import { SubNetwork } from '@/utils/web3-util'
import {
  isXorAccountAsset,
  hasInsufficientBalance,
  hasInsufficientXorForFee,
  hasInsufficientEvmNativeTokenForFee,
  getMaxValue,
  formatAssetSymbol,
  getAssetBalance,
  findAssetInCollection,
  asZeroValue,
  isEthereumAddress
} from '@/utils'
import { bridgeApi } from '@/utils/bridge'

const namespace = 'bridge'

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    TokenLogo: lazyComponent(Components.TokenLogo),
    InfoLine: lazyComponent(Components.InfoLine),
    SelectNetwork: lazyComponent(Components.SelectNetwork),
    SelectRegisteredAsset: lazyComponent(Components.SelectRegisteredAsset),
    ConfirmBridgeTransactionDialog: lazyComponent(Components.ConfirmBridgeTransactionDialog),
    ToggleTextButton: lazyComponent(Components.ToggleTextButton)
  }
})
export default class Bridge extends Mixins(
  BridgeMixin,
  TranslationMixin,
  LoadingMixin,
  NetworkFormatterMixin,
  NumberFormatterMixin
) {
  @Action('setSoraToEvm', { namespace }) setSoraToEvm
  @Action('setEvmNetwork', { namespace: 'web3' }) setEvmNetwork
  @Action('setAssetAddress', { namespace }) setAssetAddress
  @Action('setAmount', { namespace }) setAmount
  @Action('resetBridgeForm', { namespace }) resetBridgeForm
  @Action('resetBalanceSubscription', { namespace }) resetBalanceSubscription
  @Action('getNetworkFee', { namespace }) getNetworkFee

  @Getter('evmBalance', { namespace: 'web3' }) evmBalance!: CodecString
  @Getter('evmNetwork', { namespace: 'web3' }) evmNetwork!: BridgeNetworks
  @Getter('subNetworks', { namespace: 'web3' }) subNetworks!: Array<SubNetwork>
  @Getter('defaultNetworkType', { namespace: 'web3' }) defaultNetworkType!: string
  @Getter('isTransactionConfirmed', { namespace }) isTransactionConfirmed!: boolean
  @Getter('isValidNetworkType', { namespace: 'web3' }) isValidNetworkType!: boolean
  @Getter('isSoraToEvm', { namespace }) isSoraToEvm!: boolean
  @Getter('registeredAssets', { namespace: 'assets' }) registeredAssets!: Array<RegisteredAccountAsset>
  @Getter('asset', { namespace }) asset!: any
  @Getter('tokenXOR', { namespace: 'assets' }) tokenXOR!: any
  @Getter('amount', { namespace }) amount!: string
  @Getter('soraNetworkFee', { namespace }) soraNetworkFee!: CodecString
  @Getter('evmNetworkFee', { namespace }) evmNetworkFee!: CodecString

  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean

  EvmSymbol = EvmSymbol
  KnownSymbols = KnownSymbols
  formatAssetSymbol = formatAssetSymbol
  inputPlaceholder = ZeroStringValue
  isFieldAmountFocused = false
  showSelectTokenDialog = false
  showSelectNetworkDialog = false
  showConfirmTransactionDialog = false

  get isNetworkAConnected () {
    return this.isSoraToEvm ? this.isSoraAccountConnected : this.isExternalAccountConnected
  }

  get isNetworkBConnected () {
    return this.isSoraToEvm ? this.isExternalAccountConnected : this.isSoraAccountConnected
  }

  get isZeroAmount (): boolean {
    return +this.amount === 0
  }

  get isMaxAvailable (): boolean {
    if (!this.areNetworksConnected || !this.isRegisteredAsset) {
      return false
    }
    const balance = getAssetBalance(this.asset, { internal: this.isSoraToEvm })
    if (asZeroValue(balance)) {
      return false
    }
    const decimals = this.asset.decimals
    const fpBalance = this.getFPNumberFromCodec(balance, decimals)
    const fpAmount = this.getFPNumber(this.amount, decimals)
    // TODO: Check if we have appropriate network fee currency (XOR/ETH) for both networks
    if (isXorAccountAsset(this.asset) && this.isSoraToEvm) {
      const fpFee = this.getFPNumberFromCodec(this.soraNetworkFee, decimals)
      return !FPNumber.eq(fpFee, fpBalance.sub(fpAmount)) && FPNumber.gt(fpBalance, fpFee)
    }
    if (isEthereumAddress(this.asset.externalAddress) && !this.isSoraToEvm) {
      const fpFee = this.getFPNumberFromCodec(this.evmNetworkFee)
      return !FPNumber.eq(fpFee, fpBalance.sub(fpAmount)) && FPNumber.gt(fpBalance, fpFee)
    }
    return !FPNumber.eq(fpBalance, fpAmount)
  }

  get isInsufficientXorForFee (): boolean {
    return hasInsufficientXorForFee(this.tokenXOR, this.soraNetworkFee)
  }

  get isInsufficientEvmNativeTokenForFee (): boolean {
    return hasInsufficientEvmNativeTokenForFee(this.evmBalance, this.evmNetworkFee)
  }

  get isInsufficientBalance (): boolean {
    const fee = this.isSoraToEvm ? this.soraNetworkFee : this.evmNetworkFee

    return this.isNetworkAConnected && this.isRegisteredAsset && hasInsufficientBalance(this.asset, this.amount, fee, !this.isSoraToEvm)
  }

  get inputClasses (): string {
    const inputClass = 's-input-amount'
    const classes = [inputClass]

    if (!this.isZeroAmount) {
      classes.push(`${inputClass}--filled`)
    }

    return classes.join(' ')
  }

  get isAssetSelected (): boolean {
    return !!this.asset
  }

  get isRegisteredAsset (): boolean {
    return !!findAssetInCollection(this.asset, this.registeredAssets)
  }

  get assetSymbol (): string {
    return this.asset?.symbol ?? ''
  }

  get formattedSoraNetworkFee (): string {
    return this.formatCodecNumber(this.soraNetworkFee)
  }

  get formattedEvmNetworkFee (): string {
    return this.formatCodecNumber(this.evmNetworkFee)
  }

  get currentEvmTokenSymbol (): string {
    if (this.evmNetwork === BridgeNetworks.ENERGY_NETWORK_ID) {
      return this.EvmSymbol.VT
    }
    return this.EvmSymbol.ETH
  }

  formatFee (fee: string, formattedFee: string): string {
    if (!fee) {
      return '-'
    }
    if (fee === '0') {
      return fee
    }
    return `~${formattedFee}`
  }

  formatBalance (isSora = true): string {
    if (!this.isRegisteredAsset) {
      return '-'
    }
    const balance = getAssetBalance(this.asset, { internal: isSora })
    if (!balance) {
      return '-'
    }
    const decimals = isSora ? this.asset.decimals : undefined
    return this.formatCodecNumber(balance, decimals)
  }

  created (): void {
    this.setAmount('') // reset fields
    this.resetBridgeForm(!!router.currentRoute.params?.address)
    this.withApi(async () => {
      await this.getRegisteredAssets()
      this.getNetworkFees()
    })
  }

  destroyed (): void {
    this.resetBalanceSubscription()
  }

  getBridgeItemTitle (isBTitle = false): string {
    if (this.isSoraToEvm) {
      return this.t(this.formatNetwork(!isBTitle))
    }
    return this.t(this.formatNetwork(isBTitle))
  }

  handleBlur (): void {
    this.isFieldAmountFocused = false
  }

  handleFocus (): void {
    this.isFieldAmountFocused = true
  }

  handleSwitchItems (): void {
    this.setSoraToEvm(!this.isSoraToEvm)
    this.getNetworkFees()
  }

  handleMaxValue (): void {
    if (this.asset && this.isRegisteredAsset) {
      const fee = this.isSoraToEvm ? this.soraNetworkFee : this.evmNetworkFee
      const max = getMaxValue(this.asset, fee, !this.isSoraToEvm)
      this.setAmount(max)
    }
  }

  async handleConfirmTransaction (): Promise<void> {
    await this.checkConnectionToExternalAccount(() => {
      this.showConfirmTransactionDialog = true
    })
  }

  handleViewTransactionsHistory (): void {
    router.push({ name: PageNames.BridgeTransactionsHistory })
  }

  handleChangeNetwork (): void {
    this.showSelectNetworkDialog = true
  }

  openSelectAssetDialog (): void {
    this.showSelectTokenDialog = true
  }

  async selectNetwork (network: number): Promise<void> {
    await this.setEvmNetwork(network)
  }

  async selectAsset (selectedAsset: any): Promise<void> {
    if (selectedAsset) {
      await this.setAssetAddress(selectedAsset?.address ?? '')
      this.getNetworkFees()
    }
  }

  async confirmTransaction (isTransactionConfirmed: boolean): Promise<void> {
    if (!isTransactionConfirmed) return

    await this.checkConnectionToExternalAccount(() => {
      router.push({ name: PageNames.BridgeTransaction })
    })
  }

  private getNetworkFees (): void {
    if (this.isRegisteredAsset) {
      this.getNetworkFee()
      this.getEvmNetworkFee()
    }
  }
}
</script>

<style lang="scss">
$bridge-input-class: ".el-input";
$bridge-input-color: var(--s-color-base-content-tertiary);

.bridge {
  &-content > .el-card__body {
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
  .s-button--switch {
    @include switch-button-inherit-styles('medium');
  }
  &-form {
    @include bridge-container;
    .s-input.s-input-amount {
      position: relative;
      &--filled {
        &:not(.s-disabled) {
          color: var(--s-color-base-content-primary);
        }
        &.s-disabled {
          color: $bridge-input-color;
        }
      }
      #{$bridge-input-class} {
        #{$bridge-input-class}__inner {
          padding-top: 0;
          @include text-ellipsis;
        }
      }
      #{$bridge-input-class}__inner {
        padding-right: 0;
        padding-left: 0;
        border-radius: 0 !important;
        color: inherit;
        @include input-font-styles;
        &, &:hover, &:focus {
          background-color: transparent;
          border-color: transparent;
        }
        &:disabled {
          color: var(--s-color-base-content-tertiary);
        }
        &:not(:disabled) {
          &:hover, &:focus {
            color: var(--s-color-base-content-primary);
          }
        }
        &::placeholder {
          color: var(--s-color-base-content-tertiary);
        }
      }
      .s-placeholder {
        display: none;
      }
    }
  }
}
</style>

<style lang="scss" scoped>
.bridge {
  flex-direction: column;
  align-items: center;
  &-content {
    @include bridge-content;
  }
  @include token-styles;
  @include vertical-divider('s-button--switch', $inner-spacing-medium);
  .s-button--switch {
    @include switch-button(var(--s-size-medium));
  }
  .bridge-item {
    margin-bottom: $inner-spacing-mini;
    background-color: var(--s-color-base-background);
    &,
    &:hover {
      border: none;
    }
    @include generic-input-lines('bridge-item');
    &-title,
    .el-button--change-wallet {
      margin-right: $inner-spacing-medium;
    }
    &-title {
      display: flex;
      flex-wrap: nowrap;
      align-items: center;
      cursor: pointer;
      &-label {
        margin-right: $inner-spacing-mini / 2;
        & + span {
          color: var(--s-color-base-content-tertiary);
          white-space: nowrap;
        }
      }
      .s-icon {
        &-sora, &-eth {
          margin-top: $inner-spacing-mini / 4;
          margin-left: $inner-spacing-mini / 4;
        }
      }
    }
    &--evm {
      .el-button {
        @include evm-logo-styles;
      }
      .el-button--choose-token {
        cursor: initial;
      }
    }
    .el-form-item {
      margin-bottom: 0;
      margin-right: $inner-spacing-mini;
      width: 100%;
    }
    .s-input {
      min-height: 0;
      font-feature-settings: $s-font-feature-settings-title;
    }
    .asset {
      display: flex;
      align-items: center;
      &-logo {
        margin-right: $inner-spacing-mini;
      }
    }
    &-footer {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      padding-bottom: $inner-spacing-mini;
      background-color: var(--s-color-base-background);
      color: var(--s-color-base-content-secondary);
      .el-divider {
        margin-top: 0;
        margin-bottom: $inner-spacing-mini;
        width: 100%;
        background-color: var(--s-color-base-border-primary);
      }
    }
    & + .bridge-info {
      margin-top: $basic-spacing * 2;
    }
  }
  .s-button--switch {
    margin-left: auto;
    margin-right: auto;
    display: block;
  }
  &-footer {
    display: flex;
    align-items: center;
    margin-top: $inner-spacing-medium;
    font-size: var(--s-font-size-mini);
    line-height: $s-line-height-big;
    color: var(--s-color-base-content-secondary);
    font-feature-settings: $s-font-feature-settings-common;
  }
  .s-tertiary {
    padding: $inner-spacing-mini / 2 $inner-spacing-mini / 2 $inner-spacing-mini / 2 $inner-spacing-mini;
  }
  @include buttons;

  .el-button {
    &--connect {
      margin: $inner-spacing-mini $inner-spacing-small $inner-spacing-small;
      width: calc(100% - #{$inner-spacing-small * 2});
    }
    &--change-wallet {
      padding: 0;
      color: inherit;
      font-size: inherit;
      line-height: inherit;
      span {
        font-weight: 400 !important;
      }
      .change-wallet {
        display: none;
      }
      &:hover {
        .bridge-item-id {
          display: none;
        }
        .change-wallet {
          display: inline-block;
          text-decoration: underline;
        }
      }
    }
    &--next {
      margin-top: $inner-spacing-mini;
      width: 100%;
    }
  }
  .el-button--history {
    margin-left: auto;
  }
}
</style>
