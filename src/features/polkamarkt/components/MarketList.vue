<template>
  <section class="polkamarkt-list">
    <header class="polkamarkt-list__header">
      <div>
        <h2>{{ headingLabel }}</h2>
        <p>{{ subtitleText }}</p>
      </div>
      <s-button type="secondary" size="small" :loading="loading" @click="$emit('refresh')">
        {{ t('connection.action.refresh') }}
      </s-button>
    </header>

    <div class="polkamarkt-list__filters">
      <input v-model="searchValue" class="polkamarkt-input" :placeholder="t('polkamarkt.markets.search')" />
      <s-select
        v-model="categoryValue"
        class="polkamarkt-select"
        :label="t('polkamarkt.create.category')"
        :options="categoryOptions"
        mandatory
        max-shown-options="8"
      />
      <div class="polkamarkt-status-toggle" role="group" :aria-label="t('polkamarkt.metrics.status')">
        <button
          v-for="option in statusOptions"
          :key="option.value"
          type="button"
          :class="[
            'polkamarkt-status-toggle__option',
            { 'polkamarkt-status-toggle__option--active': statusValue === option.value },
          ]"
          :aria-pressed="statusValue === option.value"
          @click="statusValue = option.value"
        >
          {{ option.label }}
        </button>
      </div>
      <label class="polkamarkt-check">
        <input v-model="mineOnlyValue" type="checkbox" :disabled="!account" />
        <span>{{ t('polkamarkt.filters.mine') }}</span>
      </label>
    </div>

    <div v-if="loading" class="polkamarkt-empty">{{ t('polkamarkt.loadingMarkets') }}</div>
    <div v-else-if="!filteredMarkets.length" class="polkamarkt-empty">
      <span>{{ t('polkamarkt.noMarkets') }}</span>
      <s-button
        v-if="showClosedMarketShortcut"
        class="polkamarkt-empty__action"
        type="secondary"
        size="small"
        @click="browseClosedMarkets"
      >
        {{ closedMarketsLabel }}
      </s-button>
    </div>

    <div v-else class="polkamarkt-list__groups" data-testid="polkamarkt-market-groups">
      <section v-for="group in groupedMarkets" :key="group.category" class="polkamarkt-market-group">
        <header class="polkamarkt-market-group__header">
          <div>
            <h3>{{ group.category }}</h3>
            <p>{{ t('polkamarkt.markets.groupTotals', { volume: formatUsd(group.totalVolume) }) }}</p>
          </div>
          <span>{{ t('polkamarkt.markets.groupCount', { count: group.markets.length }) }}</span>
        </header>

        <div class="polkamarkt-market-group__cards">
          <button
            v-for="market in group.markets"
            :key="market.id"
            type="button"
            :class="['market-card', { 'market-card--selected': market.id === selectedId }]"
            @click="$emit('select', market)"
          >
            <span class="market-card__meta">
              <span>{{ market.category }}</span>
              <span>{{ marketStatusLabel(market) }}</span>
              <span v-if="market.trending">{{ t('polkamarkt.markets.trending') }}</span>
            </span>
            <strong>{{ market.title }}</strong>
            <market-probability-sparkline
              :market="market"
              :points="historyForMarket(market)"
              :loading="historyLoadingForMarket(market)"
            />
            <span class="market-card__stats">
              <span>{{ t('polkamarkt.metrics.volume') }} {{ formatUsd(market.volume) }}</span>
              <span>{{ t('polkamarkt.metrics.liquidity') }} {{ formatUsd(market.liquidity) }}</span>
            </span>
          </button>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { MARKET_CATEGORIES, type MarketCategory, type MarketStatusFilter } from '../consts';
import { filterMarkets, getMarketDisplayStatus, groupHotMarketsByCategory } from '../lib/markets';
import MarketProbabilitySparkline from './MarketProbabilitySparkline.vue';

import type { MarketHistoryPoint, PolkamarktMarket } from '../types';
import type { SelectOption } from '@/lib/soramitsu-ui/components/Select/types';

type DisplayMarketGroup = {
  category: MarketCategory;
  markets: PolkamarktMarket[];
  totalLiquidity: number;
  totalVolume: number;
};

const props = withDefaults(
  defineProps<{
    markets: PolkamarktMarket[];
    selectedId?: string;
    search?: string;
    category?: MarketCategory | 'all';
    status?: MarketStatusFilter;
    account?: string;
    mineOnly?: boolean;
    currentBlock?: number;
    loading?: boolean;
    historiesByMarketId?: Record<string, MarketHistoryPoint[]>;
    historiesLoading?: boolean;
  }>(),
  {
    selectedId: '',
    search: '',
    category: 'all',
    status: 'active',
    account: '',
    mineOnly: false,
    currentBlock: 0,
    loading: false,
    historiesByMarketId: () => ({}),
    historiesLoading: false,
  }
);

