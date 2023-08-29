<template>
  <transaction-details>
    <info-line
      :label="t('bridge.soraNetworkFee')"
      :label-tooltip="t('networkFeeTooltipText')"
      :value="formatStringValue(soraNetworkFee)"
      :asset-symbol="XOR.symbol"
      :fiat-value="getFiatAmountByString(soraNetworkFee, XOR)"
      is-formatted
    />
    <info-line
      :label="formattedNetworkFeeLabel"
      :label-tooltip="t('ethNetworkFeeTooltipText', { network: networkName })"
      :value="formatStringValue(externalNetworkFee)"
      :asset-symbol="nativeTokenSymbol"
      :fiat-value="getFiatAmountByString(externalNetworkFee, asset)"
      is-formatted
    >
      <template v-if="isExternalFeeNotZero" #info-line-value-prefix>
        <span class="info-line-value-prefix">~</span>
      </template>
    </info-line>
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
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    TransactionDetails: lazyComponent(Components.TransactionDetails),
    InfoLine: components.InfoLine,
  },
})
export default class BridgeTransactionDetails extends Mixins(mixins.FormattedAmountMixin, TranslationMixin) {
  readonly XOR = XOR;

  @Prop({ default: () => null, type: Object }) readonly asset!: Nullable<RegisteredAccountAsset>;
  @Prop({ default: '', type: String }) readonly nativeTokenSymbol!: string;
  @Prop({ default: ZeroStringValue, type: String }) readonly externalNetworkFee!: CodecString;
  @Prop({ default: ZeroStringValue, type: String }) readonly soraNetworkFee!: CodecString;
  @Prop({ default: '', type: String }) readonly networkName!: string;

  get formattedNetworkFeeLabel(): string {
    return `${this.networkName} ${this.t('networkFeeText')}`;
  }

  get isExternalFeeNotZero(): boolean {
    return this.externalNetworkFee !== ZeroStringValue;
  }
}
</script>
