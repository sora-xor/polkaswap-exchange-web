<template>
  <transaction-details :info-only="infoOnly" class="info-line-container">
    <div v-if="!emptyAssets" class="info-line-container">
      <p class="info-line-container__title">{{ t('createPair.pricePool') }}</p>
      <info-line
        :label="t('firstPerSecond', { first: firstTokenSymbol, second: secondTokenSymbol })"
        :value="formattedPrice"
      ></info-line>
      <info-line
        :label="t('firstPerSecond', { first: secondTokenSymbol, second: firstTokenSymbol })"
        :value="formattedPriceReversed"
      ></info-line>
      <info-line v-if="strategicBonusApy" :label="t('pool.strategicBonusApy')" :value="strategicBonusApy"></info-line>
      <info-line
        is-formatted
        :label="t('networkFeeText')"
        :label-tooltip="t('networkFeeTooltipText')"
        :value="formattedFee"
        :asset-symbol="XOR_SYMBOL"
        :fiat-value="getFiatAmountByCodecString(networkFee)"
      ></info-line>
    </div>

    <div class="info-line-container">
      <p class="info-line-container__title">{{ t(`createPair.yourPosition${!emptyAssets ? 'Estimated' : ''}`) }}</p>
      <info-line
        is-formatted
        value-can-be-hidden
        :label="firstTokenSymbol"
        :value="formattedFirstTokenPosition"
        :fiat-value="fiatFirstTokenPosition"
      ></info-line>
      <info-line
        is-formatted
        value-can-be-hidden
        :label="secondTokenSymbol"
        :value="formattedSecondTokenPosition"
        :fiat-value="fiatSecondTokenPosition"
      ></info-line>
      <info-line value-can-be-hidden :label="t('createPair.shareOfPool')" :value="`${shareOfPool}%`"></info-line>
    </div>
  </transaction-details>
</template>

<script setup lang="ts">
import { FPNumber } from '@sora-substrate/sdk';
import { components } from '@/shims/wallet-components';
import { computed, toRef } from 'vue';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTranslation } from '@/composables/useTranslation';
import { Components } from '@/consts';
import { usePoolTokenPair } from '@/modules/pool/composables/usePoolTokenPair';
import { usePoolApy } from '@/modules/pool/composables/usePoolApy';
import { lazyComponent } from '@/router';
import { usePoolStore } from '@/stores/pool';

import type { CodecString } from '@sora-substrate/sdk';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';

type Props = {
  infoOnly?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  infoOnly: true,
});

const infoOnly = toRef(props, 'infoOnly');
const { t } = useTranslation();
const poolTokenPair = usePoolTokenPair();
const { getFiatAmountByCodecString, getFiatAmountByFPNumber, getFPNumberFromCodec, Hundred } = useFormattedAmount();
const { getPoolApy } = usePoolApy();
const poolStore = usePoolStore();

const liquidityInfo = computed(() => poolStore.addLiquidityLiquidityInfo as Nullable<AccountLiquidity>);
const shareOfPool = computed(() => poolStore.addLiquidityShareOfPool);

const getTokenPosition = (
  liquidityInfoBalance: string | undefined,
  tokenValue: string | CodecString | number
): FPNumber => {
  const previousPosition = FPNumber.fromCodecValue(liquidityInfoBalance ?? 0);
  if (!poolTokenPair.emptyAssets.value) {
    return previousPosition.add(new FPNumber(tokenValue));
  }

  return previousPosition;
};

const firstTokenPosition = computed(() =>
  getTokenPosition(liquidityInfo.value?.firstBalance, poolTokenPair.firstTokenValue.value)
);

const secondTokenPosition = computed(() =>
  getTokenPosition(liquidityInfo.value?.secondBalance, poolTokenPair.secondTokenValue.value)
);

const strategicBonusApy = computed(() => {
  const apy = getPoolApy(
    poolTokenPair.firstToken.value?.address ?? null,
    poolTokenPair.secondToken.value?.address ?? null
  );
  if (!apy) return null;

  return `${getFPNumberFromCodec(apy).mul(Hundred).toLocaleString()}%`;
});

const formattedFirstTokenPosition = computed(() => firstTokenPosition.value.toLocaleString());
const formattedSecondTokenPosition = computed(() => secondTokenPosition.value.toLocaleString());

const fiatFirstTokenPosition = computed(() =>
  poolTokenPair.firstToken.value
    ? getFiatAmountByFPNumber(firstTokenPosition.value, poolTokenPair.firstToken.value)
    : null
);

const fiatSecondTokenPosition = computed(() =>
  poolTokenPair.secondToken.value
    ? getFiatAmountByFPNumber(secondTokenPosition.value, poolTokenPair.secondToken.value)
    : null
);

const firstTokenSymbol = computed(() => poolTokenPair.firstToken.value?.symbol ?? '');
const secondTokenSymbol = computed(() => poolTokenPair.secondToken.value?.symbol ?? '');

const TransactionDetails = lazyComponent(Components.TransactionDetails);
const InfoLine = components.InfoLine;

const {
  XOR_SYMBOL,
  firstToken,
  secondToken,
  firstTokenValue,
  secondTokenValue,
  formattedPrice,
  formattedPriceReversed,
  formattedFee,
  networkFee,
  emptyAssets,
} = poolTokenPair;
</script>
