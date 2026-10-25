<template>
  <div class="s-flex-column order-table__main">
    <span class="h4 order-table__empty" v-if="shouldEmptyStateBeShown">{{ t('orderBook.orderTable.noOrders') }}</span>
    <s-table
      v-show="!shouldEmptyStateBeShown /* v-show cuz SScrollbar is set during the mounting */"
      v-loading="loadingState"
      class="order-table"
      ref="table"
      :row-key="rowKey"
      :empty-text="t('orderBook.orderTable.noOrders')"
      :data="tableItems"
      :highlight-current-row="false"
      @cell-click="handleSelectRow"
      @selection-change="handleSelectionChange"
      @select="handleSelect"
    >
      <s-table-column v-if="selectable" type="selection"></s-table-column>
      <s-table-column width="88">
        <template #header>
          <span>{{ t('orderBook.orderTable.time') }}</span>
        </template>
        <template v-slot="{ row }">
          <div class="order-table__date">
            <div>{{ row.created.date }}</div>
            <div>{{ row.created.time }}</div>
          </div>
        </template>
      </s-table-column>
      <s-table-column width="126">
        <template #header>
          <span>{{ t('orderBook.orderTable.pair') }}</span>
        </template>
        <template v-slot="{ row }">
          <span class="order-table__pair">{{ row.pair }}</span>
        </template>
      </s-table-column>
      <s-table-column width="62">
        <template #header>
          <span>{{ t('orderBook.orderTable.side') }}</span>
        </template>
        <template v-slot="{ row }">
          <span class="order-table__side" :class="[{ buy: row.side === PriceVariant.Buy }]">{{ row.side }}</span>
        </template>
      </s-table-column>
      <s-table-column width="126">
        <template #header>
          <span>{{ t('priceText') }}</span>
        </template>
        <template v-slot="{ row }">
          <div class="order-table__price">
            <span class="price">{{ getString(row.price) }}</span>
            <span>{{ row.quoteAssetSymbol }}</span>
          </div>
        </template>
      </s-table-column>
      <s-table-column width="180">
        <template #header>
          <span>{{ t('orderBook.amount') }}</span>
        </template>
        <template v-slot="{ row }">
          <div class="order-table__amount">
            <span class="amount">{{ getString(row.amount) }}/{{ getString(row.originalAmount) }}</span>
            <span>{{ row.baseAssetSymbol }}</span>
          </div>
        </template>
      </s-table-column>
      <s-table-column width="84">
        <template #header>
          <span>% {{ t('orderBook.orderTable.filled') }}</span>
        </template>
        <template v-slot="{ row }">{{ row.filled }}</template>
      </s-table-column>
      <s-table-column width="94">
        <template #header>
          <span>{{ t('orderBook.orderTable.lifetime') }}</span>
        </template>
        <template v-slot="{ row }">
          <div class="order-table__date">
            <div>{{ row.expires }}</div>
          </div>
        </template>
      </s-table-column>
      <s-table-column width="93" v-if="!isOpenOrders">
        <template #header>
          <span>{{ t('orderBook.tradingPair.status') }}</span>
        </template>
        <template v-slot="{ row }">
          <span class="order-table__status">{{ row.status }}</span>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>{{ t('orderBook.total') }}</span>
        </template>
        <template v-slot="{ row }">
          <span class="order-table__total">${{ row.total }}</span>
        </template>
      </s-table-column>
    </s-table>
    <div class="order-table__pagination">
      <history-pagination
        v-if="total"
        :current-page="currentPage"
        :page-amount="pageAmount"
        :total="total"
        :last-page="lastPage"
        :loading="loadingState"
        @pagination-click="handlePagination"
      ></history-pagination>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PriceVariant as LiquidityPriceVariant } from '@sora-substrate/liquidity-proxy';
import { FPNumber } from '@sora-substrate/sdk';
import dayjs from 'dayjs/esm';
import debounce from 'lodash/debounce';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { PaginationButton } from '@/consts';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';
import { OrderStatus } from '@/types/orderBook';

import { resolveOrderTableScrollElements, type OrderTableComponentRef } from '../table';

import type { OrderData } from '@/types/orderBook';
import type { LimitOrder } from '@sora-substrate/sdk/build/orderBook/types';
import type { OrderStatus as OrderStatusType } from '@/lib/soraneo-wallet/src/services/indexer/types';
import WalletComponentHistoryPagination from '@/lib/soraneo-wallet/src/components/HistoryPagination.vue';

type OrderTableRow = {
  id: LimitOrder['id'];
  orderBookId: LimitOrder['orderBookId'];
  originalAmount: FPNumber;
  amount: FPNumber;
  filled: string;
  baseAssetSymbol?: string;
  quoteAssetSymbol?: string;
  pair: string;
  price: FPNumber;
  total: string;
  side: LimitOrder['side'];
  status: string;
  created: { date: string; time: string };
  expires: string;
};

