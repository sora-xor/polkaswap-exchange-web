<template>
  <transaction-details :info-only="infoOnly" class="info-line-container">
    <div class="info-line-container">
      <p class="info-line-container__title">{{ t('createPair.pricePool') }}</p>
      <info-line
        :label="t('createPair.firstPerSecond', { first: firstToken.symbol, second: secondToken.symbol })"
        :value="formattedPrice"
      />
      <info-line
        :label="t('createPair.firstPerSecond', { first: secondToken.symbol, second: firstToken.symbol })"
        :value="formattedPriceReversed"
      />
      <info-line
        :label="t('createPair.networkFee')"
        :label-tooltip="t('networkFeeTooltipText')"
        :value="formattedFee"
        :asset-symbol="KnownSymbols.XOR"
        :fiat-value="getFiatAmountByCodecString(networkFee)"
        is-formatted
      />
    </div>

    <div class="info-line-container">
      <p class="info-line-container__title">{{ t('createPair.yourPositionEstimated') }}</p>
      <info-line
        is-formatted
        value-can-be-hidden
        :label="firstToken.symbol"
        :value="formattedFirstTokenValue"
        :fiat-value="fiatFirstAmount"
      />
      <info-line
        is-formatted
        value-can-be-hidden
        :label="secondToken.symbol"
        :value="formattedSecondTokenValue"
        :fiat-value="fiatSecondAmount"
      />
      <info-line :label="t('createPair.shareOfPool')" value="100%" />
    </div>
  </transaction-details>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { Getter } from 'vuex-class';
import { components } from '@soramitsu/soraneo-wallet-web';
import { FPNumber, CodecString } from '@sora-substrate/util';

import BaseTokenPairMixinInstance from '../mixins/BaseTokenPairMixin';
import TranslationMixin from '../mixins/TranslationMixin';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';

const namespace = 'createPair';

const BaseTokenPairMixin = BaseTokenPairMixinInstance(namespace);

@Component({
  components: {
    InfoLine: components.InfoLine,
    TransactionDetails: lazyComponent(Components.TransactionDetails),
  },
})
export default class CreatePairTransactionDetails extends Mixins(TranslationMixin, BaseTokenPairMixin) {
  @Getter('isNotFirstLiquidityProvider', { namespace }) isNotFirstLiquidityProvider!: boolean;
  @Getter('shareOfPool', { namespace }) shareOfPool!: string;

  @Prop({ default: true, type: Boolean }) readonly infoOnly!: boolean;

  get strategicBonusApy(): Nullable<string> {
    // It won't be in template when not defined
    const strategicBonusApy = this.fiatPriceAndApyObject[this.secondToken.address]?.strategicBonusApy;
    if (!strategicBonusApy) {
      return null;
    }
    return `${this.getFPNumberFromCodec(strategicBonusApy).mul(this.Hundred).toLocaleString()}%`;
  }

  get formattedFirstTokenValue(): string {
    return this.formatStringValue(this.firstTokenValue.toString());
  }

  get formattedSecondTokenValue(): string {
    return this.formatStringValue(this.secondTokenValue.toString());
  }

  getTokenPosition(liquidityInfoBalance: string | undefined, tokenValue: string | CodecString | number): FPNumber {
    const prevPosition = FPNumber.fromCodecValue(liquidityInfoBalance ?? 0);
    if (!this.emptyAssets) {
      return prevPosition.add(new FPNumber(tokenValue));
    }
    return prevPosition;
  }
}
</script>
