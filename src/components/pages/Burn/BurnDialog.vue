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
        <p
          class="nexus-recipient__message p4"
          :class="{ 'nexus-recipient__message--error': isNexusRecipientInvalid }"
        >
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
  --burn-surface: rgb(253, 247, 251);
  --burn-surface-raised: rgb(255, 251, 254);
  --burn-surface-recessed: rgb(246, 238, 244);
  --burn-content-primary: rgb(42, 23, 31);
  --burn-content-secondary: rgb(123, 111, 118);
  --burn-content-tertiary: rgb(169, 158, 165);
  --burn-hairline: rgba(42, 23, 31, 0.08);
  --burn-shadow-ambient: rgba(42, 23, 31, 0.16);
  --burn-shadow-contact: rgba(42, 23, 31, 0.1);
  --burn-shadow-inset: rgba(42, 23, 31, 0.11);
  --burn-highlight: rgba(255, 255, 255, 0.88);
  --burn-highlight-soft: rgba(255, 255, 255, 0.54);
  --burn-accent: var(--s-color-theme-accent, rgb(246, 35, 137));
  --burn-accent-soft: rgba(246, 35, 137, 0.22);

  position: relative;
  max-width: min(560px, calc(100vw - (#{$basic-spacing-big} * 2)));
  border: 1px solid var(--burn-highlight-soft);
  border-radius: 32px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0) 38%),
    linear-gradient(160deg, var(--burn-surface-raised), var(--burn-surface));
  box-shadow:
    -18px -18px 42px var(--burn-highlight),
    22px 28px 64px var(--burn-shadow-ambient),
    0 18px 36px rgba(42, 23, 31, 0.08),
    inset 1px 1px 0 var(--burn-highlight),
    inset -1px -1px 2px rgba(42, 23, 31, 0.05);
  color: var(--burn-content-primary);
  overflow: hidden;
}

:root[data-theme='dark'] .dialog-card.dialog--confirm-burn,
:root[design-system-theme='dark'] .dialog-card.dialog--confirm-burn,
.sora-theme-provider[data-theme='dark'] .dialog-card.dialog--confirm-burn,
.sora-theme-provider[design-system-theme='dark'] .dialog-card.dialog--confirm-burn {
  --burn-surface: rgb(88, 45, 112);
  --burn-surface-raised: rgb(100, 52, 127);
  --burn-surface-recessed: rgb(76, 35, 101);
  --burn-content-primary: rgb(249, 235, 242);
  --burn-content-secondary: rgb(219, 191, 211);
  --burn-content-tertiary: rgb(178, 140, 174);
  --burn-hairline: rgba(249, 235, 242, 0.11);
  --burn-shadow-ambient: rgba(20, 6, 38, 0.5);
  --burn-shadow-contact: rgba(20, 6, 38, 0.34);
  --burn-shadow-inset: rgba(20, 6, 38, 0.42);
  --burn-highlight: rgba(155, 111, 165, 0.28);
  --burn-highlight-soft: rgba(255, 255, 255, 0.08);
  --burn-accent-soft: rgba(246, 35, 137, 0.3);
}

.dialog--confirm-burn .dialog-card__header {
  padding: 36px 40px 20px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0));
  box-shadow: inset 0 -1px 0 var(--burn-hairline);
}

.dialog--confirm-burn .dialog-card__title-text {
  color: var(--burn-content-primary);
  font-size: 38px;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.08;
}

.dialog--confirm-burn .dialog-card__content {
  padding: 24px 40px 22px;
  max-height: min(76vh, 840px);
}

.dialog--confirm-burn .dialog-card__footer {
  display: block;
  padding: 18px 40px 40px;
}

.dialog--confirm-burn .dialog-card__close.el-button {
  width: 52px;
  min-width: 52px;
  height: 52px;
  padding: 0;
  border-radius: 50% !important;
  background: linear-gradient(145deg, var(--burn-surface-raised), var(--burn-surface-recessed));
  color: var(--burn-content-tertiary);
  box-shadow:
    -8px -8px 18px var(--burn-highlight),
    9px 11px 22px var(--burn-shadow-contact),
    inset 1px 1px 0 var(--burn-highlight-soft);
  transition:
    box-shadow 180ms ease,
    color 180ms ease,
    transform 180ms ease;
}

