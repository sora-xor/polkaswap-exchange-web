<template>
  <dialog-base v-model:visible="isVisible" :title="title" custom-class="dialog--confirm-burn">
    <div class="burn-dialog__amount-fields">
      <token-input
        class="token-input burn-dialog__amount-input burn-dialog__amount-input--burned"
        :max="maxBurned"
        :title="burnedPlaceholder"
        :is-fiat-editable="false"
        :token="burnedAsset"
        :model-value="burnedValue"
        @update:model-value="handleBurnedInputField"
      ></token-input>
      <token-input
        class="token-input burn-dialog__amount-input burn-dialog__amount-input--received"
        :max="max"
        :title="receivedPlaceholder"
        :is-fiat-editable="false"
        :token="receivedAsset"
        :model-value="value"
        @update:model-value="handleInputField"
      ></token-input>
    </div>
    <div class="burn-dialog__metrics">
      <info-line
        class="burn-dialog__info-line"
        :label="toBeBurnedLabel"
        :key="toBeBurnedKey"
        :value="formattedWillBeBurned"
        :asset-symbol="burnedAsset.symbol"
        :fiat-value="formattedFiatWillBeBurned"
        is-formatted
      ></info-line>
      <info-line
        class="burn-dialog__info-line"
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
        class="burn-dialog__info-line"
        :label="t('networkFeeText')"
        :label-tooltip="t('networkFeeTooltipText')"
        :value="networkFeeFormatted"
        :asset-symbol="xor.symbol"
        :fiat-value="getFiatAmountByCodecString(networkFee)"
        is-formatted
      ></info-line>
    </div>
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
      <s-button
        type="primary"
        class="burn-dialog__submit s-typography-button--large"
        :disabled="isBurnDisabled"
        @click="handleConfirmBurn"
      >
        <template v-if="isZeroAmount">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else-if="isAmountLessThanMin">NEED TO RESERVE MORE THAN {{ min }}</template>
        <template v-else-if="isNexusRecipientMissing">
          {{ t('burnPage.enterNexusRecipient') }}
        </template>
        <template v-else-if="isNexusRecipientInvalid">
          {{ t('burnPage.invalidNexusRecipient') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('insufficientBalanceText', { tokenSymbol: burnedAsset.symbol }) }}
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
const fpRate = computed(() => getFPNumber(rate.value || ZeroStringValue));

const willBeBurned = computed(() => getFPNumber(value.value || ZeroStringValue).mul(fpRate.value));
const tokensLeft = computed(() => {
  const diff = xorBalance.value.sub(willBeBurned.value);
  return diff.isLtZero() ? Zero : diff;
});
const burnedValue = computed(() => (value.value ? willBeBurned.value.toString() : ''));
const maxBurned = computed(() => getFPNumber(max.value).mul(fpRate.value).toString());

const title = computed(() => `Reserve ${receivedAsset.value.symbol} token`);
const burnedPlaceholder = computed(() => t('burnPage.soraV3XorAmountTitle', { tokenSymbol: 'SORA v3 XOR' }));
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
const isAmountLessThanMin = computed(() => getFPNumber(value.value || ZeroStringValue).lt(getFPNumber(min.value)));
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

/**
 * Converts a typed SORA v3 XOR amount into the SS reservation amount at the fixed campaign rate.
 */
function getReceivedValueFromBurnedValue(newValue: string): string {
  if (!newValue) return '';
  if (fpRate.value.isZero()) return ZeroStringValue;

  return getFPNumber(newValue).div(fpRate.value).toString();
}

function handleBurnedInputField(newValue: string): void {
  const receivedValue = getReceivedValueFromBurnedValue(newValue);
  if (value.value === receivedValue) return;
  value.value = receivedValue;
}

