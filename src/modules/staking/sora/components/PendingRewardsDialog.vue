<template>
  <DialogBase v-model:visible="isVisible" :title="title">
    <div class="pending-rewards-dialog">
      <s-scrollbar class="pending-rewards-scrollbar">
        <s-card class="information" shadow="always" primary>
          <div class="information-content">
            <div class="information-text">
              {{ t('soraStaking.pendingRewardsDialog.information') }}
            </div>
            <div class="information-icon">
              <s-icon name="notifications-alert-triangle-24" size="20px"></s-icon>
            </div>
          </div>
        </s-card>

        <s-card
          v-for="reward in rewards"
          :key="reward.id"
          class="reward"
          border-radius="medium"
          shadow="always"
          size="mini"
          @click="toggleRewardSelection(reward)"
        >
          <div class="reward-content">
            <ValidatorAvatar class="avatar" :validator="reward.validator">
              <template #icon>
                <s-icon
                  v-if="reward.alert"
                  class="alert-icon"
                  name="notifications-alert-triangle-24"
                  size="16px"
                ></s-icon>
              </template>
            </ValidatorAvatar>
            <div class="reward-lines">
              <div class="reward-line">
                <div class="name">
                  {{ reward.name }}
                </div>
                <div class="value">
                  {{ reward.valueFormatted }}
                </div>
              </div>
              <div class="reward-line">
                <div :class="computedClassDaysLeft(reward.alert)">
                  {{ reward.daysLeftFormatted }}
                </div>
                <FormattedAmount
                  class="value-fiat"
                  is-fiat-value
                  with-left-shift
                  :value="reward.valueFiat"
                ></FormattedAmount>
              </div>
            </div>
            <div :class="{ ['reward-check']: true, ['reward-check--selected']: isRewardSelected(reward) }">
              <s-icon name="basic-check-mark-24" size="18px"></s-icon>
            </div>
          </div>
        </s-card>
      </s-scrollbar>

      <div class="info">
        <InfoLine
          :label="t('networkFeeText')"
          :label-tooltip="t('networkFeeTooltipText')"
          :value="networkFeeFormatted"
          :asset-symbol="xor?.symbol"
          :fiat-value="networkFeeFiat"
          is-formatted
        ></InfoLine>
      </div>

      <s-button
        type="primary"
        class="s-typography-button--large action-button"
        :loading="buttonLoading"
        :disabled="confirmDisabled"
        @click="handleConfirm"
      >
        <template v-if="insufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: stakingAsset?.symbol ?? '' }) }}
        </template>
        <template v-else-if="noReward">
          {{ t('soraStaking.pendingRewardsDialog.noPendingRewards') }}
        </template>
        <template v-else-if="noSelectedRewards">
          {{ t('soraStaking.pendingRewardsDialog.noSelectedRewards') }}
        </template>
        <template v-else> {{ t('soraStaking.pendingRewardsDialog.payout') }} ({{ selectedRewards.length }}) </template>
      </s-button>
    </div>
  </DialogBase>
</template>

<script setup lang="ts">
import { FPNumber } from '@sora-substrate/sdk';
import { components } from '@/shims/wallet-components';
import { computed, ref, watch } from 'vue';
import { useTranslation } from '@/composables/useTranslation';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTransaction } from '@/composables/useTransaction';
import { useSoraStaking } from '@/modules/staking/sora/composables/useSoraStaking';
import { useValidatorsFormatting } from '@/modules/staking/sora/composables/useValidatorsFormatting';
import { soraStakingLazyComponent } from '@/modules/staking/router';
import { ERA_HOURS, SoraStakingComponents } from '@/modules/staking/sora/consts';
import { formatDecimalPlaces, hasInsufficientXorForFee } from '@/utils';

import type { CodecString } from '@sora-substrate/sdk';
import type { ValidatorInfoFull } from '@sora-substrate/sdk/build/staking/types';
import type { Nullable } from '@/types/common';

