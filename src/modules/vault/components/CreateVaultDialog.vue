<template>
  <div>
    <dialog-base
      :title="t('kensetsu.createVault')"
      v-model:visible="isVisible"
      :tooltip="t('kensetsu.createVaultDescription')"
    >
      <div class="vault-create">
        <token-input
          ref="collateralInput"
          class="vault-create__collateral-input vault-create__token-input"
          with-slider
          is-fiat-editable
          is-select-available
          v-model="collateralValue"
          :title="t('kensetsu.depositCollateral')"
          :is-max-available="isMaxCollateralAvailable"
          :token="collateralToken"
          :balance="collateralAssetBalance"
          :slider-value="collateralValuePercent"
          :disabled="loading"
          @max="handleMaxCollateralValue"
          @slide="handleCollateralPercentChange"
          @select="openSelectTokenDialog(true)"
        ></token-input>
        <token-input
          ref="debtInput"
          class="vault-create__debt-input vault-create__token-input"
          is-fiat-editable
          is-select-available
          v-model="borrowValue"
          :with-slider="isBorrowSliderAvailable"
          :title="t('kensetsu.borrowDebt')"
          :balance-text="t('kensetsu.available')"
          :balance="maxBorrowCodec"
          :is-max-available="isMaxBorrowAvailable"
          :token="debtToken"
          :slider-value="borrowValuePercent"
          :disabled="loading"
          :max="maxBorrowPerMaxCollateralNumber"
          @max="handleMaxBorrowValue"
          @slide="handleBorrowPercentChange"
          @select="openSelectTokenDialog(false)"
        ></token-input>
        <slippage-tolerance class="slippage-tolerance-settings vault-create__slippage"></slippage-tolerance>
        <info-line
          :label="t('kensetsu.ltv')"
          :label-tooltip="t('kensetsu.ltvDescription')"
          :value="formattedLtv"
          asset-symbol="%"
          is-formatted
        >
          <value-status v-if="ltv" class="ltv-badge-status" badge :value="ltvNumber" :get-status="getLtvStatus">
            {{ ltvText }}
          </value-status>
        </info-line>
        <s-button
          type="primary"
          class="s-typography-button--large action-button vault-create__button"
          :disabled="disabled"
          @click="handleCreate"
        >
          <template v-if="disabled">{{ errorMessage }}</template>
          <template v-else>{{ t('kensetsu.createVaultAction') }}</template>
        </s-button>
        <info-line
          :label="t('kensetsu.minDepositCollateral')"
          :label-tooltip="t('kensetsu.minDepositCollateralDescription')"
          :value="formattedMinDeposit"
          :asset-symbol="collateralSymbol"
          :fiat-value="minDepositFiat"
          is-formatted
        ></info-line>
        <info-line
          :label="t('kensetsu.interest')"
          :label-tooltip="t('kensetsu.interestDescription')"
          :value="formattedStabilityFee"
          asset-symbol="%"
          is-formatted
        ></info-line>
        <info-line
          :label="t('kensetsu.borrowTax')"
          :label-tooltip="t('kensetsu.borrowTaxDescription', { value: borrowTaxPercent })"
          :value="formattedBorrowTax"
          :asset-symbol="debtSymbol"
          is-formatted
        ></info-line>
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

    <select-token
      disabled-custom
      v-model:visible="showSelectTokenDialog"
      :connected="isLoggedIn"
      :filter="selectTokenFilter"
      :asset="collateralToken"
      @select="handleSelectToken"
    ></select-token>
  </div>
</template>

<script setup lang="ts">
import { Operation, FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { components, api } from '@wallet';
import { computed, nextTick, ref, watch } from 'vue';

import { Components, HundredNumber, ZeroStringValue } from '@/consts';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useNotification } from '@/composables/useNotification';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import { LtvTranslations } from '@/modules/vault/consts';
import { getLtvStatus } from '@/modules/vault/util';
import { lazyComponent } from '@/router';
import store from '@/store';
import { asZeroValue, getAssetBalance, hasInsufficientBalance } from '@/utils';

import type TokenInputComponent from '@/components/shared/Input/TokenInput.vue';
import type { CodecString, NetworkFeesObject } from '@sora-substrate/sdk';
import type { AccountAsset, Asset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Collateral } from '@sora-substrate/sdk/build/kensetsu/types';
import type { Nullable } from '@/types/common';

const DialogBase = components.DialogBase;
const InfoLine = components.InfoLine;
const TokenInput = lazyComponent(Components.TokenInput);
const SelectToken = lazyComponent(Components.SelectToken);
const ValueStatus = lazyComponent(Components.ValueStatusWrapper);
const SlippageTolerance = lazyComponent(Components.SlippageTolerance);

