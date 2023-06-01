<template>
  <transaction-details :info-only="infoOnly">
    <info-line
      :label="t('bridge.soraNetworkFee')"
      :label-tooltip="t('networkFeeTooltipText')"
      :value="formatFee(soraNetworkFee, formattedSoraNetworkFee)"
      :asset-symbol="XOR_SYMBOL"
      :fiat-value="getFiatAmountByCodecString(soraNetworkFee)"
      is-formatted
    />
    <info-line
      :label="formattedNetworkFeeLabel"
      :label-tooltip="t('ethNetworkFeeTooltipText', { network: networkName })"
      :value="formatFee(evmNetworkFee, formattedEvmNetworkFee)"
      :asset-symbol="evmTokenSymbol"
      is-formatted
    />
  </transaction-details>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import type { CodecString } from '@sora-substrate/util';

import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { lazyComponent } from '@/router';
import { Components, ZeroStringValue } from '@/consts';

import type { NetworkData } from '@/types/bridge';

@Component({
  components: {
    TransactionDetails: lazyComponent(Components.TransactionDetails),
    InfoLine: components.InfoLine,
  },
})
export default class BridgeTransactionDetails extends Mixins(mixins.FormattedAmountMixin, TranslationMixin) {
  readonly XOR_SYMBOL = XOR.symbol;

  @Prop({ default: true, type: Boolean }) readonly isSoraToEvm!: boolean;
  @Prop({ default: true, type: Boolean }) readonly infoOnly!: boolean;
  @Prop({ default: '', type: String }) readonly evmTokenSymbol!: string;
  @Prop({ default: ZeroStringValue, type: String }) readonly evmNetworkFee!: CodecString;
  @Prop({ default: ZeroStringValue, type: String }) readonly soraNetworkFee!: CodecString;
  @Prop({ default: () => null, type: Object }) readonly network!: NetworkData;

  get networkName(): string {
    return this.network?.shortName ?? '';
  }

  get formattedNetworkFeeLabel(): string {
    return `${this.networkName} ${this.t('networkFeeText')}`;
  }

  get formattedSoraNetworkFee(): string {
    return this.formatCodecNumber(this.soraNetworkFee);
  }

  get formattedEvmNetworkFee(): string {
    return this.formatCodecNumber(this.evmNetworkFee);
  }

  formatFee(fee: string, formattedFee: string): string {
    return fee !== ZeroStringValue ? formattedFee : ZeroStringValue;
  }
}
</script>