.dialog--confirm-burn .dialog-card__close.el-button:hover,
.dialog--confirm-burn .dialog-card__close.el-button:focus {
  color: var(--burn-content-secondary);
  transform: translateY(-1px);
  box-shadow:
    -10px -10px 22px var(--burn-highlight),
    12px 14px 26px var(--burn-shadow-contact),
    inset 1px 1px 0 var(--burn-highlight-soft);
}

.dialog--confirm-burn .dialog-card__close.el-button:active {
  transform: translateY(1px);
  box-shadow:
    inset 7px 7px 16px var(--burn-shadow-inset),
    inset -7px -7px 16px var(--burn-highlight);
}

.dialog--confirm-burn .dialog-card__close i {
  font-size: 28px;
  line-height: 28px;
}

.dialog--confirm-burn .burn-dialog__amount-fields {
  display: grid;
  gap: 14px;
  margin-bottom: 22px;
}

.dialog--confirm-burn .token-input.s-input {
  min-height: 112px;
  margin-bottom: 0;
  padding: 20px 24px 18px;
  border: 1px solid rgba(255, 255, 255, 0.32);
  border-radius: 30px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0) 44%),
    linear-gradient(145deg, var(--burn-surface-recessed), var(--burn-surface-raised));
  box-shadow:
    inset 9px 9px 22px var(--burn-shadow-inset),
    inset -10px -10px 24px var(--burn-highlight),
    0 14px 34px rgba(42, 23, 31, 0.06);
  transition:
    box-shadow 180ms ease,
    transform 180ms ease;
}

.dialog--confirm-burn .token-input.s-input.s-focused {
  box-shadow:
    inset 7px 7px 18px var(--burn-shadow-inset),
    inset -10px -10px 24px var(--burn-highlight),
    0 0 0 1px var(--burn-accent-soft),
    0 16px 34px rgba(246, 35, 137, 0.1);
}

.dialog--confirm-burn .token-input.s-input > .s-input__content .el-input__inner {
  color: var(--burn-content-primary);
  font-size: 30px;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.1;
}

.dialog--confirm-burn .token-input .input-title {
  color: var(--burn-content-secondary);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
}

.dialog--confirm-burn .token-input .input-title--primary {
  color: inherit;
}

.dialog--confirm-burn .token-input .el-buttons {
  padding: 4px 8px 4px 4px;
  border-radius: 999px;
  background: linear-gradient(145deg, var(--burn-surface-raised), var(--burn-surface-recessed));
  box-shadow:
    -5px -5px 12px var(--burn-highlight),
    6px 7px 16px var(--burn-shadow-contact),
    inset 1px 1px 0 var(--burn-highlight-soft);
}

.dialog--confirm-burn .token-input .token-select-button.el-button {
  height: 40px;
  border-radius: 999px;
  background: transparent;
  box-shadow: none;
}

.dialog--confirm-burn .token-input .token-select-button__text {
  color: var(--burn-content-primary);
  font-size: 20px;
  letter-spacing: 0;
}

.dialog--confirm-burn .burn-dialog__metrics {
  display: grid;
  gap: 8px;
  margin-bottom: 22px;
}

.dialog--confirm-burn .burn-dialog__info-line.info-line {
  min-height: 44px;
  padding: 8px 10px;
  border-bottom: 0;
  border-radius: 16px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0));
  box-shadow: inset 0 -1px 0 var(--burn-hairline);
  color: var(--burn-content-primary);
}

.dialog--confirm-burn .burn-dialog__info-line.info-line + .burn-dialog__info-line.info-line {
  margin-top: 0;
}

.dialog--confirm-burn .burn-dialog__info-line .info-line-label {
  color: var(--burn-content-primary);
  font-weight: 600;
  letter-spacing: 0;
}

.dialog--confirm-burn .burn-dialog__info-line .info-line-content {
  color: var(--burn-content-primary);
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
  margin: 4px 0 10px;
  padding: 0 10px;
}