type Reward = {
  id: string;
  era: string;
  validators: {
    address: string;
    value: string;
  }[];
  name: string;
  daysLeft: number;
  daysLeftFormatted: string;
  alert: boolean;
  value: string;
  valueFormatted: string;
  valueFiat: Nullable<string>;
  validator: ValidatorInfoFull;
};

const props = defineProps<{
  parentLoading?: boolean;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
}>();

const isVisible = defineModel<boolean>('visible', { default: false });
const { t } = useTranslation();
const { getFiatAmountByFPNumber, getFiatAmountByCodecString } = useFormattedAmount();
const validatorsFormatting = useValidatorsFormatting();

const {
  pendingRewards,
  rewardAsset,
  stakingAsset,
  validators,
  currentEra,
  formatCodecNumber,
  xor,
  getPayoutNetworkFee,
  getPendingRewards,
  payout,
} = useSoraStaking();

const { loading, withNotifications, withApi } = useTransaction({
  parentLoading: () => Boolean(props.parentLoading),
});
const historyDepth = validatorsFormatting.historyDepth;

const DialogBase = components.DialogBase;
const InfoLine = components.InfoLine;
const FormattedAmount = components.FormattedAmount;
const ValidatorAvatar = soraStakingLazyComponent(SoraStakingComponents.ValidatorAvatar);

const selectedRewards = ref<Reward[]>([]);
const payoutNetworkFee = ref<string | null>(null);
const feeRequestToken = ref(0);

const closeDialog = (): void => {
  emit('close');
  isVisible.value = false;
};

const title = computed(() => t('soraStaking.pendingRewardsDialog.title'));
const payouts = computed(() =>
  selectedRewards.value.map((reward) => ({
    era: reward.era,
    validators: reward.validators.map((validator) => validator.address),
  }))
);

/**
 * Flattens pending payouts into reward cards enriched with formatting metadata.
 */
const rewards = computed<Reward[]>(() => {
  if (!pendingRewards.value || !rewardAsset.value) return [];

  return pendingRewards.value
    .map((element) =>
      element.validators.map((validator) => {
        const validatorInfo = validators.value.find((item) => item.address === validator.address);
        if (!validatorInfo) {
          throw new Error(`There is no validator "${validator.address}" in the list`);
        }

        const name = validatorsFormatting.formatName(validatorInfo);
        const hoursLeft = ((historyDepth.value ?? 0) - ((currentEra.value ?? 0) - Number(element.era))) * ERA_HOURS;
        const daysLeft = Math.floor(hoursLeft / 24);
        const daysLeftFormatted = daysLeft < 1 ? 'less then 1 day left' : `${daysLeft} days left`;
        const alert = daysLeft < 5;
        const value = validator.value;
        const rewardValue = new FPNumber(value, rewardAsset.value?.decimals);
        const valueFormatted = `${formatDecimalPlaces(rewardValue)} ${rewardAsset.value?.symbol ?? ''}`;
        const valueFiat = rewardAsset.value ? getFiatAmountByFPNumber(rewardValue, rewardAsset.value) : null;

        return {
          id: `${validator.address}-${element.era}`,
          era: element.era,
          validators: element.validators,
          name,
          daysLeft,
          daysLeftFormatted,
          alert,
          value,
          valueFormatted,
          valueFiat,
          validator: validatorInfo,
        };
      })
    )
    .flat();
});

const noReward = computed(() => !rewards.value.length);
const noSelectedRewards = computed(() => !selectedRewards.value.length);

const networkFee = computed<CodecString>(() => (payoutNetworkFee.value ?? '0') as CodecString);
const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
const networkFeeFiat = computed(() => (xor.value ? getFiatAmountByCodecString(networkFee.value, xor.value) : null));
const insufficientXorForFee = computed(() =>
  xor.value ? hasInsufficientXorForFee(xor.value, networkFee.value) : false
);

const confirmDisabled = computed(() => insufficientXorForFee.value || noReward.value || noSelectedRewards.value);
const buttonLoading = computed(() => Boolean(props.parentLoading) || loading.value);

