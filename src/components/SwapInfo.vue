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
        <span class="swap-info-value">{{ formattedMinMaxReceived }}<span class="asset-title">{{ getAssetSymbolText }}</span></span>
      </div>
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
        <span class="swap-info-value">{{ formattedLiquidityProviderFee }}<span class="asset-title">{{ xorSymbol }}</span></span>
      </div>
      <!-- TODO 4 alexnatalia: Show if logged in and have info about Network Fee -->
      <div v-if="connected" class="swap-info">
        <s-tooltip v-if="showTooltips" class="swap-info-icon" popper-class="info-tooltip info-tooltip--swap" border-radius="mini" :content="t('swap.networkFeeTooltip')" theme="light" placement="right-start" animation="none" :show-arrow="false">
          <s-icon name="info" size="16" />
        </s-tooltip>
        <span>{{ t('swap.networkFee') }}</span>
        <span class="swap-info-value">{{ formattedNetworkFee }}<span class="asset-title">{{ xorSymbol }}</span></span>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { KnownSymbols, CodecString } from '@sora-substrate/util'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'
import { isWalletConnected } from '@/utils'
import { lazyComponent } from '@/router'
import { Components } from '@/consts'

@Component({
  components: {
    Settings: lazyComponent(Components.Settings)
  }
})
export default class SwapInfo extends Mixins(TranslationMixin, NumberFormatterMixin) {
  @Getter tokenFrom!: any
  @Getter tokenTo!: any
  @Getter isTokenFromPrice!: boolean
  @Getter slippageTolerance!: number
  @Getter minMaxReceived!: CodecString
  @Getter isExchangeB!: boolean
  @Getter liquidityProviderFee!: CodecString
  @Getter networkFee!: CodecString
  @Action setTokenFromPrice
  @Getter('price', { namespace: 'prices' }) price!: string
  @Getter('priceReversed', { namespace: 'prices' }) priceReversed!: string

  @Prop({ default: false, type: Boolean }) readonly showPrice!: boolean
  @Prop({ default: true, type: Boolean }) readonly showTooltips!: boolean
  @Prop({ default: false, type: Boolean }) readonly showSlippageTolerance!: boolean

  showSettings = false

  get connected (): boolean {
    return isWalletConnected()
  }

  get priceValue (): string {
    const fromSymbol = this.tokenFrom ? this.tokenFrom.symbol : ''
    const toSymbol = this.tokenTo ? this.tokenTo.symbol : ''
    if (this.isTokenFromPrice) {
      return `${this.price} ${fromSymbol} / ${toSymbol}`
    }
    return `${this.priceReversed} ${toSymbol} / ${fromSymbol}`
  }

  get formattedNetworkFee (): string {
    return this.formatCodecNumber(this.networkFee)
  }

  get formattedLiquidityProviderFee (): string {
    return this.formatCodecNumber(this.liquidityProviderFee)
  }

  get formattedMinMaxReceived (): string {
    const decimals = (this.isExchangeB ? this.tokenFrom : this.tokenTo)?.decimals
    return this.formatCodecNumber(this.minMaxReceived, decimals)
  }

  // TODO: [Release 2]
  // get priceImpact (): string {
  //   return '0'
  // }
  // get priceImpactClass (): string {
  //   if (+this.priceImpact > 0) {
  //     return 'price-impact-positive'
  //   }
  //   if (+this.priceImpact < 0) {
  //     return 'price-impact-negative'
  //   }
  //   return ''
  // }

  get xorSymbol (): string {
    return ' ' + KnownSymbols.XOR
  }

  get getAssetSymbolText (): string {
    if (this.isExchangeB) {
      return this.tokenFrom ? ` ${this.tokenFrom.symbol}` : ''
    }
    return this.tokenTo ? ` ${this.tokenTo.symbol}` : ''
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
