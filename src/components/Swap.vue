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
          <span v-if="areTokensSelected && !isEmptyAmount && isExchangeB" class="input-title-estimated">({{ t('swap.estimated') }})</span>
        </div>
        <div v-if="this.connected && this.tokenFrom && this.tokenFrom.balance && this.isTokenFromBalanceAvailable" class="token-balance">
          <span class="token-balance-title">{{ t('exchange.balance') }}</span>
          <span class="token-balance-value">{{ getTokenBalance(tokenFrom) }}</span>
        </div>
      </div>
      <div class="input-line">
        <s-form-item>
          <s-input
            v-model="formModel.from"
            v-float="formModel.from"
            class="s-input--token-value"
            :placeholder="isFieldFromFocused ? '' : inputPlaceholder"
            @input="handleInputFieldFrom"
            @focus="handleFocusFieldFrom"
            @blur="handleBlurFieldFrom"
          />
        </s-form-item>
        <div v-if="tokenFrom" class="token">
          <s-button v-if="connected && areTokensSelected" class="el-button--max" type="tertiary" size="small" border-radius="mini" :disabled="this.isMaxDisabled" @click="handleMaxValue">
            {{ t('exchange.max') }}
          </s-button>
          <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium" icon="chevron-bottom-rounded" icon-position="right" @click="openSelectTokenDialog(true)">
            <token-logo :token="tokenFrom" size="small" />
            {{ tokenFrom.symbol }}
          </s-button>
        </div>
        <s-button v-else class="el-button--empty-token" type="tertiary" size="small" border-radius="mini" icon="chevron-bottom-rounded" icon-position="right" @click="openSelectTokenDialog(true)">
          {{ t('swap.chooseToken') }}
        </s-button>
      </div>
    </div>
    <s-button class="el-button--switch-tokens" type="action" icon="change-positions" :disabled="!areTokensSelected" @click="handleSwitchTokens" />
    <div class="input-container">
      <div class="input-line">
        <div class="input-title">
          <span>{{ t('exchange.to') }}</span>
          <span v-if="areTokensSelected && !isEmptyAmount && !isExchangeB" class="input-title-estimated">({{ t('swap.estimated') }})</span>
        </div>
        <div v-if="this.connected && this.tokenTo && this.tokenTo.balance && this.isTokenToBalanceAvailable" class="token-balance">
          <span class="token-balance-title">{{ t('exchange.balance') }}</span>
          <span class="token-balance-value">{{ getTokenBalance(tokenTo) }}</span>
        </div>
      </div>
      <div class="input-line">
        <s-form-item>
          <s-input
            v-model="formModel.to"
            v-float="formModel.to"
            class="s-input--token-value"
            :placeholder="isFieldToFocused ? '' : inputPlaceholder"
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
          {{ t('swap.chooseToken') }}
        </s-button>
      </div>
    </div>
    <swap-info v-if="areTokensSelected && !isEmptyAmount" :show-price="true" :show-slippage-tolerance="true" />
    <s-button v-if="!connected" type="primary" @click="handleConnectWallet">
      {{ t('swap.connectWallet') }}
    </s-button>
    <s-button v-else type="primary" :disabled="!areTokensSelected || isEmptyAmount || isInsufficientAmount || isInsufficientBalance" @click="handleConfirmSwap">
      <template v-if="isEmptyAmount">
        {{ t('swap.enterAmount') }}
      </template>
      <template v-else-if="isInsufficientAmount">
        {{ t('swap.insufficientAmount', { tokenSymbol: insufficientAmountTokenSymbol }) }}
      </template>
      <template v-else-if="isInsufficientBalance">
        {{ t('swap.insufficientBalance', { tokenSymbol: insufficientBalanceTokenSymbol }) }}
      </template>
      <template v-else>
        {{ t('exchange.Swap') }}
      </template>
    </s-button>
    <swap-info v-if="areTokensSelected && !isEmptyAmount" />
    <select-token :visible.sync="showSelectTokenDialog" :asset="isTokenFromSelected ? tokenTo : tokenFrom" @select="selectToken" />
    <confirm-swap :visible.sync="showConfirmSwapDialog" @confirm="confirmSwap" />
    <result-dialog :visible.sync="isSwapConfirmed" :type="t('exchange.Swap')" :message="transactionResultMessage" @close="swapNotify(transactionResultMessage)" />
  </s-form>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import { formatNumber, isNumberValue, isWalletConnected } from '@/utils'
