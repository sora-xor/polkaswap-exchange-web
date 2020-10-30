<template>
  <s-form
    v-model="swapForm"
    class="el-form--swap"
    :show-message="false"
  >
    <div class="input-container">
      <div class="input-line">
        <div class="input-title">{{ t('exchange.from') }}</div>
        <div v-if="isWalletConnected && tokenFrom" class="token-balance">
          <span class="token-balance-title">{{ t('exchange.balance') }}</span>
          <span class="token-balance-value">{{ formatNumber(tokenFrom.balance, 2) }}</span>
        </div>
      </div>
      <div class="input-line">
        <s-form-item>
          <s-input
            v-model="swapForm.tokenFromValue"
            v-float="swapForm.tokenFromValue"
            :placeholder="formatNumber(0, 2)"
            :disabled="!tokensSelected"
            @change="handleChangeFromValue"
            @blur="handleBlurFromValue"
          />
        </s-form-item>
        <div v-if="tokenFrom" class="token">
          <s-button v-if="isWalletConnected" class="el-button--max" type="tertiary" size="small" @click="handleMaxValue">
            {{ t('exchange.max') }}
          </s-button>
          <s-button type="tertiary" size="small" icon="chevron-bottom-rounded" class="el-button--choose-token" @click="handleChooseToken(true)">
            <span class="logo">{{ tokenFrom.logo }}</span>
            {{ tokenFrom.symbol }}
          </s-button>
        </div>
        <s-button v-else type="tertiary" size="small" icon="chevron-bottom-rounded" class="el-button--empty-token" @click="handleChooseToken(true)">
          {{ t('swap.chooseToken') }}
        </s-button>
      </div>
    </div>
    <s-button class="el-button--switch-tokens" type="action" size="medium" icon="change-positions" @click="handleSwitchTokens"></s-button>
    <div class="input-container">
      <div class="input-line">
        <div class="input-title">
          <span>{{ t('exchange.to') }}</span>
          <span v-if="tokenTo" class="input-title-estimated">({{ t('swap.estimated') }})</span>
        </div>
        <div v-if="isWalletConnected && tokenTo" class="token-balance">
          <span class="token-balance-title">{{ t('exchange.balance') }}</span>
          <span class="token-balance-value">{{ formatNumber(tokenTo.balance, 2) }}</span>
        </div>
      </div>
      <div class="input-line">
        <s-form-item>
          <s-input
            v-model="swapForm.tokenToValue"
            v-float="swapForm.tokenToValue"
            :placeholder="formatNumber(0, 2)"
            :disabled="!tokensSelected"
            @change="handleChangeToValue"
            @blur="handleBlurToValue"
          />
        </s-form-item>
        <div v-if="tokenTo" class="token">
          <s-button type="tertiary" size="small" icon="chevron-bottom-rounded" class="el-button--choose-token" @click="handleChooseToken">
            <span class="logo">{{ tokenTo.logo }}</span>
            {{ tokenTo.symbol }}
          </s-button>
        </div>
        <s-button v-else type="tertiary" size="small" icon="chevron-bottom-rounded" class="el-button--empty-token" @click="handleChooseToken">
          {{t('swap.chooseToken')}}
        </s-button>
      </div>
    </div>
    <template v-if="tokensSelected">
      <div class="swap-info">
        <span>{{ t('exchange.price') }}</span>
        <span class="swap-info-value">{{ priceValue }}</span>
        <s-button class="el-button--switch-price" type="action" size="small" icon="swap" @click="handleSwitchPrice"></s-button>
      </div>
      <div class="swap-info swap-info--slippage-tolerance">
        <span>{{ t('swap.slippageTolerance') }}</span>
        <span class="swap-info-value">{{ slippageToleranceValue }}%</span>
      </div>
    </template>
    <s-button v-if="!isWalletConnected" type="primary" size="medium" @click="handleConnectWallet">
      {{ t('swap.connectWallet') }}
    </s-button>
    <s-button v-else type="primary" size="medium" :disabled="!tokensSelected || isEmptyBalance || isInsufficientBalance" @click="handleSwap">
      <template v-if="!tokensSelected">
        {{ t('swap.chooseTokens') }}
      </template>
      <template v-else-if="isEmptyBalance">
        {{ t('swap.enterAmount') }}
      </template>
      <template v-else-if="isInsufficientBalance">
        {{ t('swap.insufficientBalance') }}
      </template>
      <template v-else>
        {{ t('exchange.swap') }}
      </template>
    </s-button>
    <template v-if="tokensSelected">
      <div class="swap-info">
        <s-tooltip class="swap-info-icon" :content="t('swap.minReceivedTooltip')" theme="light" placement="right-start" :show-arrow="false">
          <s-icon name="info" size="16"/>
        </s-tooltip>
        <span>{{ t('swap.minReceived') }}</span>
        <span class="swap-info-value">{{ minReceived }}</span>
      </div>
      <div class="swap-info">
        <s-tooltip class="swap-info-icon" :content="t('swap.priceImpactTooltip')" theme="light" placement="right-start" :show-arrow="false">
          <s-icon name="info" size="16"/>
        </s-tooltip>
        <span>{{ t('swap.priceImpact') }}</span>
        <span :class="'swap-info-value ' + priceImpactClass">{{ priceImpact }}%</span>
      </div>
      <div class="swap-info">
        <s-tooltip class="swap-info-icon" :content="t('swap.liquidityProviderFeeTooltip')" theme="light" placement="right-start" :show-arrow="false">
          <s-icon name="info" size="16"/>
        </s-tooltip>
        <span>{{ t('swap.liquidityProviderFee') }}</span>
        <span class="swap-info-value">{{ liquidityProviderFee }}</span>
      </div>
    </template>
  </s-form>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import TranslationMixin from '@/components/mixins/TranslationMixin'

