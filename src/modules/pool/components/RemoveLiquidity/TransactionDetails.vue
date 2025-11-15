<template>
  <TransactionDetails :info-only="infoOnly" class="info-line-container">
    <InfoLine
      v-if="shareOfPool"
      value-can-be-hidden
      :label="t('removeLiquidity.shareOfPool')"
      :value="`${shareOfPool}%`"
    ></InfoLine>
    <template v-if="firstTokenSymbol && secondTokenSymbol">
      <InfoLine
        v-if="priceReversed"
        :label="t('priceText')"
        :value="`1 ${firstTokenSymbol} = ${formattedPriceReversed}`"
        :asset-symbol="secondTokenSymbol"
      ></InfoLine>
      <InfoLine
        v-if="price"
        :value="`1 ${secondTokenSymbol} = ${formattedPrice}`"
        :asset-symbol="firstTokenSymbol"
      ></InfoLine>
    </template>
    <InfoLine
      v-if="networkFee"
      :label="t('networkFeeText')"
      :label-tooltip="t('networkFeeTooltipText')"
      :value="formattedFee"
      :asset-symbol="XOR_SYMBOL"
      :fiat-value="formattedFeeFiatValue"
      is-formatted
    ></InfoLine>
  </TransactionDetails>
</template>

<script setup lang="ts">
import { Operation, type CodecString, type NetworkFeesObject } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { components } from '@wallet';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import store from '@/store';

import type { Nullable } from '@/types/common';
import type { Asset } from '@sora-substrate/sdk/build/assets/types';

const props = withDefaults(
  defineProps<{
    infoOnly?: boolean;
  }>(),
  {
    infoOnly: true,
  }
);

const { t } = useI18n();
const formattedAmount = useFormattedAmount();
const { formatStringValue, formatCodecNumber, getFiatAmountByCodecString } = formattedAmount;

const networkFees = computed(() => store.state.wallet.settings.networkFees as NetworkFeesObject);

const shareOfPool = computed(() => store.getters.removeLiquidity.shareOfPool as string);
const firstToken = computed<Nullable<Asset>>(() => store.getters.removeLiquidity.firstToken as Nullable<Asset>);
const secondToken = computed<Nullable<Asset>>(() => store.getters.removeLiquidity.secondToken as Nullable<Asset>);
const priceReversed = computed(() => store.getters.removeLiquidity.priceReversed as string);
const price = computed(() => store.getters.removeLiquidity.price as string);

const firstTokenSymbol = computed(() => firstToken.value?.symbol ?? null);
const secondTokenSymbol = computed(() => secondToken.value?.symbol ?? null);

const formattedPrice = computed(() => formatStringValue(price.value));
const formattedPriceReversed = computed(() => formatStringValue(priceReversed.value));

const networkFee = computed<CodecString>(() => networkFees.value?.[Operation.RemoveLiquidity] ?? '0');
const formattedFee = computed(() => formatCodecNumber(networkFee.value));
const formattedFeeFiatValue = computed(() => getFiatAmountByCodecString(networkFee.value));

const XOR_SYMBOL = XOR.symbol;

const InfoLine = components.InfoLine;
const TransactionDetails = lazyComponent(Components.TransactionDetails);
</script>
