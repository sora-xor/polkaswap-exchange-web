<template>
  <div class="create-pair-container">
    <s-row class="header" flex justify="space-between" align="middle">
      <s-button type="action" size="small" icon="arrow-left" />
      <div class="title">{{ t('createPair.title') }}</div>
      <s-button type="action" size="small" icon="info" />
    </s-row>
    <s-form
      v-model="formModel"
      class="el-form--create-pair"
      :show-message="false"
    >
      <div class="input-container">
        <div class="input-line">
          <div class="input-title">{{ t('createPair.deposit') }}</div>
          <div v-if="connected && firstToken" class="token-balance">
            <span class="token-balance-title">{{ t('createPair.balance') }}</span>
            <span class="token-balance-value">{{ getTokenBalance(firstToken) }}</span>
          </div>
        </div>
        <div class="input-line">
          <s-form-item>
            <s-input
              v-model="formModel.first"
              v-float="formModel.first"
              :placeholder="inputPlaceholder"
              :disabled="!areTokensSelected"
              @change="handleChangeFirstField"
            />
          </s-form-item>
          <div v-if="firstToken" class="token">
            <s-button v-if="connected" class="el-button--max" type="tertiary" size="small" @click="handleFirstMaxValue">
              {{ t('exchange.max') }}
            </s-button>
            <s-button type="tertiary" size="small" icon="chevron-bottom-rounded" class="el-button--choose-token" @click="firstModalVisible = true">
              <token-logo :token="firstToken.symbol" size="small" />
              {{ firstToken.symbol }}
            </s-button>
          </div>
          <s-button v-else type="tertiary" size="small" icon="chevron-bottom-rounded" class="el-button--empty-token" @click="firstModalVisible = true">
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
          <div v-if="connected && secondToken" class="token-balance">
            <span class="token-balance-title">{{ t('exchange.balance') }}</span>
            <span class="token-balance-value">{{ getTokenBalance(secondToken.balance) }}</span>
          </div>
        </div>
        <div class="input-line">
          <s-form-item>
            <s-input
              v-model="formModel.second"
              v-float="formModel.second"
              :placeholder="inputPlaceholder"
              :disabled="!areTokensSelected"
              @change="handleChangeSecondField"
            />
          </s-form-item>
          <div v-if="secondToken" class="token">
            <s-button v-if="connected" class="el-button--max" type="tertiary" size="small" @click="handleSecondMaxValue">
              {{ t('exchange.max') }}
            </s-button>
            <s-button type="tertiary" size="small" icon="chevron-bottom-rounded" class="el-button--choose-token" @click="secondModalVisible = true">
              <token-logo :token="secondToken.symbol" size="small" />
              {{ secondToken.symbol }}
            </s-button>
          </div>
          <s-button v-else type="tertiary" size="small" icon="chevron-bottom-rounded" class="el-button--empty-token" @click="secondModalVisible = true">
            {{t('swap.chooseToken')}}
          </s-button>
        </div>
      </div>
        <s-button type="primary" size="medium" :disabled="!areTokensSelected || isEmptyBalance || isInsufficientBalance" @click="showConfirmDialog = true">
        <template v-if="!areTokensSelected">
          {{ t('swap.chooseTokens') }}
        </template>
        <template v-else-if="isEmptyBalance">
          {{ t('swap.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('swap.insufficientBalance', { tokenSymbol: firstToken.symbol }) }}
        </template>
        <template v-else>
          {{ t('createPair.supply') }}
        </template>
      </s-button>
    </s-form>

    <div v-if="areTokensSelected" class="card">
      <div class="card__title">{{ t('createPair.pricePool') }}</div>
      <div class="card__data">
        <div>{{ t('createPair.firstPerSecond', { first: firstToken.symbol, second: secondToken.symbol }) }}</div>
        <div>{{ firstPerSecondPrice }} {{ firstToken.symbol }}</div>
      </div>
      <div class="card__data">
        <div>{{ t('createPair.firstPerSecond', { first: secondToken.symbol, second: firstToken.symbol })  }}</div>
        <div>{{ secondPerFirstPrice }} {{ secondToken.symbol }}</div>
      </div>
      <div class="card__data">
        <div>{{ t('createPair.shareOfPool') }}</div>
        <div>{{ shareOfPool }}</div>
      </div>
    </div>

    <div v-if="areTokensSelected" class="card">
      <div class="card__title">{{ t('createPair.yourPosition') }}</div>
      <div class="card__data">
        <div>{{ t('createPair.firstSecondPoolTokens', { first: secondToken.symbol, second: firstToken.symbol })  }}</div>
        <div>{{ poolTokens }}</div>
      </div>
      <s-divider />
      <div class="card__data">
        <div>{{ firstToken.symbol }}</div>
        <div>{{ firstTokenPosition }}</div>
      </div>
      <div class="card__data">
        <div>{{ secondToken.symbol }}</div>
        <div>{{ secondTokenPosition }}</div>
      </div>
    </div>

    <select-token :visible="firstModalVisible" @close="firstModalVisible = false" @select="setFirstToken" />
    <select-token :visible="secondModalVisible" @close="secondModalVisible = false" @select="setSecondToken" />

    <confirm-create-pair :visible="showConfirmDialog" @close="() => { showConfirmDialog = false; isCreatePairConfirmed = true }" />
    <create-pair-submit :visible="isCreatePairConfirmed" @close="isCreatePairConfirmed = false" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import SelectToken from '@/components/SelectToken.vue'
import ConfirmCreatePair from '@/components/ConfirmCreatePair.vue'
import CreatePairSubmit from '@/components/CreatePairSubmit.vue'
import TokenLogo from '@/components/TokenLogo.vue'

import router from '@/router'
import { formatNumber, isWalletConnected } from '@/utils'
const namespace = 'createPair'

@Component({
  components: { SelectToken, ConfirmCreatePair, CreatePairSubmit, TokenLogo }
})
export default class CreatePair extends Mixins(TranslationMixin) {
  @Getter('firstToken', { namespace }) firstToken!: any
  @Getter('secondToken', { namespace }) secondToken!: any
  @Getter('firstTokenValue', { namespace }) firstTokenValue!: number
  @Getter('secondTokenValue', { namespace }) secondTokenValue!: number

  @Action('setFirstToken', { namespace }) setFirstToken
  @Action('setSecondToken', { namespace }) setSecondToken
  @Action('setFirstTokenValue', { namespace }) setFirstTokenValue
  @Action('setSecondTokenValue', { namespace }) setSecondTokenValue

  firstModalVisible = false
  secondModalVisible = false
  inputPlaceholder: string = formatNumber(0, 2);
  showConfirmDialog = false
  isCreatePairConfirmed = false

  formModel = {
    first: formatNumber(0, 1),
    second: formatNumber(0, 1)
  }

  formatNumber = formatNumber

  get connected (): boolean {
    return isWalletConnected()
  }

  get firstPerSecondPrice (): string {
    return formatNumber(this.firstToken.price / this.secondToken.price, 2)
  }

  get secondPerFirstPrice (): string {
    return formatNumber(this.secondToken.price / this.firstToken.price, 2)
  }

  get firstTokenPosition (): string {
    return formatNumber(0, 2)
  }

  get secondTokenPosition (): string {
    return formatNumber(0, 2)
  }

  get poolTokens (): string {
    return formatNumber(0, 2)
  }

  get shareOfPool (): string {
    return '<0.01%'
  }

  get areTokensSelected (): boolean {
    return this.firstToken && this.secondToken
  }

  get isEmptyBalance (): boolean {
    return +this.firstTokenValue === 0 || +this.secondTokenValue === 0
  }

  get isInsufficientBalance (): boolean {
    if (this.areTokensSelected) {
      return +this.formModel.first > this.firstToken.balance
    }

    return true
  }

  handleChangeFirstField (): void {
    this.setFirstTokenValue(this.formModel.first)
  }

  handleChangeSecondField (): void {
    this.setSecondTokenValue(this.formModel.second)
  }

  handleFirstMaxValue (): void {
    this.formModel.first = this.firstToken.balance
  }

  handleSecondMaxValue (): void {
    this.formModel.second = this.secondToken.balance
  }

  getTokenBalance (token: any): string {
    if (token) {
      return formatNumber(token.balance, 2)
    }
    return ''
  }
}
</script>

<style lang="scss">
$swap-input-class: ".el-input";

.plus {
  padding: $inner-spacing-medium;
}
.el-form--create-pair {
  .s-input {
    .el-input {
      #{$swap-input-class}__inner {
        padding-top: 0;
      }
    }
    #{$swap-input-class}__inner {
      height: var(--s-size-small);
      padding-right: 0;
      padding-left: 0;
      border-radius: 0;
      border-bottom-width: 2px;
      color: var(--s-color-base-content-primary);
      font-size: 20px;
      line-height: 1.26;
      &, &:hover, &:focus {
        background-color: var(--s-color-base-background);
        border-color: var(--s-color-base-background);
      }
      &:disabled {
        color: var(--s-color-base-content-tertiary);
      }
      &:not(:disabled) {
        &:hover, &:focus {
          border-bottom-color: var(--s-color-base-content-primary);
          color: var(--s-color-base-content-primary);
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
    margin-bottom: $inner-spacing-medium;
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
.card {
  border: 1px solid var(--s-color-base-background-hover);
  box-sizing: border-box;
  border-radius: 12px;
  margin: $inner-spacing-mini 0;
  padding: $inner-spacing-medium;
  &__title {
    font-weight: 600;
    line-height: 1.8;
    color: var(--s-color-base-content-primary);
  }
  &__data {
    color: var(--s-color-base-content-tertiary);
    line-height: 1.8;
    display: flex;
    justify-content: space-between;
  }
  .el-divider {
    margin-top: $inner-spacing-mini;
    margin-bottom: $inner-spacing-mini;
  }
}
.create-pair-container {
  margin: $inner-spacing-big auto;
  padding: $inner-spacing-medium $inner-spacing-medium $inner-spacing-big;
  min-height: $inner-window-height;
  width: $inner-window-width;
  background-color: var(--s-color-utility-surface);
  border-radius: $border-radius-medium;
  box-shadow: var(--s-shadow-surface);
  color: var(--s-color-base-content-primary);
}
.el-form--create-pair {
  display: flex;
  flex-direction: column;
  align-items: center;
  .input-container {
    position: relative;
    padding: $inner-spacing-small $inner-spacing-medium $inner-spacing-mini;
    width: 100%;
    background-color: var(--s-color-base-background);
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

      .token-logo {
        order: 1;
        margin-right: $inner-spacing-mini;
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
    .token-balance-value {
      margin-left: $inner-spacing-mini / 2;
    }
    .token-balance {
      margin-left: auto;
      &-title {
        color: var(--s-color-base-content-tertiary);
        font-size: $s-font-size-small;
      }
    }
  }
  .s-input {
    min-height: 0;
  }
  .s-action {
    background-color: var(--s-color-base-background);
    border-color: var(--s-color-base-background);
    border-radius: $border-radius-small;
    &:not(:disabled) {
      &:hover, &:focus {
        background-color: var(--s-color-base-background-hover);
        border-color: var(--s-color-base-background-hover);
      }
    }
  }
  .s-tertiary {
    padding: $inner-spacing-mini / 2 $inner-spacing-mini / 2 $inner-spacing-mini / 2 $inner-spacing-mini;
    border-radius: $border-radius-mini;
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
      background-color: var(--s-color-base-background);
      border-color: var(--s-color-base-background);
      border-radius: $border-radius-medium;
      color: var(--s-color-base-content-primary);
      &:hover, &:active, &:focus {
        background-color: var(--s-color-base-background-hover);
        border-color: var(--s-color-base-background-hover);
        color: var(--s-color-base-content-primary);
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
      color: var(--s-color-base-on-disabled);
    }
  }
}
</style>
