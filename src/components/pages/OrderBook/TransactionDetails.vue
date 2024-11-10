<template>
  <transaction-details class="s-flex-column" :info-only="infoOnly">
    <info-line
      :label="t('orderBook.txDetails.orderType')"
      :label-tooltip="t('orderBook.tooltip.txDetails.orderType')"
      :value="sideText"
      :class="computedClass"
    />
    <info-line
      :label="t('orderBook.txDetails.limitPrice')"
      :label-tooltip="t('orderBook.tooltip.txDetails.limit')"
      :asset-symbol="quoteSymbol"
      :value="quoteValue || toValue || '0'"
      is-formatted
    />
    <info-line
      :label="t('orderBook.amount')"
      :label-tooltip="t('orderBook.tooltip.txDetails.amount')"
      :asset-symbol="baseSymbol"
      :value="baseValue || '0'"
      is-formatted
    />
    <info-line
      :label="t(`assets.balance.locked`)"
      :label-tooltip="t('orderBook.tooltip.txDetails.locked')"
      :value="locked"
      :asset-symbol="lockedAssetSymbol"
      :fiat-value="getFiatAmountByCodecString(lockedCodec, lockedAsset)"
      is-formatted
    />
    <info-line
      v-if="!isMarketType"
      :label="t('orderBook.txDetails.expiryDate')"
      :label-tooltip="t('orderBook.tooltip.txDetails.expiryDate')"
      :value="limitOrderExpiryDate"
    />
    <info-line
      :label="t('networkFeeText')"
      :label-tooltip="t('networkFeeTooltipText')"
      :value="formattedNetworkFee"
      :asset-symbol="xorSymbol"
      :fiat-value="getFiatAmountByCodecString(networkFee)"
      is-formatted
    />
  </transaction-details>
</template>

<script lang="ts">
import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { Operation } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, ZeroStringValue } from '@/consts';
import { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';

import type { CodecString, FPNumber, NetworkFeesObject } from '@sora-substrate/sdk';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

@Component({
  components: {
    TransactionDetails: lazyComponent(Components.TransactionDetails),
    InfoLine: components.InfoLine,
  },
})
export default class PlaceTransactionDetails extends Mixins(mixins.FormattedAmountMixin, TranslationMixin) {
  @state.orderBook.baseValue baseValue!: string;
  @state.orderBook.quoteValue quoteValue!: string;
  @state.orderBook.side side!: PriceVariant;
  @state.swap.toValue toValue!: string;
  @state.wallet.settings.networkFees private networkFees!: NetworkFeesObject;
  @getter.orderBook.baseAsset private baseAsset!: AccountAsset;
  @getter.orderBook.quoteAsset private quoteAsset!: AccountAsset;

  @Prop({ default: true, type: Boolean }) readonly infoOnly!: boolean;
  @Prop({ default: false, type: Boolean }) readonly isMarketType!: boolean;

  get xorSymbol(): string {
    return XOR.symbol;
  }

  get networkFee(): CodecString {
    return this.networkFees[Operation.OrderBookPlaceLimitOrder];
  }

  get baseSymbol(): string {
    return this.baseAsset.symbol;
  }

  get quoteSymbol(): string {
    return this.quoteAsset.symbol;
  }

  get sideText(): string {
    return this.side === PriceVariant.Buy ? this.t('orderBook.Buy') : this.t('orderBook.Sell');
  }

  get locked(): string {
    return this.isBuy ? this.total.toString() : this.baseValue;
  }

  get lockedCodec(): string {
    return this.isBuy ? this.total.toCodecString() : this.getFPNumber(this.baseValue).toCodecString();
  }

  get lockedAsset(): AccountAsset {
    return this.isBuy ? this.quoteAsset : this.baseAsset;
  }

  get lockedAssetSymbol(): string | undefined {
    return this.isBuy ? this.quoteSymbol : this.baseSymbol;
  }

  get total(): FPNumber {
    return this.getFPNumber(this.baseValue).mul(this.getFPNumber(this.quoteValue));
  }

  get isBuy(): boolean {
    return this.side === PriceVariant.Buy;
  }

  get limitOrderExpiryDate(): Nullable<string> {
    const now = new Date();
    const oneMonthAhead = now.setMonth(now.getMonth() + 1);
    return this.formatDate(oneMonthAhead, 'LL');
  }

  get formattedNetworkFee(): string {
    return this.formatCodecNumber(this.networkFee);
  }

  get computedClass(): string | undefined {
    if (this.infoOnly) {
      return this.side === PriceVariant.Buy ? 'limit-order-type--buy' : 'limit-order-type--sell';
    }
    return undefined;
  }
}
</script>
