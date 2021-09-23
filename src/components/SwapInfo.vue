<template>
  <div class="swap-info-container">
    <info-line v-for="({ id, label, value }) in priceValues" :key="id" :label="label" :value="value" />
    <info-line
      :label="t(`swap.${isExchangeB ? 'maxSold' : 'minReceived'}`)"
      :label-tooltip="t('swap.minReceivedTooltip')"
      :value="formattedMinMaxReceived"
      :asset-symbol="getAssetSymbolText"
      :fiat-value="getFiatAmountByCodecString(minMaxReceived, isExchangeB ? tokenFrom : tokenTo)"
      is-formatted
    />
    <info-line
      v-for="(reward, index) in rewardsValues"
      :key="index"
      v-bind="reward"
    />
    <info-line
      v-if="hasPriceImpact"
      :label="t('swap.priceImpact')"
      :label-tooltip="t('swap.priceImpactTooltip')"
    >
      <value-status-wrapper :value="priceImpact">
        <formatted-amount class="price-impact-value" :value="priceImpactFormatted">%</formatted-amount>
      </value-status-wrapper>
    </info-line>
    <info-line
      :label="t('swap.liquidityProviderFee')"
      :label-tooltip="liquidityProviderFeeTooltipText"
      :value="formattedLiquidityProviderFee"
      :asset-symbol="xorSymbol"
      :fiat-value="getFiatAmountByCodecString(liquidityProviderFee)"
      is-formatted
    />
    <!-- TODO 4 alexnatalia: Show if logged in and have info about Network Fee -->
    <info-line
      v-if="isLoggedIn"
      :label="t('swap.networkFee')"
      :label-tooltip="t('swap.networkFeeTooltip')"
      :value="formattedNetworkFee"
      :asset-symbol="xorSymbol"
      :fiat-value="getFiatAmountByCodecString(networkFee)"
      is-formatted
    />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Getter } from 'vuex-class'
import { KnownAssets, KnownSymbols, CodecString, AccountAsset, LPRewardsInfo, Operation } from '@sora-substrate/util'
import { components, mixins } from '@soramitsu/soraneo-wallet-web'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import { lazyComponent } from '@/router'
import { Components } from '@/consts'
import { asZeroValue } from '@/utils'

const namespace = 'swap'

@Component({
  components: {
    ValueStatusWrapper: lazyComponent(Components.ValueStatusWrapper),
    FormattedAmount: components.FormattedAmount,
    InfoLine: components.InfoLine
  }
})
export default class SwapInfo extends Mixins(mixins.FormattedAmountMixin, TranslationMixin) {
  @Getter('tokenFrom', { namespace }) tokenFrom!: AccountAsset
  @Getter('tokenTo', { namespace }) tokenTo!: AccountAsset
  @Getter('minMaxReceived', { namespace }) minMaxReceived!: CodecString
  @Getter('isExchangeB', { namespace }) isExchangeB!: boolean
  @Getter('liquidityProviderFee', { namespace }) liquidityProviderFee!: CodecString
  @Getter('rewards', { namespace }) rewards!: Array<LPRewardsInfo>
  @Getter('priceImpact', { namespace }) priceImpact!: string

  @Getter('price', { namespace: 'prices' }) price!: string
  @Getter('priceReversed', { namespace: 'prices' }) priceReversed!: string
  @Getter isLoggedIn!: boolean
  @Getter networkFees!: any

  get liquidityProviderFeeTooltipText (): string {
    return this.t('swap.liquidityProviderFeeTooltip', { liquidityProviderFee: this.liquidityProviderFeeValue })
  }

  get priceValues (): Array<object> {
    const fromSymbol = this.tokenFrom?.symbol ?? ''
    const toSymbol = this.tokenTo?.symbol ?? ''

    return [
      {
        id: 'from',
        label: this.t('swap.firstPerSecond', { first: fromSymbol, second: toSymbol }),
        value: this.formatStringValue(this.price)
      },
      {
        id: 'to',
        label: this.t('swap.firstPerSecond', { first: toSymbol, second: fromSymbol }),
        value: this.formatStringValue(this.priceReversed)
      }
    ]
  }

  get hasPriceImpact (): boolean {
    return !asZeroValue(this.priceImpact)
  }

  get priceImpactFormatted (): string {
    return this.formatStringValue(this.priceImpact)
  }

  get rewardsValues (): Array<any> {
    return this.rewards.map((reward, index) => {
      const asset = KnownAssets.get(reward.currency)
      const value = this.formatCodecNumber(reward.amount)

      return {
        value,
        fiatValue: this.getFiatAmountByString(value, asset as AccountAsset),
        assetSymbol: asset?.symbol ?? '',
        label: index === 0 ? this.t('swap.rewardsForSwap') : ''
      }
    })
  }

  get networkFee (): CodecString {
    return this.networkFees[Operation.Swap]
  }

  get formattedNetworkFee (): string {
    return this.formatCodecNumber(this.networkFee)
  }

  get liquidityProviderFeeValue (): string {
    return this.formatStringValue('0.3')
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
  &-value.el-button {
    margin-right: 0;
    height: var(--s-font-size-small);
    padding: 0;
    color: inherit;
  }
}
.price-impact-value {
  font-weight: 600;
}
</style>
