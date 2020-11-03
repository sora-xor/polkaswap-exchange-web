<template>
  <s-form
    v-model="formModel"
    class="el-form--swap"
    :show-message="false"
  >
    <div class="input-container">
      <div class="input-line">
        <div class="input-title">{{ t('exchange.from') }}</div>
        <div v-if="isWalletConnected && tokenFromValue" class="token-balance">
          <span class="token-balance-title">{{ t('exchange.balance') }}</span>
          <span class="token-balance-value">{{ getTokenBalance(tokenFromValue) }}</span>
        </div>
      </div>
      <div class="input-line">
        <s-form-item>
          <s-input
            v-model="formModel.from"
            v-float="formModel.from"
            :placeholder="inputPlaceholder"
            :disabled="!areTokensSelected"
            @change="handleChangeFieldFrom"
            @blur="handleBlurFieldFrom"
          />
        </s-form-item>
        <div v-if="tokenFromValue" class="token">
          <!-- TODO: Fix secondary сolors in UI Library and project -->
          <s-button v-if="isWalletConnected && areTokensSelected" class="el-button--max" type="tertiary" size="small" @click="handleMaxFromValue">
            {{ t('exchange.max') }}
          </s-button>
          <s-button type="tertiary" size="small" icon="chevron-bottom-rounded" class="el-button--choose-token" @click="handleChooseToken(true)">
            <span class="logo">{{ tokenFromValue.logo }}</span>
            {{ tokenFromValue.symbol }}
          </s-button>
        </div>
        <s-button v-else type="tertiary" size="small" icon="chevron-bottom-rounded" class="el-button--empty-token" @click="handleChooseToken(true)">
          {{ t('swap.chooseToken') }}
        </s-button>
      </div>
    </div>
    <s-button class="el-button--switch-tokens" type="action" size="medium" icon="change-positions" @click="handleSwitchTokens" />
    <div class="input-container">
      <div class="input-line">
        <div class="input-title">
          <span>{{ t('exchange.to') }}</span>
          <span v-if="tokenToValue" class="input-title-estimated">({{ t('swap.estimated') }})</span>
        </div>
        <div v-if="isWalletConnected && tokenToValue" class="token-balance">
          <span class="token-balance-title">{{ t('exchange.balance') }}</span>
          <span class="token-balance-value">{{ getTokenBalance(tokenToValue) }}</span>
        </div>
      </div>
      <div class="input-line">
        <s-form-item>
          <s-input
            v-model="formModel.to"
            v-float="formModel.to"
            :placeholder="inputPlaceholder"
            :disabled="!areTokensSelected"
            @change="handleChangeFieldTo"
            @blur="handleBlurFieldTo"
          />
        </s-form-item>
        <div v-if="tokenToValue" class="token">
          <s-button type="tertiary" size="small" icon="chevron-bottom-rounded" class="el-button--choose-token" @click="handleChooseToken">
            <span class="logo">{{ tokenToValue.logo }}</span>
            {{ tokenToValue.symbol }}
          </s-button>
        </div>
        <s-button v-else type="tertiary" size="small" icon="chevron-bottom-rounded" class="el-button--empty-token" @click="handleChooseToken">
          {{t('swap.chooseToken')}}
        </s-button>
      </div>
    </div>
    <swap-info v-if="areTokensSelected" :showPrice="true" :showSlippageTolerance="true" />
    <s-button v-if="!isWalletConnected" type="primary" size="medium" @click="handleConnectWallet">
      {{ t('swap.connectWallet') }}
    </s-button>
    <s-button v-else type="primary" size="medium" :disabled="!areTokensSelected || isEmptyBalance || isInsufficientBalance" @click="handleSwap">
      <template v-if="!areTokensSelected">
        {{ t('swap.chooseTokens') }}
      </template>
      <template v-else-if="isEmptyBalance">
        {{ t('swap.enterAmount') }}
      </template>
      <template v-else-if="isInsufficientBalance">
        {{ t('swap.insufficientBalance', { tokenSymbol: tokenFromValue.symbol }) }}
      </template>
      <template v-else>
        {{ t('exchange.swap') }}
      </template>
    </s-button>
    <swap-info v-if="areTokensSelected" />
    <confirm-swap :visible="showConfirmSwapDialog" :transactionValue="transactionValue" @after-closed="handleAfterConfirmSwapClosed" />
    <transaction-submit :visible="showTransactionSubmitDialog" />
  </s-form>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import { formatNumber } from '@/utils'
