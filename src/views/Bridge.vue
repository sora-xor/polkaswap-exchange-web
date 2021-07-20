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
          :decimals="(asset || {}).externalDecimals"
          :delimiters="delimiters"
          :max="getMax((asset || {}).address)"
          :class="inputClasses"
          :disabled="!areNetworksConnected || !isAssetSelected"
          has-locale-string
          size="medium"
          @input="setAmount"
          @focus="handleFocus"
          @blur="handleBlur"
        >
          <div slot="top" class="input-line">
            <div class="input-title">
              <span class="input-title--uppercase input-title--primary">{{ t('transfers.from') }}</span>
              <span>{{ getBridgeItemTitle() }}</span>
              <i :class="`s-icon-${isSoraToEvm ? 'sora' : getEvmIcon(evmNetwork)}`" />
            </div>
            <div v-if="isNetworkAConnected && isAssetSelected" class="input-title">
              <span class="input-title--uppercase">{{ t('bridge.balance') }}</span>
              <span class="input-title--uppercase input-title--primary">{{ formatBalance(isSoraToEvm) }}</span>
            </div>
          </div>
          <div slot="right" v-if="isNetworkAConnected" class="s-flex el-buttons">
            <s-button v-if="isMaxAvailable" class="el-button--max s-typography-button--small" type="primary" alternative size="mini" border-radius="mini" @click="handleMaxValue">
              {{ t('buttons.max') }}
            </s-button>
            <token-select-button class="el-button--select-token" icon="chevron-down-rounded-16" :token="asset" @click="openSelectAssetDialog" />
          </div>
          <template #bottom>
            <div class="input-line input-line--footer">
              <token-address v-if="isAssetSelected" v-bind="asset" :external="!isSoraToEvm" class="input-title" />
            </div>
            <s-button v-if="!isNetworkAConnected" class="el-button--connect s-typography-button--large" type="primary" @click="isSoraToEvm ? connectInternalWallet() : connectExternalWallet()">
              {{ t('bridge.connectWallet') }}
            </s-button>
          </template>
        </s-float-input>

        <s-button class="s-button--switch" type="action" icon="arrows-swap-90-24" @click="handleSwitchItems" />

        <s-float-input
          :value="amount"
          :decimals="(asset || {}).externalDecimals"
          :delimiters="delimiters"
          :max="getMax((asset || {}).address)"
          :class="inputClasses"
          has-locale-string
          size="medium"
          disabled
        >
          <div slot="top" class="input-line">
            <div class="input-title" @click="handleChangeNetwork">
              <span class="input-title--uppercase input-title--primary">{{ t('transfers.to') }}</span>
              <span>{{ getBridgeItemTitle(true) }}</span>
              <i :class="`s-icon-${!isSoraToEvm ? 'sora' : getEvmIcon(evmNetwork)}`" />
            </div>
            <div v-if="isNetworkAConnected && isAssetSelected" class="input-title">
              <span class="input-title--uppercase">{{ t('bridge.balance') }}</span>
              <span class="input-title--uppercase input-title--primary">{{ formatBalance(!isSoraToEvm) }}</span>
            </div>
          </div>
          <div slot="right" v-if="isNetworkAConnected && isAssetSelected" class="s-flex el-buttons">
            <token-select-button class="el-button--select-token" :token="asset" />
          </div>
          <template #bottom>
            <div class="input-line input-line--footer">
              <token-address v-if="isAssetSelected" v-bind="asset" :external="isSoraToEvm" class="input-title" />
            </div>
            <div v-if="isNetworkBConnected && isSoraToEvm" class="bridge-item-footer">
              <s-divider />
              <span>{{ formatAddress(isSoraToEvm ? evmAddress : getWalletAddress(), 8) }}</span>
              <span>{{ t('bridge.connected') }}</span>
            </div>
            <s-button v-else-if="!isNetworkBConnected" class="el-button--connect s-typography-button--large" type="primary" @click="!isSoraToEvm ? connectInternalWallet() : connectExternalWallet()">
              {{ t('bridge.connectWallet') }}
            </s-button>
          </template>
        </s-float-input>

        <s-button
          class="el-button--next s-typography-button--large"
          type="primary"
          :disabled="!isAssetSelected || !areNetworksConnected || !isValidNetworkType || !isAssetSelected || isZeroAmount || isInsufficientXorForFee || isInsufficientEvmNativeTokenForFee || isInsufficientBalance || !isRegisteredAsset || feesFetching"
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
      <!-- <select-network :visible.sync="showSelectNetworkDialog" :value="evmNetwork" :sub-networks="subNetworks" @input="selectNetwork" /> -->
      <confirm-bridge-transaction-dialog :visible.sync="showConfirmTransactionDialog" :isInsufficientBalance="isInsufficientBalance" @confirm="confirmTransaction" />
    </s-form>
    <div v-if="!areNetworksConnected" class="bridge-footer">{{ t('bridge.connectWallets') }}</div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { RegisteredAccountAsset, BridgeNetworks, KnownSymbols, FPNumber, CodecString } from '@sora-substrate/util'