defineOptions({
  components: {
    HistoryPagination: WalletComponentHistoryPagination,
  },
});

const props = withDefaults(
  defineProps<{
    orders?: OrderData[];
    selectable?: boolean;
    isOpenOrders?: boolean;
    parentLoading?: boolean;
  }>(),
  {
    orders: () => [],
    selectable: false,
    isOpenOrders: false,
    parentLoading: false,
  }
);

const emit = defineEmits<{
  (event: 'select', rows: LimitOrder[]): void;
  (event: 'cell-click', row: LimitOrder): void;
  (event: 'selection-change', rows: LimitOrder[]): void;
  (event: 'page-updated', page: number, rows: OrderTableRow[]): void;
  (event: 'sync', rows: OrderTableRow[]): void;
}>();

const { t } = useTranslation();
const walletStore = useWalletStore();
const settingsStore = useSettingsStore();
const formattedAmount = useFormattedAmount();
const { loading, withParentLoading } = useLoading({ parentLoading: () => props.parentLoading });

const tableComponent = ref<OrderTableComponentRef | null>(null);
const teardownScrollSync = ref<Nullable<() => void>>(null);

const PriceVariant = LiquidityPriceVariant;

const ordersList = computed(() => props.orders ?? []);
const percentFormat = computed(() => settingsStore.percentFormat ?? null);
const assetsDataTable = computed(() => walletStore.assetsDataTable ?? {});

const currentPage = ref(1);
const pageAmount = ref(10);

const startIndex = computed(() => (currentPage.value - 1) * pageAmount.value);
const lastIndex = computed(() => currentPage.value * pageAmount.value);

const getStatusTranslation = (status: OrderStatusType | undefined): string => {
  switch (status) {
    case OrderStatus.Active:
      return t('orderBook.orderStatus.active');
    case OrderStatus.Aligned:
    case OrderStatus.Canceled:
      return t('orderBook.orderStatus.canceled');
    case OrderStatus.Expired:
      return t('orderBook.orderStatus.expired');
    case OrderStatus.Filled:
      return t('orderBook.orderStatus.filled');
    default:
      return t('orderBook.orderStatus.active');
  }
};

const preparedItems = computed<OrderTableRow[]>(() =>
  ordersList.value.map((order) => {
    const { originalAmount, amount, price, side, id, orderBookId, time, status, lifespan } = order;
    const { base, quote } = orderBookId;
    const baseAsset = assetsDataTable.value?.[base];
    const quoteAsset = assetsDataTable.value?.[quote];
    const baseAssetSymbol = baseAsset?.symbol;
    const quoteAssetSymbol = quoteAsset?.symbol;
    const pair = `${baseAssetSymbol ?? base}-${quoteAssetSymbol ?? quote}`;
    const created = dayjs(time);
    const expires = dayjs.duration(lifespan);

    const proportion = amount.div(originalAmount);
    const percent = FPNumber.ONE.sub(proportion).toNumber(2);
    const filled = percentFormat.value?.format?.(percent) ?? `${percent * 100}%`;
    const totalFpn =
      formattedAmount.getFPNumberFiatAmountByFPNumber(originalAmount.mul(price), quoteAsset) ?? FPNumber.ZERO;

    return {
      id,
      orderBookId,
      originalAmount: originalAmount.dp(2),
      amount: originalAmount.sub(amount).dp(2),
      filled,
      baseAssetSymbol,
      quoteAssetSymbol,
      pair,
      price: price.dp(2),
      total: totalFpn.dp(2).toLocaleString(),
      side,
      status: getStatusTranslation(status as OrderStatusType),
      created: { date: created.format('M/DD'), time: created.format('HH:mm:ss') },
      expires: expires.format('D[D]'),
    };
  })
);

const tableItems = computed(() => preparedItems.value.slice(startIndex.value, lastIndex.value));
const total = computed(() => preparedItems.value.length);
const lastPage = computed(() => (total.value ? Math.ceil(total.value / pageAmount.value) : 1));
const loadingState = computed(() => Boolean(props.parentLoading) || loading.value);
const shouldEmptyStateBeShown = computed(() => !(loadingState.value || ordersList.value.length));
const rowKey = computed(() => (props.selectable ? 'id' : undefined));

const syncTableItems = async () => {
  if (currentPage.value !== 1 && tableItems.value.length === 0) {
    await handlePagination(PaginationButton.Prev);
    return;
  }

  emit('sync', tableItems.value);
};

const debouncedSync = debounce(syncTableItems, 250);