const props = withDefaults(
  defineProps<{
    visible?: boolean;
  }>(),
  {
    visible: false,
  }
);

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
}>();

const { t } = useTranslation();
const { withNotifications, loading } = useTransaction();
const { showAppAlert } = useNotification();
const {
  Zero,
  Hundred,
  getFPNumber,
  getFPNumberFromCodec,
  formatCodecNumber,
  getFiatAmountByCodecString,
  getFiatAmountByFPNumber,
} = useFormattedAmount();

const xorSymbol = XOR.symbol;

const isVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
});

const collateralInput = ref<InstanceType<typeof TokenInputComponent> | null>(null);
const debtInput = ref<InstanceType<typeof TokenInputComponent> | null>(null);
const collateralValue = ref('');
const borrowValue = ref('');
const showSelectTokenDialog = ref(false);
const isCollateralSelected = ref(true);

const percentFormat = computed(() => store.state.settings.percentFormat as Nullable<Intl.NumberFormat>);
const networkFees = computed(() => store.state.wallet.settings.networkFees as NetworkFeesObject | undefined);
const slippageToleranceValue = computed(() => store.state.settings.slippageTolerance as string);
const collaterals = computed(() => store.state.vault.collaterals as Record<string, Collateral>);
const averageCollateralPrice = computed(() => store.getters.vault.averageCollateralPrice as Nullable<FPNumber>);
const accountXor = computed(() => store.getters.assets.xor as Nullable<AccountAsset>);
const isLoggedIn = computed(() => store.getters.wallet.account.isLoggedIn as boolean);
const debtToken = computed(() => store.getters.vault.debtToken as Nullable<RegisteredAccountAsset>);
const collateralToken = computed(() => store.getters.vault.collateralToken as Nullable<RegisteredAccountAsset>);
const shouldBalanceBeHidden = computed(() => store.state.wallet.settings.shouldBalanceBeHidden ?? false);

const networkFee = computed<CodecString>(() => networkFees.value?.[Operation.CreateVault] ?? ZeroStringValue);
const fpNetworkFee = computed(() => getFPNumberFromCodec(networkFee.value));
const xorBalance = computed(() => getFPNumberFromCodec(accountXor.value?.balance?.transferable ?? ZeroStringValue));
const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));
const isInsufficientXorForFee = computed(() => xorBalance.value.sub(fpNetworkFee.value).isLtZero());

const collateralId = computed(() => {
  const collateral = collateralToken.value;
  const debt = debtToken.value;
  if (!(collateral && debt)) return '';
  return api.kensetsu.serializeKey(collateral.address, debt.address);
});

const collateral = computed(() => collaterals.value[collateralId.value] ?? null);
const maxLtv = computed(() => collateral.value?.riskParams.liquidationRatioReversed ?? HundredNumber);
const minDeposit = computed(() => collateral.value?.riskParams.minDeposit ?? Zero);
const isCollateralZero = computed(() => asZeroValue(collateralValue.value));
const isBorrowZero = computed(() => asZeroValue(borrowValue.value));

const collateralValueFp = computed(() => {
  if (isCollateralZero.value) return Zero;
  return getFPNumber(collateralValue.value, collateralToken.value?.decimals);
});

const borrowValueFp = computed(() => {
  if (isBorrowZero.value) return Zero;
  return getFPNumber(borrowValue.value, debtToken.value?.decimals);
});

const collateralAssetBalance = computed<CodecString>(() => getAssetBalance(collateralToken.value));

const availableCollateralBalanceFp = computed(() => {
  let available = getFPNumberFromCodec(collateralAssetBalance.value);
  if (collateralToken.value?.address === XOR.address) {
    available = available.sub(fpNetworkFee.value);
    if (available.isLtZero()) {
      available = Zero;
    }
  }
  return available;
});

const isLessThanMinDeposit = computed(() => {
  if (!collateralValue.value) return true;
  return collateralValueFp.value.lt(minDeposit.value);
});

const isInsufficientBalance = computed(() => {
  if (!collateralToken.value) return true;
  return hasInsufficientBalance(collateralToken.value, collateralValue.value, networkFee.value);
});

const isIncorrectCollateral = computed(() => {
  if (!(collateralToken.value && debtToken.value)) return false;
  return !collateral.value;
});

const isLtvGtHundred = computed(() => ltv.value?.gt(Hundred) ?? false);

const disabled = computed(
  () =>
    loading.value ||
    isIncorrectCollateral.value ||
    isInsufficientXorForFee.value ||
    isLessThanMinDeposit.value ||
    isInsufficientBalance.value ||
    !ltv.value ||
    isBorrowZero.value ||
    isLtvGtHundred.value
);

