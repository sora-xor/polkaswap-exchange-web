<template>
  <div class="history s-flex">
    <search-input
      v-if="hasTransactions"
      v-model="query"
      :placeholder="t('history.filterPlaceholder')"
      autofocus
      class="history--search"
      @clear="resetSearch"
    ></search-input>
    <div v-loading="loading" class="history-items">
      <template v-if="hasVisibleTransactions">
        <div
          v-for="(item, index) in transactions"
          :key="index"
          v-button
          class="history-item s-flex"
          tabindex="0"
          @click="handleOpenTransactionDetails(item.id)"
        >
          <div class="history-item-info">
            <div class="history-item-operation ch3" :data-type="item.type">{{ getTitle(item) }}</div>
            <div class="history-item-title p4">{{ getOperationMessage(item, shouldBalanceBeHidden) }}</div>
            <s-icon v-if="!isFinalizedStatus(item)" :class="getStatusClass(item)" :name="getStatusIcon(item)"></s-icon>
          </div>
          <div class="history-item-date">{{ formatDate(item.startTime, DateFormat) }}</div>
        </div>
      </template>
      <div v-else class="history-empty p4">{{ t(`history.${hasTransactions ? 'emptySearch' : 'empty'}`) }}</div>
    </div>
    <history-pagination
      v-if="hasVisibleTransactions && total > pageAmount"
      :current-page="currentPage"
      :page-amount="pageAmount"
      :total="total"
      :loading="loading"
      :last-page="lastPage"
      @pagination-click="handlePaginationClick"
    />
  </div>
</template>

<script lang="ts">
import { TransactionStatus } from '@sora-substrate/sdk';
import debounce from 'lodash/fp/debounce';
import isEmpty from 'lodash/fp/isEmpty';
import { defineComponent, type PropType } from 'vue';
import { mapActions, mapMutations, mapState } from 'vuex';

import { useRouterStore } from '@/stores/router';

import { RouteNames, PaginationButton } from '../consts';
import { getCurrentIndexer } from '../services/indexer';
import { getStatusIcon, getStatusClass } from '../util';

import HistoryPagination from './HistoryPagination.vue';
import SearchInput from './Input/SearchInput.vue';
import EthBridgeTransactionMixin from './mixins/EthBridgeTransactionMixin';
import LoadingMixin from './mixins/LoadingMixin';
import PaginationSearchMixin from './mixins/PaginationSearchMixin';
import TransactionMixin from './mixins/TransactionMixin';

import type { Route } from '../store/router/types';
import type { ExternalHistoryParams, HistoryQuery } from '../types/history';
import type { History, AccountHistory, HistoryItem } from '@sora-substrate/sdk';
import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';

const isAssetSymbol = (value: string) => value.length > 1 && value.length < 8;
const isAccountAddress = (value: string) => value.startsWith('cn') && value.length === 49;
const isHexAddress = (value: string) => value.startsWith('0x') && value.length === 66;

