<template>
  <div class="collaterals-container container" :class="{ 'menu-collapsed': collapsed }">
    <div class="collaterals-search">
      <search-input
        class="search"
        autofocus
        :model-value="exploreQuery"
        :placeholder="t('searchText')"
        @update:model-value="updateSearch"
        @clear="resetSearch"
      ></search-input>
    </div>
    <s-table
      ref="table"
      :data="tableItems"
      :highlight-current-row="false"
      size="small"
      class="collaterals-table explore-table"
      @cell-click="openSelectedPosition"
    >
      <!-- Index -->
      <s-table-column width="250" label="#">
        <template #header>
          <div class="explore-table-item-index">
            <span
              v-button
              :class="['explore-table-item-index--head', { active: isDefaultSort }]"
              @click="handleResetSort"
            >
              #
            </span>
          </div>
          <div class="explore-table-item-info explore-table-item-info--head">
            <span class="explore-table__primary">DEBT / COLLATERAL</span>
          </div>
        </template>
        <template v-slot="{ $index, index, row }">
          <span class="explore-table-item-index explore-table-item-index--body">
            {{
              (typeof ($index ?? index) === 'number' && Number.isFinite($index ?? index)
                ? ($index ?? index)
                : tableItems.indexOf(row)) +
              sliceStart +
              1
            }}
          </span>
          <pair-token-logo
            class="explore-table-item-logo"
            size="small"
            :first-token="row.debtAsset"
            :second-token="row.lockedAsset"
          ></pair-token-logo>
          <div class="explore-table-item-info explore-table-item-info--body">
            <div class="explore-table-item-name">{{ row.debtAsset.symbol }} / {{ row.lockedAsset.symbol }}</div>
          </div>
          <s-icon v-if="isLoggedIn && row.isAvailable" name="plus-16" size="12"></s-icon>
        </template>
      </s-table-column>
      <!-- Interest -->
      <s-table-column width="140" header-align="right" align="right">
        <template #header>
          <sort-button name="stabilityFeeValue" :sort="sortState" @change-sort="changeSort">
            <span class="explore-table__primary">{{ t('kensetsu.interest') }}</span>
            <s-tooltip border-radius="mini" :content="t('kensetsu.interestDescription')">
              <s-icon name="info-16" size="14px"></s-icon>
            </s-tooltip>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <span class="explore-table__accent">{{ row.stabilityFee }}</span>
        </template>
      </s-table-column>
      <!-- Max LTV -->
      <s-table-column width="120" header-align="right" align="right">
        <template #header>
          <sort-button name="maxLtvValue" :sort="sortState" @change-sort="changeSort">
            <span class="explore-table__primary">MAX LTV</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <span class="explore-table__accent">{{ row.maxLtv }}</span>
        </template>
      </s-table-column>
      <!-- Total locked -->
      <s-table-column min-width="180" header-align="right" align="right">
        <template #header>
          <sort-button name="totalLockedValue" :sort="sortState" @change-sort="changeSort">
            <span class="explore-table__primary">Total locked</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <div class="explore-table-item-tokens">
            <div class="explore-table-cell">
              <formatted-amount
                class="explore-table-item-token"
                :font-size-rate="FontSizeRate.SMALL"
                :value="row.totalLocked"
              ></formatted-amount>
              <token-logo
                class="explore-table-item-logo explore-table-item-logo--plain"
                size="small"
                :token="row.lockedAsset"
              ></token-logo>
            </div>
            <div v-if="row.totalLockedFiat" class="explore-table-cell">
              <formatted-amount
                class="explore-table-item-token"
                is-fiat-value
                :font-size-rate="FontSizeRate.SMALL"
                :value="row.totalLockedFiat"
              ></formatted-amount>
            </div>
          </div>
        </template>
      </s-table-column>
      <!-- Total debt -->
      <s-table-column min-width="180" header-align="right" align="right">
        <template #header>
          <sort-button name="totalDebtValue" :sort="sortState" @change-sort="changeSort">
            <span class="explore-table__primary">Total debt</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <div class="explore-table-item-tokens">
            <div class="explore-table-cell">
              <formatted-amount
                class="explore-table-item-token"
                :font-size-rate="FontSizeRate.SMALL"
                :value="row.totalDebt"
              ></formatted-amount>
              <token-logo
                class="explore-table-item-logo explore-table-item-logo--plain"
                size="small"
                :token="row.debtAsset"
              ></token-logo>
            </div>
            <div v-if="row.totalDebtFiat" class="explore-table-cell">
              <formatted-amount
                class="explore-table-item-token"
                is-fiat-value
                :font-size-rate="FontSizeRate.SMALL"
                :value="row.totalDebtFiat"
              ></formatted-amount>
            </div>
          </div>
        </template>
      </s-table-column>
      <!-- Available -->
      <s-table-column min-width="180" header-align="right" align="right">
        <template #header>
          <sort-button name="availableToBorrowValue" :sort="sortState" @change-sort="changeSort">
            <span class="explore-table__primary">Available</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <div class="explore-table-item-tokens">
            <div class="explore-table-cell">
              <formatted-amount
                class="explore-table-item-token"
                :font-size-rate="FontSizeRate.SMALL"
                :value="row.availableToBorrow"
              ></formatted-amount>
              <token-logo
                class="explore-table-item-logo explore-table-item-logo--plain"
                size="small"
                :token="row.debtAsset"
              ></token-logo>
            </div>
            <div v-if="row.availableToBorrowFiat" class="explore-table-cell">
              <formatted-amount
                class="explore-table-item-token"
                is-fiat-value
                :font-size-rate="FontSizeRate.SMALL"
                :value="row.availableToBorrowFiat"
              ></formatted-amount>
            </div>
          </div>
        </template>
      </s-table-column>
    </s-table>

    <history-pagination
      class="explore-table-pagination"
      :current-page="currentPage"
      :page-amount="pageAmount"
      :total="total"
      :last-page="lastPage"
      :loading="loadingState"
      @pagination-click="handlePaginationClick"
    ></history-pagination>
  </div>
