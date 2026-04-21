<template>
  <s-card class="details-history" border-radius="small" size="big" primary>
    <template #header>
      <h4>{{ $t('kensetsu.positionHistory') }}</h4>
    </template>
    <template v-if="hasItems">
      <div class="details-history__items s-flex-column" v-loading="loadingState">
        <div v-for="(item, index) in items" :key="index" class="history-item s-flex-column">
          <div class="history-item-info s-flex">
            <div class="history-item-operation ch3" :data-type="item.type">{{ getTitle(item.type) }}</div>
            <div class="history-item-title p4">{{ getOperationMessage(item) }}</div>
          </div>
          <div class="history-item-date">{{ formatDate(item.timestamp, DateFormat) }}</div>
        </div>
      </div>
      <history-pagination
        :current-page="currentPage"
        :page-amount="pageAmount"
        :loading="loading"
        :total="total"
        :last-page="lastPage"
        @pagination-click="handlePaginationClick"
      ></history-pagination>
    </template>
    <div v-else v-loading="loadingState" class="details-history__empty p4">{{ t('noDataText') }}</div>
  </s-card>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';
import { HiddenValue, ObjectInit, PaginationButton } from '@/consts';
import { fetchVaultEvents } from '@/indexer/queries/vault/events';
import { VaultEventTypes } from '@/modules/vault/consts';
import type { VaultEvent, VaultEventType } from '@/modules/vault/types';
import { useWalletStore } from '@/stores/wallet';

import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import WalletComponentHistoryPagination from '@/lib/soraneo-wallet/src/components/HistoryPagination.vue';

const HistoryPagination = WalletComponentHistoryPagination;

const props = withDefaults(
  defineProps<{
    id?: number;
    lockedAsset?: Nullable<RegisteredAccountAsset>;
    debtAsset?: Nullable<RegisteredAccountAsset>;
  }>(),
  {
    id: undefined,
    lockedAsset: ObjectInit,
    debtAsset: ObjectInit,
  }
);

const pageAmount = 5;
const fetchAmount = 5;
const updateInterval = 24_000;
const DateFormat = 'll LT';

const currentPage = ref(1);
const totalCount = ref(0);
const rawItems = ref<readonly VaultEvent[]>([]);
const intervalId = ref<Nullable<ReturnType<typeof setInterval>>>(null);

const { t, formatDate } = useTranslation();
const { loading, withLoading } = useLoading();
const walletStore = useWalletStore();

const loadingState = computed(() => loading.value);
const shouldBalanceBeHidden = computed(() => walletStore.shouldBalanceBeHidden);
const lockedAssetSymbol = computed(() => props.lockedAsset?.symbol ?? '');
const debtAssetSymbol = computed(() => props.debtAsset?.symbol ?? '');

const fetchPage = computed(() => Math.ceil((pageAmount * currentPage.value) / fetchAmount));
const total = computed(() => totalCount.value);
const lastPage = computed(() => (total.value ? Math.ceil(total.value / pageAmount) : 1));
const hasItems = computed(() => total.value > 0);

const offset = computed(() => pageAmount * (currentPage.value - 1));
const dataVariables = computed(() => ({
  id: props.id,
  first: pageAmount,
  offset: offset.value,
}));

const intervalTimestamp = computed(() => Math.floor((rawItems.value[0]?.timestamp ?? Date.now()) / 1000));

const updateVariables = computed(() => ({
  id: props.id,
  fromTimestamp: intervalTimestamp.value,
}));

const visibleItems = computed(() => {
  const currentFetchPage = fetchPage.value;
  const offsetWithinFetch = fetchAmount * (currentFetchPage - 1);
  const start = Math.max(pageAmount * (currentPage.value - 1) - offsetWithinFetch, 0);
  const end = start + pageAmount;
  return rawItems.value.slice(start, end);
});

const items = visibleItems;

function resetDataSubscription(): void {
  if (intervalId.value) {
    clearInterval(intervalId.value);
  }
  intervalId.value = null;
}

function resetData(): void {
  rawItems.value = [];
  totalCount.value = 0;
  resetDataSubscription();
}

async function applyPageData(): Promise<void> {
  if (!props.id) {
    resetData();
    return;
  }

  await withLoading(async () => {
    const { items: fetchedItems, totalCount: count } = await fetchVaultEvents(dataVariables.value);
    rawItems.value = Object.freeze(fetchedItems) as VaultEvent[];
    totalCount.value = count;
  });

  resetDataSubscription();

  if (fetchPage.value === 1 && hasItems.value) {
    intervalId.value = setInterval(async () => {
      try {
        const { items: updates, totalCount: newTotal } = await fetchVaultEvents(updateVariables.value);
        if (updates.length) {
          rawItems.value = Object.freeze([...updates, ...rawItems.value].slice(0, fetchAmount)) as VaultEvent[];
        }
        if (newTotal) {
          totalCount.value = totalCount.value + newTotal;
        }
      } catch (error) {
        console.error(error);
      }
    }, updateInterval);
  }
}