@Component
export default class Swap extends Mixins(TranslationMixin) {
  // ------------------ Mock data start ------------------
  // TODO: Add icon field to tokens
  tokens: any = {
    XOR: {
      name: 'Sora',
      logo: '',
      symbol: 'XOR',
      address: '1f9840a85d5af5bf1d1762f925bdaddc4201f984',
      balance: 10000,
      price: 0.0025
    },
    KSM: {
      name: 'Kusama',
      logo: '',
      symbol: 'KSM',
      address: '34916349d43f65bccca11ff53a8e0382a1a594a7',
      balance: 0,
      price: 0.0055
    },
    ETH: {
      name: 'Ether',
      logo: '',
      symbol: 'ETH',
      address: '8adaca8ea8192656a15c88797e04c8771c4576b3',
      balance: 20000.45,
      price: 0.0099
    }
  };

  // TODO: Add Slippage Tolerance value for appropriate place
  slippageToleranceValue = 0.5;
  // ------------------ Mock data end ------------------

  tokenFrom: any = null;
  tokenTo: any = null;
  swapForm: any = {
    tokenFromValue: this.formatNumber(0, 1),
    tokenToValue: this.formatNumber(0, 1)
  };

  isTokenFromFocused = false;
  isTokenToFocused = false;
  isSwitchTokensClicked = false;
  isTokenFromPrice = true;
  isWalletConnected = false;

  get tokensSelected (): boolean {
    return this.tokenFrom && this.tokenTo
  }

  get priceValue (): string {
    if (this.isTokenFromPrice) {
      return this.formatNumber(this.tokenFrom.price / this.tokenTo.price, 4) + ` ${this.tokenFrom.symbol + ' / ' + this.tokenTo.symbol}`
    }
    return this.formatNumber(this.tokenTo.price / this.tokenFrom.price, 4) + ` ${this.tokenTo.symbol + ' / ' + this.tokenFrom.symbol}`
  }

  get isEmptyBalance (): boolean {
    return +this.swapForm.tokenFromValue === 0 || +this.swapForm.tokenToValue === 0
  }

  get isInsufficientBalance (): boolean {
    if (this.tokensSelected) {
      return +this.swapForm.tokenFromValue > this.tokenFrom.balance
    }
    return true
  }

  get minReceived (): string {
    // TODO: Generate min received value
    return this.tokenFrom ? `${this.formatNumber(24351.25123, 4)} ${this.tokenFrom.symbol}` : ''
  }

  get priceImpact (): string {
    // TODO: Generate price impact value, is could be positive or negative, use appropriate class to show it in layout
    return this.formatNumber(0.0222, 2)
  }

  get priceImpactClass (): string {
    if (+this.priceImpact > 0) {
      return 'price-impact-positive'
    }
    if (+this.priceImpact < 0) {
      return 'price-impact-negative'
    }
    return ''
  }

