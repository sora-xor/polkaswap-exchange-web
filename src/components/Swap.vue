<template>
  <s-form
    v-model="formModel"
    class="el-form--swap"
    :show-message="false"
  >
    <div class="input-container">
      <div class="input-line">
        <div class="input-title">{{ t('exchange.from') }}</div>
        <div v-if="isWalletConnected && tokenFrom" class="token-balance">
          <span class="token-balance-title">{{ t('exchange.balance') }}</span>
          <span class="token-balance-value">{{ getTokenBalance(tokenFrom) }}</span>
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
        <div v-if="tokenFrom" class="token">
          <!-- TODO: Fix secondary сolors in UI Library and project -->
          <s-button v-if="isWalletConnected && areTokensSelected" class="el-button--max" type="tertiary" size="small" @click="handleMaxFromValue">
            {{ t('exchange.max') }}
          </s-button>
          <s-button type="tertiary" size="small" icon="chevron-bottom-rounded" class="el-button--choose-token" @click="handleChooseToken(true)">
            <span :class="getTokenClasses(tokenFrom)" />
            {{ tokenFrom.symbol }}
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
          <span v-if="tokenTo" class="input-title-estimated">({{ t('swap.estimated') }})</span>
        </div>
        <div v-if="isWalletConnected && tokenTo" class="token-balance">
          <span class="token-balance-title">{{ t('exchange.balance') }}</span>
          <span class="token-balance-value">{{ getTokenBalance(tokenTo) }}</span>
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
        <div v-if="tokenTo" class="token">
          <s-button type="tertiary" size="small" icon="chevron-bottom-rounded" class="el-button--choose-token" @click="handleChooseToken">
            <span :class="getTokenClasses(tokenTo)" />
            {{ tokenTo.symbol }}
          </s-button>
        </div>
        <s-button v-else type="tertiary" size="small" icon="chevron-bottom-rounded" class="el-button--empty-token" @click="handleChooseToken">
          {{ t('swap.chooseToken') }}
        </s-button>
      </div>
    </div>
    <swap-info v-if="areTokensSelected" :showPrice="true" :showSlippageTolerance="true" />
    <s-button v-if="!isWalletConnected" type="primary" size="medium" @click="handleConnectWallet">
      {{ t('swap.connectWallet') }}
    </s-button>
    <s-button v-else type="primary" size="medium" :disabled="!areTokensSelected || isEmptyBalance || isInsufficientBalance" @click="handleConfirmSwap">
      <template v-if="!areTokensSelected">
        {{ t('swap.chooseTokens') }}
      </template>
      <template v-else-if="isEmptyBalance">
        {{ t('swap.enterAmount') }}
      </template>
      <template v-else-if="isInsufficientBalance">
        {{ t('swap.insufficientBalance', { tokenSymbol: tokenFrom.symbol }) }}
      </template>
      <template v-else>
        {{ t('exchange.swap') }}
      </template>
    </s-button>
    <swap-info v-if="areTokensSelected" />
    <select-token :visible="showSelectTokenDialog" @select="handleSelectToken" @close="closeSelectToken"/>
    <confirm-swap :visible="showConfirmSwapDialog && !isSwapConfirmed" @close="closeConfirmSwapDialog" />
    <transaction-submit :visible="isSwapConfirmed" @close="closeTransactionSubmitDialog" />
  </s-form>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import { formatNumber } from '@/utils'
import SwapInfo from '@/components/SwapInfo.vue'
import SelectToken from '@/components/SelectToken.vue'
import ConfirmSwap from '@/components/ConfirmSwap.vue'
import TransactionSubmit from '@/components/TransactionSubmit.vue'

@Component({
  components: { SwapInfo, SelectToken, ConfirmSwap, TransactionSubmit }
})
export default class Swap extends Mixins(TranslationMixin) {
  @Getter isWalletConnected!: any
  @Getter tokenFrom!: any
  @Getter tokenTo!: any
  @Getter fromValue!: number
  @Getter toValue!: number
  @Getter isSwapConfirmed!: boolean
  @Action connectWallet
  @Action setTokenFrom
  @Action setTokenTo
  @Action setFromValue
  @Action setToValue
  @Action setTokenFromPrice