watch(
  () => props.id,
  (current, previous) => {
    if (current === previous) return;
    currentPage.value = 1;
    resetData();
    applyPageData().catch((error) => console.error(error));
  },
  { immediate: true }
);

watch(currentPage, (current, previous) => {
  if (current === previous) return;
  applyPageData().catch((error) => console.error(error));
});

watch(lastPage, (value) => {
  if (currentPage.value > value) {
    currentPage.value = value;
  }
});

onBeforeUnmount(() => {
  resetDataSubscription();
});

const handlePaginationClick = (button: PaginationButton) => {
  switch (button) {
    case PaginationButton.Prev:
      currentPage.value = Math.max(currentPage.value - 1, 1);
      break;
    case PaginationButton.Next:
      currentPage.value = Math.min(currentPage.value + 1, lastPage.value);
      break;
    case PaginationButton.Last:
      currentPage.value = lastPage.value;
      break;
    default:
      currentPage.value = 1;
  }
};

const getTitle = (type: VaultEventType): string => {
  switch (type) {
    case VaultEventTypes.Created:
      return t('operations.CreateVault');
    case VaultEventTypes.Closed:
      return t('operations.CloseVault');
    case VaultEventTypes.DebtIncreased:
      return t('operations.BorrowVaultDebt');
    case VaultEventTypes.CollateralDeposit:
      return t('operations.DepositCollateral');
    case VaultEventTypes.DebtPayment:
      return t('operations.RepayVaultDebt');
    case VaultEventTypes.Liquidated:
      return t('kensetsu.liquidated');
    default:
      return '';
  }
};

const getAmount = (hidden: boolean, item: VaultEvent): string => {
  return hidden ? HiddenValue : (item.amount?.toLocaleString() ?? '');
};

const getOperationMessage = (item: VaultEvent): string => {
  const hidden = shouldBalanceBeHidden.value;

  switch (item.type) {
    case VaultEventTypes.Created:
      return t('operations.finalized.CreateVault', {
        symbol: debtAssetSymbol.value,
        symbol2: lockedAssetSymbol.value,
      });
    case VaultEventTypes.Closed:
      return t('operations.finalized.CloseVault', {
        symbol: debtAssetSymbol.value,
        symbol2: lockedAssetSymbol.value,
      });
    case VaultEventTypes.DebtIncreased:
      return t('operations.finalized.BorrowVaultDebt', {
        symbol: debtAssetSymbol.value,
        amount: getAmount(hidden, item),
      });
    case VaultEventTypes.CollateralDeposit:
      return t('operations.finalized.DepositCollateral', {
        symbol: lockedAssetSymbol.value,
        amount: getAmount(hidden, item),
      });
    case VaultEventTypes.DebtPayment:
      return t('operations.finalized.RepayVaultDebt', {
        symbol: debtAssetSymbol.value,
        amount: getAmount(hidden, item),
      });
    case VaultEventTypes.Liquidated:
      return t('kensetsu.liquidatedMessage', {
        symbol: lockedAssetSymbol.value,
        amount: getAmount(hidden, item),
      });
    default:
      return '';
  }
};
</script>

<style lang="scss">
.details-history .el-loading-mask {
  background-color: var(--s-color-utility-surface);
}
</style>

<style lang="scss" scoped>
$history-item-height: 48px;
$history-items-length: 5;

.details-history {
  box-shadow: var(--s-shadow-element-pressed);

  &__items {
    height: $history-item-height * $history-items-length;
  }

  &__empty {
    margin: $basic-spacing 0;
    text-align: center;
  }

  .history-item {
    font-size: var(--s-font-size-mini);
    min-height: $history-item-height;
    padding: calc(var(--s-basic-spacing) + 1px) 0;
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
        width: 100%;
        content: '';
        background-color: var(--s-color-base-border-secondary);
      }
    }
    &-info {
      align-items: flex-start;
    }
    &-title {
      padding-right: var(--s-basic-spacing);
      line-height: var(--s-line-height-mini);
    }
    &-operation {
      flex-shrink: 0;
      color: var(--s-color-theme-accent-hover);
      margin-right: calc(var(--s-basic-spacing) / 2);
    }
    &-date {
      color: var(--s-color-base-content-secondary);
      line-height: var(--s-line-height-mini);
      margin-top: calc(var(--s-basic-spacing) / 2);
    }
  }
}
</style>
