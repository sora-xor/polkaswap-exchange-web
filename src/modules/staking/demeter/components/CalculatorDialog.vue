<template>
  <dialog-base v-model:visible="isVisible" :title="`${TranslationConsts.APR} ${t('demeterFarming.calculator')}`">
    <div class="calculator-dialog">
      <dialog-title :base-asset="baseAsset" :pool-asset="poolAsset" :is-farm="isFarm"></dialog-title>

      <s-form class="el-form--actions" :show-message="false">
        <template v-if="isFarm && baseAsset">
          <token-input
            :balance="baseAssetBalance.toCodecString()"
            :is-max-available="isBaseAssetMaxButtonAvailable"
            :title="t('demeterFarming.amountAdd')"
            :token="baseAsset"
            :model-value="baseAssetValue"
            @update:model-value="handleBaseAssetValue"
            @max="handleBaseAssetMax"
          ></token-input>

          <s-icon v-if="poolAsset" class="icon-divider" name="plus-16"></s-icon>
        </template>

        <token-input
          v-if="poolAsset"
          :balance="poolAssetBalance.toCodecString()"
          :is-max-available="isPoolAssetMaxButtonAvailable"
          :title="t('demeterFarming.amountAdd')"
          :token="poolAsset"
          :model-value="poolAssetValue"
          @update:model-value="handlePoolAssetValue"
          @max="handlePoolAssetMax"
        ></token-input>
      </s-form>

      <div class="duration">
        <info-line label="Duration" class="duration-title"></info-line>
        <s-tabs type="rounded" :value="selectedPeriod" @update:model-value="selectPeriod" class="duration-tabs">
          <s-tab v-for="period in intervals" :key="period" :name="String(period)" :label="`${period}D`"></s-tab>
        </s-tabs>
      </div>

      <div class="results">
        <div class="results-title">{{ TranslationConsts.APR }} {{ t('demeterFarming.results') }}</div>

        <info-line
          :label="TranslationConsts.ROI"
          :label-tooltip="t('tooltips.roi')"
          :value="calculatedRoiPercentFormatted"
        ></info-line>
        <info-line
          :label="rewardsText"
          :value="calculatedRewardsFormatted"
          :fiat-value="calculatedRewardsFiat"
        ></info-line>
      </div>

      <a :href="link" target="_blank" rel="nofollow noopener" class="demeter-copyright">
        {{ t('demeterFarming.poweredBy') }}
      </a>
    </div>
  </dialog-base>
</template>

<script lang="ts" setup>
import { FPNumber, Operation, type CodecString } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { computed, ref, toRefs, watch, type PropType } from 'vue';

import TokenInput from '@/components/shared/Input/TokenInput.vue';
import { Links } from '@/consts';
import { useTranslation } from '@/composables/useTranslation';
import DialogTitle from '@/modules/staking/demeter/components/DialogTitle.vue';
import { useAssetsStore } from '@/stores/assets';
import { useSettingsStore } from '@/stores/settings';
import { getAssetBalance, isMaxButtonAvailable, getMaxValue, formatDecimalPlaces } from '@/utils';

import { useDemeterPoolStatus } from '../composables/useDemeterPoolStatus';
import { useDemeterPoolCard } from '../composables/useDemeterPoolCard';

import type { DemeterAsset, DemeterPool, DemeterAccountPool } from '../types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Nullable } from '@/types/common';
import WalletComponentDialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';
import WalletComponentInfoLine from '@/lib/soraneo-wallet/src/components/InfoLine.vue';

defineOptions({
  components: {
    DialogBase: WalletComponentDialogBase,
    InfoLine: WalletComponentInfoLine,
  },
});

const props = defineProps({
  parentLoading: { type: Boolean, default: false },
  liquidity: { type: Object as PropType<Nullable<AccountLiquidity>>, default: null },
  baseAsset: { type: Object as PropType<Nullable<DemeterAsset>>, default: null },
  pool: { type: Object as PropType<Nullable<DemeterPool>>, default: null },
  accountPool: { type: Object as PropType<Nullable<DemeterAccountPool>>, default: null },
  poolAsset: { type: Object as PropType<Nullable<DemeterAsset>>, default: null },
  rewardAsset: { type: Object as PropType<Nullable<DemeterAsset>>, default: null },
  emission: { type: Object as PropType<FPNumber>, default: () => FPNumber.ZERO },
});

