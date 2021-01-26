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
        <s-button class="swap-info-value" type="link" @click="openSettingsDialog">
          {{ slippageTolerance }}%
        </s-button>
      </div>
      <settings v-if="showSlippageTolerance" :visible.sync="showSettings" />
    </template>
    <template v-else>
      <div class="swap-info swap-info--min-received">
        <s-tooltip v-if="showTooltips" class="swap-info-icon" popper-class="info-tooltip info-tooltip--swap" border-radius="mini" :content="t('swap.minReceivedTooltip')" theme="light" placement="right-start" animation="none" :show-arrow="false">
          <s-icon name="info" size="16" />
        </s-tooltip>
        <span>{{ t(`swap.${isExchangeB ? 'maxSold' : 'minReceived'}`) }}</span>
        <span class="swap-info-value">{{ minMaxReceived }}<span class="asset-title">{{ getAssetSymbolText(false) }}</span></span>
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
        <s-tooltip v-if="showTooltips" class="swap-info-icon" popper-class="info-tooltip info-tooltip--swap" border-radius="mini" :content="t('swap.liquidityProviderFeeTooltip', { liquidityProviderFee: 0.3})" theme="light" placement="right-start" animation="none" :show-arrow="false">
          <s-icon name="info" size="16" />
        </s-tooltip>
        <span>{{ t('swap.liquidityProviderFee') }}</span>
        <span class="swap-info-value">{{ liquidityProviderFee }}<span class="asset-title">{{ getAssetSymbolText() }}</span></span>
      </div>
      <!-- TODO 4 alexnatalia: Show if logged in and have info about Network Fee -->
      <div v-if="connected" class="swap-info">
        <s-tooltip v-if="showTooltips" class="swap-info-icon" popper-class="info-tooltip info-tooltip--swap" border-radius="mini" :content="t('swap.networkFeeTooltip')" theme="light" placement="right-start" animation="none" :show-arrow="false">
          <s-icon name="info" size="16" />
        </s-tooltip>
        <span>{{ t('swap.networkFee') }}</span>
        <span class="swap-info-value">{{ networkFee }}<span class="asset-title">{{ getAssetSymbolText() }}</span></span>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import { getAssetSymbol, isWalletConnected } from '@/utils'
import { lazyComponent } from '@/router'
import { Components } from '@/consts'
import { KnownSymbols } from '@sora-substrate/util'

@Component({
  components: {
    Settings: lazyComponent(Components.Settings)
  }
})
export default class SwapInfo extends Mixins(TranslationMixin) {
  @Getter tokenFrom!: any
  @Getter tokenTo!: any
  @Getter isTokenFromPrice!: boolean
  @Getter slippageTolerance!: number
  @Getter minMaxReceived!: string
  @Getter isExchangeB!: boolean
  @Getter liquidityProviderFee!: string
  @Getter networkFee!: string
  @Action setTokenFromPrice
  @Getter('price', { namespace: 'prices' }) price!: string | number
  @Getter('priceReversed', { namespace: 'prices' }) priceReversed!: string | number

  @Prop({ default: false, type: Boolean }) readonly showPrice!: boolean
  @Prop({ default: true, type: Boolean }) readonly showTooltips!: boolean
  @Prop({ default: false, type: Boolean }) readonly showSlippageTolerance!: boolean

  showSettings = false

  get connected (): boolean {
    return isWalletConnected()
  }

  get priceValue (): string {
    const fromSymbol = this.tokenFrom ? getAssetSymbol(this.tokenFrom.symbol) : ''
    const toSymbol = this.tokenTo ? getAssetSymbol(this.tokenTo.symbol) : ''
    if (this.isTokenFromPrice) {
      return `${this.price} ${fromSymbol} / ${toSymbol}`
    }
    return `${this.priceReversed} ${toSymbol} / ${fromSymbol}`
  }

  get priceImpact (): string {
    // TODO: Generate price impact value, is could be positive or negative, use appropriate class to show it in layout
    return '0.0222'
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

  getAssetSymbolText (isXorSymbol = true): string {
    if (isXorSymbol) {
      return ' ' + KnownSymbols.XOR
    }
    return this.tokenTo ? ' ' + getAssetSymbol(this.tokenTo.symbol) : ''
  }

  handleSwitchPrice (): void {
    this.setTokenFromPrice(!this.isTokenFromPrice)
  }

  openSettingsDialog (): void {
    this.showSettings = true
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
@include info-line;
.swap-info {
  &--slippage-tolerance,
  &--min-received {
    margin-top: $inner-spacing-small;
  }
  .price-impact {
    &-positive {
      color: var(--s-color-status-success);
    }
    &-negative {
      color: var(--s-color-status-error);
    }
  }
  &-value.el-button {
    margin-right: 0;
    height: var(--s-font-size-small);
    padding: 0;
    color: inherit;
  }
  .el-button--switch-price {
    margin-right: 0;
    margin-left: $inner-spacing-mini;
    @include switch-button;
  }
}
</style>