export default defineComponent({
  components: {
    SearchInput,
    HistoryPagination,
  },
  mixins: [LoadingMixin, TransactionMixin, PaginationSearchMixin, EthBridgeTransactionMixin],
  props: {
    asset: {
      default: null,
      type: Object as PropType<Nullable<AccountAsset>>,
    },
  },
  data() {
    return {
      DateFormat: 'll LT',
      pageAmount: 8,
      updateCommonHistory: (() => Promise.resolve()) as () => Promise<void>,
    };
  },
  computed: {
    ...mapState('wallet/account', ['assets']),
    ...mapState('wallet/transactions', [
      'history',
      'externalHistory',
      'externalHistoryUpdates',
      'externalHistoryTotal',
    ]),
    routerStore(this: any) {
      return useRouterStore(this.$pinia);
    },
    assetAddress(this: any): string {
      return (this.asset && this.asset.address) || '';
    },
    internalHistoryPrefiltered(this: any) {
      return this.getPrefilteredHistory(this.history as AccountHistory<HistoryItem>);
    },
    externalHistoryUpdatesPrefiltered(this: any) {
      return this.getPrefilteredHistory(this.externalHistoryUpdates as AccountHistory<HistoryItem>);
    },
    filteredInternalHistory(this: any): Array<History> {
      return this.getFilteredHistory(this.internalHistoryPrefiltered);
    },
    filteredExternalHistory(this: any): Array<History> {
      return Object.values(this.externalHistory as AccountHistory<HistoryItem>);
    },
    filteredExternalHistoryUpdates(this: any): Array<History> {
      return this.getFilteredHistory(this.externalHistoryUpdatesPrefiltered);
    },
    transactions(this: any): Array<History> {
      const merged = [
        ...this.filteredInternalHistory,
        ...this.filteredExternalHistory,
        ...this.filteredExternalHistoryUpdates,
      ];
      const sorted = this.sortTransactions(merged, this.isLtrDirection);

      const end = this.isLtrDirection
        ? Math.min(this.currentPage * this.pageAmount, sorted.length)
        : Math.max((this.lastPage - this.currentPage + 1) * this.pageAmount - this.directionShift, 0);

      const start = this.isLtrDirection
        ? Math.max(end - this.pageAmount, 0)
        : Math.max((this.lastPage - this.currentPage) * this.pageAmount - this.directionShift, 0);

      return this.sortTransactions(this.getPageItems(sorted, start, end), true);
    },
    total(this: any): number {
      return (
        this.externalHistoryTotal + this.filteredInternalHistory.length + this.filteredExternalHistoryUpdates.length
      );
    },
    hasVisibleTransactions(this: any): boolean {
      return !!this.transactions.length;
    },
    hasTransactions(this: any): boolean {
      return this.hasVisibleTransactions || !!this.searchQuery;
    },
    queryCriterias(this: any): HistoryQuery {
      if (!this.searchQuery) return {};

      const query: HistoryQuery = {};
      const indexer = getCurrentIndexer();

      const operationNames = indexer.services.dataParser.supportedOperations.filter((operation) =>
        this.t(`operations.${operation}`).toLowerCase().includes(this.searchQuery.toLowerCase())
      );

      if (operationNames.length) query.operationNames = operationNames;

      if (isAssetSymbol(this.searchQuery)) {
        const assetsAddresses = (this.assets as Array<Asset>).reduce((buffer: Array<string>, asset) => {
          if (asset.symbol.toLowerCase().includes(this.searchQuery.toLowerCase())) {
            buffer.push(asset.address);
          }
          return buffer;
        }, []);

        if (assetsAddresses.length) {
          query.assetsAddresses = assetsAddresses;
        }
      }

      if (isAccountAddress(this.searchQuery)) {
        query.accountAddress = this.searchQuery;
      }

      if (isHexAddress(this.searchQuery)) {
        query.hexAddress = this.searchQuery;
      }

      return query;
    },
    isValidQuery(this: any): boolean {
      return !(this.searchQuery && isEmpty(this.queryCriterias));
    },
  },
  watch: {
    async searchQuery(this: any): Promise<void> {
      await this.updateHistoryBySearchQuery();
    },
  },
  created(this: any): void {
    this.updateCommonHistory = debounce(500)(() => this.updateHistory(1, true));
  },
  async mounted(this: any): Promise<void> {
    this.saveExternalHistoryUpdates(true);
    await this.updateHistory(1, true);
  },
  beforeUnmount(this: any): void {
    this.saveExternalHistoryUpdates(false);
    this.reset();
  },
  methods: {
    ...mapMutations('wallet/transactions', [
      'resetExternalHistory',
      'saveExternalHistoryUpdates',
      'getHistory',
      'setTxDetailsId',
    ]),
    ...mapActions('wallet/transactions', ['getExternalHistory']),
    navigate(this: any, options: Route): void {
      this.routerStore.navigate(options);
    },
    async updateHistoryBySearchQuery(this: any): Promise<void> {
      await this.updateCommonHistory();
    },
    getPrefilteredHistory(this: any, history: AccountHistory<HistoryItem>): HistoryItem[] {
      const historyList = Object.values(history);

      if (!this.assetAddress) return historyList;

      return historyList.filter((item) => {
        return [item.assetAddress, item.asset2Address].includes(this.assetAddress);
      });
    },
    reset(this: any): void {
      this.resetPage();
      this.resetExternalHistory();
    },
    getFilteredHistory(this: any, history: Array<History>): Array<History> {
      if (!this.searchQuery) {
        return history;
      }

      const query = this.searchQuery.toLowerCase();

      return history.filter(
        (item) =>
          `${item.assetAddress}`.toLowerCase() === query ||
          `${item.asset2Address}`.toLowerCase() === query ||
          `${item.symbol}`.toLowerCase().includes(query) ||
          `${item.symbol2}`.toLowerCase().includes(query) ||
          `${item.blockId}`.toLowerCase().includes(query) ||
          `${item.from}`.toLowerCase() === query ||
          `${item.to}`.toLowerCase() === query ||
          this.t(`operations.${item.type}`).toLowerCase().includes(query)
      );
    },
    getStatus(this: any, item: HistoryItem): string {
      let status = 'success';

      if (this.isErrorStatus(item)) {
        status = TransactionStatus.Error;
      } else if (!this.isFinalizedStatus(item)) {
        status = 'in_progress';
      }

      return status.toUpperCase();
    },
    getStatusClass(this: any, item: HistoryItem): string {
      return getStatusClass(this.getStatus(item));
    },
    getStatusIcon(this: any, item: HistoryItem): string {
      return getStatusIcon(this.getStatus(item));
    },
    isFinalizedStatus(this: any, item: HistoryItem): boolean {
      if (this.isEthBridgeTx(item)) return this.isEthBridgeTxToCompleted(item);

      return [TransactionStatus.InBlock, TransactionStatus.Finalized].includes(item.status as TransactionStatus);
    },
    isErrorStatus(this: any, item: HistoryItem): boolean {
      if (this.isEthBridgeTx(item)) return this.isEthBridgeTxFromFailed(item) || this.isEthBridgeTxToFailed(item);

      return [TransactionStatus.Error, TransactionStatus.Invalid].includes(item.status as TransactionStatus);
    },
    handleOpenTransactionDetails(this: any, id?: string): void {
      if (!id) {
        this.navigate({ name: RouteNames.Wallet });
      } else {
        this.setTxDetailsId(id);
      }
    },
    async handlePaginationClick(this: any, button: PaginationButton): Promise<void> {
      let current = 1;

      switch (button) {
        case PaginationButton.Prev:
          current = this.currentPage - 1;
          break;
        case PaginationButton.Next:
          current = this.currentPage + 1;
          if (current === this.lastPage) {
            this.isLtrDirection = false;
          }
          break;
        case PaginationButton.First:
          this.isLtrDirection = true;
          break;
        case PaginationButton.Last:
          current = this.lastPage;
          this.isLtrDirection = false;
      }

      await this.updateHistory(current);
      this.currentPage = current;
    },
    async updateHistory(this: any, page = 1, withReset = false): Promise<void> {
      await this.withLoading(async () => {
        if (withReset) {
          this.reset();
        }
        if (this.isValidQuery) {
          await this.getExternalHistory({
            page,
            address: this.account.address,
            assetAddress: this.assetAddress,
            pageAmount: this.pageAmount,
            query: this.queryCriterias,
          } as ExternalHistoryParams);
        }
        this.getHistory();
      });
    },
  },
});
</script>

