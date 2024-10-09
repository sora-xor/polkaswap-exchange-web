<template>
  <transaction-details :info-only="infoOnly" class="info-line-container">
    <div v-if="!emptyAssets" class="info-line-container">
      <p class="info-line-container__title">{{ t('createPair.pricePool') }}</p>
      <info-line
        :label="t('firstPerSecond', { first: firstTokenSymbol, second: secondTokenSymbol })"
        :value="formattedPrice"
      />
      <info-line
        :label="t('firstPerSecond', { first: secondTokenSymbol, second: firstTokenSymbol })"
        :value="formattedPriceReversed"
      />
      <info-line v-if="strategicBonusApy" :label="t('pool.strategicBonusApy')" :value="strategicBonusApy" />
      <info-line
        is-formatted
        :label="t('networkFeeText')"
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
import { FPNumber, CodecString } from '@sora-substrate/sdk';
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import BaseTokenPairMixin from '@/modules/pool/mixins/BaseTokenPair';
import PoolApyMixin from '@/modules/pool/mixins/PoolApy';
import { lazyComponent } from '@/router';
import { getter } from '@/store/decorators';

import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';

@Component({
  components: {
    InfoLine: components.InfoLine,
    TransactionDetails: lazyComponent(Components.TransactionDetails),
  },
})
export default class AddLiquidityTransactionDetails extends Mixins(TranslationMixin, BaseTokenPairMixin, PoolApyMixin) {
  @getter.addLiquidity.liquidityInfo private liquidityInfo!: Nullable<AccountLiquidity>;
  @getter.addLiquidity.shareOfPool shareOfPool!: string;

  @Prop({ default: true, type: Boolean }) readonly infoOnly!: boolean;

  get firstTokenPosition(): FPNumber {
    return this.getTokenPosition(this.liquidityInfo?.firstBalance, this.firstTokenValue);
  }

  get secondTokenPosition(): FPNumber {
    return this.getTokenPosition(this.liquidityInfo?.secondBalance, this.secondTokenValue);
  }

  get strategicBonusApy(): Nullable<string> {
    // It won't be in template when not defined
    const strategicBonusApy = this.getPoolApy(this.firstToken?.address, this.secondToken?.address);
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
