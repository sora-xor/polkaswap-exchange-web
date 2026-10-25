<template>
  <dialog-base
    v-model:visible="visible"
    :title="t('swap.confirmSwap')"
    :append-to-body="appendToBody"
    :modal-append-to-body="appendToBody"
    custom-class="dialog--confirm-swap"
    :show-close-button="!submitting"
    :close-on-esc="!submitting"
    :close-on-click-modal="!submitting"
  >
    <div class="tokens">
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedFromValue }}</span>
        <div v-if="tokenFrom" class="token">
          <token-logo class="token-logo" :token="tokenFrom"></token-logo>
          {{ tokenFrom.symbol }}
        </div>
      </div>
      <s-icon class="icon-divider" name="arrows-arrow-bottom-24"></s-icon>
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedToValue }}</span>
        <div v-if="tokenTo" class="token">
          <token-logo class="token-logo" :token="tokenTo"></token-logo>
          {{ tokenTo.symbol }}
        </div>
      </div>
    </div>
    <p
      class="transaction-message"
      :class="{ 'transaction-message--min-received': !isExchangeB }"
      v-html="swapMessageHtml"
    ></p>
    <s-divider></s-divider>
    <swap-transaction-details :review="review" full expanded></swap-transaction-details>
    <template #footer>
      <div v-if="statusMessage" class="swap-review-status" role="status" aria-live="polite">
        <p>{{ statusMessage }}</p>
        <s-button v-if="!readiness.ready && readiness.retryable" size="small" @click="emit('retry')">{{
          t('ux.swap.retryQuote')
        }}</s-button>
        <s-button
          v-if="!readiness.ready && readiness.reason === 'reviewChanged'"
          size="small"
          @click="emit('refresh')"
          >{{ t('ux.swap.reviewLatest') }}</s-button
        >
        <s-button v-if="canFundFee" size="small" @click="emit('fund-fee')">{{ t('ux.swap.receiveXor') }}</s-button>
      </div>
      <account-confirmation-option with-hint class="confirmation-option"></account-confirmation-option>
      <s-button
        type="primary"
        class="s-typography-button--large"
        :disabled="!readiness.ready || submitting"
        :loading="submitting"
        @click="handleConfirm"
      >
        {{ t('confirmText') }}
      </s-button>
    </template>
  </dialog-base>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTranslation } from '@/composables/useTranslation';
import type { SwapReadiness } from '../services/readiness';
import type { SwapReview } from '../types/review';
import { createAsyncComponent } from '@/shared/ui/async';
import { sanitizeHtml } from '@/utils/sanitize';

import type { CodecString } from '@sora-substrate/sdk';
import WalletComponentDialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';
import WalletComponentTokenLogo from '@/lib/soraneo-wallet/src/components/TokenLogo.vue';
import WalletComponentAccountConfirmationOption from '@/lib/soraneo-wallet/src/components/Account/Settings/ConfirmationOption.vue';

const SwapTransactionDetails = createAsyncComponent(() => import('./TransactionDetails.vue'));
const DialogBase = WalletComponentDialogBase;
const TokenLogo = WalletComponentTokenLogo;
const AccountConfirmationOption = WalletComponentAccountConfirmationOption;

defineOptions({
  name: 'SwapConfirm',
});

const props = withDefaults(
  defineProps<{
    review?: SwapReview | null;
    readiness?: SwapReadiness;
    submitting?: boolean;
    statusMessage?: string;
    canFundFee?: boolean;
    appendToBody?: boolean;
  }>(),
  {
    review: null,
    readiness: () => ({ ready: false, reason: 'checking', retryable: false }),
    submitting: false,
    statusMessage: '',
    canFundFee: false,
    appendToBody: false,
  }
);

const emit = defineEmits<{
  (event: 'confirm' | 'retry' | 'refresh' | 'fund-fee'): void;
}>();