<style lang="scss">
$history-item-horizontal-space: 10px;

.history {
  & > .history-items {
    & > .el-loading-mask {
      margin-left: -#{$history-item-horizontal-space * 2};
      margin-right: -#{$history-item-horizontal-space * 2};
    }
  }
}
</style>

<style scoped lang="scss">
$history-item-horizontal-space: 10px;
$history-item-height: 48px;
$history-item-top-border-height: 1px;

.history {
  flex-direction: column;
  margin-top: calc(var(--s-basic-spacing) * 2);

  &--search {
    margin-bottom: #{$basic-spacing-medium};
  }

  &-items {
    min-height: $history-item-height;
  }

  &-item {
    display: flex;
    flex-direction: column;
    margin-right: -#{$history-item-horizontal-space * 2};
    margin-left: -#{$history-item-horizontal-space * 2};
    min-height: $history-item-height;
    padding: calc(var(--s-basic-spacing) + #{$history-item-top-border-height}) $history-item-horizontal-space * 2;
    font-size: var(--s-font-size-mini);
    border-radius: var(--s-border-radius-small);
    @include focus-outline($borderRadius: var(--s-border-radius-small));
    &:not(:first-child):not(:focus) {
      position: relative;
      &:before {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        display: block;
        margin-right: auto;
        margin-left: auto;
        height: 1px;
        width: calc(100% - #{$history-item-horizontal-space * 4});
        content: '';
        background-color: var(--s-color-base-border-secondary);
      }
    }
    &:hover {
      background-color: var(--s-color-base-background-hover);
      cursor: pointer;
    }
    &:focus + .history-item:before,
    &:focus + .el-loading-mask + .history-item:before {
      background-color: transparent;
    }
    &-info {
      display: flex;
      align-items: flex-start;
      .info-status {
        &--loading,
        &--success,
        &--error {
          line-height: var(--s-font-size-small);
        }
        &.info-status--loading {
          height: var(--s-font-size-small);
        }
        &--error {
          color: var(--s-color-status-error);
        }
      }
      // TODO: [1.5] remove it
      i.info-status--loading {
        width: var(--s-icon-font-size-mini);
        height: var(--s-icon-font-size-mini);
        margin-right: 6px;
        &:before {
          content: '';
        }
      }
    }
    &-title {
      width: auto;
      padding-right: var(--s-basic-spacing);
      line-height: var(--s-line-height-mini);
    }
    &-title,
    &-date {
      width: 100%;
    }
    &-date {
      margin-top: $basic-spacing-mini;
      line-height: var(--s-line-height-mini);
      color: var(--s-color-base-content-tetriary);
    }
    &-operation {
      flex-shrink: 0;
      color: var(--s-color-theme-accent);
      border-radius: var(--s-border-radius-mini);
      margin-right: $basic-spacing-mini;
    }
    &-title,
    &-date {
      width: 100%;
    }
    &-date {
      color: var(--s-color-base-content-secondary);
      line-height: var(--s-line-height-mini);
    }
    &-icon {
      flex-shrink: 0;
      align-self: flex-start;
      margin-top: $basic-spacing-mini;
      margin-right: var(--s-basic-spacing);
      margin-left: auto;
    }
    .info-status--loading {
      @include svg-icon($status-pending-svg, var(--s-font-size-mini));
      @include loading;
    }
  }
  &-empty {
    text-align: center;
  }
}
</style>
