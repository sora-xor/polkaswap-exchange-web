<template>
  <dialog-base :title="title" v-model:visible="isVisible" :tooltip="t('kensetsu.repayDebtDescription')">
    <div class="repay-debt">
      <token-input
        ref="debtInput"
        class="repay-debt__debt-input repay-debt__token-input"
        with-slider
        :title="title"
        v-model="repayDebtValue"
        is-fiat-editable
        :is-max-available="isMaxRepayAvailable"
        :token="debtAsset"
        :balance="debtAssetBalance"
        :slider-value="repayDebtValuePercent"
        :disabled="loading"
        @max="handleMaxRepayDebtValue"
        @slide="handleRepayPercentChange"
      ></token-input>
      <prev-next-info-line
        :label="t('kensetsu.outstandingDebt')"
        :tooltip="t('kensetsu.outstandingDebtDescription')"
        :symbol="debtSymbol"
        :prev="formattedPrevBorrow"
        :next="formattedNextBorrow"
      ></prev-next-info-line>
      <prev-next-info-line
        :label="t('kensetsu.ltv')"
        :tooltip="t('kensetsu.ltvDescription')"
        symbol="%"
        :prev="formattedPrevLtv"
        :next="formattedLtv"
      >
        <value-status v-if="ltv" class="ltv-badge-status" badge :value="ltvNumber" :get-status="getLtvStatus">
          {{ ltvText }}
        </value-status>
      </prev-next-info-line>
      <s-button
        type="primary"
        class="s-typography-button--large action-button repay-debt__button"
        :disabled="disabled"
        @click="handleRepayDebt"
      >
        <template v-if="disabled">{{ errorMessage }}</template>
        <template v-else>{{ title }}</template>
      </s-button>
      <info-line
        :label="t('networkFeeText')"
        :label-tooltip="t('networkFeeTooltipText')"
        :value="networkFeeFormatted"
        :asset-symbol="xorSymbol"
        :fiat-value="getFiatAmountByCodecString(networkFee)"
        is-formatted
      ></info-line>
    </div>
  </dialog-base>
</template>

<script setup lang="ts">
import { Operation, FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { components, api } from '@wallet';
import { computed, nextTick, ref, watch } from 'vue';

import { Components, HundredNumber, ObjectInit, ZeroStringValue } from '@/consts';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useNotification } from '@/composables/useNotification';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import { LtvTranslations, VaultComponents } from '@/modules/vault/consts';
import { vaultLazyComponent } from '@/modules/vault/router';
import { getLtvStatus } from '@/modules/vault/util';
import { lazyComponent } from '@/router';
import store from '@/store';
import { asZeroValue, getAssetBalance, hasInsufficientBalance } from '@/utils';

import type TokenInputComponent from '@/components/shared/Input/TokenInput.vue';
import type { CodecString, NetworkFeesObject } from '@sora-substrate/sdk';
import type { AccountAsset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Vault } from '@sora-substrate/sdk/build/kensetsu/types';
import type { Nullable } from '@/types/common';

const DialogBase = components.DialogBase;
const InfoLine = components.InfoLine;
const TokenInput = lazyComponent(Components.TokenInput);
const ValueStatus = lazyComponent(Components.ValueStatusWrapper);
const PrevNextInfoLine = vaultLazyComponent(VaultComponents.PrevNextInfoLine);

const props = withDefaults(
  defineProps<{
    visible?: boolean;
    vault?: Nullable<Vault>;
    debtAsset?: Nullable<RegisteredAccountAsset>;
    prevLtv?: Nullable<FPNumber>;
    maxSafeDebt?: FPNumber;
    maxLtv?: number;
  }>(),
  {
    visible: false,
    vault: ObjectInit,
    debtAsset: ObjectInit,
    prevLtv: () => FPNumber.ZERO,
    maxSafeDebt: () => FPNumber.ZERO,
    maxLtv: HundredNumber,
  }
);

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'confirm'): void;
}>();

const { t } = useTranslation();
const { withNotifications, loading } = useTransaction();
const { showAppAlert } = useNotification();
const { Zero, Hundred, getFPNumber, getFPNumberFromCodec, formatCodecNumber, getFiatAmountByCodecString } =
  useFormattedAmount();

const xorSymbol = XOR.symbol;

const debtInput = ref<InstanceType<typeof TokenInputComponent> | null>(null);
const repayDebtValue = ref('');

const isVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
});

const networkFees = computed(() => store.state.wallet.settings.networkFees as NetworkFeesObject | undefined);
const accountXor = computed(() => store.getters.assets.xor as Nullable<AccountAsset>);
const shouldBalanceBeHidden = computed(() => store.state.wallet.settings.shouldBalanceBeHidden ?? false);

const vault = computed(() => props.vault as Nullable<Vault>);
const debtAsset = computed(() => props.debtAsset as Nullable<RegisteredAccountAsset>);
const prevLtv = computed(() => props.prevLtv as Nullable<FPNumber>);
const maxSafeDebt = computed(() => props.maxSafeDebt ?? Zero);
const maxLtv = computed(() => props.maxLtv ?? HundredNumber);

const networkFee = computed<CodecString>(() => networkFees.value?.[Operation.CreateVault] ?? ZeroStringValue);
const fpNetworkFee = computed(() => getFPNumberFromCodec(networkFee.value));
const xorBalance = computed(() => getFPNumberFromCodec(accountXor.value?.balance?.transferable ?? ZeroStringValue));
const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
const isInsufficientXorForFee = computed(() => xorBalance.value.sub(fpNetworkFee.value).isLtZero());

