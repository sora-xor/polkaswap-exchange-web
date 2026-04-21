<template>
  <DialogBase :title="title" v-model:visible="isVisible" tooltip="COMING SOON...">
    <div class="dashboard-burn">
      <p class="p3 dashboard-burn__text">ENTER THE AMOUNT YOU WANT TO BURN</p>
      <TokenInput
        ref="tokenInput"
        class="dashboard-burn__token-input"
        with-slider
        title="AMOUNT"
        v-model="value"
        :is-fiat-editable="editableFiat"
        :is-max-available="isMaxAvailable"
        :token="asset"
        :balance="balance"
        :slider-value="valuePercent"
        :disabled="loading"
        @max="handleMaxValue"
        @slide="handlePercentChange"
      ></TokenInput>
      <s-button
        type="primary"
        class="s-typography-button--large action-button dashboard-burn__button"
        :disabled="disabled"
        @click="handleBurn"
      >
        <template v-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: xorSymbol }) }}
        </template>
        <template v-else-if="emptyValue">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('insufficientBalanceText', { tokenSymbol }) }}
        </template>
        <template v-else>{{ title }}</template>
      </s-button>
      <InfoLine
        :label="t('networkFeeText')"
        :label-tooltip="t('networkFeeTooltipText')"
        :value="networkFeeFormatted"
        :asset-symbol="xorSymbol"
        :fiat-value="getFiatAmountByCodecString(networkFee)"
        is-formatted
      ></InfoLine>
    </div>
  </DialogBase>
</template>

<script lang="ts" setup>
import { Operation } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { api } from '@/lib/soraneo-wallet/src/api';
import { computed, getCurrentInstance, nextTick, ref, watch } from 'vue';

import TokenInput from '@/components/shared/Input/TokenInput.vue';
import { HundredNumber, ObjectInit, ZeroStringValue } from '@/consts';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import type { OwnedAsset } from '@/modules/dashboard/types';
import { useAssetsStore } from '@/stores/assets';
import { useSettingsStore } from '@/stores/settings';
import { isMaxButtonAvailable } from '@/utils';

import type TokenInputComponent from '@/components/shared/Input/TokenInput.vue';
import type { CodecString, NetworkFeesObject } from '@sora-substrate/sdk';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import WalletComponentDialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';
import WalletComponentInfoLine from '@/lib/soraneo-wallet/src/components/InfoLine.vue';

const DialogBase = WalletComponentDialogBase;
const InfoLine = WalletComponentInfoLine;

const props = withDefaults(
  defineProps<{
    balance?: CodecString;
    editableFiat?: boolean;
    asset?: OwnedAsset;
  }>(),
  {
    balance: ZeroStringValue,
    editableFiat: false,
    asset: () => ObjectInit as OwnedAsset,
  }
);

const { t } = useTranslation();
const { loading, withNotifications } = useTransaction();
const { Zero, getFPNumber, getFPNumberFromCodec, formatCodecNumber, getFiatAmountByCodecString } = useFormattedAmount();
const settingsStore = useSettingsStore();
const assetsStore = useAssetsStore();

const isVisible = defineModel<boolean>('visible', { default: false });
const value = ref('');
const tokenInput = ref<InstanceType<typeof TokenInputComponent> | null>(null);

const xorSymbol = XOR.symbol;
const asset = computed(() => props.asset);
const editableFiat = computed(() => props.editableFiat);
const balance = computed(() => props.balance);

const networkFees = computed(() => settingsStore.networkFees as NetworkFeesObject | undefined);
const accountXor = computed(() => assetsStore.xor as Nullable<AccountAsset>);

const networkFee = computed<CodecString>(() => networkFees.value?.[Operation.Burn] ?? ZeroStringValue);
const fpNetworkFee = computed(() => getFPNumberFromCodec(networkFee.value));
const xorBalance = computed(() => getFPNumberFromCodec(accountXor.value?.balance?.transferable ?? ZeroStringValue));
const tokenDecimals = computed(() => asset.value?.decimals);
const tokenSymbol = computed(() => asset.value?.symbol ?? '');
const title = computed(() => `Burn ${tokenSymbol.value}`);
const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));

const fpBalance = computed(() => getFPNumberFromCodec(balance.value ?? ZeroStringValue, tokenDecimals.value));

const assetWithBalance = computed<Nullable<AccountAsset>>(() => {
  if (!asset.value) return null;
  return { ...asset.value, balance: { transferable: balance.value } } as unknown as AccountAsset;
});

const emptyValue = computed(() => !Number(value.value));
const isInsufficientXorForFee = computed(() => xorBalance.value.sub(fpNetworkFee.value).isLtZero());
const isInsufficientBalance = computed(() => {
  if (!value.value) return false;
  const amount = getFPNumber(value.value, tokenDecimals.value);
  return fpBalance.value.sub(amount).isLtZero();
});

const isMaxAvailable = computed(() => {
  if (!assetWithBalance.value || !accountXor.value) return false;
  return isMaxButtonAvailable(assetWithBalance.value, value.value ?? '', networkFee.value, accountXor.value);
});

const valuePercent = computed(() => {
  if (!value.value) return 0;
  if (fpBalance.value.isZero()) return 0;
  const percent = getFPNumber(value.value, tokenDecimals.value).div(fpBalance.value).mul(HundredNumber).toNumber(0);
  return percent > HundredNumber ? HundredNumber : percent;
});

const disabled = computed(
  () => loading.value || isInsufficientXorForFee.value || emptyValue.value || isInsufficientBalance.value
);

const instance = getCurrentInstance();
const showAlert = (message: string) => {
  const proxy = instance?.proxy as { $alert?: (msg: string, options?: Record<string, unknown>) => void } | null;
  proxy?.$alert?.(message, { title: t('errorText') });
};

const resetForm = () => {
  value.value = '';
};

const handlePercentChange = (percent: number) => {
  const amount = fpBalance.value.mul(percent / HundredNumber);
  value.value = amount.toString();
};

const handleMaxValue = () => {
  value.value = fpBalance.value.toString();
};

const handleBurn = async () => {
  if (disabled.value) {
    if (isInsufficientBalance.value) {
      showAlert(t('insufficientBalanceText', { tokenSymbol: tokenSymbol.value }));
    }
    return;
  }

  if (!asset.value) return;

  try {
    await withNotifications(async () => {
      await api.assets.burn(asset.value, value.value);
    });
  } catch (error) {
    console.error(error);
  } finally {
    isVisible.value = false;
  }
};

watch(
  isVisible,
  async (visible) => {
    if (visible) {
      resetForm();
      await nextTick();
      tokenInput.value?.focus?.();
    }
  },
  { immediate: true }
);

defineExpose({
  isVisible,
  value,
  disabled,
  isInsufficientBalance,
  isInsufficientXorForFee,
  handleBurn,
  handleMaxValue,
  handlePercentChange,
  resetForm,
});
</script>

<style lang="scss" scoped>
.dashboard-burn {
  @include full-width-button('action-button');

  &__text,
  &__button {
    margin-bottom: 16px;
  }
}
</style>
