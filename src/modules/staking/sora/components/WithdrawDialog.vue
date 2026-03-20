<template>
  <DialogBase v-model:visible="isVisible" :title="title">
    <div class="withdraw-dialog">
      <div class="reward">
        <FormattedAmountWithFiatValue
          class="reward-amount"
          symbol-as-decimal
          value-can-be-hidden
          :value="withdrawableFundsFormatted"
          :fiat-value="withdrawableFundsFiat"
        ></FormattedAmountWithFiatValue>
        <template v-if="stakingAsset">
          <TokenLogo class="reward-logo" :token-symbol="stakingAsset.symbol"></TokenLogo>
          <span class="reward-symbol">
            {{ stakingAsset.symbol }}
          </span>
        </template>
      </div>

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
          {{ t('insufficientBalanceText', { tokenSymbol: xor?.symbol ?? '' }) }}
        </template>
        <template v-else-if="insufficientBalance">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else>
          {{ t('confirmText') }}
        </template>
      </s-button>
      <div v-button class="check-all-withdraws" @click="emit('show-all-withdraws')">
        {{ t('soraStaking.withdrawDialog.showAllWithdraws') }}
      </div>
    </div>
  </DialogBase>
</template>

<script setup lang="ts">
import { Operation } from '@sora-substrate/sdk';
import { components } from '@wallet';
import { computed } from 'vue';
import { useTranslation } from '@/composables/useTranslation';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTransaction } from '@/composables/useTransaction';
import { useSoraStaking } from '@/modules/staking/sora/composables/useSoraStaking';
import { useSettingsStore } from '@/stores/settings';
import { hasInsufficientXorForFee } from '@/utils';

import type { CodecString, NetworkFeesObject } from '@sora-substrate/sdk';

const props = defineProps<{
  parentLoading?: boolean;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'show-all-withdraws'): void;
}>();

const isVisible = defineModel<boolean>('visible', { default: false });
const { t } = useTranslation();
const { getFiatAmountByCodecString } = useFormattedAmount();
const settingsStore = useSettingsStore();

const {
  stakingAsset,
  xor,
  withdrawableFunds,
  withdrawableFundsFiat,
  withdrawableFundsFormatted,
  formatCodecNumber,
  withdraw,
} = useSoraStaking();

const { loading, withNotifications } = useTransaction({
  parentLoading: () => Boolean(props.parentLoading),
});

const DialogBase = components.DialogBase;
const InfoLine = components.InfoLine;
const TokenLogo = components.TokenLogo;
const FormattedAmountWithFiatValue = components.FormattedAmountWithFiatValue;

const networkFees = computed(() => settingsStore.networkFees as NetworkFeesObject);

const networkFee = computed<CodecString>(
  () => (networkFees.value?.[Operation.StakingWithdrawUnbonded] ?? '0') as CodecString
);
const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
const networkFeeFiat = computed(() => (xor.value ? getFiatAmountByCodecString(networkFee.value, xor.value) : null));
const insufficientXorForFee = computed(() =>
  xor.value ? hasInsufficientXorForFee(xor.value, networkFee.value) : false
);
const insufficientBalance = computed(() => withdrawableFunds.value.isZero());
const confirmDisabled = computed(() => insufficientXorForFee.value || insufficientBalance.value);
const buttonLoading = computed(() => Boolean(props.parentLoading) || loading.value);

const title = computed(() => t('soraStaking.withdrawDialog.title'));

const closeDialog = (): void => {
  emit('close');
  isVisible.value = false;
};

/**
 * Submits the withdraw extrinsic and closes the dialog once finalized.
 */
const handleConfirm = async () => {
  if (confirmDisabled.value) return;

  await withNotifications(async () => {
    await withdraw(withdrawableFunds.value.toNumber());
  });

  closeDialog();
};

defineExpose({
  isVisible,
  handleConfirm,
});
</script>

<style lang="scss">
.withdraw-dialog {
  .reward {
    .formatted-amount {
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .formatted-amount--fiat-value {
      font-size: 14px !important;
      font-weight: 600;
    }
  }
}
</style>

<style lang="scss" scoped>
.withdraw-dialog {
  @include full-width-button('action-button');

  & > *:not(:first-child) {
    margin-top: $inner-spacing-medium;
  }
}

.reward {
  display: flex;
  width: 100%;
  font-size: 32px;
  font-weight: 700;

  &-amount {
    flex: 1;
    flex-direction: column;
    align-items: flex-start !important;
    text-align: left !important;
    overflow: hidden;
  }

  &-logo {
    margin-left: auto;
  }

  &-symbol {
    margin-left: 15px;
  }
}

.el-form--actions {
  @include buttons;
}

.info {
  margin-top: 16px;
}

.check-all-withdraws {
  color: var(--s-color-theme-accent);
  text-align: center;
  font-size: 14px;
  line-height: 20px;
  font-style: normal;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
}
</style>
