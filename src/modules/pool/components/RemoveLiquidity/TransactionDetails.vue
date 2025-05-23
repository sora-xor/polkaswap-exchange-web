<template>
  <transaction-details :info-only="infoOnly" class="info-line-container">
    <info-line
      v-if="shareOfPool"
      value-can-be-hidden
      :label="t('removeLiquidity.shareOfPool')"
      :value="`${shareOfPool}%`"
    />
    <template v-if="firstTokenSymbol && secondTokenSymbol">
      <info-line
        v-if="priceReversed"
        :label="t('priceText')"
        :value="`1 ${firstTokenSymbol} = ${formattedPriceReversed}`"
        :asset-symbol="secondTokenSymbol"
      />
      <info-line v-if="price" :value="`1 ${secondTokenSymbol} = ${formattedPrice}`" :asset-symbol="firstTokenSymbol" />
    </template>
    <info-line
      v-if="networkFee"
      :label="t('networkFeeText')"
      :label-tooltip="t('networkFeeTooltipText')"
      :value="formattedFee"
      :asset-symbol="XOR_SYMBOL"
      :fiat-value="formattedFeeFiatValue"
      is-formatted
    />
  </transaction-details>
</template>

<script lang="ts">
import { CodecString, Operation, NetworkFeesObject } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { state, getter } from '@/store/decorators';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

@Component({
  components: { InfoLine: components.InfoLine, TransactionDetails: lazyComponent(Components.TransactionDetails) },
})
export default class RemoveLiquidityTransactionDetails extends Mixins(mixins.FormattedAmountMixin, TranslationMixin) {
  readonly XOR_SYMBOL = XOR.symbol;

  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;

  @getter.removeLiquidity.shareOfPool shareOfPool!: string;
  @getter.removeLiquidity.firstToken firstToken!: Nullable<Asset>;
  @getter.removeLiquidity.secondToken secondToken!: Nullable<Asset>;
  @getter.removeLiquidity.priceReversed priceReversed!: string;
  @getter.removeLiquidity.price price!: string;

  @Prop({ default: true, type: Boolean }) readonly infoOnly!: boolean;

  get firstTokenSymbol(): Nullable<string> {
    return this.firstToken?.symbol;
  }

  get secondTokenSymbol(): Nullable<string> {
    return this.secondToken?.symbol;
  }

  get formattedPrice(): string {
    return this.formatStringValue(this.price);
  }

  get formattedPriceReversed(): string {
    return this.formatStringValue(this.priceReversed);
  }

  get networkFee(): CodecString {
    return this.networkFees[Operation.RemoveLiquidity];
  }

  get formattedFee(): string {
    return this.formatCodecNumber(this.networkFee);
  }

  get formattedFeeFiatValue(): Nullable<string> {
    return this.getFiatAmountByCodecString(this.networkFee);
  }
}
</script>
