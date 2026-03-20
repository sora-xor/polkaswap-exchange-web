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

<script lang="ts">
import { Operation } from '@sora-substrate/sdk';
import { defineComponent, type PropType } from 'vue';
import { mapGetters } from 'vuex';

import { formatAddress } from '@/util';

import { HashType } from '../consts';

import InfoLine from './InfoLine.vue';
import NumberFormatterMixin from './mixins/NumberFormatterMixin';
import PaginationSearchMixin from './mixins/PaginationSearchMixin';
import TranslationMixin from './mixins/TranslationMixin';
import TransactionHashView from './TransactionHashView.vue';

import type { PolkadotJsAccount } from '../types/common';
import type { HistoryItem } from '@sora-substrate/sdk';

export default defineComponent({
  components: {
    InfoLine,
    TransactionHashView,
  },
  mixins: [TranslationMixin, NumberFormatterMixin, PaginationSearchMixin],
  props: {
    transaction: {
      required: true,
      type: Object as PropType<HistoryItem>,
    },
  },
  data() {
    return {
      HashType,
      pageAmount: 4,
    };
  },
  computed: {
    ...mapGetters('wallet/account', ['account']),
    isAdarOperation(this: any): boolean {
      return this.transaction.type === Operation.SwapTransferBatch;
    },
    swapTransferBatchRecipients(this: any) {
      if (!this.isAdarOperation || (this.account as PolkadotJsAccount).address !== this.transaction.from) return [];
      return this.transaction.payload?.receivers;
    },
    txsList(this: any) {
      return this.getPageItems(this.swapTransferBatchRecipients);
    },
    numberOfRecipients(this: any): number {
      return this.swapTransferBatchRecipients?.length || 0;
    },
  },
  methods: {
    formatAddress(address: string): string {
      return formatAddress(address);
    },
  },
});
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