import SwapInfo from '@/components/SwapInfo.vue'
import ConfirmSwap from '@/components/ConfirmSwap.vue'
import TransactionSubmit from '@/components/TransactionSubmit.vue'

@Component({
  components: { SwapInfo, ConfirmSwap, TransactionSubmit }
})
export default class Swap extends Mixins(TranslationMixin) {
  formModel: any = {
    from: formatNumber(0, 1),
    to: formatNumber(0, 1)
  };

  inputPlaceholder: string = formatNumber(0, 2);
  isFieldFromFocused = false;
  isFieldToFocused = false;
  isSwitchTokensClicked = false;
  showConfirmSwapDialog = false;
  showTransactionSubmitDialog = false;

  @Action getTokenFrom
  @Action getTokenTo
  @Getter tokenFrom!: any
  @Getter tokenTo!: any

  get isWalletConnected (): boolean {
    return localStorage.getItem('walletAddress') !== null
  }

  // TODO rename this computed variable
  get tokenFromValue (): any {
    return this.tokenFrom
  }

  // TODO rename this computed variable
  get tokenToValue (): any {
    return this.tokenTo
  }

  get areTokensSelected (): boolean {
    return this.tokenFromValue && this.tokenToValue
  }

  get isEmptyBalance (): boolean {
    return +this.formModel.from === 0 || +this.formModel.to === 0
  }

  get isInsufficientBalance (): boolean {
    if (this.areTokensSelected) {
      return +this.formModel.from > this.tokenFromValue.balance
    }
    return true
  }

  get transactionValue (): any {
    return this.formModel.to
  }

  getTokenBalance (token: any): string {
    if (token && token.balance) {
      return formatNumber(token.balance, 2)
    }
    return ''
  }

  handleChangeFieldFrom (): void {
    if (this.areTokensSelected && +this.formModel.from !== 0 && !this.isFieldToFocused) {
      this.isFieldFromFocused = true
      this.formModel.to = formatNumber(+this.formModel.from * this.tokenFromValue.price / this.tokenToValue.price, 4)
    }
  }

  handleChangeFieldTo (): void {
    if (this.areTokensSelected && +this.formModel.to !== 0 && !this.isFieldFromFocused) {
      this.isFieldToFocused = true
      this.formModel.from = formatNumber(+this.formModel.to * this.tokenToValue.price / this.tokenFromValue.price, 4)
    }
    if (this.isSwitchTokensClicked) {
      this.handleBlurFieldFrom()
      this.handleBlurFieldTo()
      this.isSwitchTokensClicked = false
    }
  }

  handleBlurFieldFrom (): void {
    this.isFieldFromFocused = false
  }

  handleBlurFieldTo (): void {
    this.isFieldToFocused = false
  }

  handleSwitchTokens (): void {
    const currentTokenFrom = this.tokenFromValue
    const currentFieldFromValue = this.formModel.from
    this.isFieldFromFocused = true
    this.isFieldToFocused = true
    this.$store.commit('GET_TOKEN_FROM', this.tokenToValue)
    this.$store.commit('GET_TOKEN_TO', currentTokenFrom)
    this.formModel.from = this.formModel.to
    this.formModel.to = currentFieldFromValue
    this.isSwitchTokensClicked = true
    this.$store.commit('GET_TOKEN_FROM_PRICE', true)
  }

  handleMaxFromValue (): void {
    this.formModel.from = this.tokenFromValue.balance
  }

  handleChooseToken (isTokenFrom: boolean): void {
    // TODO: Add Select Token functionality here, default token for tokenFrom is XOR
    if (isTokenFrom) {
      // this.tokenFromValue && this.tokenFromValue.XOR
      this.getTokenFrom()
      // this.tokenFrom = this.tokenTo !== this.tokens.XOR ? this.tokens.XOR : this.tokens.ETH
      // this.$alert(`Token ${this.tokenFrom.symbol} is successfully selected!`, 'Success')
    } else {
      this.getTokenTo()
      // this.tokenTo = this.tokenFrom !== this.tokens.ETH ? this.tokens.ETH : this.tokens.XOR
      // this.$alert(`Token ${this.tokenTo.symbol} is successfully selected!`, 'Success')
    }
  }

