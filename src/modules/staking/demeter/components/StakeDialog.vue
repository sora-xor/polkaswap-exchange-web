<template>
  <dialog-base v-model:visible="isVisible" :title="title">
    <div class="stake-dialog">
      <dialog-title :base-asset="baseAsset" :pool-asset="poolAsset" :is-farm="isFarm"></dialog-title>

      <div v-if="isAdding" class="stake-dialog-info">
        <template v-if="pricesAvailable">
          <info-line :label="TranslationConsts.APR" :value="apr"></info-line>
          <info-line :label="t('demeterFarming.info.totalLiquidityLocked')" :value="tvl"></info-line>
        </template>
        <info-line :label="t('demeterFarming.info.rewardToken')" :value="rewardAssetSymbol"></info-line>
      </div>

      <s-form class="el-form--actions" :show-message="false">
        <s-float-input
          v-if="isFarm"
          key="farm-input"
          size="medium"
          :class="['s-input--stake-part', valuePartCharClass]"
          :value="value"
          :decimals="0"
          :max="100"
          @update:model-value="handleValue"
        >
          <div slot="top" class="input-title">{{ inputTitle }}</div>
          <div slot="right" class="el-buttons el-buttons--between">
            <span class="percent">%</span>
            <s-button
              v-if="isMaxButtonAvailable"
              class="el-button--max s-typography-button--small"
              type="primary"
              alternative
              size="mini"
              border-radius="mini"
              @click.stop="handleValue(100)"
            >
              {{ t('buttons.max') }}
            </s-button>
          </div>
          <s-slider
            slot="bottom"
            class="slider-container"
            :value="Number(value)"
            :show-tooltip="false"
            @input="handleValue"
          ></s-slider>
        </s-float-input>

        <token-input
          v-else
          key="stake-input"
          :balance="stakingBalanceCodec"
          :is-max-available="isMaxButtonAvailable"
          :title="inputTitle"
          :token="poolAsset"
          :model-value="value"
          @update:model-value="handleValue"
          @max="handleMaxValue"
        ></token-input>
      </s-form>

      <info-line
        v-if="hasStake"
        value-can-be-hidden
        :label="poolShareText"
        :value="poolShareFormatted"
        :fiat-value="poolShareFiat"
      ></info-line>
      <info-line
        value-can-be-hidden
        :label="poolShareAfterText"
        :value="poolShareAfterFormatted"
        :fiat-value="poolShareAfterFiat"
      ></info-line>
      <info-line
        v-if="isAdding"
        :label="t('demeterFarming.info.fee')"
        :label-tooltip="t('demeterFarming.info.feeTooltip')"
        :value="depositFeeFormatted"
      ></info-line>
      <info-line
        :label="t('networkFeeText')"
        :label-tooltip="t('networkFeeTooltipText')"
        :value="networkFeeFormatted"
        :asset-symbol="xorSymbol"
        :fiat-value="getFiatAmountByCodecString(networkFee)"
        is-formatted
      ></info-line>

      <s-button
        type="primary"
        class="s-typography-button--large action-button"
        :loading="combinedLoading"
        :disabled="isInsufficientXorForFee || valueFundsEmpty || isInsufficientBalance"
        @click="handleConfirm"
      >
        <template v-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: xorSymbol }) }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('insufficientBalanceText', { tokenSymbol: poolAssetSymbol }) }}
        </template>
        <template v-else-if="valueFundsEmpty">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else>
          {{ t('confirmText') }}
        </template>
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts" setup>
import { FPNumber, Operation, type CodecString } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { components } from '@/shims/wallet-components';
import { computed, ref, toRefs, watch, type PropType } from 'vue';

import { Components, ZeroStringValue } from '@/consts';
import { useTranslation } from '@/composables/useTranslation';
import { lazyComponent } from '@/router';
import { useAssetsStore } from '@/stores/assets';
import type { DemeterLiquidityParams } from '@/stores/demeterFarming/types';
import { useSettingsStore } from '@/stores/settings';
import type { Nullable } from '@/types/common';
import { getMaxValue, hasInsufficientXorForFee, isXorAccountAsset } from '@/utils';

