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
          <span v-if="areTokensSelected && !isEmptyBalance && isExchangeB" class="input-title-estimated">({{ t('swap.estimated') }})</span>
        </div>
        <div v-if="showTokenFromBalance" class="token-balance">
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
          <s-button v-if="connected && areTokensSelected" class="el-button--max" type="tertiary" size="small" border-radius="mini" :disabled="this.formModel.from === this.tokenFrom.balance || +this.tokenFrom.balance === 0" @click="handleMaxValue">
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
          <span v-if="areTokensSelected && !isEmptyBalance && !isExchangeB" class="input-title-estimated">({{ t('swap.estimated') }})</span>
        </div>
        <div v-if="showTokenToBalance" class="token-balance">
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
    <swap-info v-if="areTokensSelected && !isEmptyBalance" :show-price="true" :show-slippage-tolerance="true" />
    <s-button v-if="!connected" type="primary" @click="handleConnectWallet">
      {{ t('swap.connectWallet') }}
    </s-button>
    <s-button v-else type="primary" :disabled="!areTokensSelected || isEmptyBalance || isInsufficientBalance" @click="handleConfirmSwap">
      <template v-if="isEmptyBalance && !isInsufficientAmount">
        {{ t('swap.enterAmount') }}
      </template>
      <template v-else-if="isInsufficientAmount">
        {{ t('swap.insufficientAmount', { tokenSymbol: insufficientAmountTokenSymbol }) }}
      </template>
      <template v-else-if="isInsufficientBalance">
        {{ t('swap.insufficientBalance', { tokenSymbol: tokenFrom ? tokenFrom.symbol : '' }) }}
      </template>
      <template v-else>
        {{ t('exchange.Swap') }}
      </template>
    </s-button>
    <swap-info v-if="areTokensSelected && !isEmptyBalance" />
    <select-token :visible.sync="showSelectTokenDialog" :asset="isTokenFromSelected ? tokenTo : tokenFrom" @select="selectToken" />
    <confirm-swap :visible.sync="showConfirmSwapDialog" @confirm="confirmSwap" />
    <result-dialog :visible.sync="isSwapConfirmed" :type="t('exchange.Swap')" :message="resultMessage" @close="swapNotify(resultMessage)" />
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
import { KnownSymbols } from '@sora-substrate/util'

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
  @Getter tokenFrom!: any
  @Getter tokenTo!: any
  @Getter fromValue!: number
  @Getter toValue!: number
  @Getter isExchangeB!: boolean
  @Getter slippageTolerance!: number
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
  isFieldFromFocused = false
  isFieldToFocused = false
  isTokenFromSelected = false
  showSelectTokenDialog = false
  showConfirmSwapDialog = false
  isSwapConfirmed = false
  isInsufficientAmount = false
  insufficientAmountTokenSymbol = ''

  formModel = {
    from: formatNumber(0, 1),
    to: formatNumber(0, 1)
  }

  get connected (): boolean {
    return isWalletConnected()
  }

  get areTokensSelected (): boolean {
    return !!(this.tokenFrom && this.tokenTo)
  }

  get isEmptyBalance (): boolean {
    return +this.formModel.from === 0 || +this.formModel.to === 0
  }

  get isInsufficientBalance (): boolean {
    if (this.areTokensSelected) {
      return +this.formModel.from > +this.tokenFrom.balance
    }
    return true
  }

  get showTokenFromBalance (): boolean {
    return this.connected && this.tokenFrom && this.tokenFrom.balance && this.isTokenFromBalanceAvailable
  }

  get showTokenToBalance (): boolean {
    return this.connected && this.tokenTo && this.tokenTo.balance && this.isTokenToBalanceAvailable
  }

  get resultMessage (): string {
    return this.t('swap.transactionMessage', {
      tokenFromValue: this.getSwapValue(this.tokenFrom, this.fromValue),
      tokenToValue: this.getSwapValue(this.tokenTo, this.toValue)
    })
  }

  async created () {
    await new Promise(resolve => setTimeout((resolve) => {
      const tokenSymbol = this.tokenFrom !== null && this.tokenFrom !== undefined ? this.tokenFrom.symbol : KnownSymbols.XOR
      this.setTokenFrom({ isWalletConnected: this.connected, tokenSymbol: tokenSymbol })
      this.isTokenFromBalanceAvailable = true
      if (this.tokenTo !== null && this.tokenTo !== undefined) {
        this.setTokenTo({ isWalletConnected: this.connected, tokenSymbol: this.tokenTo.symbol })
        this.isTokenToBalanceAvailable = true
      }
    }, 1500))
  }

  getSwapValue (token: any, tokenValue: number): string {
    return token ? `${tokenValue} ${token.symbol}` : ''
  }

  getTokenBalance (token: any): string {
    if (token) {
      return formatNumber(token.balance, 2)
    }
    return ''
  }

  async handleInputFieldFrom (): Promise<any> {
    if (!isNumberValue(this.formModel.from)) {
      await setTimeout(() => {
        this.formModel.from = formatNumber(0, 1)
      }, 50)
      return
    }
    if (!this.isFieldToFocused) {
      this.isFieldFromFocused = true
      if (!this.areTokensSelected || +this.formModel.from === 0) {
        this.formModel.to = formatNumber(0, 1)
      } else {
        try {
          const swapResult = await dexApi.getSwapResult(this.tokenFrom.address, this.tokenTo.address, this.formModel.from)
          this.formModel.to = swapResult.amount
          this.setLiquidityProviderFee(swapResult.fee)
          const minMaxReceived = await dexApi.getMinMaxValue(this.tokenFrom.address, this.tokenTo.address, swapResult.amount, this.slippageTolerance)
          this.setMinMaxReceived({ minMaxReceived: minMaxReceived })
          this.getPrice()
          if (this.isInsufficientAmount) {
            this.isInsufficientAmount = false
          }
          if (this.connected) {
            const networkFee = await dexApi.getSwapNetworkFee(this.tokenFrom.address, this.tokenTo.address, this.formModel.from, this.formModel.to, this.slippageTolerance)
            this.setNetworkFee(networkFee)
          }
        } catch (error) {
          this.formModel.to = formatNumber(0, 1)
          if (!this.checkInsufficientAmount(this.tokenFrom.symbol, error.message)) {
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
        this.formModel.to = formatNumber(0, 1)
      }, 50)
      return
    }
    if (!this.isFieldFromFocused) {
      this.isFieldToFocused = true
      if (!this.areTokensSelected || +this.formModel.to === 0) {
        this.formModel.from = formatNumber(0, 1)
      } else {
        try {
          // Always use getSwapResult and minMaxReceived with reversed flag for Token B
          const isExchangeBSwap = true
          const swapResult = await dexApi.getSwapResult(this.tokenFrom.address, this.tokenTo.address, this.formModel.to, isExchangeBSwap)
          this.formModel.from = swapResult.amount
          this.setLiquidityProviderFee(swapResult.fee)
          const minMaxReceived = await dexApi.getMinMaxValue(this.tokenFrom.address, this.tokenTo.address, swapResult.amount, this.slippageTolerance, isExchangeBSwap)
          this.setMinMaxReceived({ minMaxReceived: minMaxReceived, isExchangeB: isExchangeBSwap })
          this.getPrice()
          if (this.isInsufficientAmount) {
            this.isInsufficientAmount = false
          }
          if (this.connected) {
            const networkFee = await dexApi.getSwapNetworkFee(this.tokenFrom.address, this.tokenTo.address, this.formModel.from, this.formModel.to, this.slippageTolerance, isExchangeBSwap)
            this.setNetworkFee(networkFee)
          }
        } catch (error) {
          this.formModel.from = formatNumber(0, 1)
          if (!this.checkInsufficientAmount(this.tokenTo.symbol, error.message)) {
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

  checkInsufficientAmount (tokenSymbol: string, errorMessage): boolean {
    if (errorMessage.indexOf('invalid string input for fixed point number') !== -1) {
      this.isInsufficientAmount = true
      this.insufficientAmountTokenSymbol = tokenSymbol
      this.setPrice(0)
      this.setPriceReversed(0)
    }
    return this.isInsufficientAmount
  }

  initPrice (): void {
    this.setTokenFromPrice(true)
    this.setPrice(formatNumber(0))
    this.setPriceReversed(formatNumber(0))
  }

  handleBlurFieldFrom (): void {
    if (this.formModel.from === '' || +this.formModel.from === 0) {
      this.formModel.from = formatNumber(0, 1)
    }
  }

  handleFocusFieldFrom (): void {
    this.isFieldFromFocused = true
    this.isFieldToFocused = false
    if (+this.formModel.from === 0) {
      this.formModel.from = ''
    }
  }

  handleBlurFieldTo (): void {
    if (this.formModel.to === '' || +this.formModel.to === 0) {
      this.formModel.to = formatNumber(0, 1)
    }
  }

  handleFocusFieldTo (): void {
    this.isFieldFromFocused = false
    this.isFieldToFocused = true
    if (+this.formModel.to === 0) {
      this.formModel.to = ''
    }
  }

  handleSwitchTokens (): void {
    const currentTokenFrom = this.tokenFrom
    this.setTokenFrom({ isWalletConnected: this.connected, tokenSymbol: this.tokenTo.symbol })
    this.setTokenTo({ isWalletConnected: this.connected, tokenSymbol: currentTokenFrom.symbol })
    this.formModel.from = formatNumber(0, 1)
    this.formModel.to = formatNumber(0, 1)
    this.initPrice()
    this.isFieldFromFocused = false
    this.isFieldToFocused = false
  }

  handleMaxValue (): void {
    this.isFieldFromFocused = true
    this.isFieldToFocused = false
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
      if (this.isFieldFromFocused) {
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
  .s-input--token-value {
    @include input-ellipsis;
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
