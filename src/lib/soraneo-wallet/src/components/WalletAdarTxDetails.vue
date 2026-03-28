<template>
  <div v-if="numberOfRecipients > 0" class="adar-tx-details">
    <div class="adar-tx-details__title">
      {{ t('transaction.title') }}
    </div>
    <div class="adar-tx-details__txs-container">
      <div v-for="(recipient, idx) in txsList" :key="idx">
        <transaction-hash-view
          :translation="'transaction.to'"
          :value="recipient.accountId"
          :type="HashType.Account"
          class="adar-tx-details__account-id"
        ></transaction-hash-view>
        <info-line
          is-formatted
          value-can-be-hidden
          :label="t('transaction.amount')"
          :value="formatStringValue(recipient.amount)"
          :asset-symbol="recipient.symbol"
        ></info-line>
      </div>
    </div>
    <s-pagination
      v-model:current-page="currentPage"
      class="adar-tx-details__pagination-panel"
      :layout="'prev, total, next'"
      :page-size="pageAmount"
      :total="numberOfRecipients"
      @prev-click="handlePrevClick"
      @next-click="handleNextClick"
    ></s-pagination>
  </div>
</template>

<script setup lang="ts">
import { Operation } from '@sora-substrate/sdk';
import { computed } from 'vue';

import { useNumberFormatter } from '../composables/useNumberFormatter';
import { usePaginationSearch } from '../composables/usePaginationSearch';
import { useWalletTranslation } from '../composables/useWalletTranslation';
import { useWalletStore } from '@/stores/wallet';

import { formatAddress } from '@/util';

import { HashType } from '../consts';

import InfoLine from './InfoLine.vue';
import TransactionHashView from './TransactionHashView.vue';

import type { PolkadotJsAccount } from '../types/common';
import type { HistoryItem } from '@sora-substrate/sdk';

const props = defineProps<{
  transaction: HistoryItem;
}>();

const { t } = useWalletTranslation();
const { formatStringValue } = useNumberFormatter();
const { currentPage, pageAmount, getPageItems, handlePrevClick, handleNextClick } = usePaginationSearch();
const walletStore = useWalletStore();

pageAmount.value = 4;

const account = computed(() => walletStore.account as PolkadotJsAccount);
const isAdarOperation = computed(() => props.transaction.type === Operation.SwapTransferBatch);
const swapTransferBatchRecipients = computed(() => {
  if (!isAdarOperation.value || account.value.address !== props.transaction.from) return [];
  return props.transaction.payload?.receivers ?? [];
});
const txsList = computed(() => getPageItems(swapTransferBatchRecipients.value));
const numberOfRecipients = computed(() => swapTransferBatchRecipients.value.length || 0);
</script>

<style lang="scss">
.adar-tx-details {
  &__pagination-panel {
    display: flex;
    margin-top: $inner-spacing-medium;
    .el-pagination__total {
      margin: auto;
    }
  }
}
</style>

<style scoped lang="scss">
.adar-tx-details {
  &__txs-container {
    & > * {
      margin-bottom: #{$basic-spacing-big};
    }
  }

  &__account-id {
    margin-bottom: #{$basic-spacing-small};
  }

  &__title {
    font-size: var(--s-font-size-big);
    text-align: center;
    margin: #{$basic-spacing-medium} 0;
    text-transform: capitalize;
  }
}
</style>
