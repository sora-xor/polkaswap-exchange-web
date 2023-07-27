<template>
  <transaction-details :info-only="infoOnly">
    <info-line
      :label="t('bridge.soraNetworkFee')"
      :label-tooltip="t('networkFeeTooltipText')"
      :value="soraNetworkFee"
      :asset-symbol="XOR_SYMBOL"
      :fiat-value="getFiatAmountByCodecString(soraNetworkFee)"
      is-formatted
    />
    <info-line
      :label="formattedNetworkFeeLabel"
      :label-tooltip="t('ethNetworkFeeTooltipText', { network: networkName })"
      :value="externalNetworkFee"
      :asset-symbol="nativeTokenSymbol"
      is-formatted
    />
  </transaction-details>
</template>

<script lang="ts">
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, ZeroStringValue } from '@/consts';
import { lazyComponent } from '@/router';

import type { CodecString } from '@sora-substrate/util';

@Component({
  components: {
    TransactionDetails: lazyComponent(Components.TransactionDetails),
    InfoLine: components.InfoLine,
  },
})
export default class BridgeTransactionDetails extends Mixins(mixins.FormattedAmountMixin, TranslationMixin) {
  readonly XOR_SYMBOL = XOR.symbol;

  @Prop({ default: true, type: Boolean }) readonly infoOnly!: boolean;
  @Prop({ default: '', type: String }) readonly nativeTokenSymbol!: string;
  @Prop({ default: ZeroStringValue, type: String }) readonly externalNetworkFee!: CodecString;
  @Prop({ default: ZeroStringValue, type: String }) readonly soraNetworkFee!: CodecString;
  @Prop({ default: '', type: String }) readonly networkName!: string;

  get formattedNetworkFeeLabel(): string {
    return `${this.networkName} ${this.t('networkFeeText')}`;
  }
}
</script>
