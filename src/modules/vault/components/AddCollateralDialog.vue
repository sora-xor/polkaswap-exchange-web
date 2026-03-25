<template>
  <dialog-base :title="title" v-model:visible="isVisible" :tooltip="t('kensetsu.addCollateralDescription')">
    <div class="add-collateral">
      <token-input
        ref="collateralInput"
        class="add-collateral__collateral-input add-collateral__token-input"
        with-slider
        :title="t('kensetsu.depositCollateral')"
        v-model="collateralValue"
        is-fiat-editable
        :is-max-available="isMaxCollateralAvailable"
        :token="lockedAsset"
        :balance="collateralAssetBalance"
        :slider-value="collateralValuePercent"
        :disabled="loading"
        @max="handleMaxCollateralValue"
        @slide="handleCollateralPercentChange"
      ></token-input>
      <prev-next-info-line
        :label="t('kensetsu.totalCollateral')"
        :tooltip="t('kensetsu.totalCollateralDescription')"
        :symbol="lockedSymbol"
        :prev="formattedPrevDeposit"
        :next="formattedNextDeposit"
      ></prev-next-info-line>
      <prev-next-info-line
        :label="t('kensetsu.debtAvailable')"
        :tooltip="t('kensetsu.debtAvailableDescription')"
        :symbol="debtSymbol"
        :prev="formattedPrevAvailable"
        :next="formattedNextAvailable"
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
        class="s-typography-button--large action-button add-collateral__button"
        :disabled="disabled"
        @click="handleAddCollateral"
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

<script lang="ts" setup>
import { Operation, FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { components } from '@/shims/wallet-components';
import { api } from '@/shims/wallet-api';
import { computed, getCurrentInstance, nextTick, ref, watch } from 'vue';

import { Components, HundredNumber, ObjectInit, ZeroStringValue } from '@/consts';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import { LtvTranslations, VaultComponents } from '@/modules/vault/consts';
import { vaultLazyComponent } from '@/modules/vault/router';
import { getLtvStatus } from '@/modules/vault/util';
import { lazyComponent } from '@/router';
import { useAssetsStore } from '@/stores/assets';
import { useWalletStore } from '@/stores/wallet';
import { asZeroValue, getAssetBalance, hasInsufficientBalance } from '@/utils';

import type TokenInputComponent from '@/components/shared/Input/TokenInput.vue';
import type { CodecString } from '@sora-substrate/sdk';
import type { AccountAsset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Collateral, Vault } from '@sora-substrate/sdk/build/kensetsu/types';

const DialogBase = components.DialogBase;
const InfoLine = components.InfoLine;
const TokenInput = lazyComponent(Components.TokenInput);
const ValueStatus = lazyComponent(Components.ValueStatusWrapper);
const PrevNextInfoLine = vaultLazyComponent(VaultComponents.PrevNextInfoLine);

const props = withDefaults(
  defineProps<{
    collateral?: Nullable<Collateral>;
    vault?: Nullable<Vault>;
    lockedAsset?: Nullable<RegisteredAccountAsset>;
    debtAsset?: Nullable<RegisteredAccountAsset>;
    prevLtv?: Nullable<FPNumber>;
    prevAvailable?: FPNumber;
    averageCollateralPrice?: FPNumber;
    maxLtv?: number;
    borrowTax?: number;
  }>(),
  {
    collateral: ObjectInit,
    vault: ObjectInit,
    lockedAsset: ObjectInit,
    debtAsset: ObjectInit,
    prevLtv: () => FPNumber.ZERO,
    prevAvailable: () => FPNumber.ZERO,
    averageCollateralPrice: () => FPNumber.ZERO,
    maxLtv: HundredNumber,
    borrowTax: 0,
  }
);

const emit = defineEmits<{
  (event: 'confirm'): void;
}>();

const { t, formatDate } = useTranslation();
const { loading, withNotifications, withLoading, withApi, withChainApi, withParentLoading } = useTransaction();
const {
  Zero,
  getFPNumber,
  getFPNumberFromCodec,
  formatCodecNumber,
  getFiatAmountByCodecString,
  getFPNumberFiatAmountByFPNumber,
} = useFormattedAmount();
const walletStore = useWalletStore();
const assetsStore = useAssetsStore();

const isVisible = defineModel<boolean>('visible', { default: false });
const collateralValue = ref('');
const collateralInput = ref<InstanceType<typeof TokenInputComponent> | null>(null);

const xorSymbol = XOR.symbol;
const shouldBalanceBeHidden = computed(() => walletStore.shouldBalanceBeHidden);
const networkFees = computed(() => walletStore.networkFees as Record<string, CodecString>);
const accountXor = computed(() => assetsStore.xor as Nullable<AccountAsset>);

const networkFee = computed<CodecString>(() => networkFees.value?.[Operation.DepositCollateral] ?? ZeroStringValue);
const fpNetworkFee = computed(() => getFPNumberFromCodec(networkFee.value));
const xorBalance = computed(() => getFPNumberFromCodec(accountXor.value?.balance?.transferable ?? ZeroStringValue));

const isCollateralZero = computed(() => asZeroValue(collateralValue.value));
const collateralFp = computed(() => {
  if (isCollateralZero.value) return Zero;
  return getFPNumber(collateralValue.value, props.lockedAsset?.decimals);
});

const collateralAssetBalance = computed<CodecString>(() =>
  props.lockedAsset ? getAssetBalance(props.lockedAsset) : ZeroStringValue
);

const availableCollateralBalanceFp = computed(() => {
  let available = getFPNumberFromCodec(collateralAssetBalance.value);
  if (props.lockedAsset?.address === XOR.address) {
    available = available.sub(fpNetworkFee.value);
    if (available.isLtZero()) {
      available = Zero;
    }
  }
  return available;
});

const collateralValuePercent = computed(() => {
  if (!collateralValue.value) return 0;
  const denominator = availableCollateralBalanceFp.value;
  if (denominator.isZero()) return 0;
  const percent = collateralFp.value.div(denominator).mul(HundredNumber).toNumber(0);
  return percent > HundredNumber ? HundredNumber : percent;
});

const debtSymbol = computed(() => props.debtAsset?.symbol ?? '');
const lockedSymbol = computed(() => props.lockedAsset?.symbol ?? '');

const isInsufficientXorForFee = computed(() => xorBalance.value.sub(fpNetworkFee.value).isLtZero());
const isInsufficientBalance = computed(() => {
  if (!props.lockedAsset) return true;
  return hasInsufficientBalance(props.lockedAsset, collateralValue.value, networkFee.value);
});

const disabled = computed(
  () => loading.value || isInsufficientXorForFee.value || isCollateralZero.value || isInsufficientBalance.value
);

const title = computed(() => t('kensetsu.addCollateral'));
const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));

