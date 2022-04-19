<template>
  <transaction-details :info-only="infoOnly" class="info-line-container">
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
        :label="t('addLiquidity.firstPerSecond', { first: firstTokenSymbol, second: secondTokenSymbol })"
        :value="formattedPrice"
      />
      <info-line
        :label="t('addLiquidity.firstPerSecond', { first: secondTokenSymbol, second: firstTokenSymbol })"
        :value="formattedPriceReversed"
      />
      <info-line v-if="strategicBonusApy" :label="t('pool.strategicBonusApy')" :value="strategicBonusApy" />
      <info-line
        is-formatted
        :label="t('createPair.networkFee')"
        :label-tooltip="t('networkFeeTooltipText')"
        :value="formattedFee"
        :asset-symbol="XOR_SYMBOL"
        :fiat-value="getFiatAmountByCodecString(networkFee)"
      />
    </div>

    <div class="info-line-container">
      <p class="info-line-container__title">{{ t(`createPair.yourPosition${!emptyAssets ? 'Estimated' : ''}`) }}</p>
      <info-line
        is-formatted
        value-can-be-hidden
        :label="firstTokenSymbol"
        :value="formattedFirstTokenPosition"
        :fiat-value="fiatFirstTokenPosition"
      />
      <info-line
        is-formatted
        value-can-be-hidden
        :label="secondTokenSymbol"
        :value="formattedSecondTokenPosition"
        :fiat-value="fiatSecondTokenPosition"
      />
      <info-line value-can-be-hidden :label="t('createPair.shareOfPool')" :value="`${shareOfPool}%`" />
    </div>
  </transaction-details>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { components } from '@soramitsu/soraneo-wallet-web';
import { FPNumber, CodecString } from '@sora-substrate/util';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';

import BaseTokenPairMixinInstance, { TokenPairNamespace } from '../mixins/BaseTokenPairMixin';
import TranslationMixin from '../mixins/TranslationMixin';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { getter } from '@/store/decorators';

const namespace = TokenPairNamespace.AddLiquidity;

const BaseTokenPairMixin = BaseTokenPairMixinInstance(namespace);

@Component({
  components: {
    InfoLine: components.InfoLine,
    TransactionDetails: lazyComponent(Components.TransactionDetails),
  },
})
export default class AddLiquidityTransactionDetails extends Mixins(TranslationMixin, BaseTokenPairMixin) {
  @getter.addLiquidity.liquidityInfo private liquidityInfo!: Nullable<AccountLiquidity>;
  @getter.addLiquidity.isNotFirstLiquidityProvider isNotFirstLiquidityProvider!: boolean;
  @getter.addLiquidity.shareOfPool shareOfPool!: string;

  @Prop({ default: true, type: Boolean }) readonly infoOnly!: boolean;

  get firstTokenPosition(): FPNumber {
    return this.getTokenPosition(this.liquidityInfo?.firstBalance, this.firstTokenValue);
  }

  get secondTokenPosition(): FPNumber {
    return this.getTokenPosition(this.liquidityInfo?.secondBalance, this.secondTokenValue);
  }

  get strategicBonusApy(): Nullable<string> {
    if (!this.secondToken) return null;
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
    if (!this.firstToken) return null;

    return this.getFiatAmountByFPNumber(this.firstTokenPosition, this.firstToken);
  }

  get fiatSecondTokenPosition(): Nullable<string> {
    if (!this.secondToken) return null;

    return this.getFiatAmountByFPNumber(this.secondTokenPosition, this.secondToken);
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