  get liquidityProviderFee (): string {
    // TODO: Generate liquidity provider fee
    return this.tokenFrom ? `${this.formatNumber(0.0006777, 4)} ${this.tokenFrom.symbol}` : ''
  }

  handleChangeFromValue (): void {
    if (this.tokensSelected && +this.swapForm.tokenFromValue !== 0 && !this.isTokenToFocused) {
      this.isTokenFromFocused = true
      this.swapForm.tokenToValue = this.formatNumber(+this.swapForm.tokenFromValue * this.tokenFrom.price / this.tokenTo.price, 4)
    }
  }

  handleChangeToValue (): void {
    if (this.tokensSelected && +this.swapForm.tokenToValue !== 0 && !this.isTokenFromFocused) {
      this.isTokenToFocused = true
      this.swapForm.tokenFromValue = this.formatNumber(+this.swapForm.tokenToValue * this.tokenTo.price / this.tokenFrom.price, 4)
    }
    if (this.isSwitchTokensClicked) {
      this.handleBlurFromValue()
      this.handleBlurToValue()
      this.isSwitchTokensClicked = false
    }
  }

  handleBlurFromValue (): void {
    this.isTokenFromFocused = false
  }

  handleBlurToValue (): void {
    this.isTokenToFocused = false
  }

  handleSwitchTokens (): void {
    const currentTokenFrom = this.tokenFrom
    const currentTokenFromValue = this.swapForm.tokenFromValue
    this.isTokenFromFocused = true
    this.isTokenToFocused = true
    this.tokenFrom = this.tokenTo
    this.tokenTo = currentTokenFrom
    this.swapForm.tokenFromValue = this.swapForm.tokenToValue
    this.swapForm.tokenToValue = currentTokenFromValue
    this.isSwitchTokensClicked = true
    this.isTokenFromPrice = true
  }

  handleMaxValue (): void {
    this.swapForm.tokenFromValue = this.tokenFrom.balance
  }

  handleChooseToken (isTokenFrom: boolean): void {
    // TODO: Add Select Token functionality here, default token for tokenFrom is XOR
    if (isTokenFrom) {
      this.tokenFrom = this.tokenTo !== this.tokens.XOR ? this.tokens.XOR : this.tokens.ETH
      this.$alert(`Token ${this.tokenFrom.symbol} is successfully selected!`, 'Success')
    } else {
      this.tokenTo = this.tokenFrom !== this.tokens.ETH ? this.tokens.ETH : this.tokens.XOR
      this.$alert(`Token ${this.tokenTo.symbol} is successfully selected!`, 'Success')
    }
  }

  handleSwitchPrice (): void {
    this.isTokenFromPrice = !this.isTokenFromPrice
  }

  handleConnectWallet (): void {
    // TODO: Add Connect Wallet functionality
    this.isWalletConnected = true
    this.$alert('The wallet is successfully connected!', 'Success')
  }

  handleSwap (): void {
    // TODO: Add Swap functionality and show confirmation windows
    this.$alert(`Output is estimated. You will receive at least ${this.swapForm.tokenToValue} or the transaction will revert.`, 'Confirm Swap')
    this.tokenFrom.balance -= +this.swapForm.tokenFromValue
    this.tokenTo.balance += +this.swapForm.tokenToValue
  }

  // TODO: move to utils or another appropriate place, check for BigInt values
  formatNumber (value: string | number, decimalLendth: number): string {
    const valueNumber = +value
    return valueNumber.toFixed(decimalLendth || 4)
  }
}
</script>

<style lang="scss">
@import '../styles/layout';
@import '../styles/soramitsu-variables';

$swap-input-class: ".el-input";

.el-form--swap {
  .s-input {
    .el-input {
      #{$swap-input-class}__inner {
        padding-top: 0;
      }
    }
    #{$swap-input-class}__inner {
      height: $s-size-small;
      padding-right: 0;
      padding-left: 0;
      border-radius: 0;
      border-bottom-width: 2px;
      color: $s-color-base-content-primary;
      font-size: 20px;
      line-height: 1.26;
      &, &:hover, &:focus {
        background-color: $s-color-base-background;
        border-color: $s-color-base-background;
      }
      &:disabled {
        color: $s-color-base-content-tertiary;
      }
      &:not(:disabled) {
        &:hover, &:focus {
          border-bottom-color: $s-color-base-content-primary;
          color: $s-color-base-content-primary;
        }
      }
    }
    .s-placeholder {
      display: none;
    }
  }
  .el-button--choose-token,
  .el-button--empty-token {
    > span {
      display: inline-flex;
      flex-direction: row-reverse;
      > i[class^=s-icon-] {
        margin-left: $inner-spacing-mini;
        margin-right: 0;
      }
    }
  }
}
</style>

