<template>
  <component :is="infoOnly ? 'div' : 'transaction-details'" class="remove-liquidity-info">
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
      :asset-symbol="KnownSymbols.XOR"
      :fiat-value="getFiatAmountByCodecString(networkFee)"
      is-formatted
    />
  </component>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { Getter } from 'vuex-class';

import {
  FPNumber,
  KnownSymbols,
  AccountLiquidity,
  CodecString,
  Operation,
  NetworkFeesObject,
  Asset,
  AccountAsset,
} from '@sora-substrate/util';

import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import TranslationMixin from '../mixins/TranslationMixin';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';

const namespace = 'removeLiquidity';

@Component({
  components: { InfoLine: components.InfoLine, TransactionDetails: lazyComponent(Components.TransactionDetails) },
})
export default class RemoveLiquidityTransactionDetails extends Mixins(mixins.FormattedAmountMixin, TranslationMixin) {
  @Getter('priceReversed', { namespace: 'prices' }) priceReversed!: string;
  @Getter('price', { namespace: 'prices' }) price!: string;
  @Getter('shareOfPool', { namespace }) shareOfPool!: string;
  @Getter('firstToken', { namespace }) firstToken!: Asset;
  @Getter('secondToken', { namespace }) secondToken!: Asset;
  @Getter networkFees!: NetworkFeesObject;

  @Prop({ default: true, type: Boolean }) readonly infoOnly!: boolean;

  KnownSymbols = KnownSymbols;

  get networkFee(): CodecString {
    return this.networkFees[Operation.RemoveLiquidity];
  }

  get formattedFee(): string {
    return this.formatCodecNumber(this.networkFee);
  }
}
</script>

<style lang="scss">
.remove-liquidity-info {
  .el-collapse.neumorphic .el-icon-arrow-right {
    height: 17px !important;
  }

  .el-collapse-item__header .el-icon-arrow-right.is-active {
    height: 15px !important;
  }
}
</style>