  inputPlaceholder: string = formatNumber(0, 2);
  isFieldFromFocused = false;
  isFieldToFocused = false;
  isTokenFromSelected = false;
  showSelectTokenDialog = false;
  showConfirmSwapDialog = false;
  showTransactionSubmitDialog = false;

  formModel = {
    from: formatNumber(0, 1),
    to: formatNumber(0, 1)
  }

  get areTokensSelected (): boolean {
    return this.tokenFrom && this.tokenTo
  }

  get isEmptyBalance (): boolean {
    return +this.formModel.from === 0 || +this.formModel.to === 0
  }

  get isInsufficientBalance (): boolean {
    if (this.areTokensSelected) {
      return +this.formModel.from > this.tokenFrom.balance
    }
    return true
  }

  getTokenBalance (token: any): string {
    if (token) {
      return formatNumber(token.balance, 2)
    }
    return ''
  }

  getTokenClasses (token): string {
    let classes = 'token-logo'
    if (token && token.symbol) {
      classes += ' token-logo--' + token.symbol.toLowerCase()
    }
    return classes
  }

  handleChangeFieldFrom (): void {
    if (this.areTokensSelected && !this.isFieldToFocused) {
      this.isFieldFromFocused = true
      if (+this.formModel.from === 0) {
        this.formModel.to = formatNumber(0, 4)
      } else {
        this.formModel.to = formatNumber(+this.formModel.from * this.tokenFrom.price / this.tokenTo.price, 4)
      }
      this.setToValue(this.formModel.to)
    }
    this.setFromValue(this.formModel.from)
  }

  handleChangeFieldTo (): void {
    if (this.areTokensSelected && !this.isFieldFromFocused) {
      this.isFieldToFocused = true
      if (+this.formModel.to === 0) {
        this.formModel.from = formatNumber(0, 4)
      } else {
        this.formModel.from = formatNumber(+this.formModel.to * this.tokenTo.price / this.tokenFrom.price, 4)
      }
      this.setFromValue(this.formModel.from)
    }
    this.setToValue(this.formModel.to)
  }

  handleBlurFieldFrom (): void {
    this.isFieldFromFocused = false
  }

  handleBlurFieldTo (): void {
    this.isFieldToFocused = false
  }

  handleSwitchTokens (): void {
    const currentTokenFrom = this.tokenFrom
    const currentFieldFromValue = this.formModel.from
    this.isFieldFromFocused = true
    this.isFieldToFocused = true
    this.setTokenFrom(this.tokenTo)
    this.setTokenTo(currentTokenFrom)
    this.formModel.from = this.formModel.to
    this.formModel.to = currentFieldFromValue
    this.isFieldFromFocused = false
    this.isFieldToFocused = false
    this.setTokenFromPrice(true)
  }

  handleMaxFromValue (): void {
    this.formModel.from = this.tokenFrom.balance
  }

  handleConnectWallet (): void {
    // TODO: Add Connect Wallet functionality, right now updated the value only on page reloading
    this.connectWallet('43f65bccca11ff53840a85d5af5bf1d1762f92a8e03')
    location.reload()
  }

  handleConfirmSwap (): void {
    this.showConfirmSwapDialog = true
  }

  handleChooseToken (isTokenFrom: boolean): void {
    if (isTokenFrom) {
      this.isTokenFromSelected = true
    }
    this.showSelectTokenDialog = true
  }

  handleSelectToken (token: any): void {
    if (token) {
      if (this.isTokenFromSelected) {
        this.setTokenFrom(token)
        this.isTokenFromSelected = false
      } else {
        this.setTokenTo(token)
      }
    }
  }

  closeSelectToken () {
    this.showSelectTokenDialog = false
  }

  closeConfirmSwapDialog () {
    this.showConfirmSwapDialog = false
    if (this.isSwapConfirmed) {
      this.showTransactionSubmitDialog = true
    }
  }

  closeTransactionSubmitDialog () {
    this.showTransactionSubmitDialog = false
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
@import '../styles/mixins';
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
    .token-logo {
      margin-right: $inner-spacing-mini;
      order: 1;
      @include token-logo-styles(23px);
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