const collateralValuePercent = computed(() => {
  if (!collateralValue.value) return 0;
  const denominator = availableCollateralBalanceFp.value;
  if (denominator.isZero()) return 0;
  const percent = collateralValueFp.value.div(denominator).mul(HundredNumber).toNumber(0);
  return percent > HundredNumber ? HundredNumber : percent;
});

const selectTokenFilter = (asset: AccountAsset) => {
  const tokenIds = Object.values(collaterals.value).map((collateralItem) =>
    isCollateralSelected.value ? collateralItem.lockedAssetId : collateralItem.debtAssetId
  );
  return tokenIds.includes(asset?.address);
};

const isMaxCollateralAvailable = computed(() => {
  if (shouldBalanceBeHidden.value) return true;
  if (availableCollateralBalanceFp.value.isLteZero()) return false;
  if (isCollateralZero.value) return true;
  return !collateralValueFp.value.isEqualTo(availableCollateralBalanceFp.value);
});

const isBorrowSliderAvailable = computed(() => availableCollateralBalanceFp.value.gte(minDeposit.value));

const getBorrowTax = computed(
  () => store.getters.vault.getBorrowTax as (debtAsset: Asset | AccountAsset | string) => number
);

const borrowTax = computed(() => {
  const token = debtToken.value;
  if (!token) return 0;
  return getBorrowTax.value(token.address);
});

const kusdAvailable = computed(() => {
  const available = collateral.value?.riskParams.hardCap.sub(collateral.value.debtSupply) ?? Zero;
  const availableExcludedFee = available.sub(available.mul(borrowTax.value));
  return availableExcludedFee.isLtZero() ? Zero : availableExcludedFee;
});

const maxBorrowPerMaxCollateralFp = computed(() => {
  if (
    !averageCollateralPrice.value ||
    !availableCollateralBalanceFp.value.isFinity() ||
    availableCollateralBalanceFp.value.isZero()
  ) {
    return Zero;
  }

  const collateralVolume = averageCollateralPrice.value.mul(availableCollateralBalanceFp.value);
  const maxSafeDebt = collateralVolume
    .mul(collateral.value?.riskParams.liquidationRatioReversed ?? 0)
    .div(HundredNumber);

  const maxBorrow = maxSafeDebt.sub(maxSafeDebt.mul(borrowTax.value));
  return maxBorrow.gt(kusdAvailable.value) ? kusdAvailable.value : maxBorrow;
});

const maxBorrowPerMaxCollateralNumber = computed(() => maxBorrowPerMaxCollateralFp.value.toNumber());

const maxBorrowCodec = computed<CodecString>(() => {
  if (availableCollateralBalanceFp.value.lt(minDeposit.value)) return ZeroStringValue;
  return maxBorrowPerMaxCollateralFp.value.toCodecString();
});

const maxBorrowPerCollateralValue = computed(() => {
  if (!averageCollateralPrice.value || isCollateralZero.value) return Zero;

  const collateralVolume = averageCollateralPrice.value.mul(collateralValueFp.value);
  const maxSafeDebt = collateralVolume
    .mul(collateral.value?.riskParams.liquidationRatioReversed ?? 0)
    .div(HundredNumber);

  return maxSafeDebt.sub(maxSafeDebt.mul(borrowTax.value));
});

const maxBorrowPerCollateralValueOrAvailable = computed(() =>
  maxBorrowPerCollateralValue.value.gt(kusdAvailable.value) ? kusdAvailable.value : maxBorrowPerCollateralValue.value
);

const isMaxBorrowAvailable = computed(() => {
  if (isCollateralZero.value || availableCollateralBalanceFp.value.lt(minDeposit.value)) return false;
  if (shouldBalanceBeHidden.value || isBorrowZero.value) return true;
  if (
    !maxBorrowPerCollateralValueOrAvailable.value.isFinity() ||
    maxBorrowPerCollateralValueOrAvailable.value.isLteZero()
  )
    return false;
  return !borrowValueFp.value.isEqualTo(maxBorrowPerCollateralValueOrAvailable.value);
});

const borrowValuePercent = computed(() => {
  if (!borrowValue.value) return 0;
  const denominator = maxBorrowPerCollateralValueOrAvailable.value;
  if (denominator.isZero()) return 0;
  const percent = borrowValueFp.value.div(denominator).mul(HundredNumber).toNumber(0);
  return percent > HundredNumber ? HundredNumber : percent;
});

const ltvCoeff = computed<Nullable<FPNumber>>(() => {
  if (isCollateralZero.value) return null;
  if (isBorrowZero.value) return Zero;
  return borrowValueFp.value.div(maxBorrowPerCollateralValue.value);
});

const ltv = computed<Nullable<FPNumber>>(() => (ltvCoeff.value?.isFinity() ? ltvCoeff.value.mul(HundredNumber) : null));

