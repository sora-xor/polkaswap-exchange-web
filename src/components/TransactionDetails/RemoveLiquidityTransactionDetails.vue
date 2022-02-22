<template>
  <transaction-details :info-only="infoOnly" class="info-line-container">
    <info-line
      v-if="shareOfPool"
      value-can-be-hidden
      :label="t('removeLiquidity.shareOfPool')"
      :value="`${shareOfPool}%`"
    />
    <info-line
      v-if="price || priceReversed"
      :label="t('removeLiquidity.price')"
      :value="`1 ${firstToken.symbol} = ${formatStringValue(priceReversed)}`"
      :asset-symbol="secondToken.symbol"
    />
    <info-line
      v-if="price || priceReversed"
      :value="`1 ${secondToken.symbol} = ${formatStringValue(price)}`"
      :asset-symbol="firstToken.symbol"
    />
    <info-line
      v-if="networkFee"
      :label="t('createPair.networkFee')"
      :label-tooltip="t('networkFeeTooltipText')"
      :value="formattedFee"
      :asset-symbol="XOR_SYMBOL"
      :fiat-value="getFiatAmountByCodecString(networkFee)"
      is-formatted
    />
  </transaction-details>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { Getter } from 'vuex-class';
import { CodecString, Operation, NetworkFeesObject } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import type { Asset } from '@sora-substrate/util/build/assets/types';

import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import TranslationMixin from '../mixins/TranslationMixin';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';

const namespace = 'removeLiquidity';

@Component({
  components: { InfoLine: components.InfoLine, TransactionDetails: lazyComponent(Components.TransactionDetails) },
})
export default class RemoveLiquidityTransactionDetails extends Mixins(mixins.FormattedAmountMixin, TranslationMixin) {
  readonly XOR_SYMBOL = XOR.symbol;

  @Getter('priceReversed', { namespace: 'prices' }) priceReversed!: string;
  @Getter('price', { namespace: 'prices' }) price!: string;
  @Getter('shareOfPool', { namespace }) shareOfPool!: string;
  @Getter('firstToken', { namespace }) firstToken!: Asset;
  @Getter('secondToken', { namespace }) secondToken!: Asset;
  @Getter networkFees!: NetworkFeesObject;

  @Prop({ default: true, type: Boolean }) readonly infoOnly!: boolean;

  get networkFee(): CodecString {
    return this.networkFees[Operation.RemoveLiquidity];
  }

  get formattedFee(): string {
    return this.formatCodecNumber(this.networkFee);
  }
}
</script>
