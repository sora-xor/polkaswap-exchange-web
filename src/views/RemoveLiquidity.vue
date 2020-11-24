<template>
  <div class="remove-liquidity-container">
    <s-row class="header" flex justify="space-between" align="middle">
      <s-button type="action" size="small" icon="arrow-left" />
      <div class="title">{{ t('removeLiquidity.title') }}</div>
      <s-tooltip
        theme="light"
        :content="t('removeLiquidity.description')"
        borderRadius="small"
        placement="bottom-end"
        popperClass="remove-liquidity__description"
        :visible-arrow="false"
      >
        <s-button type="action" size="small" icon="info" />
      </s-tooltip>
    </s-row>
    <s-form
      class="el-form--remove-liquidity"
      :show-message="false"
    >
      <info-card class="slider-container" :title="t('removeLiquidity.amount')">
        <div class="slider-container__amount">
          {{ removeAmount }}<span class="percent">%</span>
        </div>
        <div>
          <s-slider v-model="removeAmount" @change="() => {}"/>
        </div>
      </info-card>
      <div class="input-container">
        <div class="input-line">
          <div class="input-title">{{ t('removeLiquidity.input') }}</div>
          <div v-if="isWalletConnected && firstToken" class="token-balance">
            <span class="token-balance-title">{{ t('createPair.balance') }}</span>
            <span class="token-balance-value">{{ getTokenBalance(liquidity) }}</span>
          </div>
        </div>
        <div class="input-line">
          <s-form-item>
            <s-input
              :value="removeLiquidityAmount"
              :placeholder="inputPlaceholder"
              :disabled="true"
            />
          </s-form-item>
          <div class="token">
            <s-button v-if="isWalletConnected" class="el-button--max" type="tertiary" size="small" @click="handleFirstMaxValue">
              {{ t('exchange.max') }}
            </s-button>
            <s-button type="tertiary" size="small" class="el-button--choose-token">
              <div class="liquidity-logo">
                <pair-token-logo :firstToken="firstToken.symbol" :secondToken="secondToken.symbol" size="mini" />
              </div>
              {{ firstToken.symbol }}-{{ secondToken.symbol }}
            </s-button>
          </div>
        </div>
      </div>

      <s-icon class="icon-divider" name="arrow-bottom" size="medium" />

      <div class="input-container">
        <div class="input-line">
          <div class="input-title">{{ t('removeLiquidity.output') }}</div>
          <div v-if="isWalletConnected && firstToken" class="token-balance">
            <span class="token-balance-title">{{ t('createPair.balance') }}</span>
            <span class="token-balance-value">{{ getTokenBalance(firstToken) }}</span>
          </div>
        </div>
        <div class="input-line">
          <s-form-item>
            <s-input
              :value="firstTokenValue"
              :placeholder="inputPlaceholder"
              :disabled="true"
            />
          </s-form-item>
          <div v-if="firstToken" class="token">
            <s-button v-if="isWalletConnected" class="el-button--max" type="tertiary" size="small" @click="handleFirstMaxValue">
              {{ t('exchange.max') }}
            </s-button>
            <s-button type="tertiary" size="small" borderRadius="small" class="el-button--choose-token">
              <token-logo :token="firstToken.symbol" size="small" />
              {{ firstToken.symbol }}
            </s-button>
          </div>
        </div>
      </div>

      <s-icon class="icon-divider" name="plus" size="medium" />

      <div class="input-container">
        <div class="input-line">
          <div class="input-title">
            <span>{{ t('removeLiquidity.output') }}</span>
          </div>
          <div v-if="isWalletConnected && secondToken" class="token-balance">
            <span class="token-balance-title">{{ t('exchange.balance') }}</span>
            <span class="token-balance-value">{{ getTokenBalance(secondToken) }}</span>
          </div>
        </div>
        <div class="input-line">
          <s-form-item>
            <s-input
              :value="secondTokenValue"
              :placeholder="inputPlaceholder"
              :disabled="true"
            />
          </s-form-item>
          <div v-if="secondToken" class="token">
            <s-button v-if="isWalletConnected" class="el-button--max" type="tertiary" size="small" borderRadius="mini" @click="handleSecondMaxValue">
              {{ t('exchange.max') }}
            </s-button>
            <s-button type="tertiary" size="small" borderRadius="small" class="el-button--choose-token">
              <token-logo :token="secondToken.symbol" size="small" />
              {{ secondToken.symbol }}
            </s-button>
          </div>
        </div>
      </div>
      <s-button type="primary" size="medium" borderRadius="medium" :disabled="isEmptyBalance" @click="showConfirmDialog = true">
        <template v-if="isEmptyBalance">
          {{ t('swap.enterAmount') }}
        </template>
        <template v-else>
          {{ t('removeLiquidity.remove') }}
        </template>
      </s-button>
    </s-form>

    <s-row flex justify="space-between" class="price-container">
      <div>{{ t('removeLiquidity.price')  }}</div>
      <div>
        <div>1 {{ firstToken.symbol }} = {{ formatNumber(firstToken.price / secondToken.price, 2) }} {{ secondToken.symbol }}</div>
        <div>1 {{ secondToken.symbol }} = {{ formatNumber(secondToken.price / firstToken.price, 2) }} {{ firstToken.symbol }}</div>
      </div>
    </s-row>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import TokenLogo from '@/components/TokenLogo.vue'