</template>

<script lang="ts" setup>
import { FPNumber } from '@sora-substrate/math';
import { components, WALLET_CONSTS } from '@wallet';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { SortDirection } from '@soramitsu-ui/ui/types';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useTranslation } from '@/composables/useTranslation';
import { Components, HundredNumber } from '@/consts';
import { lazyComponent } from '@/router';
import store from '@/store';

import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Collateral } from '@sora-substrate/sdk/build/kensetsu/types';

type TableItem = {
  name: string;
  lockedAsset: RegisteredAccountAsset;
  debtAsset: RegisteredAccountAsset;
  stabilityFeeValue: number;
  stabilityFee: string;
  totalLockedValue: number;
  totalLocked: string;
  totalLockedFiat: Nullable<string>;
  totalDebtValue: number;
  totalDebt: string;
  totalDebtFiat: Nullable<string>;
  availableToBorrowValue: number;
  isAvailable: boolean;
  availableToBorrow: string;
  availableToBorrowFiat: Nullable<string>;
  maxLtv: string;
  maxLtvValue: number;
};

const PairTokenLogo = lazyComponent(Components.PairTokenLogo);
const SortButton = lazyComponent(Components.SortButton);
const DataRowSkeleton = lazyComponent(Components.DataRowSkeleton);
const TokenLogo = components.TokenLogo;
const FormattedAmount = components.FormattedAmount;
const HistoryPagination = components.HistoryPagination;
const SearchInput = components.SearchInput;

const FontSizeRate = WALLET_CONSTS.FontSizeRate;
const FontWeightRate = WALLET_CONSTS.FontWeightRate;
const ZERO = FPNumber.ZERO;

const props = defineProps<{
  exploreQuery: string;
}>();

const emit = defineEmits<{
  (event: 'open', locked: RegisteredAccountAsset, debt: RegisteredAccountAsset): void;
  (event: 'update-search', value: string): void;
}>();

const tableRef = ref<any>(null);
const teardownScrollSync = ref<Nullable<FnWithoutArgs>>(null);

const { getFPNumberFiatAmountByFPNumber } = useFormattedAmount();
const { t } = useTranslation();

const collaterals = computed(() => store.state.vault.collaterals as Record<string, Collateral>);
const percentFormat = computed(() => store.state.settings.percentFormat as Nullable<Intl.NumberFormat>);
const collapsed = computed(() => store.state.settings.menuCollapsed ?? false);
const isLoggedIn = computed(() => store.getters.wallet.account.isLoggedIn as boolean);
const getAsset = store.getters.assets.assetDataByAddress as (addr?: string) => Nullable<RegisteredAccountAsset>;

const order = ref<SortDirection | ''>(SortDirection.DESC);
const property = ref<string>('totalDebtValue');
const currentPage = ref(1);
const pageAmount = ref(10);

const loadingState = ref(false);

const formatPercent = (value: number): string => {
  const percent = value / HundredNumber;
  return percentFormat.value?.format?.(percent) ?? `${percent * HundredNumber}%`;
};