const emit = defineEmits<{
  (event: 'update:search', value: string): void;
  (event: 'update:category', value: MarketCategory | 'all'): void;
  (event: 'update:status', value: MarketStatusFilter): void;
  (event: 'update:mineOnly', value: boolean): void;
  (event: 'select', market: PolkamarktMarket): void;
  (event: 'refresh'): void;
}>();

const { t } = useTranslation();
const categories = MARKET_CATEGORIES;
const categoryOptions = computed<SelectOption<MarketCategory | 'all'>[]>(() => [
  { label: t('polkamarkt.filters.allCategories'), value: 'all' },
  ...categories.map((category) => ({ label: category, value: category })),
]);
const statusOptions = computed<SelectOption<MarketStatusFilter>[]>(() => [
  { label: t('polkamarkt.filters.active'), value: 'active' },
  { label: t('polkamarkt.status.closed'), value: 'finalized' },
  { label: t('polkamarkt.filters.allStatuses'), value: 'all' },
]);

const searchValue = computed({
  get: () => props.search,
  set: (value) => emit('update:search', value),
});

const categoryValue = computed({
  get: () => props.category,
  set: (value) => emit('update:category', value as MarketCategory | 'all'),
});

const statusValue = computed({
  get: () => props.status,
  set: (value) => emit('update:status', value as MarketStatusFilter),
});

const mineOnlyValue = computed({
  get: () => props.mineOnly,
  set: (value) => emit('update:mineOnly', value),
});

const filteredMarkets = computed(() =>
  filterMarkets(props.markets, {
    search: props.search,
    category: props.category,
    status: props.status,
    account: props.account,
    mineOnly: props.mineOnly,
    currentBlock: props.currentBlock,
  })
);
const groupedMarkets = computed<DisplayMarketGroup[]>(() => {
  if (props.status === 'active') {
    return groupHotMarketsByCategory(filteredMarkets.value, props.currentBlock);
  }

  return groupFilteredMarkets(filteredMarkets.value);
});
const showClosedMarketShortcut = computed(() => props.status === 'active' && !filteredMarkets.value.length);
const closedMarketsLabel = computed(() => `${t('polkamarkt.status.closed')} ${t('polkamarkt.markets.title')}`);
const headingLabel = computed(() =>
  props.status === 'active' ? t('polkamarkt.markets.hotTitle') : t('polkamarkt.markets.title')
);
const subtitleText = computed(() =>
  props.status === 'active'
    ? t('polkamarkt.markets.hotSubtitle', { count: filteredMarkets.value.length })
    : t('polkamarkt.markets.subtitle', { count: filteredMarkets.value.length })
);

/** Switches the list to closed markets from the compact empty active state. */
function browseClosedMarkets(): void {
  emit('update:status', 'finalized');
}

function groupFilteredMarkets(markets: PolkamarktMarket[]): DisplayMarketGroup[] {
  const groups = new Map<MarketCategory, DisplayMarketGroup>();

  for (const market of markets) {
    const group =
      groups.get(market.category) ??
      ({
        category: market.category,
        markets: [],
        totalLiquidity: 0,
        totalVolume: 0,
      } satisfies DisplayMarketGroup);

    group.markets.push(market);
    group.totalLiquidity += market.liquidity || 0;
    group.totalVolume += market.volume || 0;
    groups.set(market.category, group);
  }

  return [...groups.values()];
}

function marketHistoryKey(market: PolkamarktMarket): string {
  return String(market.chainId ?? market.id);
}

function historyForMarket(market: PolkamarktMarket): MarketHistoryPoint[] {
  return props.historiesByMarketId[marketHistoryKey(market)] ?? [];
}

function historyLoadingForMarket(market: PolkamarktMarket): boolean {
  return Boolean(props.historiesLoading && !historyForMarket(market).length);
}

function marketStatusLabel(market: PolkamarktMarket): string {
  const status = getMarketDisplayStatus(market, props.currentBlock);
  if (status?.toLowerCase() === 'closed') return t('polkamarkt.status.closed');
  if (status?.toLowerCase() === 'early report locked') return t('polkamarkt.status.earlyReportLocked');
  return status || t('polkamarkt.status.active');
}

