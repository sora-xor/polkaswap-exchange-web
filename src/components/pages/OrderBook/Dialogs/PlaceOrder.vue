<template>
  <dialog-base v-model:visible="isVisible" :title="title" custom-class="dialog--confirm-swap">
    <div class="tokens">
      <div class="tokens-info-container">
        <span class="token-value">{{ upperText }}</span>
        <token-logo class="token-logo" :token="baseAsset"></token-logo>
      </div>
      <div class="tokens-info-container">
        <span class="token-value">{{ lowerText }}</span>
        <token-logo class="token-logo" :token="quoteAsset"></token-logo>
      </div>
    </div>

    <place-transaction-details class="transaction-details" :is-market-type="isMarketType"></place-transaction-details>
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

import { useSwapAmounts } from '@/composables/useSwapAmounts';
import { useTranslation } from '@/composables/useTranslation';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { useOrderBook } from '@/composables/useOrderBook';

import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

const DialogBase = components.DialogBase;
const TokenLogo = components.TokenLogo;
const AccountConfirmationOption = components.AccountConfirmationOption;
const PlaceTransactionDetails = lazyComponent(Components.PlaceTransactionDetails);

const props = withDefaults(
  defineProps<{
    isMarketType?: boolean;
    isInsufficientBalance?: boolean;
    isBuySide?: boolean;
  }>(),
  {
    isMarketType: false,
    isInsufficientBalance: false,
    isBuySide: true,
  }
);

const isVisible = defineModel<boolean>('visible', { default: false });
const emit = defineEmits<{ (e: 'confirm'): void }>();

const { t } = useTranslation();
const { toValue } = useSwapAmounts();
const { baseValue, quoteValue, baseAsset, quoteAsset } = useOrderBook();

const title = computed(() =>
  props.isMarketType ? t('orderBook.dialog.placeMarket') : t('orderBook.dialog.placeLimit')
);

const upperText = computed(() => {
  const symbol = baseAsset.value?.symbol;

  if (props.isMarketType) {
    return props.isBuySide
      ? t('orderBook.dialog.buy', { amount: toValue.value, symbol })
      : t('orderBook.dialog.sell', { amount: baseValue.value, symbol });
  }

  return props.isBuySide
    ? t('orderBook.dialog.buy', { amount: baseValue.value, symbol })
    : t('orderBook.dialog.sell', { amount: baseValue.value, symbol });
});

const lowerText = computed(() =>
  t('orderBook.dialog.at', { price: quoteValue.value, symbol: quoteAsset.value?.symbol })
);

const handleConfirm = async () => {
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

.limit-order-type--buy {
  .info-line-value {
    color: #34ad87;
  }
}

.limit-order-type--sell {
  .info-line-value {
    color: #f754a3;
  }
}
</style>

<style lang="scss" scoped>
.transaction-details {
  margin-top: $basic-spacing;
}

.tokens {
  display: flex;
  flex-direction: column;
  font-size: var(--s-heading2-font-size);
  line-height: var(--s-line-height-small);
  &-info-container {
    display: flex;
    align-items: center;
    font-weight: 800;
  }

  .token-logo {
    margin-left: $basic-spacing;
  }
}

.confirmation-option {
  margin-bottom: $inner-spacing-medium;
}
</style>
