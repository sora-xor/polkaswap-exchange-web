<template>
  <div class="create-pair-container">
    <s-row class="header" flex justify="space-between" align="middle">
      <s-button type="action" size="small" icon="arrow-left">
      </s-button>
      <div class="title">{{ t('createPair.title') }}</div>
      <s-button type="action" size="small" icon="info">
      </s-button>
    </s-row>
    <s-form
      v-model="pairForm"
      class="el-form--swap"
      :show-message="false"
    >
      <div class="input-container">
        <div class="input-line">
          <div class="input-title">{{ t('createPair.deposit') }}</div>
          <div v-if="isWalletConnected && tokenFrom" class="token-balance">
            <span class="token-balance-title">{{ t('createPair.balance') }}</span>
            <span class="token-balance-value">{{ formatNumber(tokenFrom.balance, 2) }}</span>
          </div>
        </div>
        <div class="input-line">
          <s-form-item>
            <s-input
              v-model="pairForm.tokenFromValue"
              v-float="pairForm.tokenFromValue"
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
            <s-button type="tertiary" size="small" icon="chevron-bottom-rounded" class="el-button--choose-token" @click="fromTokenModalVisible = true">
              <span class="logo">{{ tokenFrom.logo }}</span>
              {{ tokenFrom.symbol }}
            </s-button>
          </div>
          <s-button v-else type="tertiary" size="small" icon="chevron-bottom-rounded" class="el-button--empty-token" @click="fromTokenModalVisible = true">
            {{ t('swap.chooseToken') }}
          </s-button>
        </div>
      </div>
      <s-icon class="plus" name="plus" size="medium" />
      <div class="input-container">
        <div class="input-line">
          <div class="input-title">
            <span>{{ t('createPair.deposit') }}</span>
          </div>
          <div v-if="isWalletConnected && tokenTo" class="token-balance">
            <span class="token-balance-title">{{ t('exchange.balance') }}</span>
            <span class="token-balance-value">{{ formatNumber(tokenTo.balance, 2) }}</span>
          </div>
        </div>
        <div class="input-line">
          <s-form-item>
            <s-input
              v-model="pairForm.tokenToValue"
              v-float="pairForm.tokenToValue"
              :placeholder="formatNumber(0, 2)"
              :disabled="!tokensSelected"
              @change="handleChangeToValue"
              @blur="handleBlurToValue"
            />
          </s-form-item>
          <div v-if="tokenTo" class="token">
            <s-button type="tertiary" size="small" icon="chevron-bottom-rounded" class="el-button--choose-token" @click="toTokenModalVisible = true">
              <span class="logo">{{ tokenTo.logo }}</span>
              {{ tokenTo.symbol }}
            </s-button>
          </div>
          <s-button v-else type="tertiary" size="small" icon="chevron-bottom-rounded" class="el-button--empty-token" @click="toTokenModalVisible = true">
            {{t('swap.chooseToken')}}
          </s-button>
        </div>
      </div>
        <s-button type="primary" size="medium" :disabled="!tokensSelected || isEmptyBalance || isInsufficientBalance" @click="handleSwap">
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
          {{ t('createPair.supply') }}
        </template>
      </s-button>
    </s-form>

    <select-token :visible="fromTokenModalVisible" @close="fromTokenModalVisible = false" @select="token => tokenFrom = token" />
    <select-token :visible="toTokenModalVisible" @close="toTokenModalVisible = false" @select="token => tokenTo = token" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import SelectToken from '@/components/SelectToken.vue'
import router from '@/router'
const namespace = 'createPair'

@Component({
  components: { SelectToken }
})
export default class CreatePair extends Mixins(TranslationMixin) {
  // TODO: Add Slippage Tolerance value for appropriate place
  slippageToleranceValue = 0.5;
  // ------------------ Mock data end ------------------
  isWalletConnected = true
  @Getter tokenFrom!: any
  @Getter tokenTo!: any
  @Getter fromValue!: number
  @Getter toValue!: number

  @Action setTokenFrom
  @Action setTokenTo
  @Action setFromValue
  @Action setToValue

  fromTokenModalVisible = false
  toTokenModalVisible = false

  isTokenFromFocused = false
  isTokenToFocused = false
  isTokenFromPrice = true

  get tokensSelected (): boolean {
    return this.tokenFrom && this.tokenTo
  }

  get isEmptyBalance (): boolean {
    return +this.fromValue === 0 || +this.toValue === 0
  }

  get isInsufficientBalance (): boolean {
    if (this.tokensSelected) {
      return +this.fromValue > this.fromValue
    }
    return true
  }

  get liquidityProviderFee (): string {
    // TODO: Generate liquidity provider fee
    return this.tokenFrom ? `${this.formatNumber(0.0006777, 4)} ${this.tokenFrom.symbol}` : ''
  }

  handleMaxValue (): void {
    // this.pairForm.tokenFromValue = this.tokenFrom.balance
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

$tabs-class: ".el-tabs";
$tabs-container-height: $basic-spacing * 4;
$tabs-container-padding: 2px;
$tabs-item-height: $tabs-container-height - $tabs-container-padding * 2;

$swap-input-class: ".el-input";

.plus {
  padding: 16px;
}

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
.create-pair-container {
  .header {
    margin-bottom: 16px;

    .title {
      font-size: 24px;
      line-height: 130%;
      letter-spacing: -0.02em;
      font-feature-settings: 'tnum' on, 'lnum' on, 'salt' on, 'case' on;
    }
  }
}
</style>

<style lang="scss" scoped>
@import '../styles/layout';
@import '../styles/soramitsu-variables';

.create-pair-container {
  margin: $inner-spacing-big auto;
  padding: $inner-spacing-medium $inner-spacing-medium $inner-spacing-big;
  min-height: $inner-window-height;
  width: $inner-window-width;
  background-color: $s-color-utility-surface;
  border-radius: $border-radius-medium;
  box-shadow: $s-shadow-surface;
  color: $s-color-base-content-primary;
  .s-tabs {
    width: 100%;
  }
}

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
