<template>
  <div v-loading="parentLoading" class="container">
    <generic-page-header
      has-button-back
      :title="t(isBond ? 'referralProgram.bondTitle' : 'referralProgram.unbondTitle')"
      @back="handleBack"
    />
    <s-form class="el-form--actions" :show-message="false">
      <token-input
        :balance="balance"
        :is-max-available="isMaxButtonAvailable"
        :title="t(isBond ? 'referralProgram.action.bond' : 'referralProgram.action.unbond')"
        :token="xor"
        :value="amount"
        @input="handleInputXor"
        @max="handleMaxValue"
      />

      <s-button
        class="action-button s-typography-button--large"
        type="primary"
        :disabled="isConfirmBondDisabled"
        :loading="loading"
        @click="handleConfirmBond"
      >
        <template v-if="hasZeroAmount">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: xorSymbol }) }}
        </template>
        <template v-else-if="isBondedBalance && isInsufficientBondedXor">
          {{ t('referralProgram.insufficientBondedBalance') }}
        </template>
        <template v-else>
          {{ t(isBond ? 'referralProgram.action.bond' : 'referralProgram.action.unbond') }}
        </template>
      </s-button>

      <info-line
        :label="t('networkFeeText')"
        :label-tooltip="t('networkFeeTooltipText')"
        :value="networkFeeFormatted"
        :asset-symbol="xorSymbol"
        :fiat-value="formattedNetworkFeeFiat"
        is-formatted
      />

      <referrals-confirm-bonding v-model:visible="confirmDialogVisible" @confirm="confirmBond" />
    </s-form>
  </div>
</template>

<script setup lang="ts">
import { FPNumber, Operation } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { api, components, WALLET_CONSTS } from '@wallet';
import { computed, onBeforeUnmount, ref, toRef } from 'vue';
import { useRoute } from 'vue-router';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import { Components, PageNames, ZeroStringValue } from '@/consts';
import router, { lazyComponent } from '@/router';
import store from '@/store';
import { getMaxValue, hasInsufficientBalance, asZeroValue, getAssetBalance } from '@/utils';

import type { CodecString, NetworkFeesObject } from '@sora-substrate/sdk';
import type { AccountAsset, AccountBalance } from '@sora-substrate/sdk/build/assets/types';

const props = withDefaults(defineProps<{ parentLoading?: boolean }>(), {
  parentLoading: false,
});
const parentLoading = toRef(props, 'parentLoading');

defineOptions({
  name: 'ReferralBonding',
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    TokenInput: lazyComponent(Components.TokenInput),
    ReferralsConfirmBonding: lazyComponent(Components.ReferralsConfirmBonding),
    InfoLine: components.InfoLine,
  },
});

const { t } = useTranslation();
const { formatCodecNumber, getFiatAmountByCodecString, getFPNumber, getFPNumberFromCodec } = useFormattedAmount();
const { withNotifications, loading } = useTransaction();
const route = useRoute();

const networkFees = computed<NetworkFeesObject>(
  () => (store.state?.wallet?.settings?.networkFees as NetworkFeesObject | undefined) ?? ({} as NetworkFeesObject)
);
const amount = computed(() => (store.state?.referrals?.amount as string | undefined) ?? '');
const xor = computed<Nullable<AccountAsset>>(() => store.getters?.assets?.xor as Nullable<AccountAsset>);
const shouldBalanceBeHidden = computed(() => Boolean(store.state?.wallet?.settings?.shouldBalanceBeHidden));

const xorSymbol = computed(() => XOR.symbol);
const xorDecimals = computed(() => xor.value?.decimals ?? XOR.decimals);
const xorBalance = computed<Nullable<AccountBalance>>(() => xor.value?.balance ?? null);

const isBond = computed(() => route.name === PageNames.ReferralBonding);
const isBondedBalance = computed(() => !isBond.value);