  handleConnectWallet (): void {
    // TODO: Add Connect Wallet functionality, right now updated the value only on page reloading
    localStorage.setItem('walletAddress', '43f65bccca11ff53840a85d5af5bf1d1762f92a8e03')
    this.$alert('The wallet is successfully connected!', 'Success')
  }

  handleSwap (): void {
    // TODO: Add Swap functionality and show confirmation windows
    this.tokenFromValue.balance -= +this.formModel.from
    this.tokenToValue.balance += +this.formModel.to
    this.showConfirmSwapDialog = true
  }

  handleAfterConfirmSwapClosed (): void {
    // TODO: show dialog only if transaction was confirmed
    // this.showTransactionSubmitDialog = true
  }
}
</script>

<style lang="scss">
@import '../styles/layout';
@import '../styles/typography';
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
  .el-button {
    &--choose-token,
    &--empty-token {
      > span {
        display: inline-flex;
        flex-direction: row-reverse;
        align-items: center;
        > i[class^=s-icon-] {
          margin-left: $inner-spacing-mini / 2;
          margin-right: 0;
          font-size: 20px;
        }
      }
    }
    &--choose-token {
      > span {
        > i[class^=s-icon-] {
          margin-left: $inner-spacing-mini;
        }
      }
    }
  }
}

.el-tooltip__popper.is-light {
  padding: $inner-spacing-mini;
  max-width: 320px;
  border: none !important;
  border-radius: $border-radius-mini;
  box-shadow: $s-shadow-tooltip;
  font-size: $s-font-size-small;
  line-height: 1.785;
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
    .el-form-item {
      margin-bottom: 0;
      width: 50%;
    }
    .token {
      display: flex;
      align-items: center;
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
      margin-right: $inner-spacing-mini;
      order: 1;
      height: 23px;
      width: 23px;
      background-color: $s-color-utility-surface;
      border: 1px solid $s-color-utility-surface;
      border-radius: $border-radius-small;
      box-shadow: $s-shadow-tooltip;
    }
  }
  .s-input {
    min-height: 0;
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
  .s-tertiary {
    padding: $inner-spacing-mini / 2 $inner-spacing-mini / 2 $inner-spacing-mini / 2 $inner-spacing-mini;
    background-color: $s-color-button-tertiary-background;
    border-color: $s-color-button-tertiary-background;
    border-radius: $border-radius-mini;
    color: $s-color-button-tertiary-color;
    &:hover {
      background-color: $s-color-button-tertiary-background-hover;
      border-color: $s-color-button-tertiary-background-hover;
    }
    &:active {
      background-color: $s-color-button-tertiary-background-pressed;
      border-color: $s-color-button-tertiary-background-pressed;
      color: $s-color-button-tertiary-color-active;
    }
    &:focus {
      background-color: $s-color-button-tertiary-background-focused;
      border-color: $s-color-button-tertiary-background-focused;
    }
  }
  .el-button {
    &--switch-tokens {
      &,
      & + .input-container {
        margin-top: $inner-spacing-mini;
      }
    }
    &--max,
    &--empty-token,
    &--choose-token {
      font-weight: 700;
    }
    &--max {
      margin-right: $inner-spacing-mini;
      padding-right: $inner-spacing-mini;
      height: 24px;
    }
    &--empty-token {
      position: absolute;
      right: $inner-spacing-mini;
      bottom: $inner-spacing-mini;
    }
    &--choose-token {
      margin-left: 0;
      margin-right: -$inner-spacing-mini;
      padding-left: $inner-spacing-mini / 2;
      background-color: $s-color-base-background;
      border-color: $s-color-base-background;
      border-radius: $border-radius-medium;
      color: $s-color-base-content-primary;
      &:hover, &:active, &:focus {
        background-color: $s-color-base-background-hover;
        border-color: $s-color-base-background-hover;
        color: $s-color-base-content-primary;
      }
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
