<template>
  <div class="swap-info-container">
    <info-line v-for="({ label, value }, index) in priceValues" :key="index" :label="label" :value="value" />
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
    InfoLine: lazyComponent(Components.InfoLine)
  }
})
export default class SwapInfo extends Mixins(TranslationMixin, NumberFormatterMixin) {
  @Getter('tokenFrom', { namespace }) tokenFrom!: AccountAsset
  @Getter('tokenTo', { namespace }) tokenTo!: AccountAsset
  @Getter('minMaxReceived', { namespace }) minMaxReceived!: CodecString
  @Getter('isExchangeB', { namespace }) isExchangeB!: boolean
  @Getter('liquidityProviderFee', { namespace }) liquidityProviderFee!: CodecString
  @Getter('networkFee', { namespace }) networkFee!: CodecString

  @Getter('price', { namespace: 'prices' }) price!: string
  @Getter('priceReversed', { namespace: 'prices' }) priceReversed!: string

  @Prop({ default: true, type: Boolean }) readonly showTooltips!: boolean

  get connected (): boolean {
    return isWalletConnected()
  }

  get priceValues (): Array<object> {
    const fromSymbol = this.tokenFrom?.symbol ?? ''
    const toSymbol = this.tokenTo?.symbol ?? ''

    return [
      {
        label: `${fromSymbol} / ${toSymbol}`,
        value: this.price
      },
      {
        label: `${toSymbol} / ${fromSymbol}`,
        value: this.priceReversed
      }
    ]
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
    return (this.isExchangeB ? this.tokenFrom : this.tokenTo)?.symbol ?? ''
  }
}
</script>

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