const emit = defineEmits<{
  (event: 'close'): void;
}>();

const isVisible = defineModel<boolean>('visible', { default: false });
const { baseAsset, poolAsset, rewardAsset, liquidity, pool, accountPool } = toRefs(props);

const settingsStore = useSettingsStore();
const assetsStore = useAssetsStore();

const networkFees = computed(() => settingsStore.networkFees);
const xorAsset = computed(() => assetsStore.xor as Nullable<AccountAsset>);

const { t, TranslationConsts } = useTranslation();

const statusApi = useDemeterPoolStatus({
  liquidity,
  pool,
  accountPool,
  poolAsset,
  rewardAsset,
});
const cardApi = useDemeterPoolCard(statusApi);

const baseAssetValue = ref('');
const poolAssetValue = ref('');

watch(isVisible, () => {
  baseAssetValue.value = '';
  poolAssetValue.value = '';
});

const intervals = [1, 7, 30, 90];
const interval = ref(1);
const link = Links.demeterFarmingPlatform;

const isFarm = computed(() => statusApi.isFarm.value);
const lpBalance = computed(() => statusApi.lpBalance.value);

const networkFee = computed<CodecString>(() => networkFees.value?.[Operation.DemeterFarmingDepositLiquidity] ?? '0');
const selectedPeriod = computed(() => String(interval.value));

const rewardsText = computed(() => t('demeterFarming.rewards', { symbol: cardApi.rewardAssetSymbol.value }));

const baseAssetDecimals = computed(() => baseAsset.value?.decimals ?? FPNumber.DEFAULT_PRECISION);
const baseAssetBalance = computed(() =>
  baseAsset.value
    ? FPNumber.fromCodecValue(getAssetBalance(baseAsset.value) ?? 0, baseAssetDecimals.value)
    : FPNumber.ZERO
);
const poolAssetBalance = computed(() =>
  poolAsset.value
    ? FPNumber.fromCodecValue(
        getAssetBalance(poolAsset.value) ?? 0,
        poolAsset.value.decimals ?? FPNumber.DEFAULT_PRECISION
      )
    : FPNumber.ZERO
);

const isBaseAssetMaxButtonAvailable = computed(() => {
  if (!baseAsset.value) return false;
  return isMaxButtonAvailable(baseAsset.value, baseAssetValue.value, networkFee.value, xorAsset.value as AccountAsset);
});

const isPoolAssetMaxButtonAvailable = computed(() => {
  if (!poolAsset.value) return false;
  return isMaxButtonAvailable(poolAsset.value, poolAssetValue.value, networkFee.value, xorAsset.value as AccountAsset);
});

const userTokensDeposit = computed(() => {
  if (!poolAsset.value) return FPNumber.ZERO;
  const poolValue = new FPNumber(poolAssetValue.value || 0);
  if (!isFarm.value) return poolValue;

  const secondBalance = FPNumber.fromCodecValue(statusApi.liquidity.value?.secondBalance ?? 0);
  if (secondBalance.isZero()) return FPNumber.ZERO;

  return lpBalance.value.mul(poolValue).div(secondBalance);
});

const userTokensDepositWithFee = computed(() => {
  const depositFee = new FPNumber(cardApi.depositFee.value);
  return userTokensDeposit.value.mul(FPNumber.ONE.sub(depositFee));
});

const calculatedRewards = computed(() => {
  const currentPool = statusApi.pool.value;
  if (!currentPool) return FPNumber.ZERO;

  const totalDeposit = currentPool.totalTokensInPool.add(userTokensDepositWithFee.value);
  if (totalDeposit.isZero()) return FPNumber.ZERO;

  const period = new FPNumber(interval.value);
  const blocksPerDay = new FPNumber(14_400);
  const blocksProduced = period.mul(blocksPerDay);

  return props.emission.mul(blocksProduced).mul(userTokensDepositWithFee.value).div(totalDeposit);
});

const calculatedRewardsFormatted = computed(() => calculatedRewards.value.toLocaleString());
const calculatedRewardsFiat = computed(() => {
  if (!rewardAsset.value) return null;
  return statusApi.getFiatAmountByFPNumber(calculatedRewards.value, rewardAsset.value as AccountAsset);
});

