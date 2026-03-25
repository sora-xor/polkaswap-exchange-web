<template>
  <div ref="rootRef">
    <s-form class="el-form--actions" :show-message="false">
      <s-float-input
        ref="removePart"
        size="medium"
        :class="['s-input--remove-part', removePartCharClass]"
        :value="removePart"
        :decimals="0"
        :disabled="liquidityLocked"
        :max="MAX_PART"
        @update:model-value="handleRemovePartChange"
        @focus="setFocusedField(FocusedField.Percent)"
        @blur="resetFocusedField"
      >
        <div slot="top" class="input-title">{{ t('removeLiquidity.amount') }}</div>
        <div slot="right" class="el-buttons el-buttons--between">
          <span class="percent">%</span>
          <s-button
            v-if="isMaxButtonAvailable"
            class="el-button--max s-typography-button--small"
            type="primary"
            alternative
            size="mini"
            border-radius="mini"
            @click.stop="handleRemovePartChange(MAX_PART)"
          >
            {{ t('buttons.max') }}
          </s-button>
        </div>
        <div slot="bottom">
          <s-slider
            class="slider-container"
            :value="sliderValue"
            :disabled="liquidityLocked"
            :show-tooltip="false"
            @input="handleRemovePartChange"
          ></s-slider>
          <div v-for="{ percent, lock } in locks" :key="lock" class="input-line input-line--footer locked-part">
            <span class="locked-part-percent">{{ percent }}</span> {{ t('removeLiquidity.locked', { lock }) }}
          </div>
        </div>
      </s-float-input>
      <s-icon class="icon-divider" name="arrows-arrow-bottom-24"></s-icon>

      <TokenInput
        :disabled="liquidityLocked"
        :max="getTokenMaxAmount(firstTokenBalance)"
        :title="t('removeLiquidity.output')"
        :token="firstToken"
        :model-value="firstTokenAmount"
        @update:model-value="setFirstTokenAmount"
        @focus="setFocusedField(FocusedField.First)"
        @blur="resetFocusedField"
      >
        <template #balance>-</template>
      </TokenInput>

      <s-icon class="icon-divider" name="plus-16"></s-icon>

      <TokenInput
        :disabled="liquidityLocked"
        :max="getTokenMaxAmount(secondTokenBalance)"
        :title="t('removeLiquidity.output')"
        :token="secondToken"
        :model-value="secondTokenAmount"
        @update:model-value="setSecondTokenAmount"
        @focus="setFocusedField(FocusedField.Second)"
        @blur="resetFocusedField"
      >
        <template #balance>-</template>
      </TokenInput>

      <SlippageTolerance class="slippage-tolerance-settings"></SlippageTolerance>

      <s-button
        type="primary"
        class="action-button s-typography-button--large"
        border-radius="small"
        :disabled="liquidityLocked || isEmptyAmount || isInsufficientBalance || isInsufficientXorForFee"
        :loading="loading"
        @click="handleRemoveLiquidity"
      >
        <template v-if="isEmptyAmount">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('insufficientBalanceText', { tokenSymbol: t('removeLiquidity.liquidity') }) }}
        </template>
        <template v-else-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: XOR_SYMBOL }) }}
        </template>
        <template v-else>
          {{ t('removeLiquidity.remove') }}
        </template>
      </s-button>

      <RemoveLiquidityTransactionDetails
        class="info-line-container"
        v-if="price || priceReversed || networkFee || shareOfPool"
        :info-only="false"
      ></RemoveLiquidityTransactionDetails>
    </s-form>

    <RemoveLiquidityConfirm
      v-model:visible="confirmDialogVisible"
      :parent-loading="combinedParentLoading"
      @confirm="withdrawLiquidity"
    ></RemoveLiquidityConfirm>

    <NetworkFeeWarningDialog
      v-model:visible="showWarningFeeDialog"
      :fee="formattedFee"
      @confirm="confirmNetworkFeeWariningDialog"
    ></NetworkFeeWarningDialog>
  </div>