const isRewardSelected = (reward: Reward) => selectedRewards.value.some((item) => item.id === reward.id);

const toggleRewardSelection = (reward: Reward) => {
  const index = selectedRewards.value.findIndex((item) => item.id === reward.id);

  if (index > -1) {
    const next = [...selectedRewards.value];
    next.splice(index, 1);
    selectedRewards.value = next;
  } else {
    selectedRewards.value = [...selectedRewards.value, reward];
  }
};

const computedClassDaysLeft = (alert: boolean) => {
  return ['days-left', alert ? 'days-left--alert' : ''].filter(Boolean).join(' ');
};

/**
 * Refreshes the payout network fee when selection changes, guarding against stale races.
 */
const updatePayoutFee = async () => {
  const currentToken = feeRequestToken.value + 1;
  feeRequestToken.value = currentToken;

  if (!payouts.value.length) {
    payoutNetworkFee.value = '0';
    return;
  }

  try {
    await withApi(async () => {
      const fee = await getPayoutNetworkFee({
        payouts: payouts.value,
      });

      if (currentToken === feeRequestToken.value) {
        payoutNetworkFee.value = fee;
      }
    });
  } catch (error) {
    console.error('Failed to fetch payout fee', error);
    if (currentToken === feeRequestToken.value) {
      payoutNetworkFee.value = null;
    }
  }
};

watch(
  isVisible,
  (visible) => {
    if (visible) {
      selectedRewards.value = [];
    }
  },
  { immediate: true }
);

watch(payouts, updatePayoutFee, { immediate: true });

/**
 * Executes the payout and refreshes pending rewards before closing the dialog.
 */
const handleConfirm = async () => {
  if (confirmDisabled.value) return;

  await withNotifications(async () => {
    await payout({
      payouts: payouts.value,
    });

    await getPendingRewards();
    closeDialog();
  });
};

defineExpose({
  rewards,
  selectedRewards,
  payoutNetworkFee,
  handleConfirm,
});
</script>

<style lang="scss">
.pending-rewards-scrollbar {
  .el-scrollbar__wrap {
    overflow-x: hidden;
  }
  .el-scrollbar__bar.is-horizontal {
    display: none;
  }
}
</style>

<style lang="scss" scoped>
.pending-rewards-dialog {
  @include full-width-button('action-button');

  & > *:not(:first-child) {
    margin-top: $inner-spacing-medium;
  }
}

.pending-rewards-scrollbar {
  height: 410px !important;
  margin: 0 -24px !important;
  @include scrollbar;

  ul {
    list-style-type: none;
    padding: 0 24px;
    padding-bottom: 64px;

    li {
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 100%;
      padding: 10px 0;
      border-bottom: 1px solid var(--s-color-base-border-secondary);
    }
  }
}

.el-form--actions {
  @include buttons;
}

.information {
  margin: 12px 24px 24px;

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

.reward {
  margin: 12px 24px;
  cursor: pointer;
}

.reward-content {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 12px;
  padding: 8px 18px 8px 12px;
  margin: 0;
}

.reward-lines {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.reward-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 21px;
}

.reward-check {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 32px;
  height: 32px;
  margin-right: -6px;
  background: var(--s-color-base-content-tertiary);
  border-radius: 50%;

  &--selected {
    background: var(--s-color-theme-accent);
  }

  i {
    color: var(--s-color-base-on-accent);
  }
}

.avatar {
  flex-shrink: 0;
}

/* Warning icon style */
.alert-icon {
  margin-bottom: 3px;
  color: var(--s-color-status-warning);
}

/* Item details */
.name {
  flex-grow: 1;
  font-weight: bold;
}

.days-left {
  color: var(--s-color-base-content-secondary);
  font-size: 0.9em;

  &--alert {
    color: var(--s-color-status-warning);
  }
}

.value {
  font-weight: bold;
}
</style>
