<template>
  <DialogBase v-model:visible="isVisible" :title="title">
    <div class="claim-rewards-dialog">
      <div class="reward">
        <FormattedAmountWithFiatValue
          class="reward-amount"
          symbol-as-decimal
          value-can-be-hidden
          :value="rewardedFundsFormatted"
          :fiat-value="rewardedFundsFiat"
        ></FormattedAmountWithFiatValue>
        <template v-if="rewardAsset">
          <TokenLogo class="reward-logo" :token-symbol="rewardAsset.symbol"></TokenLogo>
          <span class="reward-symbol">
            {{ rewardAsset.symbol }}
          </span>
        </template>
      </div>

      <s-input
        v-model="rewardsDestination"
        :placeholder="t('soraStaking.claimRewardsDialog.rewardsDestination')"
        suffix="s-icon-basic-user-24"
        :disabled="true"
      ></s-input>

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
        v-if="xor && rewardAsset"
        type="primary"
        class="s-typography-button--large action-button"
        :loading="buttonLoading"
        :disabled="confirmDisabled"
        @click="handleConfirm"
      >
        <template v-if="isInsufficientBalance">
          {{ t('insufficientBalanceText', { tokenSymbol: rewardAsset.symbol }) }}
        </template>
        <template v-else-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: xor.symbol }) }}
        </template>
        <template v-else-if="valueFundsEmpty">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else>
          {{ t('confirmText') }}
        </template>
      </s-button>
      <div v-if="pendingRewards" v-button class="check-pending-rewards" @click="checkPendingRewards">
        {{ t('soraStaking.claimRewardsDialog.checkRewards') }} ({{ pendingRewards?.length ?? 0 }})
      </div>
    </div>
  </DialogBase>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useTranslation } from '@/composables/useTranslation';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTransaction } from '@/composables/useTransaction';
import { useSoraStaking } from '@/modules/staking/sora/composables/useSoraStaking';
import WalletComponentDialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';
import WalletComponentInfoLine from '@/lib/soraneo-wallet/src/components/InfoLine.vue';
import WalletComponentTokenLogo from '@/lib/soraneo-wallet/src/components/TokenLogo.vue';
import WalletComponentFormattedAmountWithFiatValue from '@/lib/soraneo-wallet/src/components/FormattedAmountWithFiatValue.vue';

const props = defineProps<{
  parentLoading?: boolean;
}>();

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'show-rewards'): void;
}>();

const isVisible = defineModel<boolean>('visible', { default: false });
const { t } = useTranslation();
const { getFiatAmountByCodecString } = useFormattedAmount();

const {
  payee,
  controller,
  stash,
  pendingRewards,
  rewardedFunds,
  rewardedFundsFiat,
  rewardedFundsFormatted,
  rewardAsset,
  xor,
  isInsufficientXorForFee,
  payout,
  getPayoutNetworkFee,
  getPendingRewards,
} = useSoraStaking();

const { loading, withNotifications } = useTransaction({ parentLoading: () => Boolean(props.parentLoading) });

const DialogBase = WalletComponentDialogBase;
const InfoLine = WalletComponentInfoLine;
const TokenLogo = WalletComponentTokenLogo;
const FormattedAmountWithFiatValue = WalletComponentFormattedAmountWithFiatValue;

const rewardsDestination = ref('');
const payoutNetworkFee = ref<string | null>(null);

const closeDialog = (): void => {
  emit('close');
  isVisible.value = false;
};

const payeeAddress = computed(() => {
  switch (payee.value) {
    case 'Stash':
      return stash.value ?? '';
    case 'Controller':
      return controller.value ?? '';
    default:
      return payee.value ?? '';
  }
});

const title = computed(() => t('soraStaking.claimRewardsDialog.title'));

const payouts = computed(() =>
  (pendingRewards.value ?? []).map((reward) => ({
    era: reward.era,
    validators: reward.validators.map((validator) => validator.address),
  }))
);

const payeeOverride = computed(() =>
  rewardsDestination.value && rewardsDestination.value !== payeeAddress.value ? rewardsDestination.value : undefined
);

const networkFee = computed(() => payoutNetworkFee.value ?? '0');
const networkFeeFormatted = computed(() => networkFee.value);
const networkFeeFiat = computed(() =>
  xor.value ? getFiatAmountByCodecString(networkFee.value as any, xor.value) : null
);

const valueFundsEmpty = computed(() => rewardedFunds.value.isZero());
const isInsufficientBalance = computed(() => false);
const confirmDisabled = computed(
  () => isInsufficientXorForFee.value || valueFundsEmpty.value || isInsufficientBalance.value
);
const buttonLoading = computed(() => Boolean(props.parentLoading) || loading.value);

const syncRewardsDestination = () => {
  if (isVisible.value) {
    rewardsDestination.value = payeeAddress.value;
  }
};

watch([isVisible, payeeAddress], syncRewardsDestination, { immediate: true });

let feeRequestId = 0;
const updatePayoutFee = async () => {
  if (!isVisible.value) return;

  if (!payouts.value.length) {
    payoutNetworkFee.value = '0';
    return;
  }

  const currentId = ++feeRequestId;
  try {
    const fee = await getPayoutNetworkFee({
      payouts: payouts.value,
      payee: payeeOverride.value,
    });
    if (currentId === feeRequestId) {
      payoutNetworkFee.value = fee;
    }
  } catch (error) {
    console.error('Failed to fetch payout fee', error);
    if (currentId === feeRequestId) {
      payoutNetworkFee.value = null;
    }
  }
};

watch([payouts, payeeOverride, isVisible], updatePayoutFee, { immediate: true });

const handleConfirm = async () => {
  if (confirmDisabled.value) return;

  await withNotifications(async () => {
    await payout({
      payouts: payouts.value,
      payee: payeeOverride.value,
    });

    await getPendingRewards();
    closeDialog();
  });
};

const checkPendingRewards = () => emit('show-rewards');

defineExpose({
  rewardsDestination,
  payoutNetworkFee,
  handleConfirm,
  checkPendingRewards,
});
</script>

<style lang="scss">
.s-input.s-input--stake-part {
  @include input-slider;
}

.claim-rewards-dialog {
  .reward {
    .formatted-amount {
      width: 100%;
    }

    .formatted-amount__value {
      font-size: 32px;
      line-height: 36px;
      letter-spacing: -2px;
    }

    .formatted-amount__fiat {
      font-size: var(--s-font-size-mini);
      font-weight: 300;
      line-height: normal;
      letter-spacing: -0.28px;
      color: var(--s-color-text-secondary);
    }
  }
  .reward {
    display: flex;
    align-items: center;
    justify-content: center;

    .reward-symbol {
      font-size: 20px;
      font-weight: 700;
      text-transform: uppercase;
      margin-left: var(--s-size-mini);
    }

    .reward-logo {
      margin-left: var(--s-size-mini);
    }
  }

  .action-button {
    width: 100%;
    margin-top: 24px;
  }

  .check-pending-rewards {
    margin-top: 16px;
    color: var(--s-color-theme-accent);
    text-transform: uppercase;
    text-align: center;
    font-size: var(--s-font-size-extra-small);
    font-weight: 300;
  }
}
</style>
