<template>
  <transaction-details>
    <info-line
      :label="t('bridge.soraNetworkFee')"
      :label-tooltip="t('networkFeeTooltipText')"
      :value="formatStringValue(soraNetworkFee, XOR.decimals)"
      :asset-symbol="XOR.symbol"
      :fiat-value="getFiatAmountByString(soraNetworkFee, XOR)"
      is-formatted
    />
    <info-line
      :label="formattedNetworkFeeLabel"
      :label-tooltip="t('ethNetworkFeeTooltipText', { network: networkName })"
      :value="formatStringValue(externalNetworkFee, nativeToken.externalDecimals)"
      :asset-symbol="nativeTokenSymbol"
      :fiat-value="getFiatAmountByString(externalNetworkFee, nativeToken)"
      is-formatted
    />
    <info-line
      v-if="isNotZero(externalTransferFee)"
      :label="t('bridge.externalTransferFee', { network: networkName })"
      :label-tooltip="t('bridge.externalTransferFeeTooltip', { network: networkName })"
      :value="formatStringValue(externalTransferFee, asset.externalDecimals)"
      :asset-symbol="assetSymbol"
      :fiat-value="getFiatAmountByString(externalTransferFee, asset)"
      is-formatted
    />
    <info-line
      v-if="isNotZero(externalMinBalance)"
      :label="t('bridge.externalMinDeposit', { network: networkName })"
      :label-tooltip="t('bridge.externalMinDepositTooltip', { network: networkName, symbol: assetSymbol })"
      :value="formatStringValue(externalMinBalance, asset.externalDecimals)"
      :asset-symbol="assetSymbol"
      :fiat-value="getFiatAmountByString(externalMinBalance, asset)"
      is-formatted
    />
  </transaction-details>
</template>

<script lang="ts">
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, ZeroStringValue } from '@/consts';
import { lazyComponent } from '@/router';

import type { CodecString } from '@sora-substrate/sdk';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

@Component({
  components: {
    TransactionDetails: lazyComponent(Components.TransactionDetails),
    InfoLine: components.InfoLine,
  },
})
export default class BridgeTransactionDetails extends Mixins(mixins.FormattedAmountMixin, TranslationMixin) {
  readonly XOR = XOR;

  @Prop({ default: () => null, type: Object }) readonly asset!: Nullable<RegisteredAccountAsset>;
  @Prop({ default: () => null, type: Object }) readonly nativeToken!: Nullable<RegisteredAccountAsset>;
  @Prop({ default: ZeroStringValue, type: String }) readonly externalTransferFee!: CodecString;
  @Prop({ default: ZeroStringValue, type: String }) readonly externalNetworkFee!: CodecString;
  @Prop({ default: ZeroStringValue, type: String }) readonly externalMinBalance!: CodecString;
  @Prop({ default: ZeroStringValue, type: String }) readonly soraNetworkFee!: CodecString;
  @Prop({ default: '', type: String }) readonly networkName!: string;

  get assetSymbol(): string {
    return this.asset?.symbol ?? '';
  }

  get nativeTokenSymbol(): string {
    return this.nativeToken?.symbol ?? '';
  }

  get formattedNetworkFeeLabel(): string {
    return `${this.TranslationConsts.Max} ${this.networkName} ${this.t('networkFeeText')}`;
  }

  get isExternalTransferFeeNotZero(): boolean {
    return this.externalTransferFee !== ZeroStringValue;
  }

  isNotZero(value: CodecString): boolean {
    return value !== ZeroStringValue;
  }
}
</script>