async function handleConfirmBurn(): Promise<void> {
  if (loading.value || isZeroAmount.value || isAmountLessThanMin.value) return;

  if (isNexusRecipientMissing.value) {
    instance?.proxy?.$alert?.(t('burnPage.enterNexusRecipient'), {
      title: t('errorText'),
    });
    return;
  } else if (isNexusRecipientInvalid.value) {
    instance?.proxy?.$alert?.(t('burnPage.invalidNexusRecipient'), {
      title: t('errorText'),
    });
    return;
  } else if (isInsufficientBalance.value) {
    instance?.proxy?.$alert?.(t('insufficientBalanceText', { tokenSymbol: burnedAsset.value.symbol }), {
      title: t('errorText'),
    });
    emit('confirm');
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

<style lang="scss">
.dialog-card.dialog--confirm-burn {
  --burn-warning-background: rgba(247, 84, 163, 0.12);
  --burn-warning-border: rgba(247, 84, 163, 0.32);

  position: relative;
  max-width: min(520px, calc(100vw - (#{$basic-spacing-big} * 2)));
  border-radius: 24px;
  background: var(--s-color-utility-surface);
  box-shadow: var(--s-shadow-dialog);
  color: var(--s-color-base-content-primary);
  overflow: hidden;
}

:root[data-theme='dark'] .dialog-card.dialog--confirm-burn,
:root[design-system-theme='dark'] .dialog-card.dialog--confirm-burn,
.sora-theme-provider[data-theme='dark'] .dialog-card.dialog--confirm-burn,
.sora-theme-provider[design-system-theme='dark'] .dialog-card.dialog--confirm-burn {
  --burn-warning-background: rgba(247, 84, 163, 0.16);
  --burn-warning-border: rgba(247, 84, 163, 0.42);
}

.dialog--confirm-burn .dialog-card__header {
  padding: 24px 24px 8px;
  border-bottom: 0;
  box-shadow: none;
}

.dialog--confirm-burn .dialog-card__title-text {
  color: var(--s-color-base-content-primary);
  font-size: 24px;
  font-weight: 300;
  letter-spacing: normal;
  line-height: 31.2px;
}

.dialog--confirm-burn .dialog-card__content {
  padding: 8px 24px 16px;
  max-height: min(76vh, 760px);
}

.dialog--confirm-burn .dialog-card__footer {
  display: block;
  padding: 8px 24px 24px;
}

.dialog--confirm-burn .dialog-card__close.el-button {
  width: 42px;
  min-width: 42px;
  height: 42px;
  padding: 0;
  border-radius: 24px !important;
}

.dialog--confirm-burn .dialog-card__close i {
  font-size: 24px;
  line-height: 24px;
}

.dialog--confirm-burn .burn-dialog__amount-fields {
  display: grid;
  gap: $basic-spacing;
  margin-bottom: $basic-spacing-medium;
}

.dialog--confirm-burn .token-input.s-input {
  min-height: 100px;
  margin-bottom: 0;
  padding: $basic-spacing-medium;
  border: 1px solid var(--s-color-base-border-secondary);
  border-radius: 24px;
  background: var(--s-color-base-background);
  box-shadow: var(--s-shadow-element);
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.dialog--confirm-burn .token-input.s-input.s-focused {
  border-color: var(--s-color-theme-accent);
  box-shadow:
    0 0 0 1px var(--s-color-theme-accent-focused),
    var(--s-shadow-element);
}

.dialog--confirm-burn .token-input.s-input > .s-input__content .el-input__inner {
  color: var(--s-color-base-content-primary);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0;
  line-height: var(--s-line-height-medium);
}

.dialog--confirm-burn .token-input .input-title {
  color: var(--s-color-base-content-secondary);
  font-size: var(--s-font-size-extra-small);
  font-weight: 600;
  letter-spacing: 0;
}

.dialog--confirm-burn .token-input .el-buttons {
  padding: 0;
  border-radius: var(--s-border-radius-small);
  background: transparent;
  box-shadow: none;
}

.dialog--confirm-burn .token-input .token-select-button.el-button {
  height: 36px;
  border-radius: var(--s-border-radius-small);
}

.dialog--confirm-burn .token-input .token-select-button__text {
  color: var(--s-color-base-content-primary);
  font-size: var(--s-font-size-medium);
  letter-spacing: 0;
}

.dialog--confirm-burn .burn-dialog__metrics {
  display: grid;
  gap: $basic-spacing-tiny;
  margin-bottom: $basic-spacing-medium;
}

.dialog--confirm-burn .burn-dialog__info-line.info-line {
  min-height: 38px;
  padding: $basic-spacing-small 0;
  border-bottom: 1px solid var(--s-color-base-border-secondary);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  color: var(--s-color-base-content-primary);
}

.dialog--confirm-burn .burn-dialog__info-line.info-line + .burn-dialog__info-line.info-line {
  margin-top: 0;
}

.dialog--confirm-burn .burn-dialog__info-line .info-line-label {
  color: var(--s-color-base-content-secondary);
  font-weight: 600;
  letter-spacing: 0;
}

.dialog--confirm-burn .burn-dialog__info-line .info-line-content {
  color: var(--s-color-base-content-primary);
  gap: 6px;
  word-break: normal;
}

.dialog--confirm-burn .burn-dialog__info-line .info-line-value {
  font-weight: 700;
}

.dialog--confirm-burn .burn-dialog__info-line .formatted-amount--fiat-value {
  color: var(--s-color-fiat-value);
  font-weight: 500;
}

.dialog--confirm-burn .nexus-recipient {
  margin: $basic-spacing-small 0;
  padding: 0;
}

.dialog--confirm-burn .nexus-recipient__label {
  color: var(--s-color-base-content-secondary);
  font-weight: 600;
  letter-spacing: 0;
  margin-bottom: $basic-spacing-small;
  text-transform: uppercase;
}

.dialog--confirm-burn .nexus-recipient__input.s-input {
  width: 100%;
  min-height: 42px;
  border: 1px solid var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-small);
  background: var(--s-color-base-background);
  box-shadow: var(--s-shadow-element);
}

.dialog--confirm-burn .nexus-recipient__input .s-input__content {
  min-height: 40px;
  padding: 0 $basic-spacing-medium;
}

.dialog--confirm-burn .nexus-recipient__input .el-input__inner {
  color: var(--s-color-base-content-primary);
  font-size: 15px;
  font-weight: 400;
  letter-spacing: 0;
}

.dialog--confirm-burn .nexus-recipient__input .el-input__inner::placeholder {
  color: var(--s-color-base-content-tertiary);
}

.dialog--confirm-burn .nexus-recipient__message {
  color: var(--s-color-base-content-secondary);
  margin-top: $basic-spacing-small;
}

.dialog--confirm-burn .nexus-recipient__message--error {
  color: var(--s-color-status-error);
}

.dialog--confirm-burn .disclaimer {
  align-items: center;
  width: 100%;
  margin-top: $basic-spacing;
  padding: $basic-spacing-medium;
  border: 1px solid var(--burn-warning-border);
  border-radius: var(--s-border-radius-small);
  background: var(--burn-warning-background);
  box-shadow: none;
}

.dialog--confirm-burn .disclaimer__text {
  flex: 1;
  color: var(--s-color-base-content-primary);
  font-size: var(--s-font-size-small);
  font-weight: 400;
  letter-spacing: 0;
  line-height: var(--s-line-height-medium);
}

.dialog--confirm-burn .disclaimer__badge {
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-left: $basic-spacing-medium;
  border-radius: 50%;
  background: var(--s-color-status-error);
  box-shadow: none;
  flex-shrink: 0;
}

.dialog--confirm-burn .disclaimer__icon {
  color: white;
}

.dialog--confirm-burn .burn-dialog__submit.el-button {
  width: 100%;
  min-height: 56px !important;
  height: auto !important;
  border-radius: var(--s-border-radius-small) !important;
  font-size: 18px !important;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 24px;
  text-align: center;
  white-space: normal !important;
  overflow-wrap: anywhere;
  box-shadow: var(--s-shadow-element);
  transition:
    box-shadow 180ms ease,
    filter 180ms ease,
    transform 180ms ease;
}

.dialog--confirm-burn .burn-dialog__submit.el-button .s-button__text {
  display: block !important;
  font-size: inherit !important;
  justify-content: center;
  letter-spacing: 0 !important;
  line-height: inherit !important;
  max-width: 100%;
  overflow: visible !important;
  overflow-wrap: anywhere !important;
  text-align: center;
  text-overflow: clip !important;
  white-space: normal !important;
}

.dialog--confirm-burn .burn-dialog__submit.el-button:not(:disabled):not(.is-disabled):hover,
.dialog--confirm-burn .burn-dialog__submit.el-button:not(:disabled):not(.is-disabled):focus {
  filter: saturate(1.06) brightness(1.02);
  transform: translateY(-1px);
  box-shadow: var(--s-shadow-element);
}

.dialog--confirm-burn .burn-dialog__submit.el-button:not(:disabled):not(.is-disabled):active {
  transform: translateY(1px);
  box-shadow: var(--s-shadow-element-pressed);
}

.dialog--confirm-burn .burn-dialog__submit.el-button:disabled,
.dialog--confirm-burn .burn-dialog__submit.el-button.is-disabled {
  opacity: 0.82;
  filter: saturate(0.82);
}

@media (max-width: 560px) {
  .dialog-card.dialog--confirm-burn {
    max-width: calc(100vw - (#{$basic-spacing} * 2));
    border-radius: 24px;
  }

  .dialog--confirm-burn .dialog-card__header {
    padding: 20px 20px 8px;
  }

  .dialog--confirm-burn .dialog-card__title-text {
    font-size: 22px;
    line-height: 28px;
  }

  .dialog--confirm-burn .dialog-card__content {
    padding: 8px 20px 14px;
  }

  .dialog--confirm-burn .dialog-card__footer {
    padding: 8px 20px 20px;
  }

  .dialog--confirm-burn .token-input.s-input {
    min-height: 92px;
    padding: $basic-spacing;
  }

  .dialog--confirm-burn .token-input.s-input > .s-input__content .el-input__inner {
    font-size: 22px;
  }

  .dialog--confirm-burn .burn-dialog__submit.el-button {
    min-height: 52px !important;
    font-size: 16px !important;
  }

  .dialog--confirm-burn .disclaimer {
    align-items: flex-start;
    padding: $basic-spacing;
  }

  .dialog--confirm-burn .disclaimer__badge {
    width: 36px;
    height: 36px;
    margin-left: $basic-spacing;
  }
}
</style>