const prefilteredItems = computed<TableItem[]>(() =>
  Object.values(collaterals.value).reduce<TableItem[]>((acc, collateral) => {
    const lockedAsset = getAsset(collateral.lockedAssetId);
    const debtAsset = getAsset(collateral.debtAssetId);
    if (!(lockedAsset && debtAsset)) return acc;

    const stabilityFeeValue = collateral.riskParams.stabilityFeeAnnual.toNumber();
    const stabilityFee = formatPercent(stabilityFeeValue);

    const maxLtvValue = collateral.riskParams.liquidationRatioReversed;
    const maxLtv = formatPercent(maxLtvValue);

    const totalLocked = collateral.totalLocked.toLocaleString(2);
    const totalLockedFiatFp = getFPNumberFiatAmountByFPNumber(collateral.totalLocked, lockedAsset) ?? ZERO;
    const totalLockedValue = totalLockedFiatFp.toNumber();
    const totalLockedFiat = totalLockedFiatFp.toLocaleString(2);

    const totalDebt = collateral.debtSupply.toLocaleString(2);
    const totalDebtFiatFp = getFPNumberFiatAmountByFPNumber(collateral.debtSupply, debtAsset) ?? ZERO;
    const totalDebtValue = totalDebtFiatFp.toNumber();
    const totalDebtFiat = totalDebtFiatFp.toLocaleString(2);

    let availableToBorrowValue = 0;
    let availableToBorrow = '0';
    let availableToBorrowFiat: Nullable<string> = '0';
    let isAvailable = false;
    const availableToBorrowFp = collateral.riskParams.hardCap.sub(collateral.debtSupply).dp(2);
    if (availableToBorrowFp.isGtZero()) {
      isAvailable = true;
      availableToBorrow = availableToBorrowFp.toLocaleString(2);
      const availableToBorrowFiatFp = getFPNumberFiatAmountByFPNumber(availableToBorrowFp, debtAsset) ?? ZERO;
      availableToBorrowValue = availableToBorrowFiatFp.toNumber();
      availableToBorrowFiat = availableToBorrowFiatFp.toLocaleString(2);
    }

    acc.push({
      name: `${debtAsset.symbol}/${lockedAsset.symbol}`,
      lockedAsset,
      debtAsset,
      stabilityFeeValue,
      stabilityFee,
      totalLockedValue,
      totalLocked,
      totalLockedFiat,
      totalDebtValue,
      totalDebt,
      totalDebtFiat,
      availableToBorrowValue,
      availableToBorrow,
      availableToBorrowFiat,
      isAvailable,
      maxLtv,
      maxLtvValue,
    });
    return acc;
  }, [])
);

const filteredItems = computed(() => {
  const search = props.exploreQuery.toLowerCase().trim();
  if (!search) return prefilteredItems.value;

  const filterAsset = (asset?: { name?: string; symbol?: string; address?: string }) =>
    asset?.name?.toLowerCase?.().includes(search) ||
    asset?.symbol?.toLowerCase?.().includes(search) ||
    asset?.address?.toLowerCase?.() === search;

  return prefilteredItems.value.filter((item) => {
    return item.name.toLowerCase().includes(search) || filterAsset(item.lockedAsset) || filterAsset(item.debtAsset);
  });
});

const isDefaultSort = computed(() => !property.value);

const preparedItems = computed(() => {
  if (isDefaultSort.value) return filteredItems.value;

  const isAscending = order.value === SortDirection.ASC;
  const prop = property.value as keyof TableItem;

  return [...filteredItems.value].sort((a, b) => {
    const aValue = a[prop];
    const bValue = b[prop];

    if (aValue === bValue) return 0;

    return (isAscending ? aValue > bValue : aValue < bValue) ? 1 : -1;
  });
});

const total = computed(() => preparedItems.value.length);
const lastPage = computed(() => (total.value ? Math.ceil(total.value / pageAmount.value) : 1));
const startIndex = computed(() => (currentPage.value - 1) * pageAmount.value);
const sliceStart = computed(() => {
  if (!total.value) return 0;
  const start = startIndex.value;
  if (start >= total.value) {
    return Math.max(total.value - pageAmount.value, 0);
  }
  return start;
});

const tableItems = computed(() => {
  const start = sliceStart.value;
  const end = start + pageAmount.value;
  return preparedItems.value.slice(start, end);
});

watch(
  () => props.exploreQuery,
  () => {
    currentPage.value = 1;
  }
);

watch(total, () => {
  if (currentPage.value > lastPage.value) {
    currentPage.value = lastPage.value;
  }
});

