<template>
  <DialogBase :title="title" v-model:visible="isVisible" tooltip="COMING SOON...">
    <div class="dashboard-mint">
      <AddressBookInput
        class="dashboard-mint__address"
        v-model="address"
        :is-valid="validAddress"
        :disabled="loading"
      ></AddressBookInput>
      <p class="p3 dashboard-mint__text">
        ENTER THE AMOUNT YOU WANT TO MINT
        <s-tooltip slot="suffix" border-radius="mini" content="COMING SOON..." placement="top" tabindex="-1">
          <s-icon name="info-16" size="14px"></s-icon>
        </s-tooltip>
      </p>
      <TokenInput
        ref="tokenInput"
        class="dashboard-mint__token-input"
        title="AMOUNT"
        v-model="value"
        :is-fiat-editable="editableFiat"
        :token="asset"
        :disabled="loading"
      ></TokenInput>
      <s-button
        type="primary"
        class="s-typography-button--large action-button dashboard-mint__button"
        :disabled="disabled"
        @click="handleMint"
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
import { computed, nextTick, ref, watch } from 'vue';

import { Components, ObjectInit, ZeroStringValue } from '@/consts';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import type { OwnedAsset } from '@/modules/dashboard/types';
import { lazyComponent } from '@/router';
import store from '@/store';
import type { Nullable } from '@/types/common';

import type TokenInputComponent from '@/components/shared/Input/TokenInput.vue';
import type { CodecString, NetworkFeesObject } from '@sora-substrate/sdk';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

const DialogBase = components.DialogBase;
const InfoLine = components.InfoLine;
const AddressBookInput = components.AddressBookInput;
const TokenInput = lazyComponent(Components.TokenInput);

const props = withDefaults(
  defineProps<{
    editableFiat?: boolean;
    asset?: OwnedAsset;
  }>(),
  {
    editableFiat: false,
    asset: () => ObjectInit as OwnedAsset,
  }
);

const { t } = useTranslation();
const { loading, withNotifications } = useTransaction();
const { formatCodecNumber, getFiatAmountByCodecString, getFPNumberFromCodec } = useFormattedAmount();

const isVisible = defineModel<boolean>('visible', { default: false });
const value = ref('');
const address = ref('');
const tokenInput = ref<InstanceType<typeof TokenInputComponent> | null>(null);

const xorSymbol = XOR.symbol;
const asset = computed(() => props.asset);
const editableFiat = computed(() => props.editableFiat);

const networkFees = computed(() => store.state.wallet.settings.networkFees as NetworkFeesObject | undefined);
const accountXor = computed(() => store.getters.assets.xor as Nullable<AccountAsset>);

const networkFee = computed<CodecString>(() => networkFees.value?.[Operation.Mint] ?? ZeroStringValue);
const fpNetworkFee = computed(() => getFPNumberFromCodec(networkFee.value));
const xorBalance = computed(() => getFPNumberFromCodec(accountXor.value?.balance?.transferable ?? ZeroStringValue));

const tokenSymbol = computed(() => asset.value?.symbol ?? '');
const title = computed(() => `Mint ${tokenSymbol.value}`);
const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value));

const trimmedAddress = computed(() => address.value.trim());
const emptyAddress = computed(() => trimmedAddress.value.length === 0);
const validAddress = computed(() => !emptyAddress.value && api.validateAddress(trimmedAddress.value));
const emptyValue = computed(() => !Number(value.value));
const isInsufficientXorForFee = computed(() => xorBalance.value.sub(fpNetworkFee.value).isLtZero());
const disabled = computed(
  () => loading.value || isInsufficientXorForFee.value || emptyValue.value || !validAddress.value
);

/**
 * Clears the dialog inputs before focusing the token input field.
 */
const resetForm = () => {
  value.value = '';
  address.value = '';
};

/**
 * Mints additional supply for the owned asset and closes the dialog afterwards.
 */
const handleMint = async () => {
  if (disabled.value || !asset.value) return;

  try {
    await withNotifications(async () => {
      await api.assets.mint(asset.value, value.value, trimmedAddress.value);
    });
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
  address,
  disabled,
  validAddress,
  emptyValue,
  handleMint,
  resetForm,
});
</script>

<style lang="scss" scoped>
.dashboard-mint {
  @include full-width-button('action-button');

  &__address,
  &__button,
  &__text {
    margin-bottom: 16px;
  }
}
</style>
