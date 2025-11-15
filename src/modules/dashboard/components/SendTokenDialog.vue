<template>
  <DialogBase :title="title" v-model:visible="isVisible" tooltip="COMING SOON...">
    <div class="dashboard-send">
      <AddressBookInput
        class="dashboard-send__address"
        exclude-connected
        v-model="address"
        :is-valid="validAddress"
        :disabled="loading"
      ></AddressBookInput>
      <TokenInput
        ref="tokenInput"
        class="dashboard-send__token-input"
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
      <s-input
        class="dashboard-send__comment"
        type="textarea"
        placeholder="Comment (Optional)"
        v-model="comment"
        :rows="4"
        :maxlength="128"
        :disabled="loading"
        @keypress="handleCommentInput"
      ></s-input>
      <s-button
        type="primary"
        class="s-typography-button--large action-button dashboard-send__button"
        :disabled="disabled"
        @click="handleSend"
      >
        <template v-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: xorSymbol }) }}
        </template>
        <template v-else-if="emptyAddress">
          {{ t('walletSend.enterAddress') }}
        </template>
        <template v-else-if="!validAddress">
          {{ t('walletSend.badAddress') }}
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
import { api, components } from '@wallet';
import { computed, getCurrentInstance, nextTick, ref, watch } from 'vue';

import { Components, HundredNumber, ObjectInit, ZeroStringValue } from '@/consts';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import type { OwnedAsset } from '@/modules/dashboard/types';
import { lazyComponent } from '@/router';
import store from '@/store';
import { isMaxButtonAvailable } from '@/utils';

import type TokenInputComponent from '@/components/shared/Input/TokenInput.vue';
import type { CodecString, NetworkFeesObject } from '@sora-substrate/sdk';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

const DialogBase = components.DialogBase;
const InfoLine = components.InfoLine;
const AddressBookInput = components.AddressBookInput;
const TokenInput = lazyComponent(Components.TokenInput);

const props = withDefaults(
  defineProps<{
    visible?: boolean;
    balance?: CodecString;
    editableFiat?: boolean;
    asset?: OwnedAsset;
  }>(),
  {
    visible: false,
    balance: ZeroStringValue,
    editableFiat: false,
    asset: () => ObjectInit as OwnedAsset,
  }
);

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
}>();

const { t } = useTranslation();
const { loading, withNotifications } = useTransaction();
const { Zero, getFPNumber, getFPNumberFromCodec, formatCodecNumber, getFiatAmountByCodecString } = useFormattedAmount();

const isVisible = ref(props.visible);
const value = ref('');
const address = ref('');
const comment = ref('');
const tokenInput = ref<InstanceType<typeof TokenInputComponent> | null>(null);

const xorSymbol = XOR.symbol;
const asset = computed(() => props.asset);
const balance = computed(() => props.balance ?? ZeroStringValue);
const editableFiat = computed(() => props.editableFiat);
const tokenDecimals = computed(() => asset.value?.decimals);

const networkFees = computed(() => store.state.wallet.settings.networkFees as NetworkFeesObject | undefined);
const accountXor = computed(() => store.getters.assets.xor as Nullable<AccountAsset>);

const networkFee = computed<CodecString>(() => networkFees.value?.[Operation.XorlessTransfer] ?? ZeroStringValue);
const fpNetworkFee = computed(() => getFPNumberFromCodec(networkFee.value));
const xorBalance = computed(() => getFPNumberFromCodec(accountXor.value?.balance?.transferable ?? ZeroStringValue));

const tokenSymbol = computed(() => asset.value?.symbol ?? '');
const title = computed(() => `Send ${tokenSymbol.value}`);
const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));

const fpBalance = computed(() => getFPNumberFromCodec(balance.value, tokenDecimals.value));
const assetWithBalance = computed<Nullable<AccountAsset>>(() => {
  if (!asset.value) return null;
  return { ...asset.value, balance: { transferable: balance.value } } as unknown as AccountAsset;
});

const trimmedAddress = computed(() => address.value.trim());
const emptyAddress = computed(() => trimmedAddress.value.length === 0);
const validAddress = computed(() => !emptyAddress.value && api.validateAddress(trimmedAddress.value));
const emptyValue = computed(() => !Number(value.value));
const isInsufficientBalance = computed(() => {
  if (!value.value) return false;
  const amount = getFPNumber(value.value, tokenDecimals.value);
  return fpBalance.value.sub(amount).isLtZero();
});
const isInsufficientXorForFee = computed(() => xorBalance.value.sub(fpNetworkFee.value).isLtZero());

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
  () =>
    loading.value ||
    isInsufficientXorForFee.value ||
    emptyValue.value ||
    !validAddress.value ||
    isInsufficientBalance.value
);

const instance = getCurrentInstance();
const showAlert = (message: string) => {
  const proxy = instance?.proxy as { $alert?: (msg: string, options?: Record<string, unknown>) => void } | null;
  proxy?.$alert?.(message, { title: t('errorText') });
};

const resetForm = () => {
  value.value = '';
  address.value = '';
  comment.value = '';
};

const handlePercentChange = (percent: number) => {
  const amount = fpBalance.value.mul(percent / HundredNumber);
  value.value = amount.toString();
};

const handleMaxValue = () => {
  value.value = fpBalance.value.toString();
};

const handleCommentInput = (event: KeyboardEvent) => {
  if (!/^[A-Za-z0-9 _',.#]+$/.test(event.key)) {
    event.preventDefault();
  }
};

const handleSend = async () => {
  const trimmedComment = comment.value.trim() || undefined;
  const trimmedAddressValue = trimmedAddress.value;

  if (isInsufficientBalance.value) {
    showAlert(t('insufficientBalanceText', { tokenSymbol: tokenSymbol.value }));
    return;
  }

  if (!asset.value || disabled.value) return;

  try {
    await withNotifications(async () => {
      await api.assets.transfer(asset.value, trimmedAddressValue, value.value, {
        feeType: 'xor',
        comment: trimmedComment,
      });
    });
  } catch (error) {
    console.error(error);
  } finally {
    isVisible.value = false;
  }
};

watch(
  () => props.visible,
  async (visible) => {
    isVisible.value = visible;
    if (visible) {
      resetForm();
      await nextTick();
      tokenInput.value?.focus?.();
    }
  },
  { immediate: true }
);

watch(isVisible, (visible) => {
  emit('update:visible', visible);
});

defineExpose({
  isVisible,
  value,
  address,
  comment,
  disabled,
  isInsufficientBalance,
  isInsufficientXorForFee,
  handleSend,
  handleMaxValue,
  handlePercentChange,
  handleCommentInput,
  resetForm,
});
</script>

<style lang="scss">
.dashboard-send__comment .el-textarea__inner {
  max-height: 84px; // rows: 4 (21px*4)
}

.s-input__input .el-textarea.is-disabled .el-textarea__inner {
  background-color: var(--s-color-base-background); // TODO: fix in UI lib
}
</style>

<style lang="scss" scoped>
.dashboard-send {
  @include full-width-button('action-button');

  &__address,
  &__button,
  &__token-input {
    margin-bottom: 16px;
  }
}
</style>