import router, { lazyComponent } from '@/router'
import { Components, PageNames } from '@/consts'
import { dexApi } from '@soramitsu/soraneo-wallet-web'
import { KnownSymbols, KnownAssets, FPNumber } from '@sora-substrate/util'

@Component({
  components: {
    SwapInfo: lazyComponent(Components.SwapInfo),
    TokenLogo: lazyComponent(Components.TokenLogo),
    SelectToken: lazyComponent(Components.SelectToken),
    ConfirmSwap: lazyComponent(Components.ConfirmSwap),
    ResultDialog: lazyComponent(Components.ResultDialog)
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
  @Action getTokenXOR
  @Action setTokenFrom
  @Action setTokenTo
  @Action setFromValue
  @Action setToValue
  @Action setTokenFromPrice
  @Action setPrice
  @Action setPriceReversed
  @Action setMinMaxReceived
  @Action setLiquidityProviderFee
  @Action setNetworkFee

  inputPlaceholder: string = formatNumber(0, 2)
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
  isSwapConfirmed = false

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

  get isEmptyAmount (): boolean {
    return +this.formModel.from === 0 || +this.formModel.to === 0
  }

  get isMaxDisabled (): boolean {
    if (this.connected && this.areTokensSelected) {
      if (+this.tokenFrom.balance === 0) {
        return true
      }
      const fpBalance = new FPNumber(this.tokenFrom.balance, this.tokenFrom.decimals)
      const fpAmount = new FPNumber(this.formModel.from, this.tokenFrom.decimals)
      if (this.tokenFrom.symbol === KnownSymbols.XOR) {
        const fpFee = new FPNumber(this.networkFee, this.tokenFrom.decimals)
        return FPNumber.eq(fpFee, fpBalance.sub(fpAmount))
      } else {
        return FPNumber.eq(fpBalance, fpAmount)
      }
    }
    return false
  }

  get isInsufficientBalance (): boolean {
    if (this.connected && this.areTokensSelected) {
      let fpBalance = new FPNumber(this.tokenFrom.balance, this.tokenFrom.decimals)
      const fpAmount = new FPNumber(this.formModel.from, this.tokenFrom.decimals)
      if (FPNumber.lt(fpBalance, fpAmount)) {
        this.insufficientBalanceTokenSymbol = this.tokenFrom.symbol
        return true
      }
      const assetXOR = KnownAssets.get(KnownSymbols.XOR)
      const fpFee = new FPNumber(this.networkFee, this.tokenFrom.decimals)
      this.insufficientBalanceTokenSymbol = KnownSymbols.XOR
      if (this.tokenFrom.symbol === KnownSymbols.XOR) {
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

  get transactionResultMessage (): string {
    return this.t('swap.transactionMessage', {
      tokenFromValue: this.formatTokenValue(this.tokenFrom, this.fromValue),
      tokenToValue: this.formatTokenValue(this.tokenTo, this.toValue)
    })
  }

  formatTokenValue (token: any, tokenValue: number | string): string {
    return token ? `${tokenValue} ${token.symbol}` : ''
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

  getTokenBalance (token: any): string {
    return token ? token.balance : ''
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
    const networkFee = await dexApi.getSwapNetworkFee(this.tokenFrom.address, this.tokenTo.address, this.formModel.from, this.formModel.to, this.slippageTolerance, this.isExchangeB)
    this.setNetworkFee(networkFee)
  }

  async handleInputFieldFrom (): Promise<any> {
    if (!isNumberValue(this.formModel.from)) {
      await setTimeout(() => {
        this.resetFieldFrom()
      }, 50)
      return
    }
    if (!this.isFieldToActive) {
      this.isFieldFromActive = true
      if (!this.areTokensSelected || +this.formModel.from === 0) {
        this.resetFieldTo()
      } else {
        try {
          const swapResult = await dexApi.getSwapResult(this.tokenFrom.address, this.tokenTo.address, this.formModel.from)
          this.formModel.to = swapResult.amount
          this.setLiquidityProviderFee(swapResult.fee)
          const minMaxReceived = await dexApi.getMinMaxValue(this.tokenFrom.address, this.tokenTo.address, swapResult.amount, this.slippageTolerance)
          this.setMinMaxReceived({ minMaxReceived })
          this.getPrice()
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

  async handleInputFieldTo (): Promise<any> {
    if (!isNumberValue(this.formModel.to)) {
      await setTimeout(() => {
        this.resetFieldTo()
      }, 50)
      return
    }
    if (!this.isFieldFromActive) {
      this.isFieldToActive = true
      if (!this.areTokensSelected || +this.formModel.to === 0) {
        this.resetFieldFrom()
      } else {
        try {
          // Always use getSwapResult and minMaxReceived with reversed flag for Token B
          const isExchangeBSwap = true
          const swapResult = await dexApi.getSwapResult(this.tokenFrom.address, this.tokenTo.address, this.formModel.to, isExchangeBSwap)
          this.formModel.from = swapResult.amount
          this.setLiquidityProviderFee(swapResult.fee)
          const minMaxReceived = await dexApi.getMinMaxValue(this.tokenFrom.address, this.tokenTo.address, swapResult.amount, this.slippageTolerance, isExchangeBSwap)
          this.setMinMaxReceived({ minMaxReceived, isExchangeB: isExchangeBSwap })
          this.getPrice()
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

  async getPrice (): Promise<void> {
    try {
      const price = await dexApi.divideAssets(this.tokenFrom.address, this.tokenTo.address, this.formModel.from, this.formModel.to)
      this.setPrice(price)
      const priceReversed = await dexApi.divideAssets(this.tokenFrom.address, this.tokenTo.address, this.formModel.from, this.formModel.to, true)
      this.setPriceReversed(priceReversed)
    } catch (error) {
      throw new Error(error)
    }
  }

  resetPrice (): void {
    this.setPrice(formatNumber(0, 2))
    this.setPriceReversed(formatNumber(0, 2))
  }

  isInsufficientAmountError (tokenSymbol: string, errorMessage): boolean {
    // TODO: If an input field has too many symbols this is a way to avoid an error, find another approach later
    if (errorMessage.indexOf('invalid string input for fixed point number') !== -1) {
      this.isInsufficientAmount = true
      this.insufficientAmountTokenSymbol = tokenSymbol
      this.resetPrice()
    }
    return this.isInsufficientAmount
  }

  handleBlurFieldFrom (): void {
    if (this.formModel.from === '' || +this.formModel.from === 0) {
      this.resetFieldFrom()
    }
    this.isFieldFromFocused = false
  }

  handleFocusFieldFrom (): void {
    this.isFieldFromActive = true
    this.isFieldToActive = false
    this.isFieldFromFocused = true
    if (+this.formModel.from === 0) {
      this.formModel.from = ''
    }
  }

  handleBlurFieldTo (): void {
    if (this.formModel.to === '' || +this.formModel.to === 0) {
      this.resetFieldTo()
    }
    this.isFieldToFocused = false
  }

  handleFocusFieldTo (): void {
    this.isFieldFromActive = false
    this.isFieldToActive = true
    this.isFieldToFocused = true
    if (+this.formModel.to === 0) {
      this.formModel.to = ''
    }
  }

  handleSwitchTokens (): void {
    const currentTokenFrom = this.tokenFrom
    this.setTokenFrom({ isWalletConnected: this.connected, tokenSymbol: this.tokenTo.symbol })
    this.setTokenTo({ isWalletConnected: this.connected, tokenSymbol: currentTokenFrom.symbol })
    this.resetFieldFrom()
    this.resetFieldTo()
    this.setTokenFromPrice(true)
    this.resetPrice()
    this.isFieldFromActive = false
    this.isFieldToActive = false
  }

  async handleMaxValue (): Promise<void> {
    this.isFieldFromActive = true
    this.isFieldToActive = false
    if (this.tokenFrom.symbol === KnownSymbols.XOR) {
      await this.getNetworkFee()
      const fpBalance = new FPNumber(this.tokenFrom.balance, this.tokenFrom.decimals)
      const fpFee = new FPNumber(this.networkFee, this.tokenFrom.decimals)
      this.formModel.from = fpBalance.sub(fpFee).toString()
      return
    }
    this.formModel.from = this.tokenFrom.balance
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
      if (this.isFieldFromActive) {
        await this.handleInputFieldFrom()
      } else {
        await this.handleInputFieldTo()
      }
    }
  }

  handleConfirmSwap (): void {
    this.showConfirmSwapDialog = true
  }

  async confirmSwap (isSwapConfirmed: boolean): Promise<any> {
    if (isSwapConfirmed) {
      this.isSwapConfirmed = isSwapConfirmed
    }
  }

  async swapNotify (message: string): Promise<void> {
    this.$notify({
      message: message,
      title: this.t('exchange.Swap'),
      type: 'success'
    })
    try {
      await dexApi.updateAccountAssets()
    } catch (error) {
      throw new Error(error)
    }
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
  }

  .el-button--switch-tokens {
    @include switch-button(var(--s-size-medium));
  }
}
</style>