<style lang="scss" scoped>
@import '../styles/layout';
@import '../styles/soramitsu-variables';

.el-form--swap {
  display: flex;
  flex-direction: column;
  align-items: center;
  .input-container {
    position: relative;
    padding: $inner-spacing-small $inner-spacing-medium $inner-spacing-mini;
    width: 100%;
    background-color: $s-color-base-background;
    border-radius: $border-radius-mini;
    .input-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      + .input-line {
        margin-top: $inner-spacing-small;
      }
    }
    .input-title,
    .token-balance {
      display: inline-flex;
      align-items: baseline;
    }
    .input-title {
      font-weight: 600;
      &-estimated {
        font-weight: 400;
      }
    }
    .input-title-estimated,
    .token-balance-value {
      margin-left: $inner-spacing-mini / 2;
    }
    .token-balance {
      margin-left: auto;
      &-title {
        color: $s-color-base-content-tertiary;
        font-size: $s-font-size-small;
      }
    }
    .logo {
      margin-right: $inner-spacing-mini / 2;
      order: 1;
      height: 24px;
      width: 24px;
      background-color: $s-color-utility-surface;
      border: 1px solid $s-color-utility-surface;
      border-radius: $border-radius-small;
      box-shadow: 0px 1px 4px 0px rgba(var(--s-color-standard-black-rgb), 0.35);
  }
    }
  .el-button--switch-tokens {
    &,
    & + .input-container {
      margin-top: $inner-spacing-mini;
    }
  }
  .s-input {
    min-height: 0;
    max-width: 50%;
  }
  .s-action {
    background-color: $s-color-base-background;
    border-color: $s-color-base-background;
    border-radius: $border-radius-small;
    &:not(:disabled) {
      &:hover, &:focus {
        background-color: $s-color-base-background-hover;
        border-color: $s-color-base-background-hover;
      }
    }
  }
  .el-button {
    &--empty-token,
    &--choose-token {
      font-weight: 700;
    }
  }
  .el-button--empty-token {
    position: absolute;
    right: $inner-spacing-mini;
    bottom: $inner-spacing-mini;
  }
  .s-tertiary {
    padding: $inner-spacing-mini / 2 $inner-spacing-mini;
    // background-color: $s-color-theme-secondary;
    // border-color: $s-color-theme-secondary;
    border-radius: $border-radius-mini;
    // color: $s-color-theme-accent;
    // &:hover, &:focus {
    //   background-color: var(--s-color-theme-accent-light-hover);
    //   border-color: var(--s-color-theme-accent-light-hover);
    // }
  }
  .swap-info {
    display: flex;
    align-items: center;
    margin-top: $inner-spacing-mini;
    width: 100%;
    padding-right: $border-radius-mini;
    padding-left: $border-radius-mini;
    color: $s-color-base-content-secondary;
    &--slippage-tolerance {
      margin-top: $inner-spacing-small;
    }
    &-value {
      margin-left: auto;
    }
    .price-impact {
      &-positive {
        color: $s-color-status-success;
      }
      &-negative {
        color: $s-color-status-error;
      }
    }
    .el-tooltip {
      margin-right: $inner-spacing-small;
    }
    &-icon {
      position: relative;
      height: $inner-spacing-big;
      width: $inner-spacing-big;
      background-color: $s-color-base-background;
      border-radius: $border-radius-small;
      &:hover {
        background-color: $s-color-base-background-hover;
        cursor: pointer;
      }
      &:before {
        position: absolute;
        display: block;
        height: 14px;
        width: 14px;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        margin: auto;
      }
    }
  }
  .el-button {
    &--max {
      height: 24px;
      margin-right: $inner-spacing-mini;
    }
    &.el-button--switch-price {
      margin-right: 0;
      margin-left: $inner-spacing-mini;
    }
  }
  .s-primary {
    margin-top: $inner-spacing-medium;
    width: 100%;
    border-radius: $border-radius-small;
    &:disabled {
      color: $s-color-base-on-disabled;
    }
    & + .swap-info {
      margin-top: $inner-spacing-small;
    }
  }
}
</style>