.dialog--confirm-burn .nexus-recipient__label {
  color: var(--burn-content-secondary);
  font-weight: 800;
  letter-spacing: 0;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.dialog--confirm-burn .nexus-recipient__input.s-input {
  width: 100%;
  border-radius: 999px;
  background: var(--burn-surface-recessed);
  box-shadow:
    inset 5px 5px 12px var(--burn-shadow-inset),
    inset -6px -6px 14px var(--burn-highlight);
}

.dialog--confirm-burn .nexus-recipient__input .s-input__content {
  min-height: 44px;
  padding: 0 18px;
}

.dialog--confirm-burn .nexus-recipient__input .el-input__inner {
  color: var(--burn-content-primary);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0;
}

.dialog--confirm-burn .nexus-recipient__input .el-input__inner::placeholder {
  color: var(--burn-content-tertiary);
}

.dialog--confirm-burn .nexus-recipient__message {
  color: var(--burn-content-secondary);
  margin-top: 10px;
}

.dialog--confirm-burn .nexus-recipient__message--error {
  color: var(--s-color-status-error);
}

.dialog--confirm-burn .disclaimer {
  align-items: center;
  width: 100%;
  margin-top: 4px;
  padding: 24px 26px;
  border: 1px solid var(--burn-highlight-soft);
  border-radius: 28px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0) 42%),
    var(--burn-surface-raised);
  box-shadow:
    -9px -9px 22px var(--burn-highlight),
    12px 16px 32px rgba(42, 23, 31, 0.1),
    inset 1px 1px 0 var(--burn-highlight-soft);
}

.dialog--confirm-burn .disclaimer__text {
  flex: 1;
  color: var(--burn-content-primary);
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0;
  line-height: 1.35;
}

.dialog--confirm-burn .disclaimer__badge {
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-left: 20px;
  border-radius: 50%;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.36), rgba(255, 255, 255, 0) 42%),
    var(--burn-accent);
  box-shadow:
    -6px -6px 14px var(--burn-highlight),
    8px 10px 20px rgba(246, 35, 137, 0.3),
    inset 1px 1px 0 rgba(255, 255, 255, 0.38);
}

.dialog--confirm-burn .disclaimer__icon {
  color: white;
}

.dialog--confirm-burn .burn-dialog__submit.el-button {
  width: 100%;
  min-height: 58px;
  border-radius: 999px !important;
  font-size: 26px !important;
  font-weight: 800;
  letter-spacing: 0;
  box-shadow:
    -7px -7px 18px var(--burn-highlight),
    12px 16px 28px rgba(246, 35, 137, 0.28),
    inset 1px 1px 0 rgba(255, 255, 255, 0.38);
  transition:
    box-shadow 180ms ease,
    filter 180ms ease,
    transform 180ms ease;
}

.dialog--confirm-burn .burn-dialog__submit.el-button:not(:disabled):not(.is-disabled):hover,
.dialog--confirm-burn .burn-dialog__submit.el-button:not(:disabled):not(.is-disabled):focus {
  filter: saturate(1.06) brightness(1.02);
  transform: translateY(-1px);
  box-shadow:
    -9px -9px 22px var(--burn-highlight),
    15px 19px 34px rgba(246, 35, 137, 0.32),
    inset 1px 1px 0 rgba(255, 255, 255, 0.42);
}

.dialog--confirm-burn .burn-dialog__submit.el-button:not(:disabled):not(.is-disabled):active {
  transform: translateY(1px);
  box-shadow:
    inset 7px 7px 14px rgba(128, 8, 74, 0.24),
    inset -6px -6px 14px rgba(255, 255, 255, 0.22);
}

.dialog--confirm-burn .burn-dialog__submit.el-button:disabled,
.dialog--confirm-burn .burn-dialog__submit.el-button.is-disabled {
  opacity: 0.82;
  filter: saturate(0.82);
}

@media (max-width: 560px) {
  .dialog-card.dialog--confirm-burn {
    max-width: calc(100vw - (#{$basic-spacing} * 2));
    border-radius: 26px;
  }

  .dialog--confirm-burn .dialog-card__header {
    padding: 28px 24px 16px;
  }

  .dialog--confirm-burn .dialog-card__title-text {
    font-size: 30px;
  }

  .dialog--confirm-burn .dialog-card__content {
    padding: 20px 24px 18px;
  }

  .dialog--confirm-burn .dialog-card__footer {
    padding: 14px 24px 30px;
  }

  .dialog--confirm-burn .token-input.s-input {
    min-height: 96px;
    padding: 18px 20px;
  }

  .dialog--confirm-burn .burn-dialog__submit.el-button {
    min-height: 54px;
    font-size: 22px !important;
  }

  .dialog--confirm-burn .disclaimer {
    align-items: flex-start;
    padding: 20px;
  }

  .dialog--confirm-burn .disclaimer__badge {
    width: 48px;
    height: 48px;
    margin-left: 14px;
  }
}
</style>
