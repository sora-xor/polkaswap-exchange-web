<template>
  <s-form
    v-model="formModel"
    class="el-form--actions"
    :show-message="false"
  >
    <div class="input-container">
      <div class="input-line">
        <div class="input-title">
          <span>{{ t('exchange.from') }}</span>
          <span :class="`input-title-estimated ${(areTokensSelected && !isEmptyToAmount && !isFieldFromActive) ? 'input-title-estimated--show' : ''}`">({{ t('swap.estimated') }})</span>
        </div>
        <div v-if="this.connected && this.tokenFrom && this.tokenFrom.balance && this.isTokenFromBalanceAvailable" class="token-balance">
          <span class="token-balance-title">{{ t('exchange.balance') }}</span>
          <span class="token-balance-value">{{ tokenFromBalance }}</span>
        </div>
      </div>
      <div class="input-line">
        <s-form-item>
          <s-float-input
            class="s-input--token-value"
            :decimals="tokenFrom && tokenFrom.decimals"
            :value="formModel.from"
            @input="handleInputFieldFrom"
            @focus="handleFocusFieldFrom"
            @blur="handleBlurFieldFrom"
          />
        </s-form-item>
        <div v-if="tokenFrom" class="token">
          <s-button v-if="isMaxSwapAvailable" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleMaxValue">
            {{ t('exchange.max') }}
          </s-button>
          <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium" icon="chevron-bottom-rounded" icon-position="right" @click="openSelectTokenDialog(true)">
            <token-logo :token="tokenFrom" size="small" />
            {{ tokenFrom.symbol }}
          </s-button>
        </div>
        <s-button v-else class="el-button--empty-token" type="tertiary" size="small" border-radius="mini" icon="chevron-bottom-rounded" icon-position="right" @click="openSelectTokenDialog(true)">
          {{ t('exchange.chooseToken') }}
        </s-button>
      </div>
    </div>
    <s-button class="el-button--switch-tokens" type="action" icon="change-positions" :disabled="!areTokensSelected" @click="handleSwitchTokens" />
    <div class="input-container">
      <div class="input-line">
        <div class="input-title">
          <span>{{ t('exchange.to') }}</span>
          <span :class="`input-title-estimated ${(areTokensSelected && !isEmptyFromAmount && !isFieldToActive) ? 'input-title-estimated--show' : ''}`" class="input-title-estimated">({{ t('swap.estimated') }})</span>
        </div>
        <div v-if="this.connected && this.tokenTo && this.tokenTo.balance && this.isTokenToBalanceAvailable" class="token-balance">
          <span class="token-balance-title">{{ t('exchange.balance') }}</span>
          <span class="token-balance-value">{{ tokenToBalance }}</span>
        </div>
      </div>
      <div class="input-line">
        <s-form-item>
          <s-float-input
            class="s-input--token-value"
            :value="formModel.to"
            :decimals="tokenTo && tokenTo.decimals"
            @input="handleInputFieldTo"
            @focus="handleFocusFieldTo"
            @blur="handleBlurFieldTo"
          />
        </s-form-item>
        <div v-if="tokenTo" class="token">
          <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium" icon="chevron-bottom-rounded" icon-position="right" @click="openSelectTokenDialog">
            <token-logo :token="tokenTo" size="small" />
            {{ tokenTo.symbol }}
          </s-button>
        </div>
        <s-button v-else class="el-button--empty-token" type="tertiary" size="small" border-radius="mini" icon="chevron-bottom-rounded" icon-position="right" @click="openSelectTokenDialog">
          {{ t('exchange.chooseToken') }}
        </s-button>
      </div>
    </div>
    <swap-info v-if="areTokensSelected && !areZeroAmounts" :show-price="true" :show-slippage-tolerance="true" />
    <s-button v-if="!connected" type="primary" @click="handleConnectWallet">
      {{ t('swap.connectWallet') }}
    </s-button>
    <s-button v-else type="primary" :disabled="!areTokensSelected || areZeroAmounts || isInsufficientAmount || isInsufficientBalance" @click="handleConfirmSwap">
      <template v-if="!areTokensSelected || (isZeroFromAmount && isZeroToAmount)">
        {{ t('exchange.enterAmount') }}
      </template>
      <template v-else-if="isInsufficientLiquidity">
        {{ t('swap.insufficientLiquidity') }}
      </template>
      <template v-else-if="isInsufficientAmount">
        {{ t('swap.insufficientAmount', { tokenSymbol: insufficientAmountTokenSymbol }) }}
      </template>
      <template v-else-if="isInsufficientBalance">
        {{ t('exchange.insufficientBalance', { tokenSymbol: insufficientBalanceTokenSymbol }) }}
      </template>
      <template v-else>
        {{ t('exchange.Swap') }}
      </template>
    </s-button>
    <swap-info v-if="areTokensSelected && !areZeroAmounts" />
    <select-token :visible.sync="showSelectTokenDialog" :asset="isTokenFromSelected ? tokenTo : tokenFrom" @select="selectToken" />
    <confirm-swap :visible.sync="showConfirmSwapDialog" :isInsufficientBalance="isInsufficientBalance" @confirm="confirmSwap" @checkConfirm="updateAccountAssets" />
  </s-form>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { api } from '@soramitsu/soraneo-wallet-web'