const changeSort = ({ order: newOrder = SortDirection.DESC, property: newProperty = '' } = {}) => {
  order.value = newOrder;
  property.value = newProperty;
};

const handleResetSort = () => {
  changeSort();
};

const sortState = computed(() => ({
  order: order.value,
  property: property.value,
}));

const handlePaginationClick = (button: WALLET_CONSTS.PaginationButton) => {
  switch (button) {
    case WALLET_CONSTS.PaginationButton.Prev:
      currentPage.value = Math.max(currentPage.value - 1, 1);
      break;
    case WALLET_CONSTS.PaginationButton.Next:
      currentPage.value = Math.min(currentPage.value + 1, lastPage.value);
      break;
    case WALLET_CONSTS.PaginationButton.Last:
      currentPage.value = lastPage.value;
      break;
    default:
      currentPage.value = 1;
  }
};

const openSelectedPosition = (row: TableItem) => {
  if (!(isLoggedIn.value && row.isAvailable)) return;
  emit('open', row.lockedAsset, row.debtAsset);
};

const updateSearch = (value: string) => {
  emit('update-search', value);
};

const resetSearch = () => {
  emit('update-search', '');
};

const initScrollbarSync = () => {
  teardownScrollSync.value?.();

  const tableComponent = tableRef.value;
  const elTable = tableComponent?.$refs?.table;
  const bodyWrapper = elTable?.$refs?.bodyWrapper as HTMLElement | undefined;
  const headerWrapper = elTable?.$refs?.headerWrapper as HTMLElement | undefined;

  if (!bodyWrapper || !headerWrapper) return;

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

onMounted(async () => {
  await nextTick();
  initScrollbarSync();
});

watch(tableItems, () => {
  nextTick().then(() => initScrollbarSync());
});

onBeforeUnmount(() => {
  teardownScrollSync.value?.();
  teardownScrollSync.value = null;
});
</script>

<style lang="scss">
@include explore-table;

.collaterals-table.explore-table.el-table.el-table--enable-row-hover .el-table__body tr:hover > td.el-table__cell {
  background-color: rgba(42, 23, 31, 0.06);
  cursor: pointer;
}

.collaterals-table.explore-table.el-table {
  font-size: 16px;
  line-height: 18.4px;
}

.collaterals-table.explore-table.el-table .el-table__header tr > th > .cell {
  padding-top: 8px !important;
  padding-bottom: 8px !important;
  font-weight: 500 !important;
}

.collaterals-table.explore-table.el-table .el-table__body tr > td > .cell {
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}
</style>

<style lang="scss" scoped>
$container-paddings: 2 * $inner-spacing-big + $inner-spacing-mini;
$container-max: 100vw;
$container-max-width: calc($container-max - $container-paddings - var(--sidebar-width));
$container-max-width--collapsed: calc($container-max - $container-paddings - $sidebar-collapsed-width);

$min_breakpoint_large-mobile: $breakpoint_large-mobile - 1px;

.collaterals {
  &-container {
    display: flex;
    flex-flow: column nowrap;
    gap: $inner-spacing-medium;
    padding: $inner-spacing-medium $inner-spacing-tiny;
    box-shadow: var(--s-shadow-element-pressed);

    @media (min-width: $min_breakpoint_large-mobile) and (max-width: 577px) {
      max-width: 414px; // TODO: improve this exception related to the responsive design
    }

    @include tablet {
      width: 100%;
      max-width: $container-max-width;
      &.menu-collapsed {
        max-width: $container-max-width--collapsed;
      }
    }

    .explore-table-pagination {
      margin: 0 $inner-spacing-medium;
    }
  }

  &-search {
    display: flex;
    justify-content: flex-end;
    padding: 0 $inner-spacing-small;
    > .search {
      max-width: $explore-search-input-max-width;
    }

    > :deep(.search.search-input) {
      min-height: 58px;
      border-radius: 24px;
      padding: $inner-spacing-small $inner-spacing-medium;
      background-color: var(--s-color-utility-surface);
      box-shadow:
        1px 1px 5px 0 var(--s-shadow-color-light),
        -5px -5px 5px 0 inset rgba(255, 255, 255, 0.5),
        1px 1px 10px 0 inset var(--s-shadow-color-dark);
    }

    > :deep(.search.search-input .s-input__content) {
      min-height: 42px;
      padding: 0;
    }

    > :deep(.search.search-input .el-input__inner) {
      line-height: 21px;
      padding: 0 26px;
    }
  }
}
</style>
