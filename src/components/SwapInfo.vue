<template>
  <div class="swap-info-container">
    <template v-if="showPrice || showSlippageTolerance">
      <div v-if="showPrice" class="swap-info">
        <span>{{ t('exchange.price') }}</span>
        <span class="swap-info-value">{{ price }}</span>
        <s-button class="el-button--switch-price" type="action" size="small" icon="swap" @click="handleSwitchPrice" />
      </div>
      <div v-if="showSlippageTolerance" class="swap-info swap-info--slippage-tolerance">
        <span>{{ t('swap.slippageTolerance') }}</span>
        <span class="swap-info-value">{{ slippageTolerance }}%</span>
      </div>
    </template>
    <template v-else>
      <div class="swap-info">
        <s-tooltip class="swap-info-icon" borderRadius="mini" :content="t('swap.minReceivedTooltip')" theme="light" placement="right-start" :show-arrow="false">
          <s-icon name="info" size="16" />
        </s-tooltip>
        <span>{{ t('swap.minReceived') }}</span>
        <span class="swap-info-value">{{ minReceived }}</span>
      </div>
      <div class="swap-info">
        <s-tooltip class="swap-info-icon" borderRadius="mini" :content="t('swap.priceImpactTooltip')" theme="light" placement="right-start" :show-arrow="false">
          <s-icon name="info" size="16" />
        </s-tooltip>
        <span>{{ t('swap.priceImpact') }}</span>
        <span :class="'swap-info-value ' + priceImpactClass">{{ priceImpact }}%</span>
      </div>
      <div class="swap-info">
        <s-tooltip class="swap-info-icon" borderRadius="mini" :content="t('swap.liquidityProviderFeeTooltip', { liquidityProviderFee })" theme="light" placement="right-start" :show-arrow="false">
          <s-icon name="info" size="16" />
        </s-tooltip>
        <span>{{ t('swap.liquidityProviderFee') }}</span>
        <span class="swap-info-value">{{ liquidityProviderFeeValue }}</span>
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
  @Getter tokenFrom!: any
  @Getter tokenTo!: any
  @Getter toValue!: number
  @Getter isTokenFromPrice!: boolean
  @Getter slippageTolerance!: number
  @Getter liquidityProviderFee!: number
  @Action setTokenFromPrice

  @Prop({ default: false, type: Boolean }) readonly showPrice!: boolean
  @Prop({ default: false, type: Boolean }) readonly showSlippageTolerance!: boolean

  get price (): string {
    if (this.isTokenFromPrice) {
      return formatNumber(this.tokenFrom.price / this.tokenTo.price, 4) + ` ${this.tokenFrom.symbol + ' / ' + this.tokenTo.symbol}`
    }
    return formatNumber(this.tokenTo.price / this.tokenFrom.price, 4) + ` ${this.tokenTo.symbol + ' / ' + this.tokenFrom.symbol}`
  }

  get minReceived (): string {
    // TODO: Generate value from tokenFromValue
    return this.tokenFrom ? `${formatNumber(this.toValue, 4)} ${this.tokenTo.symbol}` : ''
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

  get liquidityProviderFeeValue (): string {
    // TODO: Generate liquidity provider fee
    return this.tokenFrom ? `${formatNumber(0.0006245, 4)} ${this.tokenTo.symbol}` : ''
  }

  handleSwitchPrice (): void {
    this.setTokenFromPrice(!this.isTokenFromPrice)
  }
}
</script>

<style lang="scss" scoped>
.swap-info {
  display: flex;
  align-items: center;
  margin-top: $inner-spacing-mini;
  width: 100%;
  padding-right: $inner-spacing-mini;
  padding-left: $inner-spacing-mini;
  color: var(--s-color-base-content-secondary);
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
      color: var(--s-color-status-success);
    }
    &-negative {
      color: var(--s-color-status-error);
    }
  }
  .el-tooltip {
    margin-right: $inner-spacing-small;
  }
  &-icon {
    position: relative;
    height: $inner-spacing-big;
    width: $inner-spacing-big;
    background-color: var(--s-color-base-background);
    border-radius: var(--s-border-radius-small);
    &:hover {
      background-color: var(--s-color-base-background-hover);
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