import { KnownSymbols, FPNumber } from '@sora-substrate/util'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'

import { isWalletConnected, isXorAccountAsset, isMaxButtonAvailable, getMaxValue } from '@/utils'
import router, { lazyComponent } from '@/router'
import { Components, PageNames } from '@/consts'

@Component({
  components: {
    SwapInfo: lazyComponent(Components.SwapInfo),
    TokenLogo: lazyComponent(Components.TokenLogo),
    SelectToken: lazyComponent(Components.SelectToken),
    ConfirmSwap: lazyComponent(Components.ConfirmSwap)
  }
})
export default class Swap extends Mixins(TranslationMixin, LoadingMixin) {
  @Getter tokenXOR!: any
  @Getter tokenFrom!: any
  @Getter tokenTo!: any
  @Getter fromValue!: number
  @Getter toValue!: number
  @Getter isExchangeB!: boolean
  @Getter slippageTolerance!: number
  @Getter networkFee!: string
  @Getter liquidityProviderFee!: string
  @Action getTokenXOR
  @Action setTokenFrom
  @Action setTokenTo
  @Action setFromValue
  @Action setToValue
  @Action setTokenFromPrice
  @Action setMinMaxReceived
  @Action setLiquidityProviderFee
  @Action setNetworkFee
  @Action('getPrices', { namespace: 'prices' }) getPrices
  @Action('resetPrices', { namespace: 'prices' }) resetPrices

  @Watch('slippageTolerance')
  private handleSlippageToleranceChange (): void {
    this.recountSwapValues()
  }

  isTokenFromBalanceAvailable = false
  isTokenToBalanceAvailable = false
  isInsufficientAmount = false
  insufficientBalanceTokenSymbol = ''
  insufficientAmountTokenSymbol = ''
  isFieldFromFocused = false
  isFieldToFocused = false
  isFieldFromActive = false
  isFieldToActive = false
  isTokenFromSelected = false
  showSelectTokenDialog = false
  showConfirmSwapDialog = false

  formModel = {
    from: '',
    to: ''
  }

  get connected (): boolean {
    return isWalletConnected()
  }

  get areTokensSelected (): boolean {
    return !!(this.tokenFrom && this.tokenTo)
  }

  get isEmptyFromAmount (): boolean {
    return this.formModel.from === ''
  }

  get isZeroFromAmount (): boolean {
    return +this.formModel.from === 0
  }

  get isEmptyToAmount (): boolean {
    return this.formModel.to === ''
  }

  get isZeroToAmount (): boolean {
    return +this.formModel.to === 0
  }

  get areZeroAmounts (): boolean {
    return this.isZeroFromAmount || this.isZeroToAmount
  }

  get isMaxSwapAvailable (): boolean {
    return isMaxButtonAvailable(this.areTokensSelected, this.tokenFrom, this.formModel.from, this.networkFee)
  }

  get isInsufficientLiquidity (): boolean {
    if (!(this.connected && this.areTokensSelected && !(this.isZeroFromAmount && this.isZeroToAmount))) {
      return false
    }
    return (this.isZeroFromAmount || this.isZeroToAmount) && +this.liquidityProviderFee === 0
  }

  get isInsufficientBalance (): boolean {
    if (this.connected && this.areTokensSelected) {
      let fpBalance = new FPNumber(this.tokenFrom.balance, this.tokenFrom.decimals)
      const fpAmount = new FPNumber(this.formModel.from, this.tokenFrom.decimals)
      if (FPNumber.lt(fpBalance, fpAmount)) {
        this.insufficientBalanceTokenSymbol = this.tokenFrom.symbol
        return true
      }
      const fpFee = new FPNumber(this.networkFee, this.tokenFrom.decimals)
      this.insufficientBalanceTokenSymbol = KnownSymbols.XOR
      if (isXorAccountAsset(this.tokenFrom)) {
        return !(FPNumber.lt(fpFee, fpBalance.sub(fpAmount)) || FPNumber.eq(fpFee, fpBalance.sub(fpAmount)))
      }
      if (!this.tokenXOR) {
        return true
      }
      fpBalance = new FPNumber(this.tokenXOR.balance, this.tokenXOR.decimals)
      return !(FPNumber.lt(fpFee, fpBalance) || FPNumber.eq(fpFee, fpBalance))
    }
    return false
  }