const { t } = useTranslation();
const { formatStringValue, formatCodecNumber } = useFormattedAmount();
const tokenFrom = computed(() => props.review?.tokenFrom);
const tokenTo = computed(() => props.review?.tokenTo);
const fromValue = computed(() => props.review?.fromValue || '');
const toValue = computed(() => props.review?.toValue || '');

const visible = defineModel<boolean>('visible', { required: true });

const appendToBody = computed(() => props.appendToBody);
const isExchangeB = computed(() => props.review?.isExchangeB || false);
const minMaxReceived = computed(() => (props.review?.minMaxReceived || '0') as CodecString);

const decimalsFrom = computed(() => tokenFrom.value?.decimals);
const decimalsTo = computed(() => tokenTo.value?.decimals);

const formattedFromValue = computed(() => formatStringValue(fromValue.value, decimalsFrom.value));
const formattedToValue = computed(() => formatStringValue(toValue.value, decimalsTo.value));
const formattedMinMaxReceived = computed(() =>
  formatCodecNumber(minMaxReceived.value, (isExchangeB.value ? decimalsFrom.value : decimalsTo.value) ?? undefined)
);

const swapMessageHtml = computed(() => {
  const translation = t(`swap.swap${isExchangeB.value ? 'Input' : 'Output'}Message`, {
    transactionValue: `<span class='transaction-number'>${formattedMinMaxReceived.value}</span>`,
  });

  return sanitizeHtml(translation, {
    allowedTags: ['span', 'strong', 'em', 'p', 'br'],
    allowedAttributes: {
      span: ['class'],
    },
  });
});

const handleConfirm = () => {
  if (!props.readiness.ready || props.submitting) return;
  emit('confirm');
};
</script>

<style lang="scss">
.dialog--confirm-swap {
  .transaction-number {
    color: var(--s-color-base-content-primary);
    font-weight: 600;
    word-break: break-all;
  }
}

