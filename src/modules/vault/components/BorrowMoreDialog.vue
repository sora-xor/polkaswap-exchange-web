<template>
  <DialogBase :title="title" v-model:visible="isVisible" :tooltip="t('kensetsu.borrowMoreDescription')">
    <div class="borrow-more">
      <TokenInput
        ref="debtInput"
        class="borrow-more__debt-input borrow-more__token-input"
        with-slider
        is-fiat-editable
        v-model="borrowValue"
        :title="title"
        :balance-text="t('kensetsu.available')"
        :is-max-available="isMaxBorrowAvailable"
        :token="debtAsset"
        :balance="availableCodec"
        :slider-value="borrowValuePercent"
        :disabled="loading"
        @max="handleMaxBorrowValue"
        @slide="handleBorrowPercentChange"
      ></TokenInput>
      <SlippageTolerance class="slippage-tolerance-settings borrow-more__slippage"></SlippageTolerance>
      <PrevNextInfoLine
        :label="t('kensetsu.outstandingDebt')"
        :tooltip="t('kensetsu.outstandingDebtDescription')"
        :symbol="debtSymbol"
        :prev="formattedPrevBorrow"
        :next="formattedNextBorrow"
      ></PrevNextInfoLine>
      <PrevNextInfoLine
        symbol="%"
        :label="t('kensetsu.ltv')"
        :tooltip="t('kensetsu.ltvDescription')"
        :prev="formattedPrevLtv"
        :next="formattedLtv"
      >
        <ValueStatus v-if="ltv" class="ltv-badge-status" badge :value="ltvNumber" :get-status="resolveLtvStatus">
          {{ ltvText }}
        </ValueStatus>
      </PrevNextInfoLine>
      <s-button
        class="s-typography-button--large action-button borrow-more__button"
        type="primary"
        :disabled="disabled"
        @click="handleBorrowMore"
      >
        <template v-if="disabled">{{ errorMessage }}</template>
        <template v-else>{{ title }}</template>
      </s-button>
      <InfoLine
        :label="t('kensetsu.borrowTax')"
        :label-tooltip="t('kensetsu.borrowTaxDescription', { value: borrowTaxPercent })"
        :value="formattedBorrowTax"
        :asset-symbol="debtSymbol"
        is-formatted
      ></InfoLine>
      <InfoLine
        is-formatted
        :label="t('networkFeeText')"
        :label-tooltip="t('networkFeeTooltipText')"
        :value="networkFeeFormatted"
        :asset-symbol="xorSymbol"
        :fiat-value="getFiatAmountByCodecString(networkFee)"
      ></InfoLine>
    </div>
  </DialogBase>
</template>

<script lang="ts" setup>
import { Operation, FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { components, api } from '@wallet';
import { computed, getCurrentInstance, nextTick, ref, watch } from 'vue';

import { Components, HundredNumber, ObjectInit, ZeroStringValue } from '@/consts';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import { LtvTranslations, VaultComponents } from '@/modules/vault/consts';
import { vaultLazyComponent } from '@/modules/vault/router';
import { getLtvStatus as resolveLtvStatus } from '@/modules/vault/util';
import { lazyComponent } from '@/router';
import store from '@/store';
import { asZeroValue } from '@/utils';

import type TokenInputComponent from '@/components/shared/Input/TokenInput.vue';
import type { CodecString } from '@sora-substrate/sdk';
import type { AccountAsset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Collateral, Vault } from '@sora-substrate/sdk/build/kensetsu/types';

const DialogBase = components.DialogBase;
const InfoLine = components.InfoLine;
const TokenInput = lazyComponent(Components.TokenInput);
const ValueStatus = lazyComponent(Components.ValueStatusWrapper);
const PrevNextInfoLine = vaultLazyComponent(VaultComponents.PrevNextInfoLine);
const SlippageTolerance = lazyComponent(Components.SlippageTolerance);

const props = withDefaults(
  defineProps<{
    visible?: boolean;
    vault?: Nullable<Vault>;
    debtAsset?: Nullable<RegisteredAccountAsset>;
    collateral?: Nullable<Collateral>;
    prevLtv?: Nullable<FPNumber>;
    available?: FPNumber;
    maxSafeDebt?: FPNumber;
    maxLtv?: number;
    borrowTax?: number;
  }>(),
  {
    visible: false,
    vault: ObjectInit,
    debtAsset: ObjectInit,
    collateral: ObjectInit,
    prevLtv: () => FPNumber.ZERO,
    available: () => FPNumber.ZERO,
    maxSafeDebt: () => FPNumber.ZERO,
    maxLtv: HundredNumber,
    borrowTax: 0,
  }
);

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'confirm'): void;
}>();

const { t } = useTranslation();
const { loading, withNotifications } = useTransaction();
const { Zero, getFPNumber, getFPNumberFromCodec, formatCodecNumber, getFiatAmountByCodecString } = useFormattedAmount();

const isVisible = ref(props.visible);
const borrowValue = ref('');
const debtInput = ref<InstanceType<typeof TokenInputComponent> | null>(null);

const xorSymbol = XOR.symbol;

const percentFormat = computed(() => store.state.settings.percentFormat as Nullable<Intl.NumberFormat>);
const networkFees = computed(() => store.state.wallet.settings.networkFees as Record<string, CodecString>);
const slippageTolerance = computed(() => store.state.settings.slippageTolerance as string);
const accountXor = computed(() => store.getters.assets.xor as Nullable<AccountAsset>);
const shouldBalanceBeHidden = computed(() => store.state.wallet.settings.shouldBalanceBeHidden ?? false);