  /**
   * Update token From balance and amount (after swap it should be recalculated)
   */
  get tokenFromBalance (): string {
    return this.tokenFrom?.balance ?? ''
  }

  /**
   * Update token To balance and amount (after swap it should be recalculated)
   */
  get tokenToBalance (): string {
    return this.tokenTo?.balance ?? ''
  }

  created () {
    this.withApi(() => {
      const tokenSymbol = this.tokenFrom !== null && this.tokenFrom !== undefined ? this.tokenFrom.symbol : KnownSymbols.XOR
      this.setTokenFrom({ isWalletConnected: this.connected, tokenSymbol: tokenSymbol })
      this.isTokenFromBalanceAvailable = true
      if (this.tokenTo !== null && this.tokenTo !== undefined) {
        this.setTokenTo({ isWalletConnected: this.connected, tokenSymbol: this.tokenTo.symbol })
        this.isTokenToBalanceAvailable = true
      }
    })
  }

  resetInsufficientAmountFlag (): void {
    this.isInsufficientAmount = false
  }

  resetFieldFrom (): void {
    this.formModel.from = ''
  }

  resetFieldTo (): void {
    this.formModel.to = ''
  }

  async getNetworkFee (): Promise<void> {
    const networkFee = await api.getSwapNetworkFee(this.tokenFrom.address, this.tokenTo.address, this.formModel.from, this.formModel.to, this.slippageTolerance, this.isExchangeB)
    this.setNetworkFee(networkFee)
  }

  async handleInputFieldFrom (value): Promise<any> {
    this.formModel.from = value

    if (!this.isFieldToActive) {
      this.isFieldFromActive = true
      if (!this.areTokensSelected || this.isZeroFromAmount) {
        this.resetFieldTo()
      } else {
        try {
          const swapResult = await api.getSwapResult(this.tokenFrom.address, this.tokenTo.address, this.formModel.from)
          this.formModel.to = swapResult.amount
          this.setLiquidityProviderFee(swapResult.fee)
          const minMaxReceived = await api.getMinMaxValue(this.tokenFrom.address, this.tokenTo.address, swapResult.amount, this.slippageTolerance)
          this.setMinMaxReceived({ minMaxReceived })
          this.updatePrices()
          this.resetInsufficientAmountFlag()
          if (this.connected) {
            await this.getNetworkFee()
            if (this.tokenFrom.symbol !== KnownSymbols.XOR) {
              await this.getTokenXOR()
            }
          }
        } catch (error) {
          this.resetFieldTo()
          if (!this.isInsufficientAmountError(this.tokenFrom.symbol, error.message)) {
            throw error
          }
        }
      }
      this.setToValue(this.formModel.to)
    }
    this.setFromValue(this.formModel.from)
  }

  async handleInputFieldTo (value): Promise<any> {
    this.formModel.to = value

    if (!this.isFieldFromActive) {
      this.isFieldToActive = true
      if (!this.areTokensSelected || this.isZeroToAmount) {
        this.resetFieldFrom()
      } else {
        try {
          // Always use getSwapResult and minMaxReceived with reversed flag for Token B
          const isExchangeBSwap = true
          const swapResult = await api.getSwapResult(this.tokenFrom.address, this.tokenTo.address, this.formModel.to, isExchangeBSwap)
          this.formModel.from = swapResult.amount
          this.setLiquidityProviderFee(swapResult.fee)
          const minMaxReceived = await api.getMinMaxValue(this.tokenFrom.address, this.tokenTo.address, swapResult.amount, this.slippageTolerance, isExchangeBSwap)
          this.setMinMaxReceived({ minMaxReceived, isExchangeB: isExchangeBSwap })
          this.updatePrices()
          this.resetInsufficientAmountFlag()
          if (this.connected) {
            await this.getNetworkFee()
            if (this.tokenFrom.symbol !== KnownSymbols.XOR) {
              await this.getTokenXOR()
            }
          }
        } catch (error) {
          this.resetFieldFrom()
          if (!this.isInsufficientAmountError(this.tokenTo.symbol, error.message)) {
            throw error
          }
        }
      }
      this.setFromValue(this.formModel.from)
    }
    this.setToValue(this.formModel.to)
  }

