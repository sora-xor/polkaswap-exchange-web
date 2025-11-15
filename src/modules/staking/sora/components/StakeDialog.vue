<template>
  <DialogBase v-model:visible="isVisible" :title="title">
    <div class="stake-dialog" ref="dialogRoot">
      <s-form class="el-form--actions" :show-message="false">
        <TokenInput
          key="stake-input"
          :balance="stakingBalanceCodec"
          :is-max-available="isMaxButtonAvailable"
          :title="inputTitle"
          :token="stakingAsset"
          :value="value"
          @input="handleValue"
          @max="handleMaxValue"
        ></TokenInput>
      </s-form>

      <div class="info">
        <InfoLine
          v-if="mode === StakeDialogMode.NEW"
          :label="t('soraStaking.info.selectedValidators')"
          :value="selectedValidatorsFormatted"
        ></InfoLine>
        <InfoLine
          v-if="mode === StakeDialogMode.NEW"
          :label="t('soraStaking.info.rewardToken')"
          :value="rewardAsset?.symbol"
        ></InfoLine>
        <InfoLine
          v-if="mode === StakeDialogMode.REMOVE"
          :label="t('soraStaking.info.unstakingPeriod')"
          :value="unbondPeriodFormatted"
        ></InfoLine>
        <InfoLine
          :label="t('networkFeeText')"
          :label-tooltip="t('networkFeeTooltipText')"
          :value="networkFeeFormatted"
          :asset-symbol="xor?.symbol"
          :fiat-value="networkFeeFiat"
          is-formatted
        ></InfoLine>
      </div>

      <s-card v-if="mode === StakeDialogMode.REMOVE" class="information" shadow="always" primary>
        <div class="information-content">
          <div class="information-text">
            {{ t('soraStaking.allWithdrawsDialog.information') }}
          </div>
          <div class="information-icon">
            <s-icon name="notifications-alert-triangle-24" size="20px"></s-icon>
          </div>
        </div>
      </s-card>

      <s-button
        v-if="stakingAsset"
        type="primary"
        class="s-typography-button--large action-button"
        :loading="buttonLoading"
        :disabled="confirmDisabled"
        @click="handleConfirm"
      >
        <template v-if="confirmDisabled && (insufficientBalance || insufficientXorForFee)">
          {{ t('insufficientBalanceText', { tokenSymbol: stakingAsset.symbol }) }}
        </template>
        <template v-else-if="valueFundsEmpty">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else>
          {{ t('confirmText') }}
        </template>
      </s-button>
    </div>
  </DialogBase>
</template>

<script setup lang="ts">
import { FPNumber, Operation } from '@sora-substrate/sdk';
import { components } from '@wallet';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { Components } from '@/consts';
import { useDialogModel } from '@/composables/useDialogModel';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTransaction } from '@/composables/useTransaction';
import { useSoraStaking } from '@/modules/staking/sora/composables/useSoraStaking';
import { StakeDialogMode } from '@/modules/staking/sora/consts';
import { useSettingsStore } from '@/stores/settings';
import type { NetworkFeesObject, CodecString } from '@sora-substrate/sdk';
import { lazyComponent } from '@/router';
import { hasInsufficientXorForFee } from '@/utils';
import store from '@/store';

const props = defineProps<{
  visible: boolean;
  mode: StakeDialogMode;
  parentLoading?: boolean;
}>();

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'close'): void;
  (event: 'confirm'): void;
}>();

const { t } = useI18n();
const { getFiatAmountByCodecString } = useFormattedAmount();
const dialogModel = useDialogModel(props, emit);
const { isVisible } = dialogModel;

const {
  stakingAsset,
  rewardAsset,
  xor,
  validators,
  selectedValidators,
  unbondPeriodFormatted,
  lockedFunds,
  availableFunds,
  stakeAmount,
  formatCodecNumber,
  bondAndNominate,
  bondExtra,
  unbond,
  getBondAndNominateNetworkFee,
} = useSoraStaking();

const { loading, withNotifications, withApi } = useTransaction({
  parentLoading: () => Boolean(props.parentLoading),
});

const settingsStore = useSettingsStore();

const TokenInput = lazyComponent(Components.TokenInput);
const DialogBase = components.DialogBase;
const InfoLine = components.InfoLine;

const value = ref('');
const bondAndNominateNetworkFee = ref<string | null>(null);
const feeRequestId = ref(0);
const dialogRoot = ref<HTMLElement | null>(null);

const networkFees = computed(() => settingsStore.networkFees as NetworkFeesObject);
const shouldBalanceBeHidden = computed(() => Boolean(store.state.wallet.settings.shouldBalanceBeHidden));

const networkFee = computed<CodecString>(() => {
  switch (props.mode) {
    case StakeDialogMode.NEW:
      return (bondAndNominateNetworkFee.value ?? '0') as CodecString;
    case StakeDialogMode.ADD:
      return (networkFees.value?.[Operation.StakingBondExtra] ?? '0') as CodecString;
    default:
      return (networkFees.value?.[Operation.StakingUnbond] ?? '0') as CodecString;
  }
});