</template>

<script setup lang="ts">
import { FPNumber, type CodecString, Operation } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTransaction } from '@/composables/useTransaction';
import { useNetworkFeeWarning } from '@/composables/useNetworkFeeWarning';
import { useNetworkFeeDialog } from '@/composables/useNetworkFeeDialog';
import { Components, type NetworkFeeWarningOptions } from '@/consts';
import { PoolComponents } from '@/modules/pool/consts';
import { poolLazyComponent } from '@/modules/pool/router';
import { lazyComponent } from '@/router';
import { useAssetsStore } from '@/stores/assets';
import { usePoolStore } from '@/stores/pool';
import { RemoveLiquidityFocusedField as FocusedField } from '@/stores/pool/types';
import { useWalletStore } from '@/stores/wallet';
import { hasInsufficientXorForFee, formatDecimalPlaces } from '@/utils';

import type { Asset, AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';
import type { Nullable } from '@/types/common';

const props = withDefaults(
  defineProps<{
    parentLoading?: boolean;
  }>(),
  {
    parentLoading: false,
  }
);

const emit = defineEmits<{ (event: 'back'): void }>();

const rootRef = ref<HTMLElement | null>(null);
const sliderInputRef = ref<HTMLInputElement | null>(null);
const sliderDragButtonRef = ref<HTMLElement | null>(null);

const { t } = useTranslation();
const { formatCodecNumber, getFPNumber } = useFormattedAmount();
const { loading, withNotifications } = useTransaction();
const { allowFeePopup, isXorSufficientForNextTx, networkFees } = useNetworkFeeWarning();
const {
  showWarningFeeDialog,
  isWarningFeeDialogConfirmed,
  openWarningFeeDialog,
  closeWarningFeeDialog,
  confirmNetworkFeeWariningDialog,
  waitOnFeeWarningConfirmation,
} = useNetworkFeeDialog();
const assetsStore = useAssetsStore();
const poolStore = usePoolStore();
const walletStore = useWalletStore();

const removePart = computed(() => poolStore.removeLiquidityRemovePart);
const liquidityAmount = computed(() => poolStore.removeLiquidityLiquidityAmount);
const firstTokenAmount = computed(() => poolStore.removeLiquidityFirstTokenAmount);
const secondTokenAmount = computed(() => poolStore.removeLiquiditySecondTokenAmount);
const focusedField = computed(() => poolStore.removeLiquidityFocusedField as FocusedField | null);

const liquidity = computed(() => poolStore.removeLiquidityLiquidity as Nullable<AccountLiquidity>);
const liquidityBalanceFull = computed(() => poolStore.removeLiquidityLiquidityBalanceFull as FPNumber);
const liquidityBalance = computed(() => poolStore.removeLiquidityLiquidityBalance as FPNumber);
const demeterLockedBalance = computed(() => poolStore.removeLiquidityDemeterLockedBalance as FPNumber);
const ceresLockedBalance = computed(() => poolStore.removeLiquidityCeresLockedBalance as FPNumber);
const firstToken = computed(() => poolStore.removeLiquidityFirstToken as Nullable<Asset>);
const secondToken = computed(() => poolStore.removeLiquiditySecondToken as Nullable<Asset>);
const firstTokenBalance = computed(() => poolStore.removeLiquidityFirstTokenBalance as FPNumber);
const secondTokenBalance = computed(() => poolStore.removeLiquiditySecondTokenBalance as FPNumber);
const shareOfPool = computed(() => poolStore.removeLiquidityShareOfPool);
const price = computed(() => poolStore.removeLiquidityPrice);
const priceReversed = computed(() => poolStore.removeLiquidityPriceReversed);
const xor = computed(() => assetsStore.xor as Nullable<AccountAsset>);
const isConfirmTxDisabled = computed(() => walletStore.isConfirmTxDialogDisabled as boolean);
const shouldBalanceBeHidden = computed(() => Boolean(walletStore.shouldBalanceBeHidden));
const combinedParentLoading = computed(() => Boolean(props.parentLoading) || loading.value);

const confirmDialogVisible = ref(false);

const RemoveLiquidityConfirm = poolLazyComponent(PoolComponents.RemoveLiquidityConfirm);
const RemoveLiquidityTransactionDetails = poolLazyComponent(PoolComponents.RemoveLiquidityTransactionDetails);
const SlippageTolerance = lazyComponent(Components.SlippageTolerance);
const NetworkFeeWarningDialog = lazyComponent(Components.NetworkFeeWarningDialog);
const TokenInput = lazyComponent(Components.TokenInput);

const XOR_SYMBOL = XOR.symbol;
const MAX_PART = 100;

const networkFee = computed<CodecString>(() => networkFees.value?.[Operation.RemoveLiquidity] ?? '0');
const formattedFee = computed(() => formatCodecNumber(networkFee.value));

const sliderValue = computed<Nullable<number>>(() => {
  const value = removePart.value;
  return value ? Number(value) : undefined;
});

const isEmptyAmount = computed(() => {
  return !Number(liquidityAmount.value) || !firstTokenAmount.value || !secondTokenAmount.value;
});

const liquidityLocked = computed(() => liquidityBalance.value.isZero());

const locks = computed(() =>
  [
    { balance: demeterLockedBalance.value, lock: 'Demeter Farming' },
    { balance: ceresLockedBalance.value, lock: 'Ceres Liquidity Locker' },
  ].reduce<{ percent: string; lock: string }[]>((acc, { balance, lock }) => {
    if (!balance.isZero()) {
      acc.push({
        lock,
        percent: getLockedPercent(balance),
      });
    }
    return acc;
  }, [])
);

const isInsufficientBalance = computed(() => {
  const liquidityAmountValue = getFPNumber(liquidityAmount.value || '0');
  const firstAmountValue = getFPNumber(firstTokenAmount.value || '0');
  const secondAmountValue = getFPNumber(secondTokenAmount.value || '0');

  return (
    FPNumber.gt(liquidityAmountValue, liquidityBalance.value) ||
    FPNumber.gt(firstAmountValue, firstTokenBalance.value) ||
    FPNumber.gt(secondAmountValue, secondTokenBalance.value)
  );
});

const isInsufficientXorForFee = computed(
  () => Boolean(xor.value) && hasInsufficientXorForFee(xor.value as AccountAsset, networkFee.value)
);

const removePartCharClass = computed(() => {
  const length = removePart.value?.length ?? 0;
  const charClassName = ({ 3: 'three', 2: 'two' } as Record<number, string>)[length] ?? 'one';
  return `${charClassName}-char`;
});

const isMaxButtonAvailable = computed(() => {
  if (shouldBalanceBeHidden.value) return false;
  return !liquidityLocked.value && Number(removePart.value || 0) !== MAX_PART;
});

const setFocusedField = (field: FocusedField) => {
  poolStore.setRemoveLiquidityFocusedField(field);
};

const resetFocusedField = () => {
  poolStore.resetRemoveLiquidityFocusedField();
};

const setRemovePart = async (value: string) => {
  await poolStore.setRemoveLiquidityPart(value);
};

const setFirstTokenAmount = async (value: string | number) => {
  await poolStore.setRemoveLiquidityFirstTokenAmount(String(value));
};

const setSecondTokenAmount = async (value: string | number) => {
  await poolStore.setRemoveLiquiditySecondTokenAmount(String(value));
};

const removeLiquidityAction = async () => {
  await poolStore.submitRemoveLiquidity();
};

const getTokenMaxAmount = (tokenBalance: FPNumber): string => tokenBalance.toString();

const getLockedPercent = (lockedBalance: FPNumber): string => {
  if (liquidityBalanceFull.value.isZero()) return '0';

  const percent = lockedBalance.div(liquidityBalanceFull.value).mul(FPNumber.HUNDRED);
  return formatDecimalPlaces(percent, true);
};

const handleRemovePartChange = async (value: string | number) => {
  if (Number(value) !== Number(removePart.value)) {
    await setRemovePart(String(value));
  }
};

const focusSliderInput = () => {
  setFocusedField(FocusedField.Percent);
  sliderInputRef.value?.focus();
};

const confirmOrExecute = async (handler: () => Promise<void> | void) => {
  if (isConfirmTxDisabled.value) {
    await handler();
  } else {
    confirmDialogVisible.value = true;
  }
};

const isXorSufficientForNextOperation = () => {
  const params: NetworkFeeWarningOptions = { type: Operation.RemoveLiquidity };

  if (firstToken.value?.address === XOR.address) {
    params.amount = getFPNumber(firstTokenAmount.value || '0');
    params.isXor = true;
  }

  return isXorSufficientForNextTx(params);
};

const withdrawLiquidity = async () => {
  await withNotifications(async () => {
    await removeLiquidityAction();
    emit('back');
  });
  confirmDialogVisible.value = false;
};

const handleRemoveLiquidity = async () => {
  if (allowFeePopup.value && !isXorSufficientForNextOperation()) {
    openWarningFeeDialog();
    await waitOnFeeWarningConfirmation();
    if (!isWarningFeeDialogConfirmed.value) {
      closeWarningFeeDialog();
      return;
    }
    isWarningFeeDialogConfirmed.value = false;
    closeWarningFeeDialog();
  }

  await confirmOrExecute(withdrawLiquidity);
};

const addListenerToSliderDragButton = async () => {
  await nextTick();
  const root = rootRef.value;
  if (!root) return;

  sliderDragButtonRef.value = root.querySelector('.slider-container .el-slider__button') as HTMLElement | null;
  sliderInputRef.value = root.querySelector('.s-input--remove-part .el-input__inner') as HTMLInputElement | null;

  sliderDragButtonRef.value?.addEventListener('mousedown', focusSliderInput);
};

const removeListenerFromSliderDragButton = () => {
  sliderDragButtonRef.value?.removeEventListener('mousedown', focusSliderInput);
};

watch(
  liquidity,
  async () => {
    const field = focusedField.value;
    if (!field) {
      await setRemovePart(removePart.value || '');
      return;
    }

    if (field === FocusedField.First || field === FocusedField.Second) {
      const isFirstToken = field === FocusedField.First;
      const balance = Number(getTokenMaxAmount(isFirstToken ? firstTokenBalance.value : secondTokenBalance.value));
      const amount = Number(isFirstToken ? firstTokenAmount.value : secondTokenAmount.value);
      const setValue = isFirstToken ? setFirstTokenAmount : setSecondTokenAmount;
      const value = String(Number.isFinite(balance) ? Math.min(balance, amount) : amount);
      await setValue(value);
      return;
    }

    await setRemovePart(removePart.value || '');
  },
  { deep: true }
);

onMounted(addListenerToSliderDragButton);
onBeforeUnmount(removeListenerFromSliderDragButton);

defineExpose({
  handleRemoveLiquidity,
  confirmDialogVisible,
  showWarningFeeDialog,
});
</script>

<style lang="scss" scoped>
.el-form--actions {
  @include buttons;
  @include full-width-button('action-button');
}

@include vertical-divider('icon-divider', $inner-spacing-medium);

.locked-part {
  color: var(--s-color-base-content-secondary);
  text-transform: uppercase;
  justify-content: flex-start;

  &-percent {
    width: 50px;
  }
}
</style>

<style lang="scss">
.s-input.s-input--remove-part {
  @include input-slider;
}
</style>
