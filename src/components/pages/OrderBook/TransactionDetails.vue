<template>
  <transaction-details :info-only="infoOnly">
    <info-line :label="'order type'" :label-tooltip="'type'" :value="'SELL'" />
    <info-line
      :label="'limit price'"
      :label-tooltip="'order limit price'"
      :asset-symbol="quoteSymbol"
      :value="quoteValue || toValue || '0'"
      is-formatted
    />
    <info-line
      :label="'amount'"
      :label-tooltip="'amount'"
      :asset-symbol="baseSymbol"
      :value="baseValue || '0'"
      is-formatted
    />
    <info-line :label="'expiry date'" :label-tooltip="'lifespan'" :value="limitOrderExpiryDate" />
    <info-line
      :label="t('swap.networkFee')"
      :label-tooltip="t('networkFeeTooltipText')"
      :value="formattedNetworkFee"
      :asset-symbol="quoteSymbol"
      :fiat-value="getFiatAmountByCodecString(networkFee)"
      is-formatted
    />
  </transaction-details>
</template>

<script lang="ts">
import { Operation, NetworkFeesObject } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, ZeroStringValue } from '@/consts';
import { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';

import type { CodecString } from '@sora-substrate/util';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

@Component({
  components: {
    TransactionDetails: lazyComponent(Components.TransactionDetails),
    InfoLine: components.InfoLine,
  },
})
export default class BridgeTransactionDetails extends Mixins(mixins.FormattedAmountMixin, TranslationMixin) {
  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @state.orderBook.baseValue baseValue!: string;
  @state.orderBook.quoteValue quoteValue!: string;
  @state.orderBook.baseAssetAddress baseAssetAddress!: string;
  @state.swap.toValue toValue!: string;

  @getter.assets.assetDataByAddress getAsset!: (addr?: string) => Nullable<AccountAsset>;

  @Prop({ default: true, type: Boolean }) readonly infoOnly!: boolean;
  @Prop({ default: ZeroStringValue, type: String }) readonly soraNetworkFee!: CodecString;

  get baseSymbol(): string | undefined {
    return this.getAsset(this.baseAssetAddress)?.symbol;
  }

  get quoteSymbol(): string {
    return XOR.symbol;
  }

  get limitOrderExpiryDate(): Nullable<string> {
    const now = new Date();
    const oneMonthAhead = now.setMonth(now.getMonth() + 1);
    return this.formatDate(oneMonthAhead, 'LL');
  }

  get networkFee(): CodecString {
    // TODO: PlaceOrder
    return this.networkFees[Operation.Swap];
  }

  get formattedNetworkFee(): string {
    return this.formatCodecNumber(this.networkFee);
  }

  get formattedSoraNetworkFee(): string {
    return this.formatCodecNumber(this.soraNetworkFee);
  }

  formatFee(fee: string, formattedFee: string): string {
    return fee !== ZeroStringValue ? formattedFee : ZeroStringValue;
  }
}
</script>
