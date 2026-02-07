<template>
  <div class="history-container">
    <s-card v-loading="parentLoading" class="history-content" border-radius="medium" shadow="always" primary>
      <generic-page-header :title="t('bridgeHistory.title')">
        <template #back>
          <s-button type="action" icon="arrows-chevron-left-rounded-24" @click="handleBack"></s-button>
        </template>

        <div class="history-header-buttons">
          <s-button
            :class="['history-restore-btn', { loading: networkHistoryLoading }]"
            type="action"
            icon="arrows-swap-90-24"
            :disabled="networkHistoryLoading"
            :tooltip="t('bridgeHistory.restoreHistory')"
            @click="refreshExternalHistory(true)"
          ></s-button>

          <bridge-network-selector></bridge-network-selector>
        </div>
      </generic-page-header>
      <s-form class="history-form" :show-message="false">
        <search-input
          v-if="historyList.length"
          v-model="query"
          :placeholder="t('bridgeHistory.filterPlaceholder')"
          autofocus
          @clear="handleResetSearch"
          class="history--search"
        ></search-input>
        <div class="history-items">
          <template v-if="hasHistory">
            <div
              v-button
              class="history-item"
              v-for="item in filteredHistoryItems"
              :key="`history-${item.id}`"
              tabindex="0"
              @click="showHistory(item.id)"
            >
              <div class="history-item-info">
                <div class="history-item-title p4">
                  <formatted-amount
                    value-can-be-hidden
                    :value="formatAmount(item, false)"
                    :asset-symbol="item.symbol"
                  ></formatted-amount>
                  <i
                    :class="`network-icon network-icon--${getNetworkIcon(
                      isOutgoingTx(item) ? 0 : item.externalNetwork
                    )}`"
                  ></i>
                  <span class="history-item-title-separator"> {{ t('bridgeTransaction.for') }} </span>
                  <formatted-amount
                    value-can-be-hidden
                    :value="formatAmount(item, true)"
                    :asset-symbol="item.symbol"
                  ></formatted-amount>
                  <i
                    :class="`network-icon network-icon--${getNetworkIcon(
                      !isOutgoingTx(item) ? 0 : item.externalNetwork
                    )}`"
                  ></i>
                </div>
                <div class="history-item-date">{{ formatDatetime(item) }}</div>
              </div>
              <div :class="historyStatusClasses(item)">
                <div class="history-item-status-text">{{ historyStatusText(item) }}</div>
                <s-icon class="history-item-status-icon" :name="historyStatusIconName(item)" size="16"></s-icon>
              </div>
            </div>
          </template>
          <p v-else class="history-empty p4">{{ t('bridgeHistory.empty') }}</p>
          <history-pagination
            v-if="hasHistory"
            :current-page="currentPage"
            :page-amount="pageAmount"
            :total="total"
            :last-page="lastPage"
            @pagination-click="handlePaginationClick"
          ></history-pagination>
        </div>
      </s-form>
    </s-card>
  </div>
</template>

<script lang="ts" setup>
import { WALLET_CONSTS, components } from '@wallet';
import { computed, nextTick, ref, watch } from 'vue';

import { useBridgeCore } from '@/composables/useBridgeCore';
import { useBridgeHistory } from '@/composables/useBridgeHistory';
import { usePiniaTelemetry } from '@/composables/usePiniaTelemetry';
import { useLoading } from '@/composables/useLoading';
import { useNetworkFormatter } from '@/composables/useNetworkFormatter';
import { useNumberFormatter } from '@/composables/useNumberFormatter';
import { useTranslation } from '@/composables/useTranslation';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { useAssetsStore } from '@/stores/assets';
import { useBridgeFormStore } from '@/stores/bridge/form';
import { useBridgeHistoryStore } from '@/stores/bridge/history';
import { useBridgeTransactionsStore } from '@/stores/bridge/transactions';
import { useBridgeStore } from '@/stores/bridge';

import type { BridgeRegisteredAsset } from '@/store/assets/types';
import type { IBridgeTransaction } from '@sora-substrate/sdk';

const SearchAttrs = [
  'assetAddress',
  'symbol',
  'hash',
  'blockId',
  'txId',
  'externalBlockId',
  'externalHash',
  'parachainBlockId',
  'parachainHash',
  'relaychainBlockId',
  'relaychainHash',
] as const;

defineOptions({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    BridgeNetworkSelector: lazyComponent(Components.BridgeNetworkSelector),
    SearchInput: components.SearchInput,
    FormattedAmount: components.FormattedAmount,
    HistoryPagination: components.HistoryPagination,
  },
});

const { t } = useTranslation();
const { formatStringValue } = useNumberFormatter();
const { getNetworkIcon, isOutgoingTx, isFailedState, isSuccessState, isWaitingForActionState, formatDatetime } =
  useNetworkFormatter();
const { loading: parentLoading, withParentLoading } = useLoading();
const bridgeHistory = useBridgeHistory({ parentLoading });
const bridgeHistoryStore = useBridgeHistoryStore();
const bridgeTransactionsStore = useBridgeTransactionsStore();
const bridgeStore = useBridgeStore();
const bridgeFormStore = useBridgeFormStore();
usePiniaTelemetry('bridge-history', [
  { store: bridgeHistoryStore, storeId: 'bridgeHistory' },
  { store: bridgeTransactionsStore, storeId: 'bridgeTransactions' },
  { store: bridgeFormStore, storeId: 'bridgeForm' },
]);
const bridgeCore = useBridgeCore();
const assetsStore = useAssetsStore();

const { history, networkHistoryLoading, updateExternalHistory, showHistory, setHistoryPage } = bridgeHistory;

const { navigateToBridge } = bridgeCore;

const registeredAssets = computed(() => assetsStore.registeredAssets as Record<string, BridgeRegisteredAsset>);
const historyPage = computed(() => bridgeHistoryStore.historyPage);
const networkHistoryId = computed(() => bridgeStore.networkHistoryId);

const query = ref('');
const currentPage = ref(historyPage.value || 1);
const isLtrDirection = ref(true);
const pageAmount = 8;

const historyList = computed(() => Object.values(history.value));

const sortTransactions = (transactions: ReadonlyArray<IBridgeTransaction>, ascending = false): IBridgeTransaction[] => {
  return [...transactions].sort((a, b) => {
    if (!a?.startTime || !b?.startTime) return 0;
    return ascending ? a.startTime - b.startTime : b.startTime - a.startTime;
  });
};

const searchQuery = computed(() => query.value.trim().toLowerCase());

const filteredHistory = computed(() => {
  const sorted = sortTransactions(historyList.value, isLtrDirection.value);
  if (!searchQuery.value) return sorted;

  return sorted.filter((item) => {
    const registeredAsset = registeredAssets.value[item.assetAddress as string];
    const criteria: Array<unknown> = [registeredAsset?.address];

    for (const attr of SearchAttrs) {
      if (attr in item) {
        criteria.push((item as Record<string, unknown>)[attr]);
      }
    }

    return criteria.some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(searchQuery.value)
    );
  });
});

const total = computed(() => filteredHistory.value.length);
const lastPage = computed(() => (total.value ? Math.ceil(total.value / pageAmount) : 1));
const directionShift = computed(() => {
  const remainder = total.value % pageAmount || pageAmount;
  return isLtrDirection.value ? 0 : pageAmount - remainder;
});

const clampCurrentPage = () => {
  if (currentPage.value > lastPage.value) {
    currentPage.value = lastPage.value;
  }
  if (currentPage.value < 1) {
    currentPage.value = 1;
  }
};

watch(total, clampCurrentPage);
watch(historyPage, (value) => {
  if (value !== currentPage.value) {
    currentPage.value = value || 1;
  }
});

const getPageItems = (items: IBridgeTransaction[], start: number, end: number) => items.slice(start, end);

const filteredHistoryItems = computed(() => {
  if (!filteredHistory.value.length) return [];

  let start: number;
  let end: number;

  if (isLtrDirection.value) {
    end = Math.min(currentPage.value * pageAmount, filteredHistory.value.length);
    start = Math.max(end - pageAmount, 0);
  } else {
    end = Math.max((lastPage.value - currentPage.value + 1) * pageAmount - directionShift.value, 0);
    start = Math.max((lastPage.value - currentPage.value) * pageAmount - directionShift.value, 0);
  }

  return sortTransactions(getPageItems(filteredHistory.value, start, end), true);
});

const hasHistory = computed(() => filteredHistoryItems.value.length > 0);

const resetPage = () => {
  currentPage.value = 1;
  isLtrDirection.value = true;
  setHistoryPage(1);
};

const resetSearch = () => {
  query.value = '';
};

const handleResetSearch = () => {
  resetPage();
  resetSearch();
};

const updateBridgeHistoryAction = () => bridgeStore.updateBridgeHistory();

const fetchNetworkHistory = async () => {
  await withParentLoading(async () => {
    await updateBridgeHistoryAction();
    await nextTick();

    if (historyPage.value !== 1) {
      currentPage.value = historyPage.value;
      if (currentPage.value !== 1 && currentPage.value === lastPage.value) {
        isLtrDirection.value = false;
      }
    } else {
      resetPage();
    }
  });
};

watch(networkHistoryId, fetchNetworkHistory, { immediate: true });

const formatAmount = (item: IBridgeTransaction, received = false): string => {
  const amount = received ? (item.amount2 ?? item.amount) : item.amount;
  if (!item.assetAddress || !amount) return '';

  const registeredAsset = registeredAssets.value[item.assetAddress];
  const decimals = registeredAsset?.decimals;

  return formatStringValue(amount, decimals);
};

const historyStatusClasses = (item: IBridgeTransaction): string => {
  const iconClass = 'history-item-status';
  const classes = [iconClass];

  if (isWaitingForActionState(item)) {
    classes.push(`${iconClass}--info`);
  } else if (isFailedState(item)) {
    classes.push(`${iconClass}--error`);
  } else if (isSuccessState(item)) {
    classes.push(`${iconClass}--success`);
  } else {
    classes.push(`${iconClass}--pending`);
  }

  return classes.join(' ');
};

const historyStatusIconName = (item: IBridgeTransaction): string => {
  if (isWaitingForActionState(item)) {
    return 'notifications-alert-triangle-24';
  }
  if (isFailedState(item)) {
    return 'basic-clear-X-24';
  }
  if (isSuccessState(item)) {
    return 'basic-check-marks-24';
  }
  return 'time-time-24';
};

const historyStatusText = (item: IBridgeTransaction): string => {
  if (isWaitingForActionState(item)) {
    return t('bridgeHistory.statusAction');
  }
  return '';
};

const handlePaginationClick = (button: WALLET_CONSTS.PaginationButton) => {
  let nextPage = currentPage.value;

  switch (button) {
    case WALLET_CONSTS.PaginationButton.Prev:
      nextPage = currentPage.value - 1;
      break;
    case WALLET_CONSTS.PaginationButton.Next:
      nextPage = currentPage.value + 1;
      if (nextPage === lastPage.value) {
        isLtrDirection.value = false;
      }
      break;
    case WALLET_CONSTS.PaginationButton.First:
      nextPage = 1;
      isLtrDirection.value = true;
      break;
    case WALLET_CONSTS.PaginationButton.Last:
      nextPage = lastPage.value;
      isLtrDirection.value = false;
      break;
  }

  currentPage.value = Math.min(Math.max(nextPage, 1), lastPage.value);
  setHistoryPage(currentPage.value);
};

const handleBack = () => {
  setHistoryPage(1);
  navigateToBridge();
};

const refreshExternalHistory = async (clearHistory = false) => {
  await withParentLoading(async () => {
    await updateExternalHistory(clearHistory);
  });
};
</script>

<style lang="scss">
.history {
  &-container {
    @include bridge-container;
    .el-card .el-card__body .history-form {
      padding: 0 $inner-spacing-mini;
    }

    .s-card.status-action-badge.status-action-badge--history {
      position: absolute;
      right: 0;
      top: 50%;
      transform: translate(0, -50%);
    }
  }
  &-item-title {
    display: flex;
    align-items: baseline;
    font-weight: 600;
  }
  &--search {
    .el-input__inner {
      padding-right: var(--s-size-medium);
    }
  }
  &-items .history-pagination.el-pagination {
    margin-top: auto;
  }

  &-restore-btn {
    &.loading {
      & > span > i {
        @include loading;
      }
    }
  }
}
</style>

<style lang="scss" scoped>
$history-item-horizontal-space: $inner-spacing-medium;
$history-item-height: 48px;
$page-amount: 8;
$history-item-top-border-height: 1px;
$separator-margin: calc(var(--s-basic-spacing) / 2);
.history {
  &--search {
    margin-bottom: $inner-spacing-medium;
  }
  &-container {
    flex-direction: column;
    align-items: center;
    margin-top: $inner-spacing-large;
    margin-right: auto;
    margin-left: auto;
  }
  &-header-buttons {
    display: flex;
    align-items: center;
    gap: $inner-spacing-mini;
    margin-left: auto;
  }
  &-content {
    min-height: $bridge-height;
    @include bridge-content;
  }
  &-items {
    display: flex;
    flex-direction: column;
    min-height: calc(#{$history-item-height * $page-amount} + 50px);
    z-index: $app-content-layer;
  }
  &-empty {
    text-align: center;
    color: var(--s-color-base-content-tertiary);
  }
}

.history-item {
  display: flex;
  align-items: center;
  margin-right: -#{$inner-spacing-small};
  margin-left: -#{$inner-spacing-small};
  min-height: $history-item-height;
  padding: $inner-spacing-mini $inner-spacing-medium;
  border-radius: var(--s-border-radius-small);

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
      width: calc(100% - #{$history-item-horizontal-space * 2});
      content: '';
      background-color: var(--s-color-base-border-secondary);
    }
  }
  &:hover {
    background-color: var(--s-color-base-background-hover);
    cursor: pointer;
  }
  &:focus + .history-item:before {
    background-color: transparent;
  }
  &-info {
    font-size: var(--s-font-size-mini);
  }
  &-title,
  &-date {
    width: 100%;
  }
  &-title {
    line-height: var(--s-line-height-big);
    white-space: nowrap;

    .network-icon {
      margin-left: $separator-margin;
      width: calc(var(--s-size-small) / 2);
      height: calc(var(--s-size-small) / 2);
    }
    &-separator {
      font-weight: normal;
      margin-left: $separator-margin;
      margin-right: $separator-margin;
    }
  }
  &-date {
    color: var(--s-color-base-content-secondary);
    line-height: var(--s-line-height-mini);
  }
  &-status {
    display: flex;
    align-items: center;
    margin-left: auto;
    max-width: 25%;

    &--success {
      color: var(--s-color-status-success);
    }
    &--error {
      color: var(--s-color-status-error);
    }
    &--info {
      color: var(--s-color-status-info);
    }
    &--pending {
      color: var(--s-color-base-content-secondary);
    }

    &-text {
      text-transform: uppercase;
      font-size: $s-heading3-caps-font-size;
      line-height: var(--s-line-height-reset);
      text-align: right;
    }

    &-icon {
      flex-shrink: 0;
      color: inherit;
    }

    &-text + &-icon {
      margin-left: $inner-spacing-tiny;
    }
  }
}
</style>
