<template>
  <div class="swap-info-container">
    <template v-if="showPrice || showSlippageTolerance">
      <info-line v-if="showPrice" :label="t('exchange.price')" :value="priceValue">
        <s-button class="el-button--switch-price" type="action" size="small" icon="arrows-swap-24" @click="handleSwitchPrice" />
      </info-line>
      <info-line v-if="showSlippageTolerance && connected" :label="t('swap.slippageTolerance')">
        <s-button class="swap-info-value" type="link" @click="openSettingsDialog">
          {{ slippageTolerance }}%
        </s-button>
      </info-line>
      <settings v-if="showSlippageTolerance" :visible.sync="showSettings" />
    </template>
    <template v-else>
      <info-line
        :label="t(`swap.${isExchangeB ? 'maxSold' : 'minReceived'}`)"
        :tooltip-content="t('swap.minReceivedTooltip')"
        :value="formattedMinMaxReceived"
        :asset-symbol="getAssetSymbolText"
      />
      <!-- <info-line
        :label="t('swap.priceImpact')"
        :tooltip-content="t('swap.priceImpactTooltip')"
        :value="`${priceImpact}%`"
      /> -->
      <info-line
        v-if="showTooltips"
        :label="t('swap.liquidityProviderFee')"
        :tooltip-content="t('swap.liquidityProviderFeeTooltip', { liquidityProviderFee: 0.3})"
        :value="formattedLiquidityProviderFee"
        :asset-symbol="xorSymbol"
      />
      <!-- TODO 4 alexnatalia: Show if logged in and have info about Network Fee -->
      <info-line
        v-if="connected"
        :label="t('swap.networkFee')"
        :tooltip-content="t('swap.networkFeeTooltip')"
        :value="formattedNetworkFee"
        :asset-symbol="xorSymbol"
      />
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { KnownSymbols, CodecString, AccountAsset } from '@sora-substrate/util'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'
import { isWalletConnected } from '@/utils'
import { lazyComponent } from '@/router'
import { Components } from '@/consts'

const namespace = 'swap'

@Component({
  components: {
    InfoLine: lazyComponent(Components.InfoLine),
    Settings: lazyComponent(Components.Settings)
  }
})
export default class SwapInfo extends Mixins(TranslationMixin, NumberFormatterMixin) {
  @Getter('tokenFrom', { namespace }) tokenFrom!: AccountAsset
  @Getter('tokenTo', { namespace }) tokenTo!: AccountAsset
  @Getter('isTokenFromPrice', { namespace }) isTokenFromPrice!: boolean
  @Getter('minMaxReceived', { namespace }) minMaxReceived!: CodecString
  @Getter('isExchangeB', { namespace }) isExchangeB!: boolean
  @Getter('liquidityProviderFee', { namespace }) liquidityProviderFee!: CodecString
  @Getter('networkFee', { namespace }) networkFee!: CodecString
  @Action('setTokenFromPrice', { namespace }) setTokenFromPrice!: (isTokenFromPrice: boolean) => Promise<void>

  @Getter('price', { namespace: 'prices' }) price!: string
  @Getter('priceReversed', { namespace: 'prices' }) priceReversed!: string

  @Getter slippageTolerance!: number

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
.el-button--switch-price {
  @include switch-button-inherit-styles;
  &.s-action.s-small i {
    margin-top: 0;
    margin-left: 0;
    font-size: 16px !important;
  }
}
</style>

<style lang="scss" scoped>
@include info-line;
.swap-info {
  // TODO: [Release 2] Check these styles on
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
}
</style>