const balance = computed<CodecString>(() => getAssetBalance(xor.value, { isBondedBalance: isBondedBalance.value }));
const hasZeroAmount = computed(() => asZeroValue(amount.value));

const networkFee = computed<CodecString>(() => {
  const fees = networkFees.value;
  return fees[isBond.value ? Operation.ReferralReserveXor : Operation.ReferralUnreserveXor] ?? ZeroStringValue;
});

const fpNumberNetworkFee = computed(() => getFPNumberFromCodec(networkFee.value, xorDecimals.value));
const formattedNetworkFeeFiat = computed(() => getFiatAmountByCodecString(networkFee.value, XOR));
const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value, xorDecimals.value));

const isMaxButtonAvailable = computed(() => {
  if (shouldBalanceBeHidden.value) return false;

  const balanceValue = getFPNumberFromCodec(xorBalance.value?.transferable ?? ZeroStringValue, xorDecimals.value);
  const amountValue = getFPNumber(amount.value || '0', xorDecimals.value);

  if (fpNumberNetworkFee.value.isZero()) return false;

  if (isBondedBalance.value) {
    const bonded = xorBalance.value?.bonded ?? ZeroStringValue;
    const isBondedZero = getFPNumberFromCodec(bonded, xorDecimals.value).isZero();
    return !isBondedZero && FPNumber.gt(balanceValue, fpNumberNetworkFee.value);
  }

  return (
    !FPNumber.eq(fpNumberNetworkFee.value, balanceValue.sub(amountValue)) &&
    FPNumber.gt(balanceValue, fpNumberNetworkFee.value)
  );
});

const isInsufficientBondedXor = computed(() => {
  return (
    !!xor.value &&
    hasInsufficientBalance(xor.value, amount.value, networkFee.value, {
      isBondedBalance: isBondedBalance.value,
    })
  );
});

const isInsufficientXorForFee = computed(() => {
  if (isBondedBalance.value) {
    return FPNumber.gt(
      fpNumberNetworkFee.value,
      getFPNumberFromCodec(xorBalance.value?.transferable ?? ZeroStringValue, xorDecimals.value)
    );
  }

  return !!xor.value && hasInsufficientBalance(xor.value, amount.value, networkFee.value);
});

const isConfirmBondDisabled = computed(() => {
  return hasZeroAmount.value || isInsufficientXorForFee.value || isInsufficientBondedXor.value;
});

const confirmDialogVisible = ref(false);

const setAmount = (value: string) => {
  store.commit?.referrals?.setAmount?.(value);
};

const resetAmount = () => {
  store.commit?.referrals?.resetAmount?.();
};

const handleInputXor = (value: string) => {
  if (value === amount.value) return;
  setAmount(value);
};

const handleMaxValue = () => {
  if (!xor.value) return;

  const maxValue = getMaxValue(xor.value, networkFee.value, { isBondedBalance: isBondedBalance.value });
  handleInputXor(maxValue);
};

const confirmBond = async () => {
  confirmDialogVisible.value = false;
  await withNotifications(async () => {
    const action = isBond.value ? api.referralSystem.reserveXor : api.referralSystem.unreserveXor;
    await action(amount.value);
    resetAmount();
    handleBack();
  });
};

const handleConfirmBond = () => {
  confirmDialogVisible.value = true;
};

const handleBack = () => {
  router.push({ name: PageNames.ReferralProgram });
};

onBeforeUnmount(() => {
  resetAmount();
});
</script>

<style lang="scss">
.bonding-preview {
  margin-bottom: $inner-spacing-medium;
  font-size: var(--s-font-size-extra-small);
  line-height: var(--s-line-height-medium);
  text-align: center;

  a {
    color: var(--s-color-theme-accent);
  }
}
</style>

<style lang="scss" scoped>
.el-form--actions {
  @include full-width-button('action-button');

  .action-button {
    margin-bottom: $inner-spacing-medium;
  }
}
</style>