import router, { lazyComponent } from '@/router'
import { Components } from '@/consts'
import { formatNumber } from '@/utils'
import { Token } from '@/types'
const namespace = 'removeLiquidity'

@Component({
  components: {
    TokenLogo: lazyComponent(Components.TokenLogo),
    InfoCard: lazyComponent(Components.InfoCard),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo)
  }
})
export default class RemoveLiquidity extends Mixins(TranslationMixin) {
  @Getter('liquidity', { namespace }) liquidity!: any
  @Getter tokens!: Array<Token>

  @Action('getLiquidity', { namespace }) getLiquidity
  @Action getTokens

  created () {
    this.getTokens()
    this.getLiquidity(this.liquidityId)
  }

  isWalletConnected = true
  inputPlaceholder: string = formatNumber(0, 2);
  showConfirmDialog = false
  isCreatePairConfirmed = false
  removeAmount = 0

  formatNumber = formatNumber

  get liquidityId (): string {
    return this.$route.params.id
  }

  get firstToken (): Token {
    return this.liquidity ? this.tokens.find(t => t.symbol === this.liquidity.firstToken) || {} as Token : {} as Token
  }

  get secondToken (): Token {
    return this.liquidity ? this.tokens.find(t => t.symbol === this.liquidity.secondToken) || {} as Token : {} as Token
  }

  get firstTokenValue (): string {
    return this.liquidity ? formatNumber(this.liquidity.firstTokenAmount * this.removeAmount / 100, 2) : ''
  }

  get secondTokenValue (): string {
    return this.liquidity ? formatNumber(this.liquidity.secondTokenAmount * this.removeAmount / 100, 2) : ''
  }

  get firstPerSecondPrice (): string {
    return formatNumber(this.firstToken.price / this.secondToken.price, 2)
  }

  get secondPerFirstPrice (): string {
    return formatNumber(this.secondToken.price / this.firstToken.price, 2)
  }

  get areTokensSelected (): boolean {
    return !!this.firstToken && !!this.secondToken
  }

  get isEmptyBalance (): boolean {
    return +this.firstTokenValue === 0 || +this.secondTokenValue === 0
  }

  get removeLiquidityAmount (): string {
    if (this.liquidity) {
      return formatNumber(this.liquidity.balance * this.removeAmount / 100, 2)
    }

    return ''
  }

  handleFirstMaxValue (): void {
    // this.formModel.first = this.firstToken.balance
  }

  handleSecondMaxValue (): void {
    // this.formModel.second = this.secondToken.balance
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

.el-form--remove-liquidity {
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
.remove-liquidity-container {
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

.remove-liquidity__description {
  width: 320px;
  box-shadow: 0px 1px 4px rgba(0, 0, 0, 0.35);
  border: none !important;
}
</style>

<style lang="scss" scoped>
.icon-divider {
  padding: $inner-spacing-medium;
}
.remove-liquidity-container {
  margin: $inner-spacing-big auto;
  padding: $inner-spacing-medium $inner-spacing-medium $inner-spacing-big;
  min-height: $inner-window-height;
  width: $inner-window-width;
  background-color: var(--s-color-utility-surface);
  border-radius: $border-radius-medium;
  box-shadow: var(--s-shadow-surface);
  color: var(--s-color-base-content-primary);
}
.el-form--remove-liquidity {
  display: flex;
  flex-direction: column;
  align-items: center;
  .slider-container {
    width: 100%;

    &__amount {
      font-size: 36px;
      line-height: 120%;
      letter-spacing: -0.04em;
    }
    .percent {
      color: var(--s-color-base-content-secondary)
    }
  }
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

      .liquidity-logo {
        order: 1;
        margin-right: $inner-spacing-mini;
      }

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
    &:not(:disabled) {
      &:hover, &:focus {
        background-color: var(--s-color-base-background-hover);
        border-color: var(--s-color-base-background-hover);
      }
    }
  }
  .s-tertiary {
    padding: $inner-spacing-mini / 2 $inner-spacing-mini / 2 $inner-spacing-mini / 2 $inner-spacing-mini;
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
    &:disabled {
      color: var(--s-color-base-on-disabled);
    }
  }
}

.price-container {
  margin: $inner-spacing-medium $inner-spacing-medium 0;
  line-height: 1.8;
  color: var(--s-color-base-content-secondary)
}
</style>