const calculatedRoiPercent = computed(() => {
  if (!poolAsset.value) return FPNumber.ZERO;
  const deposit = new FPNumber(poolAssetValue.value || 0);
  if (deposit.isZero() || cardApi.poolAssetPrice.value.isZero()) return FPNumber.ZERO;

  const multiplier = isFarm.value ? 2 : 1;
  const valueOfDepositUSD = deposit.mul(new FPNumber(multiplier)).mul(cardApi.poolAssetPrice.value);
  const costOfDepositFeeUSD = valueOfDepositUSD.mul(new FPNumber(cardApi.depositFee.value));
  const costOfNetworkFeeUSD = FPNumber.fromCodecValue(networkFee.value).mul(
    FPNumber.fromCodecValue(statusApi.getAssetFiatPrice(xorAsset.value as AccountAsset) ?? 0)
  );

  const costOfInvestmentUSD = costOfDepositFeeUSD.add(costOfNetworkFeeUSD);
  const valueOfInvestmentUSD = calculatedRewards.value.mul(cardApi.rewardAssetPrice.value);

  return valueOfInvestmentUSD.sub(costOfInvestmentUSD).div(valueOfDepositUSD).mul(FPNumber.HUNDRED);
});

const calculatedRoiPercentFormatted = computed(() => formatDecimalPlaces(calculatedRoiPercent.value, true));

const selectPeriod = (name: string) => {
  interval.value = Number(name);
};

const syncPoolValueFromBase = () => {
  if (!liquidity.value) return;
  const second = FPNumber.fromCodecValue(liquidity.value.secondBalance ?? 0);
  const first = FPNumber.fromCodecValue(liquidity.value.firstBalance ?? 0);
  if (first.isZero()) return;
  poolAssetValue.value = new FPNumber(baseAssetValue.value || 0).mul(second).div(first).toString();
};

const syncBaseValueFromPool = () => {
  if (!liquidity.value) return;
  const second = FPNumber.fromCodecValue(liquidity.value.secondBalance ?? 0);
  const first = FPNumber.fromCodecValue(liquidity.value.firstBalance ?? 0);
  if (second.isZero()) return;
  baseAssetValue.value = new FPNumber(poolAssetValue.value || 0).mul(first).div(second).toString();
};

const handleBaseAssetValue = (value: string) => {
  baseAssetValue.value = value;
  if (!value) {
    poolAssetValue.value = '';
  } else {
    syncPoolValueFromBase();
  }
};

const handlePoolAssetValue = (value: string) => {
  poolAssetValue.value = value;
  if (!value) {
    baseAssetValue.value = '';
  } else {
    syncBaseValueFromPool();
  }
};

const handleBaseAssetMax = () => {
  if (!baseAsset.value) return;
  handleBaseAssetValue(getMaxValue(baseAsset.value, networkFee.value));
};

const handlePoolAssetMax = () => {
  if (!poolAsset.value) return;
  handlePoolAssetValue(getMaxValue(poolAsset.value, networkFee.value));
};
</script>

<style lang="scss">
.duration-title.info-line {
  border-bottom: none;
}
.duration-tabs.s-tabs {
  .el-tabs__header,
  .el-tabs__nav {
    width: 100%;
  }

  .el-tabs__item {
    flex: 1;
    text-align: center;
  }
}
</style>

<style lang="scss" scoped>
.calculator-dialog {
  & > *:not(:first-child) {
    margin-top: $inner-spacing-medium;
  }

  @include vertical-divider('icon-divider', $inner-spacing-medium);
}

.duration {
  &-title + &-tabs {
    margin-top: $inner-spacing-small;
  }
}

.results {
  &-title {
    font-size: var(--s-heading3-font-size);
    font-weight: 500;
    line-height: var(--s-line-height-small);
    letter-spacing: var(--s-letter-spacing-mini);
    margin-bottom: $inner-spacing-big;
  }
}

.demeter-copyright {
  color: var(--s-color-base-content-tertiary);
  display: block;
  font-size: var(--s-font-size-mini);
  font-weight: 400;
  text-align: center;
  text-decoration: none;
  text-transform: uppercase;

  @include focus-outline;
}
</style>
