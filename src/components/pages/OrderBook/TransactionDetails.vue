<template>
  <transaction-details :info-only="infoOnly">
    <info-line
      :label="'order type'"
      :label-tooltip="orderType"
      :value="side.toUpperCase()"
      :class="getComputedClass()"
    />
    <info-line
      :label="'limit price'"
      :label-tooltip="limitTooltip"
      :asset-symbol="quoteSymbol"
      :value="quoteValue || toValue || '0'"
      is-formatted
    />
    <info-line
      :label="'amount'"
      :label-tooltip="amountTooltip"
      :asset-symbol="baseSymbol"
      :value="baseValue || '0'"
      is-formatted
    />
    <info-line :label="'expiry date'" :label-tooltip="expiryTooltip" :value="limitOrderExpiryDate" />
    <info-line
      :label="t('networkFeeText')"
      :label-tooltip="t('networkFeeTooltipText')"
      :value="formattedNetworkFee"
      :asset-symbol="quoteSymbol"
      :fiat-value="getFiatAmountByCodecString(networkFee)"
      is-formatted
    />
  </transaction-details>
</template>

<script lang="ts">
import { PriceVariant } from '@sora-substrate/liquidity-proxy';
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
  @state.orderBook.side side!: PriceVariant;
  @state.orderBook.placeOrderNetworkFee networkFee!: CodecString;

  @getter.assets.assetDataByAddress getAsset!: (addr?: string) => Nullable<AccountAsset>;

  @Prop({ default: true, type: Boolean }) readonly infoOnly!: boolean;
  @Prop({ default: ZeroStringValue, type: String }) readonly soraNetworkFee!: CodecString;

  get baseSymbol(): string | undefined {
    return this.getAsset(this.baseAssetAddress)?.symbol;
  }

  getComputedClass(): string | undefined {
    if (this.infoOnly) {
      return this.side === PriceVariant.Buy ? 'limit-order-type--buy' : 'limit-order-type--sell';
    }
  }

  get expiryTooltip() {
    return "The 'Expiry Date' is the deadline for your order to be executed. If the market doesn't reach your specified price before this date, the order is automatically cancelled. You're not bound to a perpetual wait if market conditions don't align with your trading preferences.";
  }

  get amountTooltip() {
    return "The 'Amount' refers to the total number of assets you want to buy or sell in your order. It's important to specify, as it determines the size of your transaction, impacting the total cost for buy orders or revenue for sell orders.";
  }

  get limitTooltip() {
    return "The 'Limit Price' is the precise price you set for a limit order. The trade will only execute when the asset's market price meets your limit price, ensuring you don't purchase above or sell below this specified value.";
  }

  get orderType() {
    return "A 'Limit' order lets you specify the exact price at which you want to buy or sell an asset. A 'Buy' order will only be executed at the specified price or lower, while a 'Sell' order will execute only at the specified price or higher. This control ensures you don't pay more or sell for less than you're comfortable with.";
  }

  get quoteSymbol(): string {
    return XOR.symbol;
  }

  get limitOrderExpiryDate(): Nullable<string> {
    const now = new Date();
    const oneMonthAhead = now.setMonth(now.getMonth() + 1);
    return this.formatDate(oneMonthAhead, 'LL');
  }

  get formattedNetworkFee(): string {
    return this.formatCodecNumber(this.networkFee);
  }

  formatFee(fee: string, formattedFee: string): string {
    return fee !== ZeroStringValue ? formattedFee : ZeroStringValue;
  }
}
</script>