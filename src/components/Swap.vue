<template>
  <s-form
    v-model="formModel"
    class="el-form--actions"
    :show-message="false"
  >
    <div class="input-container">
      <div class="input-line">
        <div class="input-title">{{ t('exchange.from') }}</div>
        <div v-if="connected && tokenFrom && tokenFrom.balance" class="token-balance">
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
            @input="handleChangeFieldFrom"
            @focus="handleFocusFieldFrom"
            @blur="handleBlurFieldFrom"
          />
        </s-form-item>
        <div v-if="tokenFrom" class="token">
          <s-button v-if="connected && areTokensSelected" class="el-button--max" type="tertiary" size="small" border-radius="mini" :disabled="this.formModel.from === this.tokenFrom.balance" @click="handleMaxValue(true)">
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
          <span v-if="connected && areTokensSelected" class="input-title-estimated">({{ t('swap.estimated') }})</span>
        </div>
        <div v-if="connected && tokenTo && tokenTo.balance" class="token-balance">
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
            @input="handleChangeFieldTo"
            @focus="handleFocusFieldTo"
            @blur="handleBlurFieldTo"
          />
        </s-form-item>
        <div v-if="tokenTo" class="token">
          <s-button v-if="connected && areTokensSelected" class="el-button--max" type="tertiary" size="small" border-radius="mini" :disabled="this.formModel.to === this.tokenTo.balance" @click="handleMaxValue">
            {{ t('exchange.max') }}
          </s-button>
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
        {{ t('swap.insufficientBalance', { tokenSymbol: tokenFrom.symbol }) }}
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
import { formatNumber, isWalletConnected } from '@/utils'
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

  inputPlaceholder: string = formatNumber(0, 2)
  isFieldFromFocused = false
  isFieldToFocused = false
  isTokenFromSelected = false
  showSelectTokenDialog = false
  showConfirmSwapDialog = false
  isSwapConfirmed = false
  defaultTokenSymbol = KnownSymbols.XOR
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

  get resultMessage (): string {
    return this.t('swap.transactionMessage', {
      tokenFromValue: this.getSwapValue(this.tokenFrom, this.fromValue),
      tokenToValue: this.getSwapValue(this.tokenTo, this.toValue)
    })
  }

  async created () {
    if (this.connected) {
      if (this.tokenFrom === null || this.tokenFrom === undefined) {
        // Set default token
        // TODO 4 alexnatalia: This is just a temporary way to fix the default token setting
        await new Promise(resolve => setTimeout((resolve) => {
          this.setTokenFrom({ isWalletConnected: this.connected, tokenSymbol: this.defaultTokenSymbol })
        }, 1500))
      } else if (this.tokenFrom.balance === undefined) {
        // Reset tokenFrom after connection to the wallet
        this.setTokenFrom({ isWalletConnected: this.connected, tokenSymbol: this.tokenFrom.symbol })
      }
      // Reset tokenTo after connection to the wallet
      if (this.tokenTo !== null && this.tokenTo.balance === undefined) {
        this.setTokenTo({ isWalletConnected: this.connected, tokenSymbol: this.tokenTo.symbol })
      }
    } else {
      // Set default tokenFrom or remove account info of token if user logout the wallet
      if (this.tokenFrom === null || this.tokenFrom.balance !== undefined) {
        this.setTokenFrom({ isWalletConnected: this.connected, tokenSymbol: this.defaultTokenSymbol })
      }
      // Remove account info of tokenTo if user logout the wallet
      if (this.tokenTo !== null && this.tokenTo.balance !== undefined) {
        this.setTokenTo({ isWalletConnected: this.connected, tokenSymbol: this.tokenTo.symbol })
      }
    }
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

  async handleChangeFieldFrom (): Promise<any> {
    if (!this.isFieldToFocused) {
      this.isFieldFromFocused = true
      if (!this.areTokensSelected || +this.formModel.from === 0) {
        this.formModel.to = formatNumber(0, 1)
      } else {
        try {
          const swapResult = await dexApi.getSwapResult(this.tokenFrom.address, this.tokenTo.address, this.formModel.from)
          this.formModel.to = swapResult.amount
          this.setLiquidityProviderFee(swapResult.fee)
          const minMaxReceived = await dexApi.getMinMaxReceived(this.tokenFrom.address, this.tokenTo.address, swapResult.amount, this.slippageTolerance)
          this.setMinMaxReceived(minMaxReceived)
          this.getPrice()
          if (this.isInsufficientAmount) {
            this.isInsufficientAmount = false
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

  async handleChangeFieldTo (): Promise<any> {
    if (!this.isFieldFromFocused) {
      this.isFieldToFocused = true
      if (!this.areTokensSelected || +this.formModel.to === 0) {
        this.formModel.from = formatNumber(0, 1)
      } else {
        try {
          const swapResult = await dexApi.getSwapResult(this.tokenFrom.address, this.tokenTo.address, this.formModel.to)
          this.formModel.from = swapResult.amount
          this.setLiquidityProviderFee(swapResult.fee)
          const minMaxReceived = await dexApi.getMinMaxReceived(this.tokenFrom.address, this.tokenTo.address, swapResult.amount, this.slippageTolerance)
          this.setMinMaxReceived(minMaxReceived)
          this.getPrice()
          if (this.isInsufficientAmount) {
            this.isInsufficientAmount = false
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

  handleMaxValue (isTokenFrom: boolean): void {
    if (isTokenFrom) {
      this.isFieldFromFocused = true
      this.isFieldToFocused = false
      this.formModel.from = this.tokenFrom.balance
    } else {
      this.isFieldFromFocused = false
      this.isFieldToFocused = true
      this.formModel.to = this.tokenTo.balance
    }
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

  selectToken (token: any): void {
    if (token) {
      if (this.isTokenFromSelected) {
        this.setTokenFrom({ isWalletConnected: this.connected, tokenSymbol: token.symbol })
        this.isTokenFromSelected = false
        this.formModel.from = formatNumber(0, 1)
      } else {
        this.setTokenTo({ isWalletConnected: this.connected, tokenSymbol: token.symbol })
        this.formModel.to = formatNumber(0, 1)
      }
      this.initPrice()
    }
  }

  handleConfirmSwap (): void {
    this.showConfirmSwapDialog = true
  }

  async confirmSwap (isSwapConfirmed: boolean): Promise<any> {
    this.isSwapConfirmed = isSwapConfirmed
    if (isSwapConfirmed) {
      await dexApi.swap(this.tokenFrom.address, this.tokenTo.address, this.fromValue.toString(), this.toValue.toString(), this.slippageTolerance)
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
