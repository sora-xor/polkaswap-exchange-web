<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('swap.confirmSwap')"
    :append-to-body="appendToBody"
    :modal-append-to-body="appendToBody"
    custom-class="dialog--confirm-swap"
  >
    <div class="tokens">
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedFromValue }}</span>
        <div v-if="tokenFrom" class="token">
          <token-logo class="token-logo" :token="tokenFrom" />
          {{ tokenFrom.symbol }}
        </div>
      </div>
      <s-icon class="icon-divider" name="arrows-arrow-bottom-24" />
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedToValue }}</span>
        <div v-if="tokenTo" class="token">
          <token-logo class="token-logo" :token="tokenTo" />
          {{ tokenTo.symbol }}
        </div>
      </div>
    </div>
    <p
      class="transaction-message"
      :class="{ 'transaction-message--min-received': !isExchangeB }"
      v-html="swapMessageHtml"
    />
    <s-divider />
    <swap-transaction-details full expanded />
    <template #footer>
      <account-confirmation-option with-hint class="confirmation-option" />
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
import { components } from '@soramitsu/soraneo-wallet-web';
import { computed, ref, watch } from 'vue';

import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useSwapAmounts } from '@/composables/useSwapAmounts';
import { useTranslation } from '@/composables/useTranslation';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { useSwapStore } from '@/stores/swap';
import { sanitizeHtml } from '@/utils/sanitize';

import type { CodecString } from '@sora-substrate/sdk';

const DialogBase = components.DialogBase;
const TokenLogo = components.TokenLogo;
const AccountConfirmationOption = components.AccountConfirmationOption;
const SwapTransactionDetails = lazyComponent(Components.SwapTransactionDetails);

defineOptions({ name: 'SwapConfirm' });

const props = withDefaults(
  defineProps<{
    visible: boolean;
    isInsufficientBalance?: boolean;
    appendToBody?: boolean;
  }>(),
  {
    isInsufficientBalance: false,
    appendToBody: false,
  }
);

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void;
  (event: 'confirm'): void;
}>();

const { t } = useTranslation();
const { formatStringValue, formatCodecNumber } = useFormattedAmount();
const { tokenFrom, tokenTo, fromValue, toValue } = useSwapAmounts();
const swapStore = useSwapStore();

const isVisible = ref(props.visible);

watch(
  () => props.visible,
  (value) => {
    isVisible.value = value;
  },
  { immediate: true }
);

watch(isVisible, (value) => emit('update:visible', value));

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
  isVisible.value = false;
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