import { demeterStakingLazyComponent } from '../../router';
import { DemeterStakingComponents } from '../consts';
import { useDemeterPoolCard } from '../composables/useDemeterPoolCard';
import { useDemeterPoolStatus } from '../composables/useDemeterPoolStatus';

import type { DemeterAsset, DemeterPool, DemeterAccountPool } from '../types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

defineOptions({
  components: {
    DialogTitle: demeterStakingLazyComponent(DemeterStakingComponents.DialogTitle),
    TokenInput: lazyComponent(Components.TokenInput),
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
  },
});

const props = defineProps({
  parentLoading: { type: Boolean, default: false },
  isAdding: { type: Boolean, default: true },
  liquidity: { type: Object as PropType<Nullable<AccountLiquidity>>, default: null },
  baseAsset: { type: Object as PropType<Nullable<DemeterAsset>>, default: null },
  pool: { type: Object as PropType<Nullable<DemeterPool>>, default: null },
  accountPool: { type: Object as PropType<Nullable<DemeterAccountPool>>, default: null },
  poolAsset: { type: Object as PropType<Nullable<DemeterAsset>>, default: null },
  rewardAsset: { type: Object as PropType<Nullable<DemeterAsset>>, default: null },
  apr: { type: String, default: ZeroStringValue },
  tvl: { type: String, default: ZeroStringValue },
});

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'add', payload: DemeterLiquidityParams): void;
  (event: 'remove', payload: DemeterLiquidityParams): void;
}>();

const isVisible = defineModel<boolean>('visible', { default: false });
const { liquidity, pool, accountPool, poolAsset, rewardAsset, baseAsset, apr, tvl } = toRefs(props);

const settingsStore = useSettingsStore();
const assetsStore = useAssetsStore();

const networkFees = computed(() => settingsStore.networkFees);
const shouldBalanceBeHidden = computed(() => settingsStore.shouldBalanceBeHidden);
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

const value = ref<string>('');
watch(isVisible, () => {
  value.value = '';
});

const isAdding = computed(() => props.isAdding);
const isFarm = computed(() => statusApi.isFarm.value);
const pricesAvailable = computed(() => statusApi.pricesAvailable.value);
const hasStake = computed(() => statusApi.hasStake.value);

const networkFee = computed<CodecString>(() => {
  const operation = isAdding.value
    ? Operation.DemeterFarmingDepositLiquidity
    : Operation.DemeterFarmingWithdrawLiquidity;
  return networkFees.value?.[operation] ?? ZeroStringValue;
});
const networkFeeFormatted = computed(() => statusApi.formatCodecNumber(networkFee.value));
const xorSymbol = XOR.symbol;
const isInsufficientXorForFee = computed(() => hasInsufficientXorForFee(xorAsset.value, networkFee.value));

const rewardAssetSymbol = computed(() => cardApi.rewardAssetSymbol.value);
const poolAssetSymbol = computed(() => cardApi.poolAssetSymbol.value);
const depositFee = computed(() => cardApi.depositFee.value);
const depositFeeFormatted = computed(() => cardApi.depositFeeFormatted.value);
const poolShareFormatted = computed(() => cardApi.poolShareFormatted.value);
const poolShareFiat = computed(() => cardApi.poolShareFiat.value);

const poolShareText = computed(() =>
  isFarm.value ? t('demeterFarming.info.poolShare') : t('demeterFarming.info.stake', { symbol: poolAssetSymbol.value })
);

const part = computed(() => new FPNumber(value.value || '0').div(FPNumber.HUNDRED));

const valueFunds = computed(() => {
  const asset = poolAsset.value;
  if (!asset) return FPNumber.ZERO;

  if (!isFarm.value) return new FPNumber(value.value || '0');

  if (isAdding.value) {
    const fee = FPNumber.fromCodecValue(networkFee.value);
    const amount = isXorAccountAsset(asset) ? statusApi.availableFunds.value.sub(fee) : statusApi.availableFunds.value;

    return amount.mul(part.value);
  }

  return statusApi.lockedFunds.value.mul(part.value);
});

