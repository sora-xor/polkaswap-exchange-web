<template>
  <transaction-details :info-only="expanded" :disabled="disabled" :inline="inline">
    <template #reference>
      <slot name="reference"></slot>
    </template>

    <div class="swap-info-container">
      <info-line v-for="{ id, label, value } in priceValues" :key="id" :label="label" :value="value"></info-line>
      <info-line
        :label="t(`swap.${isExchangeB ? 'maxSold' : 'minReceived'}`)"
        :label-tooltip="t('swap.minReceivedTooltip')"
        :value="formattedMinMaxReceived"
        :asset-symbol="assetSymbol"
        :fiat-value="getFiatAmountByCodecString(minMaxReceived, isExchangeB ? tokenFrom : tokenTo)"
        is-formatted
      ></info-line>
      <info-line v-for="(reward, index) in rewardsValues" :key="index" v-bind="reward"></info-line>
      <info-line :label="t('swap.priceImpact')" :label-tooltip="t('swap.priceImpactTooltip')">
        <value-status-wrapper :value="priceImpact">
          <formatted-amount class="swap-value" :value="priceImpactFormatted">%</formatted-amount>
        </value-status-wrapper>
      </info-line>
      <info-line v-if="full" :label="t('swap.route')">
        <div class="swap-route">
          <div class="swap-route-paths s-flex">
            <div v-for="(token, index) in swapRoute" class="swap-route-value" :key="token">
              <span>{{ token }}</span>
              <s-icon v-if="index !== swapRoute.length - 1" name="el-icon el-icon-arrow-right swap-route-icon"></s-icon>
            </div>
          </div>
        </div>
      </info-line>
      <info-line
        :label="t('swap.liquidityProviderFee')"
        :label-tooltip="liquidityProviderFeeTooltipText"
        :value="formattedLiquidityProviderFee"
        :asset-symbol="xorSymbol"
        is-formatted
      ></info-line>
      <info-line
        v-if="full"
        :label="t('networkFeeText')"
        :label-tooltip="t('networkFeeTooltipText')"
        :value="networkFeeFormatted"
        :asset-symbol="xorSymbol"
        :fiat-value="getFiatAmountByCodecString(networkFee)"
        is-formatted
      ></info-line>
    </div>
  </transaction-details>
</template>

<script setup lang="ts">
import { Operation, type CodecString, type NetworkFeesObject } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { computed } from 'vue';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTranslation } from '@/composables/useTranslation';
import { useSwapStore } from '@/features/swap/stores/useSwapStore';
import { createAsyncComponent } from '@/shared/ui/async';
import type { SwapReview } from '../types/review';
import { useAssetsStore } from '@/stores/assets';
import { useSettingsStore } from '@/stores/settings';

import type { LPRewardsInfo } from '@sora-substrate/liquidity-proxy/build/types';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import WalletComponentFormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';
import WalletComponentInfoLine from '@/lib/soraneo-wallet/src/components/InfoLine.vue';

const ValueStatusWrapper = createAsyncComponent(() => import('@/components/shared/ValueStatusWrapper.vue'));
const TransactionDetails = createAsyncComponent(() => import('@/components/shared/TransactionDetails.vue'));
const FormattedAmount = WalletComponentFormattedAmount;
const InfoLine = WalletComponentInfoLine;

const props = withDefaults(
  defineProps<{
    /** Opens details inline so compact swap widgets expand instead of overlaying adjacent content. */
    inline?: boolean;
    /** Frozen details shown while reviewing or submitting a particular quote. */
    review?: SwapReview | null;
    full?: boolean;
    expanded?: boolean;
    disabled?: boolean;
  }>(),
  {
    inline: false,
    review: null,
    full: false,
    expanded: false,
    disabled: false,
  }
);

const swapStore = useSwapStore();
const assetsStore = useAssetsStore();
const settingsStore = useSettingsStore();
const { t } = useTranslation();
const { formatCodecNumber, formatStringValue, getFiatAmountByString, getFiatAmountByCodecString } =
  useFormattedAmount();

const networkFees = computed(() => settingsStore.networkFees as NetworkFeesObject);
const networkFee = computed(() => props.review?.networkFee ?? networkFees.value[Operation.Swap]);

const liquidityProviderFee = computed(
  () => props.review?.liquidityProviderFee ?? (swapStore.liquidityProviderFee as CodecString)
);
const rewards = computed(() => props.review?.rewards ?? (swapStore.rewards as ReadonlyArray<LPRewardsInfo>));
const route = computed(() => props.review?.route ?? (swapStore.route as ReadonlyArray<string>));
const isExchangeB = computed(() => props.review?.isExchangeB ?? swapStore.isExchangeB);
const tokenFrom = computed(() => props.review?.tokenFrom ?? (swapStore.tokenFrom as AccountAsset | null));
const tokenTo = computed(() => props.review?.tokenTo ?? (swapStore.tokenTo as AccountAsset | null));
const minMaxReceived = computed(() => props.review?.minMaxReceived ?? (swapStore.minMaxReceived as CodecString));
const priceImpact = computed(() => props.review?.priceImpact ?? swapStore.priceImpact);
const price = computed(() => props.review?.price ?? swapStore.price);
const priceReversed = computed(() => props.review?.priceReversed ?? swapStore.priceReversed);

const getAsset = (addr?: string) => assetsStore.assetDataByAddress(addr) as Nullable<AccountAsset>;

const priceValues = computed(() => {
  const fromSymbol = tokenFrom.value?.symbol ?? '';
  const toSymbol = tokenTo.value?.symbol ?? '';

  return [
    {
      id: 'from',
      label: t('firstPerSecond', { first: fromSymbol, second: toSymbol }),
      value: formatStringValue(price.value ?? ''),
    },
    {
      id: 'to',
      label: t('firstPerSecond', { first: toSymbol, second: fromSymbol }),
      value: formatStringValue(priceReversed.value ?? ''),
    },
  ];
});

const liquidityProviderFeeTooltipText = computed(() =>
  t('swap.liquidityProviderFeeTooltip', { liquidityProviderFee: formatStringValue('0.6') })
);

const swapRoute = computed(() => route.value.map((address) => getAsset(address)?.symbol ?? '?'));

const rewardsValues = computed(() =>
  rewards.value.map((reward, index) => {
    const asset = getAsset(reward.currency);
    const value = formatCodecNumber(reward.amount);

    return {
      value,
      fiatValue: asset ? getFiatAmountByString(value, asset) : null,
      assetSymbol: asset?.symbol ?? '',
      label: index === 0 ? t('swap.rewardsForSwap') : '',
    };
  })
);

const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
const formattedLiquidityProviderFee = computed(() => formatCodecNumber(liquidityProviderFee.value));
const priceImpactFormatted = computed(() => formatStringValue(priceImpact.value ?? '0'));

const formattedMinMaxReceived = computed(() => {
  const decimals = (isExchangeB.value ? tokenFrom.value : tokenTo.value)?.decimals;
  return formatCodecNumber(minMaxReceived.value, decimals);
});

const xorSymbol = ` ${XOR.symbol}`;
const assetSymbol = computed(() => (isExchangeB.value ? tokenFrom.value : tokenTo.value)?.symbol ?? '');
</script>

<style lang="scss" scoped>
.swap-route {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $inner-spacing-mini;

  &-value {
    font-weight: 600;
  }

  &-icon {
    color: var(--s-color-base-content-primary) !important;
    font-size: 12px !important;
    margin: 0 !important;
  }
}
</style>
