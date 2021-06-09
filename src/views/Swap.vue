<template>
  <s-form v-loading="parentLoading" class="container el-form--actions" :show-message="false">
    <generic-page-header class="page-header--swap" :title="t('exchange.Swap')">
      <status-action-badge v-if="pairLiquiditySourcesAvailable">
        <template #label>{{ t('marketText') }}:</template>
        <template #value>{{ marketAlgorithm }}</template>
        <template #action>
          <s-button
            class="el-button--settings"
            type="action"
            icon="basic-settings-24"
            @click="openSettingsDialog"
          />
        </template>
      </status-action-badge>
    </generic-page-header>
    <s-float-input
      class="s-input--token-value"
      size="medium"
      :value="fromValue"
      :decimals="(tokenFrom || {}).decimals"
      has-locale-string
      :delimiters="delimiters"
      :max="getMax((tokenFrom || {}).address)"
      @input="handleInputFieldFrom"
      @focus="handleFocusField(false)"
    >
      <div slot="top" class="input-line">
        <div class="input-title">
          <span>{{ t('transfers.from') }}</span>
          <span :class="`input-title-estimated ${(areTokensSelected && !isZeroToAmount && isExchangeB) ? 'input-title-estimated--show' : ''}`">
            ({{ t('swap.estimated') }})
          </span>
        </div>
        <div v-if="isLoggedIn && tokenFrom && tokenFrom.balance" class="token-balance">
          <span class="token-balance-title">{{ t('exchange.balance') }}</span>
          <span class="token-balance-value">{{ formatBalance(tokenFrom) }}</span>
        </div>
      </div>
      <div slot="right" class="s-flex el-buttons">
        <s-button v-if="tokenFrom && isMaxSwapAvailable" class="el-button--max" type="tertiary" size="mini" border-radius="mini" @click="handleMaxValue">
          {{ t('buttons.max') }}
        </s-button>
        <token-select-button class="el-button--select-token" icon="chevron-down-rounded-16" :token="tokenFrom" @click="openSelectTokenDialog(true)" />
      </div>
    </s-float-input>
    <s-button class="el-button--switch-tokens" type="action" icon="arrows-swap-90-24" :disabled="!areTokensSelected || isRecountingProcess" @click="handleSwitchTokens" />
    <s-float-input
      class="s-input--token-value"
      size="medium"
      :value="toValue"
      :decimals="(tokenTo || {}).decimals"
      has-locale-string
      :delimiters="delimiters"
      :max="getMax((tokenTo || {}).address)"
      @input="handleInputFieldTo"
      @focus="handleFocusField(true)"
    >
      <div slot="top" class="input-line">
        <div class="input-title">
          <span>{{ t('transfers.to') }}</span>
          <span :class="`input-title-estimated ${(areTokensSelected && !isZeroFromAmount && !isExchangeB) ? 'input-title-estimated--show' : ''}`">
            ({{ t('swap.estimated') }})
          </span>
        </div>
        <div v-if="isLoggedIn && tokenTo && tokenTo.balance" class="token-balance">
          <span class="token-balance-title">{{ t('exchange.balance') }}</span>
          <span class="token-balance-value">{{ formatBalance(tokenTo) }}</span>
        </div>
      </div>
      <div slot="right" class="s-flex el-buttons">
        <token-select-button class="el-button--select-token" icon="chevron-down-rounded-16" :token="tokenTo" @click="openSelectTokenDialog(false)" />
      </div>
    </s-float-input>
    <slippage-tolerance class="slippage-tolerance-settings" />
    <swap-info v-if="areTokensSelected && !hasZeroAmount" class="info-line-container" />
    <s-button v-if="!isLoggedIn" type="primary" @click="handleConnectWallet">
      {{ t('swap.connectWallet') }}
    </s-button>
    <s-button
      v-else
      type="primary"
      :disabled="!areTokensSelected || !isAvailable || hasZeroAmount || isInsufficientLiquidity || isInsufficientAmount || isInsufficientBalance || isInsufficientXorForFee" @click="handleConfirmSwap"
      :loading="isRecountingProcess || isAvailableChecking"
      class="s-typography-button--big"
    >
      <template v-if="!areTokensSelected">
        {{ t('buttons.chooseTokens') }}
      </template>
      <template v-else-if="!isAvailable">
        {{ t('swap.pairIsNotCreated') }}
      </template>
      <template v-else-if="areZeroAmounts">
        {{ t('buttons.enterAmount') }}
      </template>
      <template v-else-if="isAvailable && isInsufficientLiquidity">
        {{ t('swap.insufficientLiquidity') }}
      </template>
      <template v-else-if="isInsufficientAmount">
        {{ t('swap.insufficientAmount', { tokenSymbol: insufficientAmountTokenSymbol }) }}
      </template>
      <template v-else-if="isInsufficientBalance">
        {{ t('exchange.insufficientBalance', { tokenSymbol: tokenFrom.symbol }) }}
      </template>
      <template v-else-if="isInsufficientXorForFee">
        {{ t('exchange.insufficientBalance', { tokenSymbol: KnownSymbols.XOR }) }}
      </template>
      <template v-else>
        {{ t('exchange.Swap') }}
      </template>
    </s-button>
    <select-token :visible.sync="showSelectTokenDialog" :connected="isLoggedIn" :asset="isTokenFromSelected ? tokenTo : tokenFrom" @select="selectToken" />
    <confirm-swap :visible.sync="showConfirmSwapDialog" :isInsufficientBalance="isInsufficientBalance" @confirm="confirmSwap" />
    <settings-dialog :visible.sync="showSettings" />
  </s-form>