const formatUsd = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);
</script>

<style lang="scss" scoped>
.polkamarkt-list {
  display: flex;
  flex-direction: column;
  gap: $inner-spacing-medium;
  min-width: 0;

  &__header {
    display: flex;
    gap: $inner-spacing-mini;
    justify-content: space-between;
    align-items: flex-start;

    h2 {
      margin: 0;
      font-size: var(--s-heading4-font-size);
      line-height: var(--s-line-height-medium);
    }

    p {
      margin: $inner-spacing-tiny 0 0;
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-small);
    }
  }

  &__filters {
    display: flex;
    flex-wrap: wrap;
    gap: $inner-spacing-mini;
    align-items: center;
    min-width: 0;

    > .polkamarkt-input {
      flex: 1 1 180px;
    }

    > .polkamarkt-select {
      flex: 1 1 132px;
    }

    > .polkamarkt-status-toggle {
      flex: 1 1 230px;
    }

    > .polkamarkt-check {
      flex: 0 0 auto;
    }

    @include tablet(true) {
      align-items: stretch;

      > .polkamarkt-input,
      > .polkamarkt-select,
      > .polkamarkt-status-toggle,
      > .polkamarkt-check {
        flex-basis: 100%;
      }
    }
  }

  &__groups {
    display: grid;
    gap: $inner-spacing-medium;
    min-width: 0;
  }
}

.polkamarkt-input,
.polkamarkt-select {
  min-height: 40px;
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.polkamarkt-status-toggle {
  display: inline-flex;
  gap: 2px;
  align-items: center;
  min-height: 40px;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  padding: 3px;
  border: 1px solid var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-mini);
  background: var(--s-color-utility-body);

  &__option {
    flex: 1 0 auto;
    min-height: 30px;
    border: 0;
    border-radius: calc(var(--s-border-radius-mini) - 4px);
    background: transparent;
    color: var(--s-color-base-content-secondary);
    cursor: pointer;
    font: inherit;
    padding: 0 $inner-spacing-mini;
    white-space: nowrap;

    &--active {
      background: var(--s-color-theme-accent);
      color: var(--s-color-utility-surface);
    }
  }
}

.polkamarkt-input {
  border: 1px solid var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-mini);
  background: var(--s-color-utility-body);
  color: var(--s-color-base-content-primary);
  padding: 0 $inner-spacing-mini;
  font: inherit;
}

.polkamarkt-check {
  display: inline-flex;
  gap: $inner-spacing-tiny;
  align-items: center;
  color: var(--s-color-base-content-secondary);
  font-size: var(--s-font-size-small);
  white-space: nowrap;
}

.polkamarkt-empty {
  display: grid;
  gap: $inner-spacing-mini;
  justify-items: center;
  border: 1px dashed var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-small);
  padding: $inner-spacing-big;
  color: var(--s-color-base-content-secondary);
  text-align: center;

  &__action {
    width: fit-content;
  }
}

.polkamarkt-market-group {
  display: grid;
  gap: $inner-spacing-small;
  min-width: 0;

  &__header {
    display: flex;
    gap: $inner-spacing-small;
    align-items: flex-end;
    justify-content: space-between;
    min-width: 0;
    border-bottom: 1px solid var(--s-color-base-border-secondary);
    padding-bottom: $inner-spacing-mini;

    h3,
    p {
      margin: 0;
    }

    h3 {
      font-size: var(--s-heading5-font-size);
      line-height: var(--s-line-height-medium);
    }

    p,
    span {
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-small);
    }

    > span {
      flex: 0 0 auto;
    }
  }

  &__cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, #{'minmax(min(100%, 260px), 1fr)'});
    gap: $inner-spacing-small;
    min-width: 0;
  }
}

.market-card {
  display: grid;
  gap: $inner-spacing-small;
  width: 100%;
  min-width: 0;
  border: 1px solid var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-small);
  background: var(--s-color-utility-surface);
  color: var(--s-color-base-content-primary);
  padding: $inner-spacing-medium;
  text-align: left;
  cursor: pointer;
  box-shadow: var(--s-shadow-element-pressed);

  &:hover,
  &--selected {
    border-color: var(--s-color-theme-accent);
  }

  strong {
    display: block;
    min-width: 0;
    font-size: var(--s-font-size-big);
    line-height: var(--s-line-height-medium);
    overflow-wrap: anywhere;
  }

  &__meta,
  &__stats {
    display: flex;
    flex-wrap: wrap;
    gap: $inner-spacing-mini;
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-mini);
  }
}
</style>