const networkFee = computed<CodecString>(() => networkFees.value?.[Operation.CreateVault] ?? ZeroStringValue);
const fpNetworkFee = computed(() => getFPNumberFromCodec(networkFee.value));
const xorBalance = computed(() => getFPNumberFromCodec(accountXor.value?.balance?.transferable ?? ZeroStringValue));

const isBorrowZero = computed(() => asZeroValue(borrowValue.value));
const borrowFp = computed(() =>
  isBorrowZero.value ? Zero : getFPNumber(borrowValue.value, props.debtAsset?.decimals)
);

const debtAvailable = computed(() => props.collateral?.riskParams.hardCap.sub(props.collateral.debtSupply) ?? Zero);
const availableOrTotal = computed(() =>
  props.available.gt(debtAvailable.value) ? debtAvailable.value : props.available
);

const isInsufficientXorForFee = computed(() => xorBalance.value.sub(fpNetworkFee.value).isLtZero());
const isBorrowMoreThanAvailable = computed(() => borrowFp.value.gt(availableOrTotal.value));

const disabled = computed(
  () => loading.value || isInsufficientXorForFee.value || isBorrowZero.value || isBorrowMoreThanAvailable.value
);

const availableCodec = computed(() => availableOrTotal.value.dp(FPNumber.DEFAULT_PRECISION).codec);

const isMaxBorrowAvailable = computed(() => {
  if (shouldBalanceBeHidden.value || isBorrowZero.value) return true;
  if (!availableOrTotal.value.isFinity() || availableOrTotal.value.isLteZero()) return false;
  return !borrowFp.value.isEqualTo(availableOrTotal.value);
});

const debtSymbol = computed(() => props.debtAsset?.symbol ?? '');

const formattedPrevBorrow = computed(() => props.vault?.debt.toLocaleString() ?? ZeroStringValue);
const nextBorrow = computed(() => {
  const debt = props.vault?.debt;
  if (isBorrowZero.value) return debt ?? null;
  return debt?.add(borrowFp.value);
});
const formattedNextBorrow = computed(() => nextBorrow.value?.toLocaleString() ?? ZeroStringValue);

const formattedPrevLtv = computed(() => props.prevLtv?.toLocaleString(2) ?? ZeroStringValue);
const ltvCoeff = computed(() => {
  if (!nextBorrow.value || props.maxSafeDebt.isZero()) return null;
  return nextBorrow.value.div(props.maxSafeDebt);
});
const ltv = computed(() => (ltvCoeff.value?.isFinity() ? ltvCoeff.value.mul(HundredNumber) : null));
const ltvNumber = computed(() => ltv.value?.toNumber() ?? 0);
const formattedLtv = computed(() =>
  ltvCoeff.value ? ltvCoeff.value.mul(props.maxLtv).toLocaleString(2) : ZeroStringValue
);
const ltvText = computed(() => LtvTranslations[resolveLtvStatus(ltvNumber.value)]);

const borrowTaxPercent = computed(
  () => percentFormat.value?.format?.(props.borrowTax) ?? `${props.borrowTax * HundredNumber}%`
);
const formattedBorrowTax = computed(() => borrowFp.value.mul(props.borrowTax ?? 0).toLocaleString() ?? ZeroStringValue);

const borrowValuePercent = computed(() => {
  if (!borrowValue.value) return 0;
  if (availableOrTotal.value.isZero()) return 0;
  const percent = borrowFp.value.div(availableOrTotal.value).mul(HundredNumber).toNumber(0);
  return percent > HundredNumber ? HundredNumber : percent;
});

const title = computed(() => t('kensetsu.borrowMore'));
const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));

const errorMessage = computed(() => {
  if (isInsufficientXorForFee.value) {
    return t('insufficientBalanceText', { tokenSymbol: xorSymbol });
  }
  if (isBorrowZero.value) {
    return t('kensetsu.error.enterBorrow');
  }
  if (isBorrowMoreThanAvailable.value) {
    return t('kensetsu.error.borrowMoreThanAvailable');
  }
  return '';
});

const handleMaxBorrowValue = () => {
  borrowValue.value = availableOrTotal.value.toString();
};

const handleBorrowPercentChange = (percent: number) => {
  borrowValue.value = availableOrTotal.value.mul(percent / HundredNumber).toString();
};

const instance = getCurrentInstance();
const alert = instance?.proxy?.$alert as ((message: string, options: { title?: string }) => void) | undefined;

const handleBorrowMore = async () => {
  if (disabled.value) {
    if (errorMessage.value) {
      alert?.(errorMessage.value, { title: t('errorText') });
    }
    return;
  }

  try {
    await withNotifications(async () => {
      if (!(props.vault && props.debtAsset)) {
        throw new Error('[api.kensetsu.borrow]: vault is null');
      }
      await api.kensetsu.borrow(props.vault, borrowValue.value, props.debtAsset, slippageTolerance.value);
    });
    emit('confirm');
  } catch (error) {
    console.error(error);
  } finally {
    isVisible.value = false;
  }
};

watch(
  () => props.visible,
  async (value) => {
    isVisible.value = value;
    if (value) {
      await nextTick();
      borrowValue.value = '';
      debtInput.value?.focus();
    }
  },
  { immediate: true }
);

watch(isVisible, (value) => {
  emit('update:visible', value);
});
</script>

<style lang="scss" scoped>
.borrow-more {
  @include full-width-button('action-button');

  &__button,
  &__slippage {
    margin-bottom: $inner-spacing-medium;
  }
  &__token-input {
    margin-bottom: $inner-spacing-mini;
  }
  .ltv-badge-status {
    margin-left: $inner-spacing-mini;
  }
}
</style>