const poolShareAfter = computed(() => {
  if (isAdding.value) {
    const fee = new FPNumber(depositFee.value);
    const feeFromValue = valueFunds.value.mul(fee);
    const fundsAfter = statusApi.lockedFunds.value.add(valueFunds.value.sub(feeFromValue));
    return isFarm.value ? fundsAfter.div(statusApi.funds.value.sub(feeFromValue)).mul(FPNumber.HUNDRED) : fundsAfter;
  }

  const funds = FPNumber.max(statusApi.lockedFunds.value, statusApi.funds.value) as FPNumber;
  const fundsAfter = FPNumber.max(statusApi.lockedFunds.value.sub(valueFunds.value), FPNumber.ZERO) as FPNumber;

  return isFarm.value ? fundsAfter.div(funds).mul(FPNumber.HUNDRED) : fundsAfter;
});

const poolShareAfterFiat = computed(() => {
  if (isFarm.value || !statusApi.poolAsset.value) return null;
  return statusApi.getFiatAmountByFPNumber(poolShareAfter.value, statusApi.poolAsset.value as AccountAsset);
});

const poolShareAfterFormatted = computed(() => `${poolShareAfter.value.toLocaleString()}${isFarm.value ? '%' : ''}`);

const poolShareAfterText = computed(() =>
  isFarm.value
    ? t('demeterFarming.info.poolShareWillBe')
    : t('demeterFarming.info.stakeWillBe', { symbol: poolAssetSymbol.value })
);

const valueFundsEmpty = computed(() => valueFunds.value.isZero());

const stakingBalance = computed(() => (isAdding.value ? statusApi.availableFunds.value : statusApi.lockedFunds.value));
const stakingBalanceCodec = computed(() => stakingBalance.value.toCodecString());

const isMaxButtonAvailable = computed(() => {
  if (shouldBalanceBeHidden.value) return false;
  const asset = poolAsset.value;
  if (!asset) return false;

  const fee = FPNumber.fromCodecValue(networkFee.value);
  const amount = isAdding.value && isXorAccountAsset(asset) ? stakingBalance.value.sub(fee) : stakingBalance.value;

  return !FPNumber.eq(valueFunds.value, amount);
});

const maxStake = computed(() => {
  const asset = poolAsset.value;
  if (!asset) return ZeroStringValue;

  return isAdding.value ? getMaxValue(asset, networkFee.value) : statusApi.lockedFunds.value.toString();
});

const isInsufficientBalance = computed(() => {
  if (isFarm.value) return false;

  const asset = poolAsset.value;
  if (!asset) return false;

  const availableBalance = new FPNumber(maxStake.value, asset.decimals);
  return FPNumber.lt(availableBalance, valueFunds.value);
});

const valuePartCharClass = computed(() => {
  const charClassName =
    {
      3: 'three',
      2: 'two',
    }[value.value.length] ?? 'one';

  return `${charClassName}-char`;
});

const title = computed(() => {
  const actionKey = isAdding.value ? (hasStake.value ? 'add' : 'start') : 'remove';
  return t(`demeterFarming.actions.${actionKey}`);
});

const inputTitle = computed(() => {
  const key = isAdding.value ? 'amountAdd' : 'amountRemove';
  return t(`demeterFarming.${key}`);
});

const getFiatAmountByCodecString = statusApi.getFiatAmountByCodecString;

const handleValue = (val: string | number) => {
  value.value = String(val ?? '');
};

const handleMaxValue = () => {
  handleValue(maxStake.value);
};

const handleConfirm = () => {
  if (!statusApi.pool.value || !statusApi.accountPool.value) return;

  const params: DemeterLiquidityParams = {
    pool: statusApi.pool.value,
    accountPool: statusApi.accountPool.value,
    value: valueFunds.value,
  };

  const event = isAdding.value ? 'add' : 'remove';
  emit(event, params);
};

const combinedLoading = computed(() => props.parentLoading);
</script>

<style lang="scss" scoped>
.stake-dialog {
  @include full-width-button('action-button');

  & > *:not(:first-child) {
    margin-top: $inner-spacing-medium;
  }
}

.el-form--actions {
  @include buttons;
}
</style>

<style lang="scss">
.s-input.s-input--stake-part {
  @include input-slider;
}
</style>