  async recountSwapValues (): Promise<void> {
    if (this.isFieldFromActive) {
      await this.handleInputFieldFrom(this.fromValue)
    } else {
      await this.handleInputFieldTo(this.toValue)
    }
  }

  updatePrices (): void {
    if (this.tokenFrom && this.tokenTo) {
      this.getPrices({
        assetAAddress: this.tokenFrom.address,
        assetBAddress: this.tokenTo.address,
        amountA: this.formModel.from,
        amountB: this.formModel.to
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

  handleBlurFieldFrom (): void {
    this.isFieldFromFocused = false
  }

  handleBlurFieldTo (): void {
    this.isFieldToFocused = false
  }

  async handleFocusFieldFrom (): Promise<void> {
    this.isFieldFromActive = true
    this.isFieldToActive = false
    this.isFieldFromFocused = true
    if (this.isZeroFromAmount) {
      this.formModel.from = ''
    }
    await this.recountSwapValues()
  }

  async handleFocusFieldTo (): Promise<void> {
    this.isFieldFromActive = false
    this.isFieldToActive = true
    this.isFieldToFocused = true
    if (this.isZeroToAmount) {
      this.formModel.to = ''
    }
    await this.recountSwapValues()
  }

  handleSwitchTokens (): void {
    const currentTokenFrom = this.tokenFrom
    this.setTokenFrom({ isWalletConnected: this.connected, tokenSymbol: this.tokenTo.symbol })
    this.setTokenTo({ isWalletConnected: this.connected, tokenSymbol: currentTokenFrom.symbol })
    this.resetFieldFrom()
    this.resetFieldTo()
    this.setTokenFromPrice(true)
    this.resetPrices()
    this.isFieldFromActive = false
    this.isFieldToActive = false
  }

  async handleMaxValue (): Promise<void> {
    this.isFieldFromActive = true
    this.isFieldToActive = false
    await this.getNetworkFee()
    this.formModel.from = getMaxValue(this.tokenFrom, this.networkFee)
  }

  handleConnectWallet (): void {
    router.push({ name: PageNames.Wallet })
  }

  openSelectTokenDialog (isTokenFrom: boolean): void {
    if (isTokenFrom) {
      this.isTokenFromSelected = true
    }
    this.showSelectTokenDialog = true
  }

  async selectToken (token: any): Promise<void> {
    if (token) {
      if (this.isTokenFromSelected) {
        this.isTokenFromSelected = false
        await this.setTokenFrom({ isWalletConnected: this.connected, tokenSymbol: token.symbol })
      } else {
        await this.setTokenTo({ isWalletConnected: this.connected, tokenSymbol: token.symbol })
        this.isTokenToBalanceAvailable = true
      }
      await this.getNetworkFee()
      await this.recountSwapValues()
    }
  }

  handleConfirmSwap (): void {
    this.showConfirmSwapDialog = true
  }

  async updateAccountAssets (): Promise<void> {
    try {
      await api.updateAccountAssets()
    } catch (error) {
      this.$alert(this.t(error.message), { title: this.t('errorText') })
      throw new Error(error)
    }
  }

  async confirmSwap (isSwapConfirmed: boolean): Promise<any> {
    if (isSwapConfirmed) {
      this.resetFieldFrom()
      this.resetFieldTo()
      this.setToValue('')
      this.setFromValue('')
      this.setTokenFromPrice(true)
      this.resetPrices()
      this.isFieldFromActive = false
      this.isFieldToActive = false
    }
    await this.updateAccountAssets()
  }
}
</script>

<style lang="scss">
.el-form--actions {
  .el-button--switch-tokens {
    @include switch-button-inherit-styles('medium');
  }
  .s-input--token-value .el-input .el-input__inner {
    @include text-ellipsis;
  }
}
</style>

<style lang="scss" scoped>
.el-form--actions {
  @include input-form-styles;
  @include buttons;
  @include full-width-button;
  @include vertical-divider('el-button--switch-tokens');

  .input-title-estimated {
    margin-left: $inner-spacing-mini / 2;
    font-size: var(--s-font-size-mini);
    @include font-weight;
    opacity: 0;
    &--show {
      opacity: 1;
    }
  }

  .el-button--switch-tokens {
    @include switch-button(var(--s-size-medium));
  }
}
</style>
