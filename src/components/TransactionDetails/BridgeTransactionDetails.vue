<template>
  <component :is="infoOnly ? 'div' : 'transaction-details'" class="bridge-transaction-info">
    <info-line
      :label="t('bridge.soraNetworkFee')"
      :label-tooltip="t('networkFeeTooltipText')"
      :value="formatFee(soraNetworkFee, formattedSoraNetworkFee)"
      :asset-symbol="KnownSymbols.XOR"
      :fiat-value="getFiatAmountByCodecString(soraNetworkFee)"
      is-formatted
    />
    <info-line
      :label="t('bridge.ethereumNetworkFee')"
      :label-tooltip="t('ethNetworkFeeTooltipText')"
      :value="formatFee(evmNetworkFee, formattedEvmNetworkFee)"
      :asset-symbol="currentEvmTokenSymbol"
      is-formatted
    />
  </component>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { Getter } from 'vuex-class';
import { KnownSymbols, CodecString, BridgeNetworks } from '@sora-substrate/util';

import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { lazyComponent } from '@/router';
import { Components, EvmSymbol } from '@/consts';

const namespace = 'bridge';

@Component({
  components: {
    TransactionDetails: lazyComponent(Components.TransactionDetails),
    InfoLine: components.InfoLine,
  },
})
export default class BridgeTransactionDetails extends Mixins(mixins.FormattedAmountMixin, TranslationMixin) {
  @Getter('soraNetworkFee', { namespace }) soraNetworkFee!: CodecString;
  @Getter('evmNetworkFee', { namespace }) evmNetworkFee!: CodecString;
  @Getter('evmNetwork', { namespace: 'web3' }) evmNetwork!: BridgeNetworks;

  @Prop({ default: true, type: Boolean }) readonly infoOnly!: boolean;

  EvmSymbol = EvmSymbol;
  KnownSymbols = KnownSymbols;

  get formattedSoraNetworkFee(): string {
    return this.formatCodecNumber(this.soraNetworkFee);
  }

  get currentEvmTokenSymbol(): string {
    if (this.evmNetwork === BridgeNetworks.ENERGY_NETWORK_ID) {
      return this.EvmSymbol.VT;
    }
    return this.EvmSymbol.ETH;
  }

  formatFee(fee: string, formattedFee: string): string {
    return fee !== '0' ? formattedFee : '0';
  }

  get formattedEvmNetworkFee(): string {
    return this.formatCodecNumber(this.evmNetworkFee);
  }
}
</script>

<style lang="scss">
.bridge-transaction-info {
  .el-collapse.neumorphic .el-icon-arrow-right {
    height: 16px !important;
  }

  .el-collapse-item__header .el-icon-arrow-right.is-active {
    height: 15px !important;
  }
}
</style>