</template>

<script lang="ts">
import { Component, Mixins, Watch, Prop } from 'vue-property-decorator'
import { Action, Getter, State } from 'vuex-class'
import { api } from '@soramitsu/soraneo-wallet-web'
import { KnownAssets, KnownSymbols, CodecString, AccountAsset, LiquiditySourceTypes, LPRewardsInfo, FPNumber } from '@sora-substrate/util'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'

import { isMaxButtonAvailable, getMaxValue, hasInsufficientBalance, hasInsufficientXorForFee, asZeroValue, formatAssetBalance, debouncedInputHandler } from '@/utils'
import router, { lazyComponent } from '@/router'
import { Components, PageNames } from '@/consts'

const namespace = 'swap'

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    SettingsDialog: lazyComponent(Components.SettingsDialog),
    SlippageTolerance: lazyComponent(Components.SlippageTolerance),
    SwapInfo: lazyComponent(Components.SwapInfo),
    TokenLogo: lazyComponent(Components.TokenLogo),
    SelectToken: lazyComponent(Components.SelectToken),
    ConfirmSwap: lazyComponent(Components.ConfirmSwap),
    StatusActionBadge: lazyComponent(Components.StatusActionBadge),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton)
  }
})
export default class Swap extends Mixins(TranslationMixin, LoadingMixin, NumberFormatterMixin) {
  @Getter isLoggedIn!: boolean
  @Getter slippageTolerance!: number
  @Getter('tokenXOR', { namespace: 'assets' }) tokenXOR!: AccountAsset
  @Getter('tokenFrom', { namespace }) tokenFrom!: AccountAsset
  @Getter('tokenTo', { namespace }) tokenTo!: AccountAsset
  @Getter('fromValue', { namespace }) fromValue!: string
  @Getter('toValue', { namespace }) toValue!: string
  @Getter('isExchangeB', { namespace }) isExchangeB!: boolean
  @Getter('networkFee', { namespace }) networkFee!: CodecString
  @Getter('liquidityProviderFee', { namespace }) liquidityProviderFee!: CodecString
  @Getter('isAvailable', { namespace }) isAvailable!: boolean
  @Getter('isAvailableChecking', { namespace }) isAvailableChecking!: boolean
  @Getter('swapLiquiditySource', { namespace }) liquiditySource!: LiquiditySourceTypes
  @Getter('pairLiquiditySourcesAvailable', { namespace }) pairLiquiditySourcesAvailable!: boolean

