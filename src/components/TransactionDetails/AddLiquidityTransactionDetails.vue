<template>
  <component :is="infoOnly ? 'div' : 'transaction-details'" class="info-line-container">
    <div
      v-if="areTokensSelected && isAvailable && !isNotFirstLiquidityProvider && emptyAssets"
      class="info-line-container"
    >
      <p class="info-line-container__title">{{ t('createPair.firstLiquidityProvider') }}</p>
      <info-line>
        <template #info-line-prefix>
          <p class="info-line--first-liquidity" v-html="t('createPair.firstLiquidityProviderInfo')" />
        </template>
      </info-line>
    </div>

    <div v-if="areTokensSelected && isAvailable && !emptyAssets" class="info-line-container">
      <p class="info-line-container__title">{{ t('createPair.pricePool') }}</p>
      <info-line
        :label="t('addLiquidity.firstPerSecond', { first: firstToken.symbol, second: secondToken.symbol })"
        :value="formattedPrice"
      />
      <info-line
        :label="t('addLiquidity.firstPerSecond', { first: secondToken.symbol, second: firstToken.symbol })"
        :value="formattedPriceReversed"
      />
      <info-line v-if="strategicBonusApy" :label="t('pool.strategicBonusApy')" :value="strategicBonusApy" />
      <info-line
        is-formatted
        :label="t('createPair.networkFee')"
        :label-tooltip="t('networkFeeTooltipText')"
        :value="formattedFee"
        :asset-symbol="KnownSymbols.XOR"
        :fiat-value="getFiatAmountByCodecString(networkFee)"
      />
    </div>

    <div
      v-if="areTokensSelected && isAvailable && (!emptyAssets || (liquidityInfo || {}).balance)"
      class="info-line-container"
    >
      <p class="info-line-container__title">{{ t(`createPair.yourPosition${!emptyAssets ? 'Estimated' : ''}`) }}</p>
      <info-line
        is-formatted
        value-can-be-hidden
        :label="firstToken.symbol"
        :value="formattedFirstTokenPosition"
        :fiat-value="fiatFirstTokenPosition"
      />
      <info-line
        is-formatted
        value-can-be-hidden
        :label="secondToken.symbol"
        :value="formattedSecondTokenPosition"
        :fiat-value="fiatSecondTokenPosition"
      />
      <info-line value-can-be-hidden :label="t('createPair.shareOfPool')" :value="`${shareOfPool}%`" />
    </div>
  </component>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { Getter } from 'vuex-class';
import { components } from '@soramitsu/soraneo-wallet-web';
import { AccountLiquidity, FPNumber, CodecString } from '@sora-substrate/util';

import CreateTokenPairMixin from '@/components/mixins/TokenPairMixin';
import TranslationMixin from '../mixins/TranslationMixin';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';

const namespace = 'addLiquidity';

const TokenPairMixin = CreateTokenPairMixin(namespace);

@Component({
  components: {
    InfoLine: components.InfoLine,
    TransactionDetails: lazyComponent(Components.TransactionDetails),
  },
})
export default class AddLiquidityTransactionDetails extends Mixins(TranslationMixin, TokenPairMixin) {
  @Getter('isNotFirstLiquidityProvider', { namespace }) isNotFirstLiquidityProvider!: boolean;
  @Getter('liquidityInfo', { namespace }) liquidityInfo!: AccountLiquidity;
  @Getter('shareOfPool', { namespace }) shareOfPool!: string;

  @Prop({ default: true, type: Boolean }) readonly infoOnly!: boolean;

  get firstTokenPosition(): FPNumber {
    return this.getTokenPosition(this.liquidityInfo?.firstBalance, this.firstTokenValue);
  }

  get secondTokenPosition(): FPNumber {
    return this.getTokenPosition(this.liquidityInfo?.secondBalance, this.secondTokenValue);
  }

  get strategicBonusApy(): Nullable<string> {
    // It won't be in template when not defined
    const strategicBonusApy = this.fiatPriceAndApyObject[this.secondToken.address]?.strategicBonusApy;
    if (!strategicBonusApy) {
      return null;
    }
    return `${this.getFPNumberFromCodec(strategicBonusApy).mul(this.Hundred).toLocaleString()}%`;
  }

  get formattedFirstTokenPosition(): string {
    return this.firstTokenPosition.toLocaleString();
  }

  get formattedSecondTokenPosition(): string {
    return this.secondTokenPosition.toLocaleString();
  }

  get fiatFirstTokenPosition(): Nullable<string> {
    return this.getFiatAmountByFPNumber(this.firstTokenPosition, this.firstToken);
  }

  get fiatSecondTokenPosition(): Nullable<string> {
    return this.getFiatAmountByFPNumber(this.secondTokenPosition, this.secondToken);
  }

  get emptyAssets(): boolean {
    if (!(this.firstTokenValue || this.secondTokenValue)) {
      return true;
    }
    const first = new FPNumber(this.firstTokenValue);
    const second = new FPNumber(this.secondTokenValue);
    return first.isNaN() || first.isZero() || second.isNaN() || second.isZero();
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
