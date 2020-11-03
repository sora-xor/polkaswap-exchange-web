<template>
  <div class="swap-info-container">
    <template v-if="showPrice || showSlippageTolerance">
      <div v-if="showPrice" class="swap-info">
        <span>{{ t('exchange.price') }}</span>
        <span class="swap-info-value">{{ priceValue }}</span>
        <s-button class="el-button--switch-price" type="action" size="small" icon="swap" @click="handleSwitchPrice"></s-button>
      </div>
      <div v-if="showSlippageTolerance" class="swap-info swap-info--slippage-tolerance">
        <span>{{ t('swap.slippageTolerance') }}</span>
        <span class="swap-info-value">{{ slippageToleranceValue }}%</span>
      </div>
    </template>
    <template v-else>
      <div class="swap-info">
        <s-tooltip class="swap-info-icon" :closeDelay="10000" :content="t('swap.minReceivedTooltip')" theme="light" placement="right-start" :show-arrow="false">
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
        <s-tooltip class="swap-info-icon" :content="t('swap.liquidityProviderFeeTooltip', { liquidityProviderFeeValue: liquidityProviderFeeValue})" theme="light" placement="right-start" :show-arrow="false">
          <s-icon name="info" size="16"/>
        </s-tooltip>
        <span>{{ t('swap.liquidityProviderFee') }}</span>
        <span class="swap-info-value">{{ liquidityProviderFeeFormattedValue }}</span>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import { formatNumber } from '@/utils'

@Component
export default class SwapInfo extends Mixins(TranslationMixin) {
  @Prop({ type: Boolean, default: false }) showPrice!: boolean
  @Prop({ type: Boolean, default: false }) showSlippageTolerance!: boolean

  @Action getTokenFrom
  @Action getTokenTo
  @Action getTokenFromPrice
  @Action getSlippageTolerance
  @Action getLiquidityProviderFee
  @Getter tokenFrom!: any
  @Getter tokenTo!: any
  @Getter isTokenFromPrice!: boolean
  @Getter slippageTolerance!: number
  @Getter liquidityProviderFee!: number

  get tokenFromValue (): any {
    return this.tokenFrom
  }

  get tokenToValue (): any {
    return this.tokenTo
  }

  get isTokenFromPriceValue (): any {
    return this.isTokenFromPrice
  }

  get priceValue (): string {
    if (this.isTokenFromPriceValue) {
      return formatNumber(this.tokenFromValue.price / this.tokenToValue.price, 4) + ` ${this.tokenFromValue.symbol + ' / ' + this.tokenToValue.symbol}`
    }
    return formatNumber(this.tokenToValue.price / this.tokenFromValue.price, 4) + ` ${this.tokenToValue.symbol + ' / ' + this.tokenFromValue.symbol}`
  }

  get slippageToleranceValue (): any {
    return this.slippageTolerance
  }

  get minReceived (): string {
    // TODO: Generate min received value
    return this.tokenFromValue ? `${formatNumber(24351.25123, 4)} ${this.tokenFromValue.symbol}` : ''
  }

  get priceImpact (): string {
    // TODO: Generate price impact value, is could be positive or negative, use appropriate class to show it in layout
    return formatNumber(0.0222, 2)
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

  get liquidityProviderFeeValue (): any {
    return this.liquidityProviderFee
  }

  get liquidityProviderFeeFormattedValue (): string {
    // TODO: Generate liquidity provider fee
    return this.tokenFromValue ? `${formatNumber(0.0006777, 4)} ${this.tokenFromValue.symbol}` : ''
  }

  created () {
    this.getTokenFromPrice()
    this.getLiquidityProviderFee()
    this.getSlippageTolerance()
  }

  handleSwitchPrice (): void {
    this.$store.commit('GET_TOKEN_FROM_PRICE', !this.isTokenFromPriceValue)
  }
}
</script>

<style lang="scss" scoped>
@import '../styles/layout';
@import '../styles/soramitsu-variables';

.swap-info {
  display: flex;
  align-items: center;
  margin-top: $inner-spacing-mini;
  width: 100%;
  padding-right: $border-radius-mini;
  padding-left: $border-radius-mini;
  color: $s-color-base-content-secondary;
  &-container {
    width: 100%;
  }

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
  .el-button--switch-price {
    margin-right: 0;
    margin-left: $inner-spacing-mini;
  }
}
</style>