  @Action('setTokenFromAddress', { namespace }) setTokenFromAddress!: (address?: string) => Promise<void>
  @Action('setTokenToAddress', { namespace }) setTokenToAddress!: (address?: string) => Promise<void>
  @Action('setFromValue', { namespace }) setFromValue!: (value: string) => Promise<void>
  @Action('setToValue', { namespace }) setToValue!: (value: string) => Promise<void>
  @Action('setMinMaxReceived', { namespace }) setMinMaxReceived!: (value: CodecString) => Promise<void>
  @Action('setExchangeB', { namespace }) setExchangeB!: (isExchangeB: boolean) => Promise<void>
  @Action('setLiquidityProviderFee', { namespace }) setLiquidityProviderFee!: (value: CodecString) => Promise<void>
  @Action('setNetworkFee', { namespace }) setNetworkFee!: (value: CodecString) => Promise<void>
  @Action('checkSwap', { namespace }) checkSwap!: () => Promise<void>
  @Action('reset', { namespace }) reset!: () => void
  @Action('getPrices', { namespace: 'prices' }) getPrices!: (options: any) => Promise<void>
  @Action('resetPrices', { namespace: 'prices' }) resetPrices!: () => Promise<void>
  @Action('getAssets', { namespace: 'assets' }) getAssets
  @Action('setPairLiquiditySources', { namespace }) setPairLiquiditySources!: (liquiditySources: Array<LiquiditySourceTypes>) => Promise<void>
  @Action('setRewards', { namespace }) setRewards!: (rewards: Array<LPRewardsInfo>) => Promise<void>

  @State(state => state.settings.marketAlgorithm) marketAlgorithm!: string

  @Watch('slippageTolerance')
  private handleSlippageToleranceChange (): void {
    this.calcMinMaxRecieved()
  }

  @Watch('liquiditySource')
  private handleLiquiditySourceChange (): void {
    this.recountSwapValues()
  }

  @Watch('isLoggedIn')
  private handleLoggedInStateChange (isLoggedIn: boolean, wasLoggedIn: boolean): void {
    if (!wasLoggedIn && isLoggedIn) {
      this.getNetworkFee()
      this.recountSwapValues()
    }
  }

  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean

  readonly delimiters = FPNumber.DELIMITERS_CONFIG
  KnownSymbols = KnownSymbols
  isInsufficientAmount = false
  insufficientAmountTokenSymbol = ''
  isTokenFromSelected = false
  showSettings = false
  showSelectTokenDialog = false
  showConfirmSwapDialog = false
  isRecountingProcess = false

  get areTokensSelected (): boolean {
    return !!(this.tokenFrom && this.tokenTo)
  }

  get isZeroFromAmount (): boolean {
    return asZeroValue(this.fromValue)
  }

  get isZeroToAmount (): boolean {
    return asZeroValue(this.toValue)
  }

  get hasZeroAmount (): boolean {
    return this.isZeroFromAmount || this.isZeroToAmount
  }

  get areZeroAmounts (): boolean {
    return this.isZeroFromAmount && this.isZeroToAmount
  }

  get isXorOutputSwap (): boolean {
    return this.tokenTo?.address === KnownAssets.get(KnownSymbols.XOR)?.address
  }

  get isMaxSwapAvailable (): boolean {
    return this.isLoggedIn && isMaxButtonAvailable(this.areTokensSelected, this.tokenFrom, this.fromValue, this.networkFee, this.tokenXOR, false, this.isXorOutputSwap)
  }

  get preparedForSwap (): boolean {
    return this.isLoggedIn && this.areTokensSelected
  }

  get isInsufficientLiquidity (): boolean {
    return this.isAvailable && this.preparedForSwap && !this.areZeroAmounts && this.hasZeroAmount && asZeroValue(this.liquidityProviderFee)
  }

  get isInsufficientBalance (): boolean {
    return this.preparedForSwap && hasInsufficientBalance(this.tokenFrom, this.fromValue, this.networkFee)
  }