const title = computed(() => t('kensetsu.repayDebt'));

const isRepayDebtZero = computed(() => asZeroValue(repayDebtValue.value));

const repayDebtFp = computed(() => {
  if (isRepayDebtZero.value) return Zero;
  return getFPNumber(repayDebtValue.value, debtAsset.value?.decimals);
});

const debt = computed(() => vault.value?.debt ?? Zero);

const debtAssetBalance = computed<CodecString>(() => getAssetBalance(debtAsset.value));
const debtAssetBalanceFp = computed(() => getFPNumberFromCodec(debtAssetBalance.value, debtAsset.value?.decimals));

const isRepayMoreThanDebt = computed(() => debt.value.lt(repayDebtFp.value));

const isInsufficientBalance = computed(() => {
  if (!debtAsset.value) return true;
  return hasInsufficientBalance(debtAsset.value, repayDebtValue.value, networkFee.value);
});

const disabled = computed(
  () =>
    loading.value ||
    isInsufficientXorForFee.value ||
    isRepayDebtZero.value ||
    isRepayMoreThanDebt.value ||
    isInsufficientBalance.value
);

const isMaxRepayAvailable = computed(() => {
  if (shouldBalanceBeHidden.value || isRepayDebtZero.value) return true;
  if (!debt.value.isFinity() || debt.value.isLteZero()) return false;
  return !repayDebtFp.value.isEqualTo(debt.value);
});

const debtSymbol = computed(() => debtAsset.value?.symbol ?? '');
const formattedPrevBorrow = computed(() => vault.value?.debt.toLocaleString() ?? ZeroStringValue);

const nextBorrow = computed<Nullable<FPNumber>>(() => {
  const debtValue = vault.value?.debt;
  if (!debtValue) return null;
  if (isRepayDebtZero.value) return debtValue;
  const diff = debtValue.sub(repayDebtFp.value);
  return diff.isGteZero() ? diff : Zero;
});

const formattedNextBorrow = computed(() => nextBorrow.value?.toLocaleString() ?? ZeroStringValue);
const formattedPrevLtv = computed(() => prevLtv.value?.toLocaleString(2) ?? ZeroStringValue);

const ltvCoeff = computed<Nullable<FPNumber>>(() => {
  if (!nextBorrow.value || maxSafeDebt.value.isZero()) return null;
  return nextBorrow.value.div(maxSafeDebt.value);
});

const ltv = computed<Nullable<FPNumber>>(() => (ltvCoeff.value?.isFinity() ? ltvCoeff.value.mul(HundredNumber) : null));
const ltvNumber = computed(() => ltv.value?.toNumber() ?? 0);
const formattedLtv = computed(() =>
  ltvCoeff.value ? ltvCoeff.value.mul(maxLtv.value).toLocaleString(2) : ZeroStringValue
);
const ltvText = computed(() => LtvTranslations[getLtvStatus(ltvNumber.value)]);

const maxInputRepay = computed(() => (debt.value.gt(debtAssetBalanceFp.value) ? debtAssetBalanceFp.value : debt.value));

const repayDebtValuePercent = computed(() => {
  if (!repayDebtValue.value) return 0;
  const percent = repayDebtFp.value.div(maxInputRepay.value).mul(HundredNumber).toNumber(0);
  return percent > HundredNumber ? HundredNumber : percent;
});

const errorMessage = computed(() => {
  if (isInsufficientXorForFee.value) {
    return t('insufficientBalanceText', { tokenSymbol: xorSymbol });
  }
  if (isRepayDebtZero.value) {
    return t('kensetsu.error.enterRepayDebt');
  }
  if (isRepayMoreThanDebt.value) {
    return t('kensetsu.error.repayMoreThanDebt');
  }
  if (isInsufficientBalance.value) {
    return t('insufficientBalanceText', { tokenSymbol: debtSymbol.value });
  }
  return '';
});

const handleMaxRepayDebtValue = () => {
  repayDebtValue.value = maxInputRepay.value.toString();
};

const handleRepayPercentChange = (percent: number) => {
  repayDebtValue.value = maxInputRepay.value.mul(percent / HundredNumber).toString();
};

const handleRepayDebt = async () => {
  if (disabled.value) {
    if (errorMessage.value) {
      showAppAlert(errorMessage.value, t('errorText'));
    }
  } else {
    try {
      await withNotifications(async () => {
        if (!(vault.value && debtAsset.value)) {
          throw new Error('[api.kensetsu.repayVaultDebt]: vault or asset is null');
        }
        await api.kensetsu.repayVaultDebt(vault.value, repayDebtValue.value, debtAsset.value);
      });
      emit('confirm');
    } catch (error) {
      console.error(error);
    }
  }

  isVisible.value = false;
};

watch(
  () => props.visible,
  async (value) => {
    await nextTick();
    repayDebtValue.value = '';
    if (value) {
      const focus =
        debtInput.value && typeof (debtInput.value as any).focus === 'function'
          ? (debtInput.value as any).focus
          : undefined;
      focus?.();
    }
  },
  { immediate: true }
);

defineExpose({
  handleRepayDebt,
  handleMaxRepayDebtValue,
  handleRepayPercentChange,
  repayDebtValue,
  disabled,
  errorMessage,
  isInsufficientXorForFee,
  isVisible,
});
</script>

<style lang="scss" scoped>
.repay-debt {
  @include full-width-button('action-button');

  &__button,
  &__token-input {
    margin-bottom: $inner-spacing-medium;
  }
  .ltv-badge-status {
    margin-left: $inner-spacing-mini;
  }
}
</style>
