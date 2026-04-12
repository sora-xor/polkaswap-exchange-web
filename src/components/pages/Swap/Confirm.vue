<template>
  <dialog-base
    v-model:visible="visible"
    :title="t('swap.confirmSwap')"
    :append-to-body="appendToBody"
    :modal-append-to-body="appendToBody"
    custom-class="dialog--confirm-swap"
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
    <swap-transaction-details full expanded></swap-transaction-details>
    <template #footer>
      <account-confirmation-option with-hint class="confirmation-option"></account-confirmation-option>
      <s-button
        type="primary"
        class="s-typography-button--large"
        :disabled="isInsufficientBalance"
        @click="handleConfirm"
      >
        {{ t('confirmText') }}
      </s-button>
    </template>
  </dialog-base>
</template>

<script setup lang="ts">
import { components } from '@/shims/wallet-components';
import { computed } from 'vue';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useSwapAmounts } from '@/composables/useSwapAmounts';
import { useTranslation } from '@/composables/useTranslation';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { useSwapStore } from '@/stores/swap';
import { sanitizeHtml } from '@/utils/sanitize';

import type { CodecString } from '@sora-substrate/sdk';

const SwapTransactionDetails = lazyComponent(Components.SwapTransactionDetails);

defineOptions({
  name: 'SwapConfirm',
  components: {
    DialogBase: components.DialogBase,
    TokenLogo: components.TokenLogo,
    AccountConfirmationOption: components.AccountConfirmationOption,
  },
});

const props = withDefaults(
  defineProps<{
    isInsufficientBalance?: boolean;
    appendToBody?: boolean;
  }>(),
  {
    isInsufficientBalance: false,
    appendToBody: false,
  }
);

const emit = defineEmits<{
  (event: 'confirm'): void;
}>();

const { t } = useTranslation();
const { formatStringValue, formatCodecNumber } = useFormattedAmount();
const { tokenFrom, tokenTo, fromValue, toValue } = useSwapAmounts();
const swapStore = useSwapStore();

const visible = defineModel<boolean>('visible', { required: true });

const appendToBody = computed(() => props.appendToBody);
const isInsufficientBalance = computed(() => props.isInsufficientBalance);
const isExchangeB = computed(() => swapStore.isExchangeB);
const minMaxReceived = computed(() => swapStore.minMaxReceived as CodecString);

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
  emit('confirm');
  visible.value = false;
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
  color: rgb(213, 205, 208);
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
  color: rgb(155, 111, 165);
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
  margin-top: $inner-spacing-mini;
  color: var(--s-color-base-content-primary);
  line-height: var(--s-line-height-big);
}
.confirmation-option {
  margin-bottom: $inner-spacing-medium;
}
@include vertical-divider;
@include vertical-divider('el-divider');
</style>