  get isInsufficientXorForFee (): boolean {
    const isInsufficientXorForFee = this.preparedForSwap && hasInsufficientXorForFee(this.tokenXOR, this.networkFee, this.isXorOutputSwap)
    if (isInsufficientXorForFee || !this.isXorOutputSwap) {
      return isInsufficientXorForFee
    }
    // It's required for XOR output without XOR or with XOR balance < network fee
    const zero = this.getFPNumber(0, this.tokenXOR.decimals)
    const xorBalance = this.getFPNumberFromCodec(this.tokenXOR.balance.transferable, this.tokenXOR.decimals)
    const fpNetworkFee = this.getFPNumberFromCodec(this.networkFee, this.tokenXOR.decimals).sub(xorBalance)
    const fpAmount = this.getFPNumber(this.toValue, this.tokenXOR.decimals).sub(FPNumber.gt(fpNetworkFee, zero) ? fpNetworkFee : zero)
    return FPNumber.lte(fpAmount, zero)
  }

  created () {
    this.withApi(async () => {
      await this.getAssets()
      if (!this.tokenFrom) {
        const xorAddress = KnownAssets.get(KnownSymbols.XOR)?.address
        await this.setTokenFromAddress(xorAddress)
        await this.setTokenToAddress()
      }
      if (this.areTokensSelected) {
        await this.checkSwap()
      }
      await Promise.all([
        this.updatePairLiquiditySources(),
        this.getNetworkFee()
      ])
    })
  }

  destroyed () {
    this.reset()
  }

  formatBalance (token): string {
    return formatAssetBalance(token)
  }

  resetFieldFrom (): void {
    this.setFromValue('')
  }

  resetFieldTo (): void {
    this.setToValue('')
  }

  async getNetworkFee (): Promise<void> {
    if (this.isLoggedIn) {
      const networkFee = await api.getSwapNetworkFee(
        this.tokenFrom?.address,
        this.tokenTo?.address,
        this.fromValue,
        this.toValue,
        this.slippageTolerance,
        this.isExchangeB,
        this.liquiditySource
      )
      this.setNetworkFee(networkFee)
    }
  }

  async updatePairLiquiditySources (): Promise<void> {
    const isPair = !!this.tokenFrom?.address && !!this.tokenTo?.address

    const sources = isPair ? (await api.getListEnabledSourcesForPath(
      this.tokenFrom?.address,
      this.tokenTo?.address
    )) : []

    this.setPairLiquiditySources(sources)
  }

  async handleInputFieldFrom (value): Promise<any> {
    if (!this.areTokensSelected || asZeroValue(value)) {
      this.resetFieldTo()
    }

    if (value !== this.fromValue) {
      this.setFromValue(value)
      await this.recountSwapValues()
    }
  }

  async handleInputFieldTo (value): Promise<any> {
    if (!this.areTokensSelected || asZeroValue(value)) {
      this.resetFieldFrom()
    }

    if (value !== this.toValue) {
      this.setToValue(value)
      await this.recountSwapValues()
    }
  }

  private async runRecountSwapValues (): Promise<void> {
    const value = this.isExchangeB ? this.toValue : this.fromValue
    const setOppositeValue = this.isExchangeB ? this.setFromValue : this.setToValue
    const resetOppositeValue = this.isExchangeB ? this.resetFieldFrom : this.resetFieldTo
    const oppositeToken = this.isExchangeB ? this.tokenFrom : this.tokenTo

    if (!this.areTokensSelected || asZeroValue(value)) return

    try {
      this.isRecountingProcess = true
      this.isInsufficientAmount = false

      const { amount, fee, rewards } = await api.getSwapResult(this.tokenFrom.address, this.tokenTo.address, value, this.isExchangeB, this.liquiditySource)

      setOppositeValue(this.getStringFromCodec(amount, oppositeToken.decimals))
      this.setLiquidityProviderFee(fee)
      this.setRewards(rewards)

      await Promise.all([
        this.calcMinMaxRecieved(),
        this.updatePrices()
      ])
    } catch (error) {
      resetOppositeValue()
      if (!this.isInsufficientAmountError(oppositeToken.symbol as string, error.message)) {
        throw error
      }
    } finally {
      this.isRecountingProcess = false
    }
  }