const ltvNumber = computed(() => ltv.value?.toNumber() ?? 0);

const formattedLtv = computed(() =>
  ltvCoeff.value ? ltvCoeff.value.mul(maxLtv.value).toLocaleString(2) : ZeroStringValue
);

const ltvText = computed(() => LtvTranslations[getLtvStatus(ltvNumber.value)]);

const formattedStabilityFee = computed(() =>
  (collateral.value?.riskParams.stabilityFeeAnnual ?? Zero).toLocaleString()
);

const debtSymbol = computed(() => debtToken.value?.symbol ?? '');
const collateralSymbol = computed(() => collateralToken.value?.symbol ?? '');

const formattedMinDeposit = computed(() => minDeposit.value.toLocaleString() ?? ZeroStringValue);

const minDepositFiat = computed(() => {
  const token = collateralToken.value;
  if (!token) return null;
  return getFiatAmountByFPNumber(minDeposit.value, token);
});

const borrowTaxPercent = computed(
  () => percentFormat.value?.format?.(borrowTax.value) ?? `${borrowTax.value * HundredNumber}%`
);

const formattedBorrowTax = computed(() => borrowValueFp.value.mul(borrowTax.value ?? 0).toLocaleString());

const errorMessage = computed(() => {
  if (isInsufficientXorForFee.value) {
    return t('insufficientBalanceText', { tokenSymbol: xorSymbol });
  }
  if (isIncorrectCollateral.value) {
    return t('kensetsu.error.incorrectCollateral');
  }
  if (!ltv.value) {
    return t('kensetsu.error.enterCollateral');
  }
  if (isBorrowZero.value) {
    return t('kensetsu.error.enterBorrow');
  }
  if (isLessThanMinDeposit.value) {
    return t('kensetsu.error.insufficientCollateral');
  }
  if (isInsufficientBalance.value) {
    return t('insufficientBalanceText', { tokenSymbol: collateralSymbol.value });
  }
  if (isLtvGtHundred.value) {
    return t('kensetsu.error.insufficientCollateral');
  }
  return '';
});

const handleCollateralPercentChange = (percent: number) => {
  collateralValue.value = availableCollateralBalanceFp.value.mul(percent / HundredNumber).toString();
};

const handleMaxCollateralValue = () => {
  collateralValue.value = availableCollateralBalanceFp.value.toString();
};

const handleMaxBorrowValue = () => {
  borrowValue.value = maxBorrowPerCollateralValueOrAvailable.value.toString();
};

const handleBorrowPercentChange = (percent: number) => {
  borrowValue.value = maxBorrowPerCollateralValueOrAvailable.value.mul(percent / HundredNumber).toString();
};

const openSelectTokenDialog = (isCollateral = true) => {
  isCollateralSelected.value = isCollateral;
  showSelectTokenDialog.value = true;
};

const handleSelectToken = async (token: Asset) => {
  if (isCollateralSelected.value) {
    await store.dispatch.vault.setCollateralTokenAddress(token?.address);
  } else {
    await store.dispatch.vault.setDebtTokenAddress(token?.address);
  }

  collateralValue.value = '';
  borrowValue.value = '';
};

const handleCreate = async () => {
  if (disabled.value) {
    if (errorMessage.value) {
      showAppAlert(errorMessage.value, t('errorText'));
    }
  } else {
    try {
      const lockedToken = collateralToken.value;
      const debt = debtToken.value;
      if (!(lockedToken && debt)) return;

      await withNotifications(async () => {
        await api.kensetsu.createVault(
          lockedToken,
          debt,
          collateralValue.value,
          borrowValue.value,
          slippageToleranceValue.value
        );
      });
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
    collateralValue.value = '';
    borrowValue.value = '';
    showSelectTokenDialog.value = false;
    if (!value) {
      await store.dispatch.vault.setCollateralTokenAddress();
    } else {
      const focus =
        collateralInput.value && typeof (collateralInput.value as any).focus === 'function'
          ? (collateralInput.value as any).focus
          : undefined;
      focus?.();
    }
  },
  { immediate: true }
);

defineExpose({
  handleCreate,
  openSelectTokenDialog,
  handleSelectToken,
  collateralValue,
  borrowValue,
  disabled,
  errorMessage,
  isInsufficientXorForFee,
  isVisible,
});
</script>

<style lang="scss" scoped>
.vault-create {
  @include full-width-button('action-button');

  &__button,
  &__token-input,
  &__slippage {
    margin-bottom: $inner-spacing-medium;
  }
  &__debt-input {
    margin-bottom: $inner-spacing-mini;
  }
  .ltv-badge-status {
    margin-left: $inner-spacing-mini;
  }
}
</style>
