<template>
  <base-widget v-bind="$attrs" :title="t('transaction.title')">
    <div v-if="previewText" class="transaction-details-preview">{{ previewText }}</div>
    <swap-transaction-details v-else expanded></swap-transaction-details>
  </base-widget>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { useSwapAmounts } from '@/features/swap/composables/useSwapAmounts';
import { createAsyncComponent } from '@/shared/ui/async';

const BaseWidget = createAsyncComponent(() => import('@/components/shared/Widget/Base.vue'));
const SwapTransactionDetails = createAsyncComponent(() => import('@/features/swap/components/TransactionDetails.vue'));

const { t } = useTranslation();
const { areTokensSelected, areZeroAmounts, hasZeroAmount } = useSwapAmounts();

const previewText = computed(() => {
  if (!areTokensSelected.value) return t('buttons.chooseTokens');
  if (areZeroAmounts.value) return t('buttons.enterAmount');
  if (hasZeroAmount.value) return t('selectToken.emptyListMessage');
  return '';
});
</script>

<style lang="scss" scoped>
.transaction-details-preview {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
}
</style>
