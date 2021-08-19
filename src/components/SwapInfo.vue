<template>
  <div class="swap-info-container">
    <info-line v-for="({ id, label, value }) in priceValues" :key="id" :label="label" :value="value" />
    <info-line
      :label="t(`swap.${isExchangeB ? 'maxSold' : 'minReceived'}`)"
      :tooltip-content="t('swap.minReceivedTooltip')"
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
    <!-- <info-line
      :label="t('swap.priceImpact')"
      :tooltip-content="t('swap.priceImpactTooltip')"
      :value="`${priceImpact}%`"
    /> -->
    <info-line
      :label="t('swap.liquidityProviderFee')"
      :tooltip-content="liquidityProviderFeeTooltipText"
      :value="formattedLiquidityProviderFee"
      :asset-symbol="xorSymbol"
      :fiat-value="getFiatAmountByCodecString(liquidityProviderFee)"
      is-formatted
    />
    <!-- TODO 4 alexnatalia: Show if logged in and have info about Network Fee -->
    <info-line
      v-if="isLoggedIn"
      :label="t('swap.networkFee')"
      :tooltip-content="t('swap.networkFeeTooltip')"
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
import { KnownAssets, KnownSymbols, CodecString, AccountAsset, LPRewardsInfo } from '@sora-substrate/util'
import { FormattedAmountMixin } from '@soramitsu/soraneo-wallet-web'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import { lazyComponent } from '@/router'
import { Components } from '@/consts'
import { Account } from '../../../sora2-wallet-web/src/types'

const namespace = 'swap'

@Component({
  components: {
    InfoLine: lazyComponent(Components.InfoLine)
  }
})
export default class SwapInfo extends Mixins(FormattedAmountMixin, TranslationMixin) {
  @Getter('tokenFrom', { namespace }) tokenFrom!: AccountAsset
  @Getter('tokenTo', { namespace }) tokenTo!: AccountAsset
  @Getter('minMaxReceived', { namespace }) minMaxReceived!: CodecString
  @Getter('isExchangeB', { namespace }) isExchangeB!: boolean
  @Getter('liquidityProviderFee', { namespace }) liquidityProviderFee!: CodecString
  @Getter('networkFee', { namespace }) networkFee!: CodecString
  @Getter('rewards', { namespace }) rewards!: Array<LPRewardsInfo>

  @Getter('price', { namespace: 'prices' }) price!: string
  @Getter('priceReversed', { namespace: 'prices' }) priceReversed!: string
  @Getter isLoggedIn!: boolean

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