const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
const networkFeeFiat = computed(() => (xor.value ? getFiatAmountByCodecString(networkFee.value, xor.value) : null));

const insufficientXorForFee = computed(() =>
  xor.value ? hasInsufficientXorForFee(xor.value, networkFee.value) : false
);

const stakingBalance = computed(() =>
  props.mode !== StakeDialogMode.REMOVE ? availableFunds.value : lockedFunds.value
);
const stakingBalanceCodec = computed(() => stakingBalance.value.toCodecString());

const valueFunds = computed(() => (value.value ? new FPNumber(value.value) : FPNumber.ZERO));
const valueFundsEmpty = computed(() => valueFunds.value.isZero());

const maxStake = computed(() => {
  if (!stakingAsset.value) return FPNumber.ZERO;

  const fee = FPNumber.fromCodecValue(networkFee.value);

  return props.mode !== StakeDialogMode.REMOVE ? stakingBalance.value.sub(fee) : stakingBalance.value;
});

const isMaxButtonAvailable = computed(() => {
  if (shouldBalanceBeHidden.value) return false;
  return !FPNumber.eq(valueFunds.value, maxStake.value) && !FPNumber.lte(maxStake.value, FPNumber.ZERO);
});

const insufficientBalance = computed(() => {
  const availableBalance = new FPNumber(maxStake.value, stakingAsset.value?.decimals);
  return FPNumber.lt(availableBalance, valueFunds.value);
});

const selectedValidatorsFormatted = computed(() =>
  t('soraStaking.selectedValidators', {
    count: selectedValidators.value.length,
    max: validators.value.length,
  })
);

const title = computed(() => {
  switch (props.mode) {
    case StakeDialogMode.NEW:
      return t('soraStaking.actions.confirm');
    case StakeDialogMode.ADD:
      return lockedFunds.value.isZero() ? t('soraStaking.newStake.title') : t('soraStaking.actions.more');
    default:
      return t('soraStaking.actions.remove');
  }
});

const inputTitle = computed(() =>
  props.mode !== StakeDialogMode.REMOVE ? t('soraStaking.stakeDialog.toStake') : t('soraStaking.stakeDialog.toRemove')
);

const confirmDisabled = computed(
  () => insufficientXorForFee.value || valueFundsEmpty.value || insufficientBalance.value
);
const buttonLoading = computed(() => Boolean(props.parentLoading) || loading.value);

/**
 * Keeps the bond-and-nominate fee in sync with the latest validator selection and mode.
 */
const updateBondNetworkFee = async () => {
  const currentId = ++feeRequestId.value;

  if (props.mode !== StakeDialogMode.NEW) {
    bondAndNominateNetworkFee.value = null;
    return;
  }

  try {
    await withApi(async () => {
      const fee = await getBondAndNominateNetworkFee();
      if (currentId === feeRequestId.value) {
        bondAndNominateNetworkFee.value = fee;
      }
    });
  } catch (error) {
    console.error('Failed to fetch bond and nominate fee', error);
    if (currentId === feeRequestId.value) {
      bondAndNominateNetworkFee.value = null;
    }
  }
};

watch([selectedValidators, () => props.mode], updateBondNetworkFee, { immediate: true });

watch(isVisible, (visible) => {
  if (visible) {
    value.value = props.mode === StakeDialogMode.NEW ? stakeAmount.value : '';
  }
});

const handleValue = (nextValue: string | number) => {
  value.value = String(nextValue ?? '');
};

const handleMaxValue = () => {
  handleValue(maxStake.value.toString());
};

/**
 * Dispatches the appropriate staking extrinsic for the current mode and emits completion.
 */
const handleConfirm = async () => {
  if (!stakingAsset.value || confirmDisabled.value) return;

  stakeAmount.value = value.value;

  let extrinsic = unbond;
  if (props.mode === StakeDialogMode.NEW) {
    extrinsic = bondAndNominate;
  } else if (props.mode === StakeDialogMode.ADD) {
    extrinsic = bondExtra;
  }

  await withNotifications(async () => {
    await extrinsic();
  });

  emit('confirm');
};

onMounted(async () => {
  await nextTick();
  const input = dialogRoot.value?.querySelector<HTMLInputElement>('.s-input .el-input__inner');
  input?.focus();
});
</script>

<style lang="scss">
.s-input.s-input--stake-part {
  @include input-slider;
}
</style>

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

.information {
  &-content {
    display: flex;
    gap: 38px;
  }

  &-text {
    font-size: 15px;
    line-height: 150%;
  }

  &-icon {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 42px;
    width: 42px;
    margin-top: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--s-color-status-info);
    border: 2px solid var(--s-color-base-border-primary);
    i {
      margin-bottom: 2px;
      color: white;
    }
  }
}
</style>