.dialog-card.dialog--confirm-swap {
  max-width: min(496px, calc(100vw - (#{$basic-spacing-big} * 2)));
  border-radius: 24px;
}

.dialog--confirm-swap .dialog-card__header {
  padding: 24px 24px 8px;
  box-shadow: none;
}

.dialog--confirm-swap .dialog-card__title-text {
  font-size: 24px;
  font-weight: 300;
  line-height: 31.2px;
  letter-spacing: normal;
}

.dialog--confirm-swap .dialog-card__content {
  padding: 8px 24px 24px;
}

.dialog--confirm-swap .dialog-card__footer {
  padding: 8px 24px 24px;
  display: block;
}

.dialog--confirm-swap .dialog-card__close.el-button {
  width: 42px;
  min-width: 42px;
  height: 42px;
  padding: 0;
  border-radius: 24px;
}

.dialog--confirm-swap .dialog-card__close i {
  font-size: 24px;
  line-height: 24px;
}

:root[data-theme='light'] .dialog-card.dialog--confirm-swap,
:root[design-system-theme='light'] .dialog-card.dialog--confirm-swap,
.sora-theme-provider[data-theme='light'] .dialog-card.dialog--confirm-swap,
.sora-theme-provider[design-system-theme='light'] .dialog-card.dialog--confirm-swap {
  background-color: rgb(253, 247, 251);
  box-shadow:
    rgb(255, 255, 255) -5px -5px 10px 0px,
    rgba(0, 0, 0, 0.1) 1px 1px 10px 0px,
    rgba(255, 255, 255, 0.8) 1px 1px 2px 0px inset;
}

:root[data-theme='light'] .dialog--confirm-swap .dialog-card__title-text,
:root[design-system-theme='light'] .dialog--confirm-swap .dialog-card__title-text,
.sora-theme-provider[data-theme='light'] .dialog--confirm-swap .dialog-card__title-text,
.sora-theme-provider[design-system-theme='light'] .dialog--confirm-swap .dialog-card__title-text {
  color: rgb(42, 23, 31);
}

:root[data-theme='light'] .dialog--confirm-swap .dialog-card__close.el-button,
:root[design-system-theme='light'] .dialog--confirm-swap .dialog-card__close.el-button,
.sora-theme-provider[data-theme='light'] .dialog--confirm-swap .dialog-card__close.el-button,
.sora-theme-provider[design-system-theme='light'] .dialog--confirm-swap .dialog-card__close.el-button {
  background-color: rgb(247, 243, 244);
  color: var(--s-color-base-content-secondary);
  box-shadow:
    rgb(255, 255, 255) -5px -5px 10px 0px,
    rgba(0, 0, 0, 0.1) 1px 1px 10px 0px,
    rgba(255, 255, 255, 0.8) 1px 1px 2px 0px inset;
}

:root[data-theme='dark'] .dialog-card.dialog--confirm-swap,
:root[design-system-theme='dark'] .dialog-card.dialog--confirm-swap,
.sora-theme-provider[data-theme='dark'] .dialog-card.dialog--confirm-swap,
.sora-theme-provider[design-system-theme='dark'] .dialog-card.dialog--confirm-swap {
  background-color: rgb(89, 45, 113);
  box-shadow:
    rgba(155, 111, 165, 0.25) -5px -5px 10px 0px,
    rgb(73, 32, 103) 2px 2px 15px 0px,
    rgba(155, 111, 165, 0.25) 1px 1px 2px 0px inset;
}

:root[data-theme='dark'] .dialog--confirm-swap .dialog-card__title-text,
:root[design-system-theme='dark'] .dialog--confirm-swap .dialog-card__title-text,
.sora-theme-provider[data-theme='dark'] .dialog--confirm-swap .dialog-card__title-text,
.sora-theme-provider[design-system-theme='dark'] .dialog--confirm-swap .dialog-card__title-text {
  color: rgb(240, 215, 220);
}

:root[data-theme='dark'] .dialog--confirm-swap .dialog-card__close.el-button,
:root[design-system-theme='dark'] .dialog--confirm-swap .dialog-card__close.el-button,
.sora-theme-provider[data-theme='dark'] .dialog--confirm-swap .dialog-card__close.el-button,
.sora-theme-provider[design-system-theme='dark'] .dialog--confirm-swap .dialog-card__close.el-button {
  background-color: rgb(93, 47, 115);
  color: var(--s-color-base-content-secondary);
  box-shadow:
    rgba(155, 111, 165, 0.25) -5px -5px 10px 0px,
    rgb(73, 32, 103) 2px 2px 15px 0px,
    rgba(155, 111, 165, 0.25) 1px 1px 2px 0px inset;
}
</style>

<style lang="scss" scoped>
.tokens {
  display: flex;
  flex-direction: column;
  font-size: var(--s-heading2-font-size);
  line-height: var(--s-line-height-small);
  &-info-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 800;
  }
}
.token {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  white-space: nowrap;
  &-value {
    margin-right: $inner-spacing-medium;
  }
  &-logo {
    display: block;
    margin-right: $inner-spacing-medium;
    flex-shrink: 0;
  }
}
.transaction-message {
  margin: 24px 0;
  color: var(--s-color-base-content-secondary);
  line-height: 1.5;

  &--min-received {
    margin-bottom: 16px;
  }
}
.icon-divider {
  display: block;
  margin: $inner-spacing-small 0;
  font-size: 24px;
  color: var(--s-color-base-content-tertiary);
}
.confirmation-option {
  margin-bottom: 16px;
}
</style>

<style scoped>
.swap-review-status {
  margin-bottom: 16px;
  color: var(--s-color-base-content-secondary);
  font-size: 14px;
  line-height: 1.5;
}
.swap-review-status p {
  margin-bottom: 12px;
}
</style>

<style scoped>
.tokens-info-container {
  min-width: 0;
}
.token-value {
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
