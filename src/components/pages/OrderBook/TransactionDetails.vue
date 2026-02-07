<template>
  <transaction-details class="s-flex-column" :info-only="infoOnly">
    <info-line
      :label="t('orderBook.txDetails.orderType')"
      :label-tooltip="t('orderBook.tooltip.txDetails.orderType')"
      :value="sideText"
      :class="computedClass"
    ></info-line>
    <info-line
      :label="t('orderBook.txDetails.limitPrice')"
      :label-tooltip="t('orderBook.tooltip.txDetails.limit')"
      :asset-symbol="quoteSymbol"
      :value="quoteValue || toValue || '0'"
      is-formatted
    ></info-line>
    <info-line
      :label="t('orderBook.amount')"
      :label-tooltip="t('orderBook.tooltip.txDetails.amount')"
      :asset-symbol="baseSymbol"
      :value="baseValue || '0'"
      is-formatted
    ></info-line>
    <info-line
      :label="t(`assets.balance.locked`)"
      :label-tooltip="t('orderBook.tooltip.txDetails.locked')"
      :value="locked"
      :asset-symbol="lockedAssetSymbol"
      :fiat-value="getFiatAmountByCodecString(lockedCodec, lockedAsset)"
      is-formatted
    ></info-line>
    <info-line
      v-if="!isMarketType"
      :label="t('orderBook.txDetails.expiryDate')"
      :label-tooltip="t('orderBook.tooltip.txDetails.expiryDate')"
      :value="limitOrderExpiryDate"
    ></info-line>
    <info-line
      :label="t('networkFeeText')"
      :label-tooltip="t('networkFeeTooltipText')"
      :value="formattedNetworkFee"
      :asset-symbol="xorSymbol"
      :fiat-value="getFiatAmountByCodecString(networkFee)"
      is-formatted
    ></info-line>
  </transaction-details>
</template>

<script setup lang="ts">
import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { Operation, type CodecString, type FPNumber, type NetworkFeesObject } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { components } from '@wallet';
import dayjs from 'dayjs/esm';
import { computed } from 'vue';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useSwapAmounts } from '@/composables/useSwapAmounts';
import { useOrderBook } from '@/composables/useOrderBook';
import { useTranslation } from '@/composables/useTranslation';
import { Components, ZeroStringValue } from '@/consts';
import { lazyComponent } from '@/router';
import { useWalletStore } from '@/stores/wallet';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

const TransactionDetails = lazyComponent(Components.TransactionDetails);
const InfoLine = components.InfoLine;

const props = withDefaults(
  defineProps<{
    infoOnly?: boolean;
    isMarketType?: boolean;
  }>(),
  {
    infoOnly: true,
    isMarketType: false,
  }
);

const { t } = useTranslation();
const { getFPNumber, formatCodecNumber, getFiatAmountByCodecString } = useFormattedAmount();
const { toValue } = useSwapAmounts();
const walletStore = useWalletStore();
const { baseValue, quoteValue, side, baseAsset, quoteAsset } = useOrderBook();
const networkFees = computed(() => (walletStore.networkFees as NetworkFeesObject) ?? ({} as NetworkFeesObject));

const xorSymbol = XOR.symbol;
const networkFee = computed<CodecString>(
  () => networkFees.value[Operation.OrderBookPlaceLimitOrder] ?? ZeroStringValue
);

const baseSymbol = computed(() => baseAsset.value.symbol);
const quoteSymbol = computed(() => quoteAsset.value.symbol);

const sideText = computed(() => (side.value === PriceVariant.Buy ? t('orderBook.Buy') : t('orderBook.Sell')));

const total = computed<FPNumber>(() => getFPNumber(baseValue.value).mul(getFPNumber(quoteValue.value)));
const isBuy = computed(() => side.value === PriceVariant.Buy);

const locked = computed(() => (isBuy.value ? total.value.toString() : baseValue.value));
const lockedCodec = computed(() =>
  isBuy.value ? total.value.toCodecString() : getFPNumber(baseValue.value).toCodecString()
);
const lockedAsset = computed(() => (isBuy.value ? quoteAsset.value : baseAsset.value));
const lockedAssetSymbol = computed(() => (isBuy.value ? quoteSymbol.value : baseSymbol.value));

const limitOrderExpiryDate = computed<Nullable<string>>(() => {
  if (props.isMarketType) return null;
  const now = new Date();
  const oneMonthAhead = now.setMonth(now.getMonth() + 1);
  return dayjs(oneMonthAhead).format('LL');
});

const formattedNetworkFee = computed(() => formatCodecNumber(networkFee.value));
const computedClass = computed(() => {
  if (!props.infoOnly) return undefined;
  return side.value === PriceVariant.Buy ? 'limit-order-type--buy' : 'limit-order-type--sell';
});
</script>