watch(
  tableItems,
  () => {
    debouncedSync();
  },
  { deep: true, immediate: true }
);

const initScrollbarSync = () => {
  const elTable = tableComponent.value;
  const scrollElements = resolveOrderTableScrollElements(elTable);

  if (!elTable || !scrollElements) return;

  const { bodyWrapper, headerWrapper } = scrollElements;

  const syncScroll = () => {
    const scrollLeft = bodyWrapper.scrollLeft;
    headerWrapper.scrollLeft = scrollLeft;
    elTable.scrollPosition = scrollLeft === 0 ? 'left' : 'right';
  };

  bodyWrapper.addEventListener('scroll', syncScroll, { passive: true });
  syncScroll();

  teardownScrollSync.value = () => {
    bodyWrapper.removeEventListener('scroll', syncScroll);
  };
};

const resetScrollbarSync = () => {
  teardownScrollSync.value?.();
  teardownScrollSync.value = null;
};

onMounted(async () => {
  await withParentLoading(async () => {
    await nextTick();
    initScrollbarSync();
  });
});

onBeforeUnmount(() => {
  debouncedSync.cancel();
  resetScrollbarSync();
});

const getString = (value: FPNumber): string => value.toLocaleString();

const handleSelect = (rows: LimitOrder[]) => {
  if (!props.selectable) return;
  emit('select', rows);
};

const handleSelectRow = (row: LimitOrder) => {
  if (!props.selectable) return;
  emit('cell-click', row);
};

const handleSelectionChange = (rows: LimitOrder[]) => {
  if (!props.selectable) return;
  emit('selection-change', rows);
};

const handlePaginationClick = (button: PaginationButton) => {
  let nextPage = 1;

  switch (button) {
    case PaginationButton.Prev:
      nextPage = currentPage.value - 1;
      break;
    case PaginationButton.Next:
      nextPage = currentPage.value + 1;
      break;
    case PaginationButton.Last:
      nextPage = lastPage.value;
      break;
    case PaginationButton.First:
    default:
      nextPage = 1;
      break;
  }

  currentPage.value = Math.min(Math.max(nextPage, 1), lastPage.value);
};

const handlePagination = async (button: PaginationButton) => {
  handlePaginationClick(button);
  await nextTick();
  emit('page-updated', currentPage.value, tableItems.value);
};

defineExpose({
  tableComponent,
  tableItems,
});
</script>

<style lang="scss">
$table-header-background-color: rgba(231, 218, 221, 0.35);

.order-table {
  font-size: var(--s-font-size-mini);
  background-color: var(--s-color-utility-surface);

  &__main {
    flex: 1;
    align-items: center;
    justify-content: center;
  }

  .scrollable-table {
    height: 100%; // Move horizontal scroll to the bottom corner

    // Fix issue with horizontal and vertical scroll
    @include scrollbar($withHorizontalScroll: true, $hideVerticalScroll: true);
  }

  .el-table__header-wrapper {
    text-transform: uppercase;
    background-color: $table-header-background-color;
    th {
      background-color: $table-header-background-color;
      color: var(--s-color-base-content-secondary);
    }
  }
  .el-table__body-wrapper {
    background-color: var(--s-color-utility-surface);
    height: 400px;

    .el-table__row {
      background-color: var(--s-color-utility-surface);
    }

    .el-checkbox__inner {
      border-radius: 4px;
    }

    .el-table__empty-text {
      color: var(--s-color-base-content-secondary);
      font-size: 20px;
    }
  }

  .order-table {
    &__date {
      color: var(--s-color-base-content-secondary);
      font-size: 12.5px;
    }

    &__pair {
      font-weight: 500;
    }

    &__side {
      text-transform: uppercase;
      font-weight: 500;
      color: var(--s-color-status-error);
      &.buy {
        color: var(--s-color-status-success);
      }
    }

    &__price {
      .price {
        font-weight: 550;
        margin-right: 2px;
      }
    }

    &__amount {
      .amount {
        font-weight: 550;
        margin-right: 2px;
      }
    }

    &__status {
      text-transform: uppercase;
      font-size: var(--s-font-size-extra-mini);
    }

    &__total {
      color: var(--s-color-fiat-value);
      font-family: var(--s-font-family-default);
      line-height: var(--s-line-height-medium);
      letter-spacing: var(--s-letter-spacing-small);
      font-weight: 400;
    }
  }

  &__pagination {
    padding: 0 $basic-spacing $basic-spacing;
    width: 100%;
  }
}

[design-system-theme='dark'] {
  .el-table__header-wrapper {
    background-color: var(--s-color-utility-surface);
    th {
      background-color: var(--s-color-utility-surface);
    }
  }
}
</style>
