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
import { computed, onBeforeUnmount, onMounted, watch, type PropType } from 'vue';

import type { WalletNavigationTarget } from '@/platform/wallet/navigation';
import { useEthBridgeTransaction } from '../composables/useEthBridgeTransaction';
import { usePaginationSearch } from '../composables/usePaginationSearch';
import { useTransaction } from '../composables/useTransaction';
import { useWalletStore } from '@/stores/wallet';

import { RouteNames, PaginationButton } from '../consts';
import { getCurrentIndexer } from '../services/indexer';
import { getStatusIcon, getStatusClass } from '../util';

import HistoryPagination from './HistoryPagination.vue';
import SearchInput from './Input/SearchInput.vue';

import type { ExternalHistoryParams, HistoryQuery } from '../types/history';
import type { History, AccountHistory, HistoryItem } from '@sora-substrate/sdk';
import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';

const isAssetSymbol = (value: string) => value.length > 1 && value.length < 8;
const isAccountAddress = (value: string) => value.startsWith('cn') && value.length === 49;
const isHexAddress = (value: string) => value.startsWith('0x') && value.length === 66;

export default {
  components: {
    SearchInput,
    HistoryPagination,
  },
  props: {
    asset: {
      default: null,
      type: Object as PropType<Nullable<AccountAsset>>,
    },
  },
  setup(props) {
    const walletStore = useWalletStore();
    const { t, formatDate, getTitle, loading, withLoading } = useTransaction();
    const { isEthBridgeTx, isEthBridgeTxToCompleted, isEthBridgeTxFromFailed, isEthBridgeTxToFailed } =
      useEthBridgeTransaction();
    const {
      currentPage,
      pageAmount,
      query,
      searchQuery,
      isLtrDirection,
      resetPage,
      resetSearch,
      sortTransactions,
      getPageItems,
    } = usePaginationSearch();

    const DateFormat = 'll LT';
    pageAmount.value = 8;

    const assets = computed(() => walletStore.assets);
    const history = computed(() => walletStore.history);
    const externalHistory = computed(() => walletStore.externalHistory);
    const externalHistoryUpdates = computed(() => walletStore.externalHistoryUpdates);
    const externalHistoryTotal = computed(() => walletStore.externalHistoryTotal);
    const account = computed(() => walletStore.account);
    const assetAddress = computed(() => props.asset?.address || '');

    const getPrefilteredHistory = (historyMap: AccountHistory<HistoryItem>): HistoryItem[] => {
      const historyList = Object.values(historyMap);

      if (!assetAddress.value) return historyList;

      return historyList.filter((item) => {
        return [item.assetAddress, item.asset2Address].includes(assetAddress.value);
      });
    };

    const getFilteredHistory = (items: Array<History>): Array<History> => {
      if (!searchQuery.value) {
        return items;
      }

      const queryValue = searchQuery.value.toLowerCase();

      return items.filter(
        (item) =>
          `${item.assetAddress}`.toLowerCase() === queryValue ||
          `${item.asset2Address}`.toLowerCase() === queryValue ||
          `${item.symbol}`.toLowerCase().includes(queryValue) ||
          `${item.symbol2}`.toLowerCase().includes(queryValue) ||
          `${item.blockId}`.toLowerCase().includes(queryValue) ||
          `${item.from}`.toLowerCase() === queryValue ||
          `${item.to}`.toLowerCase() === queryValue ||
          t(`operations.${item.type}`).toLowerCase().includes(queryValue)
      );
    };

    const internalHistoryPrefiltered = computed(() =>
      getPrefilteredHistory(history.value as AccountHistory<HistoryItem>)
    );
    const externalHistoryUpdatesPrefiltered = computed(() =>
      getPrefilteredHistory(externalHistoryUpdates.value as AccountHistory<HistoryItem>)
    );
    const filteredInternalHistory = computed(() => getFilteredHistory(internalHistoryPrefiltered.value));
    const filteredExternalHistory = computed(() => Object.values(externalHistory.value as AccountHistory<HistoryItem>));
    const filteredExternalHistoryUpdates = computed(() => getFilteredHistory(externalHistoryUpdatesPrefiltered.value));
    const total = computed(
      () =>
        externalHistoryTotal.value + filteredInternalHistory.value.length + filteredExternalHistoryUpdates.value.length
    );
    const lastPage = computed(() => (total.value ? Math.ceil(total.value / pageAmount.value) : 1));
    const directionShift = computed(() => {
      const lastPageAmount = total.value % pageAmount.value || pageAmount.value;
      return isLtrDirection.value ? 0 : pageAmount.value - lastPageAmount;
    });
    const transactions = computed<Array<History>>(() => {
      const merged = [
        ...filteredInternalHistory.value,
        ...filteredExternalHistory.value,
        ...filteredExternalHistoryUpdates.value,
      ];
      const sorted = sortTransactions(merged, isLtrDirection.value);

      const end = isLtrDirection.value
        ? Math.min(currentPage.value * pageAmount.value, sorted.length)
        : Math.max((lastPage.value - currentPage.value + 1) * pageAmount.value - directionShift.value, 0);

      const start = isLtrDirection.value
        ? Math.max(end - pageAmount.value, 0)
        : Math.max((lastPage.value - currentPage.value) * pageAmount.value - directionShift.value, 0);

      return sortTransactions(getPageItems(sorted, start, end), true);
    });
    const hasVisibleTransactions = computed(() => !!transactions.value.length);
    const hasTransactions = computed(() => hasVisibleTransactions.value || !!searchQuery.value);
    const queryCriterias = computed<HistoryQuery>(() => {
      if (!searchQuery.value) return {};

      const queryParams: HistoryQuery = {};
      const indexer = getCurrentIndexer();

      const operationNames = indexer.services.dataParser.supportedOperations.filter((operation) =>
        t(`operations.${operation}`).toLowerCase().includes(searchQuery.value.toLowerCase())
      );

      if (operationNames.length) queryParams.operationNames = operationNames;

      if (isAssetSymbol(searchQuery.value)) {
        const assetsAddresses = (assets.value as Array<Asset>).reduce((buffer: Array<string>, asset) => {
          if (asset.symbol.toLowerCase().includes(searchQuery.value.toLowerCase())) {
            buffer.push(asset.address);
          }
          return buffer;
        }, []);

        if (assetsAddresses.length) {
          queryParams.assetsAddresses = assetsAddresses;
        }
      }

      if (isAccountAddress(searchQuery.value)) {
        queryParams.accountAddress = searchQuery.value;
      }

      if (isHexAddress(searchQuery.value)) {
        queryParams.hexAddress = searchQuery.value;
      }

      return queryParams;
    });
    const isValidQuery = computed(() => !(searchQuery.value && isEmpty(queryCriterias.value)));

    const resetExternalHistory = () => walletStore.resetExternalHistory();
    const saveExternalHistoryUpdates = (flag: boolean) => walletStore.saveExternalHistoryUpdates(flag);
    const getHistory = () => walletStore.getHistory();
    const setTxDetailsId = (id: string) => walletStore.setTxDetailsId(id);
    const getExternalHistory = (params: ExternalHistoryParams) => walletStore.getExternalHistory(params);
    const navigate = (options: WalletNavigationTarget): void => {
      walletStore.navigate(options);
    };
    const reset = (): void => {
      resetPage();
      resetExternalHistory();
    };

    const getStatus = (item: HistoryItem): string => {
      let status = 'success';

      if (isErrorStatus(item)) {
        status = TransactionStatus.Error;
      } else if (!isFinalizedStatus(item)) {
        status = 'in_progress';
      }

      return status.toUpperCase();
    };

    const getStatusClassValue = (item: HistoryItem): string => getStatusClass(getStatus(item));
    const getStatusIconValue = (item: HistoryItem): string => getStatusIcon(getStatus(item));
    const isFinalizedStatus = (item: HistoryItem): boolean => {
      if (isEthBridgeTx(item)) return isEthBridgeTxToCompleted(item);

      return [TransactionStatus.InBlock, TransactionStatus.Finalized].includes(item.status as TransactionStatus);
    };
    const isErrorStatus = (item: HistoryItem): boolean => {
      if (isEthBridgeTx(item)) return isEthBridgeTxFromFailed(item) || isEthBridgeTxToFailed(item);

      return [TransactionStatus.Error, TransactionStatus.Invalid].includes(item.status as TransactionStatus);
    };
    const handleOpenTransactionDetails = (id?: string): void => {
      if (!id) {
        navigate({ name: RouteNames.Wallet });
      } else {
        setTxDetailsId(id);
      }
    };
    const updateHistory = async (page = 1, withReset = false): Promise<void> => {
      await withLoading(async () => {
        if (withReset) {
          reset();
        }
        if (isValidQuery.value) {
          await getExternalHistory({
            page,
            address: account.value.address,
            assetAddress: assetAddress.value,
            pageAmount: pageAmount.value,
            query: queryCriterias.value,
          } as ExternalHistoryParams);
        }
        getHistory();
      });
    };

    const updateCommonHistory = debounce(500)(() => updateHistory(1, true));
    const updateHistoryBySearchQuery = async (): Promise<void> => {
      await updateCommonHistory();
    };

    const handlePaginationClick = async (button: PaginationButton): Promise<void> => {
      let current = 1;

      switch (button) {
        case PaginationButton.Prev:
          current = currentPage.value - 1;
          break;
        case PaginationButton.Next:
          current = currentPage.value + 1;
          if (current === lastPage.value) {
            isLtrDirection.value = false;
          }
          break;
        case PaginationButton.First:
          isLtrDirection.value = true;
          break;
        case PaginationButton.Last:
          current = lastPage.value;
          isLtrDirection.value = false;
      }

      await updateHistory(current);
      currentPage.value = current;
    };

    watch(searchQuery, () => {
      void updateHistoryBySearchQuery();
    });

    onMounted(() => {
      void (async () => {
        saveExternalHistoryUpdates(true);
        await updateHistory(1, true);
      })();
    });

    onBeforeUnmount(() => {
      saveExternalHistoryUpdates(false);
      reset();
    });

    return {
      DateFormat,
      t,
      formatDate,
      loading,
      currentPage,
      pageAmount,
      query,
      searchQuery,
      lastPage,
      transactions,
      total,
      hasVisibleTransactions,
      hasTransactions,
      handleOpenTransactionDetails,
      handlePaginationClick,
      getTitle,
      getStatusClass: getStatusClassValue,
      getStatusIcon: getStatusIconValue,
      isFinalizedStatus,
      resetSearch,
    };
  },
};
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
