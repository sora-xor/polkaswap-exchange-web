<template>
  <dialog-base v-model:visible="isVisible" :title="title" custom-class="dialog--confirm-burn">
    <token-input
      class="token-input"
      :max="max"
      :title="receivedPlaceholder"
      :is-fiat-editable="false"
      :token="receivedAsset"
      :model-value="value"
      @update:model-value="handleInputField"
    ></token-input>
    <info-line
      :label="toBeBurnedLabel"
      :key="toBeBurnedKey"
      :value="formattedWillBeBurned"
      :asset-symbol="burnedAsset.symbol"
      :fiat-value="formattedFiatWillBeBurned"
      is-formatted
    ></info-line>
    <info-line
      :label="yourBalanceLeftLabel"
      :key="yourBalanceLeftKey"
      :value="formattedTokensLeft"
      :asset-symbol="burnedAsset.symbol"
      :fiat-value="formattedFiatTokensLeft"
      is-formatted
      value-can-be-hidden
    ></info-line>
    <div v-if="requiresNexusRecipient" class="nexus-recipient">
      <p class="nexus-recipient__label p3">{{ t('burnPage.nexusRecipientLabel') }}</p>
      <s-input
        v-model="nexusRecipient"
        class="nexus-recipient__input"
        :placeholder="t('burnPage.nexusRecipientPlaceholder')"
        :maxlength="128"
        :disabled="loading"
      ></s-input>
      <p class="nexus-recipient__message p4" :class="{ 'nexus-recipient__message--error': isNexusRecipientInvalid }">
        {{ nexusRecipientMessage }}
      </p>
    </div>
    <info-line
      v-if="isLoggedIn"
      :label="t('networkFeeText')"
      :label-tooltip="t('networkFeeTooltipText')"
      :value="networkFeeFormatted"
      :asset-symbol="xor.symbol"
      :fiat-value="getFiatAmountByCodecString(networkFee)"
      is-formatted
    ></info-line>
    <div class="disclaimer s-flex">
      <p class="disclaimer__text p3">
        Disclaimer: Burning your {{ burnedAsset.symbol }} tokens is an irreversible action that permanently removes them
        from your wallet. Please proceed with caution and ensure you fully understand the implications of this
        transaction
      </p>
      <div class="disclaimer__badge s-flex">
        <s-icon class="disclaimer__icon" name="notifications-alert-triangle-24" size="24"></s-icon>
      </div>
    </div>
    <template #footer>
      <s-button type="primary" class="s-typography-button--large" :disabled="isBurnDisabled" @click="handleConfirmBurn">
        <template v-if="isZeroAmount">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else-if="isAmountLessThanMin">NEED TO RESERVE MORE THAN {{ min }}</template>
        <template v-else-if="isInsufficientBalance">
          {{ t('insufficientBalanceText', { tokenSymbol: burnedAsset.symbol }) }}
        </template>
        <template v-else-if="isNexusRecipientMissing">
          {{ t('burnPage.enterNexusRecipient') }}
        </template>
        <template v-else-if="isNexusRecipientInvalid">
          {{ t('burnPage.invalidNexusRecipient') }}
        </template>
        <template v-else>RESERVE</template>
      </s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts" setup>
import { Operation } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { api } from '@/lib/soraneo-wallet/src/api';
import { computed, getCurrentInstance, nextTick, ref, toRefs, watch } from 'vue';

import TokenInput from '@/components/shared/Input/TokenInput.vue';
import { ZeroStringValue } from '@/consts';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import { useAssetsStore } from '@/stores/assets';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';
import { asZeroValue } from '@/utils';
import { createSoraNexusXorBurnRemark, normalizeSoraNexusAccountId } from '@/utils/soraNexusAccount';

import type { CodecString, NetworkFeesObject } from '@sora-substrate/sdk';
import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';
import DialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';
import InfoLine from '@/lib/soraneo-wallet/src/components/InfoLine.vue';

defineOptions({
  name: 'BurnDialog',
});

const props = withDefaults(
  defineProps<{
    receivedAsset: Asset;
    burnedAsset: Asset;
    rate?: string;
    max?: number;
    min?: number;
    requiresNexusRecipient?: boolean;
  }>(),
  {
    rate: '0.01',
    max: 100_000_000,
    min: 1,
    requiresNexusRecipient: false,
  }
);

const emit = defineEmits<{
  (event: 'close'): void;
  (event: 'confirm', success?: boolean): void;
}>();

const isVisible = defineModel<boolean>('visible', { default: false });
const { t } = useTranslation();
const { loading, withNotifications } = useTransaction();
const {
  Zero,
  getFPNumber,
  getFPNumberFromCodec,
  formatCodecNumber,
  getFiatAmountByFPNumber,
  getFiatAmountByCodecString,
} = useFormattedAmount();

const { max, min, receivedAsset, burnedAsset, rate, requiresNexusRecipient } = toRefs(props);
const assetsStore = useAssetsStore();
const settingsStore = useSettingsStore();
const walletStore = useWalletStore();

const value = ref('');
const nexusRecipient = ref('');
const xor = XOR;

const networkFees = computed(() => settingsStore.networkFees as NetworkFeesObject | undefined);
const accountXor = computed(() => assetsStore.xor as Nullable<AccountAsset>);
const isLoggedIn = computed(() => walletStore.isLoggedIn);

const networkFeeOperation = computed(() => (requiresNexusRecipient.value ? Operation.BurnWithRemark : Operation.Burn));
const networkFee = computed<CodecString>(
  () => networkFees.value?.[networkFeeOperation.value] ?? networkFees.value?.[Operation.Burn] ?? ZeroStringValue
);
const fpNetworkFee = computed(() => getFPNumberFromCodec(networkFee.value, burnedAsset.value.decimals));
const xorBalance = computed(() =>
  getFPNumberFromCodec(accountXor.value?.balance?.transferable ?? ZeroStringValue, burnedAsset.value.decimals)
);

