<template>
  <transaction-details :info-only="infoOnly">
    <info-line
      :label="t('bridge.soraNetworkFee')"
      :label-tooltip="t('networkFeeTooltipText')"
      :value="formattedSoraNetworkFee"
      :asset-symbol="XOR_SYMBOL"
      :fiat-value="getFiatAmountByCodecString(soraNetworkFee)"
      is-formatted
    />
    <info-line
      :label="formattedNetworkFeeLabel"
      :label-tooltip="t('ethNetworkFeeTooltipText', { network: networkName })"
      :value="formattedExternalFee"
      :asset-symbol="evmTokenSymbol"
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
import type { NetworkData } from '@/types/bridge';

import type { CodecString } from '@sora-substrate/util';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    TransactionDetails: lazyComponent(Components.TransactionDetails),
    InfoLine: components.InfoLine,
  },
})
export default class BridgeTransactionDetails extends Mixins(mixins.FormattedAmountMixin, TranslationMixin) {
  readonly XOR_SYMBOL = XOR.symbol;

  @Prop({ default: () => null, type: Object }) readonly asset!: RegisteredAccountAsset;
  @Prop({ default: true, type: Boolean }) readonly isSoraToEvm!: boolean;
  @Prop({ default: true, type: Boolean }) readonly infoOnly!: boolean;
  @Prop({ default: '', type: String }) readonly evmTokenSymbol!: string;
  @Prop({ default: ZeroStringValue, type: String }) readonly externalFee!: CodecString;
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

  get formattedExternalFee(): string {
    return this.formatCodecNumber(this.externalFee, this.asset?.externalDecimals);
  }
}
</script>
