<template>
  <div class="swap-info-container">
    <template v-if="showPrice || showSlippageTolerance">
      <div v-if="showPrice" class="swap-info">
        <span>{{ t('exchange.price') }}</span>
        <span class="swap-info-value">{{ priceValue }}</span>
        <s-button class="el-button--switch-price" type="action" size="small" icon="swap" @click="handleSwitchPrice" />
      </div>
      <div v-if="showSlippageTolerance && connected" class="swap-info swap-info--slippage-tolerance">
        <span>{{ t('swap.slippageTolerance') }}</span>
        <span class="swap-info-value">{{ slippageTolerance }}%</span>
      </div>
    </template>
    <template v-else>
      <div class="swap-info swap-info--min-received">
        <s-tooltip v-if="showTooltips" class="swap-info-icon" popper-class="info-tooltip info-tooltip--swap" border-radius="mini" :content="t('swap.minReceivedTooltip')" theme="light" placement="right-start" animation="none" :show-arrow="false">
          <s-icon name="info" size="16" />
        </s-tooltip>
        <span>{{ t(`swap.${isExchangeB ? 'maxSold' : 'minReceived'}`) }}</span>
        <span class="swap-info-value">{{ minReceived }}</span>
      </div>
      <!-- TODO: Hid for first iteration of development -->
      <!-- <div class="swap-info">
        <s-tooltip v-if="showTooltips" class="swap-info-icon" popper-class="info-tooltip info-tooltip--swap" border-radius="mini" :content="t('swap.priceImpactTooltip')" theme="light" placement="right-start" animation="none" :show-arrow="false">
          <s-icon name="info" size="16" />
        </s-tooltip>
        <span>{{ t('swap.priceImpact') }}</span>
        <span :class="'swap-info-value ' + priceImpactClass">{{ priceImpact }}%</span>
      </div> -->
      <div class="swap-info">
        <s-tooltip v-if="showTooltips" class="swap-info-icon" popper-class="info-tooltip info-tooltip--swap" border-radius="mini" :content="t('swap.liquidityProviderFeeTooltip', { liquidityProviderFee: formatNumber(0.3, 1)})" theme="light" placement="right-start" animation="none" :show-arrow="false">
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
import { formatNumber, isWalletConnected } from '@/utils'
import { KnownSymbols } from '@sora-substrate/util'

@Component
export default class SwapInfo extends Mixins(TranslationMixin) {
  @Getter tokenFrom!: any
  @Getter tokenTo!: any
  @Getter isTokenFromPrice!: boolean
  @Getter slippageTolerance!: number
  @Getter minMaxReceived!: string
  @Getter isExchangeB!: boolean
  @Getter price!: string
  @Getter priceReversed!: string
  @Getter liquidityProviderFee!: string
  @Action setTokenFromPrice

  @Prop({ default: false, type: Boolean }) readonly showPrice!: boolean
  @Prop({ default: true, type: Boolean }) readonly showTooltips!: boolean
  @Prop({ default: false, type: Boolean }) readonly showSlippageTolerance!: boolean

  formatNumber = formatNumber

  get connected (): boolean {
    return isWalletConnected()
  }

  get priceValue (): string {
    if (this.isTokenFromPrice) {
      return `${formatNumber(this.price)} ${this.tokenFrom ? this.tokenFrom.symbol : ''} / ${this.tokenTo ? this.tokenTo.symbol : ''}`
    }
    return `${formatNumber(this.priceReversed)} ${this.tokenTo ? this.tokenTo.symbol : ''} / ${this.tokenFrom ? this.tokenFrom.symbol : ''}`
  }

  get minReceived (): string {
    return `${formatNumber(this.minMaxReceived)} ${this.tokenTo ? this.tokenTo.symbol : ''}`
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
    return `${formatNumber(this.liquidityProviderFee)} ${KnownSymbols.XOR}`
  }

  handleSwitchPrice (): void {
    this.setTokenFromPrice(!this.isTokenFromPrice)
  }
}
</script>

<style lang="scss">
.info-tooltip--swap {
  margin-left: #{$inner-spacing-mini / 2} !important;
}
.el-button--switch-price {
  @include switch-button-inherit-styles;
  &.s-action.s-small i {
    margin-top: 0;
    margin-left: 0;
  }
}
</style>

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
  &--slippage-tolerance,
  &--min-received {
    margin-top: $inner-spacing-small;
  }
  > span:first-of-type {
    margin-right: $inner-spacing-small;
  }
  &-value {
    margin-left: auto;
    text-align: right;
    font-feature-settings: $s-font-feature-settings-common;
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
    margin-right: $inner-spacing-mini;
  }
  &-icon {
    position: relative;
    height: var(--s-size-mini);
    width: var(--s-size-mini);
    background-color: var(--s-color-base-background);
    border-radius: var(--s-border-radius-small);
    &:hover {
      background-color: var(--s-color-base-background-hover);
      cursor: pointer;
    }
    &:before {
      position: absolute;
      display: block;
      height: var(--s-icon-font-size-mini);
      width: var(--s-icon-font-size-mini);
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      margin: auto;
      font-size: var(--s-icon-font-size-mini);
    }
  }
  .el-button--switch-price {
    margin-right: 0;
    margin-left: $inner-spacing-mini;
    @include switch-button;
  }
}
</style>