const totalCollateralValue = computed(() => {
  if (!props.vault) return null;
  return props.vault.lockedAmount.add(collateralFp.value);
});

const formattedPrevDeposit = computed(() =>
  props.vault ? props.vault.lockedAmount.toLocaleString() : ZeroStringValue
);
const formattedNextDeposit = computed(() => totalCollateralValue.value?.toLocaleString() ?? ZeroStringValue);
const formattedPrevLtv = computed(() => props.prevLtv?.toLocaleString(2) ?? ZeroStringValue);

const maxBorrowPerCollateralValue = computed(() => {
  if (isCollateralZero.value) return Zero;
  const collateralVolume = props.averageCollateralPrice.mul(collateralFp.value);
  const maxSafeDebt = collateralVolume
    .mul(props.collateral?.riskParams.liquidationRatioReversed ?? 0)
    .div(HundredNumber);

  let available = maxSafeDebt.sub(maxSafeDebt.mul(props.borrowTax));

  let totalAvailable = props.collateral?.riskParams.hardCap.sub(props.collateral.debtSupply) ?? Zero;
  totalAvailable = totalAvailable.sub(totalAvailable.mul(props.borrowTax));

  available = available.gt(totalAvailable) ? totalAvailable : available;
  return !available.isFinity() || available.isLteZero() ? Zero : available;
});

const formattedPrevAvailable = computed(() => props.prevAvailable.toLocaleString());
const nextAvailable = computed(() => props.prevAvailable.add(maxBorrowPerCollateralValue.value));
const formattedNextAvailable = computed(() => nextAvailable.value.toLocaleString());

const maxSafeDebt = computed(() => {
  if (!totalCollateralValue.value) return null;
  const collateralVolume = props.averageCollateralPrice.mul(totalCollateralValue.value);
  return collateralVolume.mul(props.collateral?.riskParams.liquidationRatioReversed ?? 0).div(HundredNumber);
});

const ltvCoeff = computed(() => {
  if (!(maxSafeDebt.value && props.vault)) return null;
  return props.vault.debt.div(maxSafeDebt.value);
});

const ltv = computed(() => (ltvCoeff.value?.isFinity() ? ltvCoeff.value.mul(HundredNumber) : null));
const ltvNumber = computed(() => ltv.value?.toNumber() ?? 0);
const formattedLtv = computed(() =>
  ltvCoeff.value ? ltvCoeff.value.mul(props.maxLtv).toLocaleString(2) : ZeroStringValue
);
const ltvText = computed(() => LtvTranslations[getLtvStatus(ltvNumber.value)]);

const isMaxCollateralAvailable = computed(() => {
  if (shouldBalanceBeHidden.value || isCollateralZero.value) return true;
  if (availableCollateralBalanceFp.value.isLteZero()) return false;
  return !collateralFp.value.isEqualTo(availableCollateralBalanceFp.value);
});

const errorMessage = computed(() => {
  if (isInsufficientXorForFee.value) {
    return t('insufficientBalanceText', { tokenSymbol: xorSymbol });
  }
  if (isCollateralZero.value) {
    return t('kensetsu.error.enterCollateral');
  }
  if (isInsufficientBalance.value) {
    return t('insufficientBalanceText', { tokenSymbol: lockedSymbol.value });
  }
  return '';
});

const instance = getCurrentInstance();
const alert = instance?.proxy?.$alert as ((message: string, options: { title?: string }) => void) | undefined;

const handleCollateralPercentChange = (percent: number) => {
  const amount = availableCollateralBalanceFp.value.mul(percent / HundredNumber);
  collateralValue.value = amount.toString();
};

const handleMaxCollateralValue = () => {
  collateralValue.value = availableCollateralBalanceFp.value.toString();
};

const handleAddCollateral = async () => {
  if (disabled.value) {
    if (errorMessage.value) {
      alert?.(errorMessage.value, { title: t('errorText') });
    }
    return;
  }

  try {
    await withNotifications(async () => {
      if (!(props.vault && props.lockedAsset)) {
        throw new Error('[api.kensetsu.depositCollateral]: vault or asset is null');
      }
      await api.kensetsu.depositCollateral(props.vault, collateralValue.value, props.lockedAsset);
    });
    emit('confirm');
  } catch (error) {
    console.error(error);
  } finally {
    isVisible.value = false;
  }
};

watch(
  isVisible,
  async (value) => {
    if (value) {
      await nextTick();
      collateralValue.value = '';
      collateralInput.value?.focus();
    }
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped>
.add-collateral {
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
