<template>
  <DialogBase v-model:visible="isVisible" :title="title">
    <div class="all-withdraws-dialog">
      <s-scrollbar class="all-withdraws-scrollbar">
        <s-card
          v-for="withdraw in withdraws"
          :key="withdraw.id"
          class="withdraw"
          border-radius="medium"
          shadow="always"
          size="mini"
        >
          <div class="withdraw-content">
            <TokenLogo class="withdraw-logo" :token-symbol="stakingAsset?.symbol"></TokenLogo>
            <FormattedAmountWithFiatValue
              class="amount"
              :asset-symbol="stakingAsset?.symbol"
              symbol-as-decimal
              value-can-be-hidden
              :value="withdraw.valueFormatted"
              :fiat-value="withdraw.valueFiat"
            ></FormattedAmountWithFiatValue>
            <EraCountdown
              class="countdown"
              translation-key="soraStaking.withdraw.countdownLeft"
              :target-era="withdraw.era"
            ></EraCountdown>
          </div>
        </s-card>
      </s-scrollbar>
      <s-card class="information" shadow="always" primary>
        <div class="information-content">
          <div class="information-text">
            {{ t('soraStaking.allWithdrawsDialog.information') }}
          </div>
          <div class="information-icon">
            <s-icon name="notifications-alert-triangle-24" size="20px"></s-icon>
          </div>
        </div>
      </s-card>
    </div>
  </DialogBase>
</template>

<script setup lang="ts">
import assert from 'assert';

import { FPNumber } from '@sora-substrate/sdk';
import { components } from '@wallet';
import { computed } from 'vue';
import { useTranslation } from '@/composables/useTranslation';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { formatDecimalPlaces } from '@/utils';

import { soraStakingLazyComponent } from '../../router';
import { ERA_HOURS, SoraStakingComponents } from '../consts';
import { useSoraStaking } from '../composables/useSoraStaking';

import type { Nullable } from '@/types/common';

type Withdraw = {
  id: number;
  era: number;
  valueFormatted: string;
  valueFiat: Nullable<string>;
};

defineEmits<{
  (event: 'close'): void;
}>();

const isVisible = defineModel<boolean>('visible', { default: false });
const { t } = useTranslation();
const { getFiatAmountByFPNumber } = useFormattedAmount();

const { accountLedger, stakingAsset, withdrawableFunds, withdrawableFundsFiat, currentEra } = useSoraStaking();

const DialogBase = components.DialogBase;
const TokenLogo = components.TokenLogo;
const FormattedAmountWithFiatValue = components.FormattedAmountWithFiatValue;
const EraCountdown = soraStakingLazyComponent(SoraStakingComponents.EraCountdown);

const title = computed(() => t('soraStaking.allWithdrawsDialog.title'));

const allWithdraws = computed(() => accountLedger.value?.unlocking ?? null);

/**
 * Collapses pending and upcoming unlock entries into a consumable, formatted list.
 */
const withdraws = computed<Withdraw[]>(() => {
  if (!allWithdraws.value || !stakingAsset.value) return [];

  const rawWithdraws = allWithdraws.value.map((element) => {
    const hoursTotal = Math.max((element.era - (currentEra.value || 0)) * ERA_HOURS, 0);

    return {
      era: element.era,
      value: FPNumber.fromCodecValue(element.value),
      countdownHours: hoursTotal,
    };
  });

  const pending = rawWithdraws.filter((withdraw) => withdraw.countdownHours <= 0);
  const upcoming = rawWithdraws.filter((withdraw) => withdraw.countdownHours > 0);

  const pendingValueSum = pending.reduce((acc, withdraw) => acc.add(withdraw.value), FPNumber.ZERO);

  const combinedPending = pending.length
    ? {
        era: pending[0].era,
        value: pendingValueSum,
        countdownHours: 0,
      }
    : null;

  const normalized = [...(combinedPending ? [combinedPending] : []), ...upcoming];

  return normalized.map((withdraw) => {
    assert(stakingAsset.value);

    return {
      id: withdraw.era,
      era: withdraw.era,
      valueFormatted: formatDecimalPlaces(withdraw.value),
      valueFiat:
        withdrawableFundsFiat.value ??
        getFiatAmountByFPNumber(withdrawableFunds.value, stakingAsset.value ?? undefined),
    };
  });
});

const noReward = computed(() => !withdraws.value.length);

defineExpose({
  withdraws,
  noReward,
});
</script>

<style lang="scss">
.all-withdraws-scrollbar {
  .el-scrollbar__wrap {
    overflow-x: hidden;
  }
  .el-scrollbar__bar.is-horizontal {
    display: none;
  }
}
</style>

<style lang="scss" scoped>
.all-withdraws-dialog {
  @include full-width-button('action-button');
}

.all-withdraws-scrollbar {
  height: 200px !important;
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

.withdraw {
  margin: 12px 24px;
  cursor: pointer;
}

.withdraw-content {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 12px;
  padding: 8px 18px 8px 12px;
  margin: 0;
}

.withdraw-lines {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.withdraw-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 21px;
}

.withdraw-check {
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

.amount {
  display: flex;
  flex-direction: column;
  font-weight: 700;
  margin-top: 4px;
}

.countdown {
  margin-left: auto;
  font-weight: 700;
  text-transform: uppercase;
}
</style>