const willBeBurned = computed(() => getFPNumber(value.value || ZeroStringValue).mul(rate.value));
const tokensLeft = computed(() => {
  const diff = xorBalance.value.sub(willBeBurned.value);
  return diff.isLtZero() ? Zero : diff;
});

const title = computed(() => `Reserve ${receivedAsset.value.symbol} token`);
const receivedPlaceholder = computed(() => `HOW MUCH ${receivedAsset.value.symbol} DO YOU WANT?`);

const getKey = (key: string) => (isVisible.value ? `${key}-opened` : `${key}-closed`);

const toBeBurnedLabel = computed(() => `${burnedAsset.value.symbol} TO BE BURNED`);
const toBeBurnedKey = computed(() => getKey(`${burnedAsset.value.symbol}-burned`));
const yourBalanceLeftLabel = computed(() => `YOUR ${burnedAsset.value.symbol} BALANCE LEFT`);
const yourBalanceLeftKey = computed(() => getKey(`${burnedAsset.value.symbol}-left`));

const formattedWillBeBurned = computed(() => willBeBurned.value.toLocaleString());
const formattedFiatWillBeBurned = computed(() => getFiatAmountByFPNumber(willBeBurned.value, burnedAsset.value));

const formattedTokensLeft = computed(() => tokensLeft.value.toLocaleString());
const formattedFiatTokensLeft = computed(() => getFiatAmountByFPNumber(tokensLeft.value, burnedAsset.value));

const networkFeeFormatted = computed(() => formatCodecNumber(networkFee.value, burnedAsset.value.decimals));

const trimmedNexusRecipient = computed(() => nexusRecipient.value.trim());
const normalizedNexusRecipient = computed(() => normalizeSoraNexusAccountId(trimmedNexusRecipient.value));
const isNexusRecipientMissing = computed(() => requiresNexusRecipient.value && !trimmedNexusRecipient.value);
const isNexusRecipientInvalid = computed(
  () => requiresNexusRecipient.value && !!trimmedNexusRecipient.value && !normalizedNexusRecipient.value
);
const nexusRecipientMessage = computed(() =>
  isNexusRecipientInvalid.value ? t('burnPage.invalidNexusRecipient') : t('burnPage.nexusRecipientWarning')
);

const isZeroAmount = computed(() => asZeroValue(value.value));
const isAmountLessThanMin = computed(() => Number(value.value || ZeroStringValue) < min.value);
const isInsufficientBalance = computed(() =>
  xorBalance.value.sub(willBeBurned.value).sub(fpNetworkFee.value).isLtZero()
);
const isBurnDisabled = computed(
  () =>
    loading.value ||
    isZeroAmount.value ||
    isAmountLessThanMin.value ||
    isInsufficientBalance.value ||
    isNexusRecipientMissing.value ||
    isNexusRecipientInvalid.value
);

const instance = getCurrentInstance();

function handleInputField(newValue: string): void {
  if (value.value === newValue) return;
  value.value = newValue;
}

async function handleConfirmBurn(): Promise<void> {
  if (isInsufficientBalance.value) {
    instance?.proxy?.$alert?.(t('insufficientBalanceText', { tokenSymbol: burnedAsset.value.symbol }), {
      title: t('errorText'),
    });
    emit('confirm');
  } else if (isNexusRecipientMissing.value || isNexusRecipientInvalid.value) {
    instance?.proxy?.$alert?.(t('burnPage.invalidNexusRecipient'), {
      title: t('errorText'),
    });
    return;
  } else if (isBurnDisabled.value) {
    return;
  } else {
    try {
      await withNotifications(async () => {
        const remark = requiresNexusRecipient.value
          ? createSoraNexusXorBurnRemark(normalizedNexusRecipient.value ?? '')
          : '';

        if (remark) {
          await api.assets.burnWithRemark(burnedAsset.value, willBeBurned.value.toString(), remark);
        } else {
          await api.assets.burn(burnedAsset.value, willBeBurned.value.toString());
        }
      });
      emit('confirm', true);
    } catch (error) {
      console.error(error);
      emit('confirm');
    }
  }

  isVisible.value = false;
}

watch(isVisible, async (dialogVisible) => {
  await nextTick();
  if (dialogVisible) {
    value.value = '';
    nexusRecipient.value = '';
  }
});
</script>

<style lang="scss" scoped>
.token-input {
  margin-bottom: $basic-spacing;
}
.nexus-recipient {
  margin-bottom: $basic-spacing;

  &__label {
    color: var(--s-color-base-content-secondary);
    font-weight: 700;
    margin-bottom: $inner-spacing-tiny;
    text-transform: uppercase;
  }

  &__input {
    width: 100%;
  }

  &__message {
    color: var(--s-color-base-content-secondary);
    margin-top: $inner-spacing-tiny;

    &--error {
      color: var(--s-color-status-error);
    }
  }
}
.disclaimer {
  align-items: flex-start;
  margin-top: $basic-spacing;
  padding: $inner-spacing-medium;
  width: 100%;
  background-color: var(--s-color-base-background);
  border-radius: var(--s-border-radius-small);
  box-shadow: var(--s-shadow-dialog);
  &__text {
    flex: 1;
  }
  &__badge {
    border-radius: 50%;
    background-color: var(--s-color-status-error);
    box-shadow: var(--s-shadow-element-pressed);
    margin-left: $inner-spacing-mini;
    width: 42px;
    height: 42px;
    align-items: center;
    justify-content: center;
  }
  &__icon {
    color: white;
  }
}
</style>