import BridgeMixin from '@/components/mixins/BridgeMixin'
import NetworkFormatterMixin from '@/components/mixins/NetworkFormatterMixin'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'

import router, { lazyComponent } from '@/router'
import { Components, PageNames, EvmSymbol } from '@/consts'
import { SubNetwork } from '@/utils/ethers-util'
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
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    TokenAddress: lazyComponent(Components.TokenAddress)
  }
})
export default class Bridge extends Mixins(
  BridgeMixin,
  TranslationMixin,
  NetworkFormatterMixin,
  NumberFormatterMixin
) {
  @Action('setSoraToEvm', { namespace }) setSoraToEvm
  @Action('setEvmNetwork', { namespace: 'web3' }) setEvmNetwork
  @Action('setAssetAddress', { namespace }) setAssetAddress
  @Action('setAmount', { namespace }) setAmount
  @Action('resetBridgeForm', { namespace }) resetBridgeForm
  @Action('resetBalanceSubscription', { namespace }) resetBalanceSubscription!: () => Promise<void>
  @Action('updateBalanceSubscription', { namespace }) updateBalanceSubscription!: () => Promise<void>
  @Action('getNetworkFee', { namespace }) getNetworkFee!: () => Promise<void>

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
  @Getter nodeIsConnected!: boolean

  @Watch('nodeIsConnected')
  private updateConnectionSubsriptions (nodeConnected: boolean) {
    if (nodeConnected) {
      this.updateBalanceSubscription()
    } else {
      this.resetBalanceSubscription()
    }
  }

  readonly delimiters = FPNumber.DELIMITERS_CONFIG

  EvmSymbol = EvmSymbol
  KnownSymbols = KnownSymbols
  formatAssetSymbol = formatAssetSymbol
  isFieldAmountFocused = false
  showSelectTokenDialog = false
  showSelectNetworkDialog = false
  showConfirmTransactionDialog = false
  feesFetching = false

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

  async onEvmNetworkChange (network: number): Promise<void> {
    await Promise.all([
      this.setEvmNetwork(network),
      this.getRegisteredAssets(),
      this.getNetworkFees()
    ])
  }

  created (): void {
    // we should reset data only on created, because it's used on another bridge views
    this.resetBridgeForm(!!router.currentRoute.params?.address)
    this.withApi(async () => {
      await this.onEvmNetworkChange(bridgeApi.externalNetwork)
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

  async handleSwitchItems (): Promise<void> {
    this.setSoraToEvm(!this.isSoraToEvm)
    await this.getNetworkFees()
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
    this.showSelectNetworkDialog = false
    await this.onEvmNetworkChange(network)
  }

  async selectAsset (selectedAsset: any): Promise<void> {
    if (selectedAsset) {
      await this.setAssetAddress(selectedAsset?.address ?? '')
      await this.getNetworkFees()
    }
  }

  async confirmTransaction (isTransactionConfirmed: boolean): Promise<void> {
    if (!isTransactionConfirmed) return

    await this.checkConnectionToExternalAccount(() => {
      router.push({ name: PageNames.BridgeTransaction })
    })
  }

  private async getNetworkFees (): Promise<void> {
    if (this.isRegisteredAsset) {
      this.feesFetching = true
      await Promise.all([
        this.getNetworkFee(),
        this.getEvmNetworkFee()
      ])
      this.feesFetching = false
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
  }
  @include generic-input-lines;
  @include token-styles;
  @include vertical-divider('s-button--switch', $inner-spacing-medium);

  .bridge-item {
    &-footer {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      font-size: var(--s-font-size-mini);
      letter-spacing: var(--s-letter-spacing-mini);
      line-height: var(--s-line-height-medium);
      color: var(--s-color-base-content-primary);

      .el-divider {
        margin-top: $inner-spacing-mini;
        margin-bottom: $inner-spacing-mini;
        width: 100%;
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
    line-height: var(--s-line-height-big);
    color: var(--s-color-base-content-secondary);
  }

  @include buttons;

  .el-button {
    &--connect {
      margin-top: $inner-spacing-mini;
      width: 100%;
    }
    &--next {
      margin-top: $inner-spacing-medium;
      width: 100%;
    }
  }
  .el-button--history {
    margin-left: auto;
  }
}
</style>