  recountSwapValues = debouncedInputHandler(this.runRecountSwapValues)

  private async calcMinMaxRecieved (): Promise<void> {
    const amount = this.isExchangeB ? this.fromValue : this.toValue
    const minMaxReceived = await api.getMinMaxValue(this.tokenFrom?.address, this.tokenTo?.address, amount, this.slippageTolerance, this.isExchangeB)

    this.setMinMaxReceived(minMaxReceived)
  }

  private async updatePrices (): Promise<void> {
    if (this.areTokensSelected) {
      await this.getPrices({
        assetAAddress: this.tokenFrom.address,
        assetBAddress: this.tokenTo.address,
        amountA: this.fromValue,
        amountB: this.toValue
      })
    }
  }

  isInsufficientAmountError (tokenSymbol: string, errorMessage): boolean {
    // TODO: If an input field has too many symbols this is a way to avoid an error, find another approach later
    if (errorMessage.indexOf('invalid string input for fixed point number') !== -1) {
      this.isInsufficientAmount = true
      this.insufficientAmountTokenSymbol = tokenSymbol
      this.resetPrices()
    }
    return this.isInsufficientAmount
  }

  async handleFocusField (isExchangeB = false): Promise<void> {
    const isZeroValue = isExchangeB ? this.isZeroToAmount : this.isZeroFromAmount
    const prevFocus = this.isExchangeB

    this.setExchangeB(isExchangeB)

    if (isZeroValue) {
      this.resetFieldFrom()
      this.resetFieldTo()
    }

    if (prevFocus !== this.isExchangeB) {
      await this.recountSwapValues()
    }
  }

  async handleSwitchTokens (): Promise<void> {
    const [fromAddress, toAddress] = [this.tokenFrom.address, this.tokenTo.address]

    await this.setTokenFromAddress(toAddress)
    await this.setTokenToAddress(fromAddress)

    this.updatePairLiquiditySources()

    if (this.isExchangeB) {
      this.setExchangeB(false)
      await this.handleInputFieldFrom(this.toValue)
    } else {
      this.setExchangeB(true)
      await this.handleInputFieldTo(this.fromValue)
    }
  }

  async handleMaxValue (): Promise<void> {
    this.setExchangeB(false)

    const max = getMaxValue(this.tokenFrom, this.networkFee)

    this.handleInputFieldFrom(max)
  }

  handleConnectWallet (): void {
    router.push({ name: PageNames.Wallet })
  }

  openSelectTokenDialog (isTokenFrom: boolean): void {
    this.isTokenFromSelected = isTokenFrom
    this.showSelectTokenDialog = true
  }

  async selectToken (token: any): Promise<void> {
    if (token) {
      if (this.isTokenFromSelected) {
        await this.setTokenFromAddress(token.address)
      } else {
        await this.setTokenToAddress(token.address)
      }
      await Promise.all([
        this.checkSwap(),
        this.updatePairLiquiditySources()
      ])
      await this.recountSwapValues()
    }
  }

  handleConfirmSwap (): void {
    this.showConfirmSwapDialog = true
  }

  async confirmSwap (isSwapConfirmed: boolean): Promise<void> {
    if (isSwapConfirmed) {
      this.resetFieldFrom()
      this.resetFieldTo()
      this.resetPrices()
      await this.setExchangeB(false)
    }
  }

  openSettingsDialog (): void {
    this.showSettings = true
  }
}
</script>

<style lang="scss">
.el-form--actions {
  .s-input--token-value .el-input .el-input__inner {
    @include text-ellipsis;
    font-weight: 800;
  }
}
</style>

<style lang="scss" scoped>
.el-form--actions {
  @include generic-input-lines;
  @include buttons;
  @include full-width-button;
  @include vertical-divider('el-button--switch-tokens', $inner-spacing-medium);
}

.page-header--swap {
  justify-content: space-between;
  align-items: center;
}
</style>
