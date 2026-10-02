<template>
  <section class="polkamarkt-list">
    <div class="polkamarkt-list__toolbar">
      <label class="polkamarkt-search">
        <s-icon name="basic-search-24" size="20" aria-hidden="true" />
        <input
          v-model="searchValue"
          type="search"
          class="polkamarkt-input"
          :aria-label="t('polkamarkt.markets.search')"
          :placeholder="t('polkamarkt.markets.search')"
        />
      </label>
      <details class="polkamarkt-filters">
        <summary>
          {{ t('polkamarkt.filters.more') }}
          <span v-if="secondaryFilterCount" class="polkamarkt-filters__count">{{ secondaryFilterCount }}</span>
          <s-icon name="arrows-chevron-bottom-24" size="16" aria-hidden="true" />
        </summary>
        <div class="polkamarkt-filters__panel">
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
      </details>
    </div>

    <div class="polkamarkt-categories" role="group" :aria-label="t('polkamarkt.create.category')">
      <button
        v-for="option in categoryOptions"
        :key="option.value"
        type="button"
        :class="[
          'polkamarkt-categories__option',
          { 'polkamarkt-categories__option--active': category === option.value },
        ]"
        :aria-pressed="category === option.value"
        @click="$emit('update:category', option.value)"
      >
        {{ option.label }}
      </button>
    </div>

    <header class="polkamarkt-list__header">
      <h2>
        {{ headingLabel }}
        <span v-if="!loading">{{ filteredMarkets.length }}</span>
      </h2>
      <div class="polkamarkt-list__actions">
        <button v-if="hasFilters" type="button" class="polkamarkt-text-action" @click="clearFilters">
          {{ t('polkamarkt.filters.clear') }}
        </button>
        <button type="button" class="polkamarkt-text-action" :disabled="loading" @click="$emit('refresh')">
          {{ t('connection.action.refresh') }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="polkamarkt-empty" role="status">{{ t('polkamarkt.loadingMarkets') }}</div>
    <div v-else-if="!filteredMarkets.length" class="polkamarkt-empty" role="status">
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

    <div v-else class="polkamarkt-list__cards" data-testid="polkamarkt-market-grid">
      <button
        v-for="market in displayMarkets"
        :key="market.id"
        type="button"
        :class="['market-card', { 'market-card--selected': market.id === selectedId }]"
        @click="$emit('select', market)"
      >
        <span v-if="status !== 'active'" class="market-card__status">{{ marketStatusLabel(market) }}</span>
        <strong class="market-card__question">{{ getMarketQuestion(market.title) }}</strong>
        <span class="market-card__outcomes">
          <span class="market-card__outcome market-card__outcome--yes">
            <span>{{ t('polkamarkt.outcomes.yes') }}</span>
            <strong>{{ formatProbability(market.probability) }}</strong>
          </span>
          <span class="market-card__outcome">
            <span>{{ t('polkamarkt.outcomes.no') }}</span>
            <strong>{{ formatProbability(market.probability, true) }}</strong>
          </span>
        </span>
        <span class="market-card__footer">
          <span>{{ market.category }} · {{ formatUsd(market.volume) }} {{ t('polkamarkt.metrics.volume') }}</span>
          <span class="market-card__action">
            {{ t('polkamarkt.markets.viewMarket') }} <span aria-hidden="true">→</span>
          </span>
        </span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { MARKET_CATEGORIES, type MarketCategory, type MarketStatusFilter } from '../consts';
import { getMarketQuestion } from '../lib/marketQuestion';
import { filterMarkets, getMarketDisplayStatus, rankHotPolkamarktMarkets } from '../lib/markets';

import type { PolkamarktMarket } from '../types';
import type { SelectOption } from '@/lib/soramitsu-ui/components/Select/types';

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
const categoryOptions = computed<SelectOption<MarketCategory | 'all'>[]>(() => [
  { label: t('polkamarkt.filters.allCategories'), value: 'all' },
  ...MARKET_CATEGORIES.filter(
    (category) =>
      category === props.category ||
      filterMarkets(props.markets, { status: props.status, currentBlock: props.currentBlock }).some(
        (market) => market.category === category
      )
  ).map((category) => ({ label: category, value: category })),
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
const statusValue = computed({
  get: () => props.status,
  set: (value) => emit('update:status', value),
});
const mineOnlyValue = computed({
  get: () => props.mineOnly,
  set: (value) => emit('update:mineOnly', value),
});
const secondaryFilterCount = computed(() => Number(props.status !== 'active') + Number(props.mineOnly));
const hasFilters = computed(() => Boolean(props.search || props.category !== 'all' || secondaryFilterCount.value));
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
const displayMarkets = computed(() =>
  props.status === 'active'
    ? rankHotPolkamarktMarkets(filteredMarkets.value, props.currentBlock)
    : filteredMarkets.value
);
const showClosedMarketShortcut = computed(() => props.status === 'active' && !filteredMarkets.value.length);
const closedMarketsLabel = computed(() => `${t('polkamarkt.status.closed')} ${t('polkamarkt.markets.title')}`);
const headingLabel = computed(() =>
  props.status === 'finalized' ? closedMarketsLabel.value : t('polkamarkt.markets.title')
);

/** Restores the default browsing view and clears every user-selected filter. */
function clearFilters(): void {
  emit('update:search', '');
  emit('update:category', 'all');
  emit('update:status', 'active');
  emit('update:mineOnly', false);
}

/** Switches the list to closed markets from the compact empty active state. */
function browseClosedMarkets(): void {
  emit('update:status', 'finalized');
}

/** Presents trading status using the same block-aware status as the detail view. */
function marketStatusLabel(market: PolkamarktMarket): string {
  const status = getMarketDisplayStatus(market, props.currentBlock);
  if (status?.toLowerCase() === 'closed') return t('polkamarkt.status.closed');
  if (status?.toLowerCase() === 'early report locked') return t('polkamarkt.status.earlyReportLocked');
  return status || t('polkamarkt.status.active');
}

/** Formats display odds only; invalid or missing probabilities must never imply a quote. */
function formatProbability(value?: number, no = false): string {
  if (value === undefined || !Number.isFinite(value) || value < 0 || value > 100) return '—';
  const probability = no ? 100 - value : value;
  if (probability > 0 && probability < 1) return '<1%';
  if (probability > 99 && probability < 100) return '>99%';
  const yes = Math.round(value);
  return `${no ? 100 - yes : yes}%`;
}

/** Formats the existing USD volume display; no token amounts are calculated here. */
const formatUsd = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);
</script>

<style lang="scss" scoped>
.polkamarkt-list {
  display: grid;
  gap: 20px;
  min-width: 0;

  &__toolbar {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    min-width: 0;
  }

  &__header,
  &__actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  &__header h2 {
    display: flex;
    gap: 10px;
    align-items: baseline;
    margin: 0;
    font-size: 20px;
    font-weight: 600;

    span {
      color: var(--s-color-base-content-secondary);
      font-size: 14px;
      font-weight: 400;
    }
  }

  &__cards {
    display: grid;
    grid-template-columns: repeat(3, #{'minmax(0, 1fr)'});
    gap: 16px;
    min-width: 0;

    @media (max-width: 1200px) {
      grid-template-columns: repeat(2, #{'minmax(0, 1fr)'});
    }

    @media (max-width: 600px) {
      grid-template-columns: 1fr;
    }
  }
}

.polkamarkt-search {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 46px;
  padding: 0 14px;
  background: var(--s-color-utility-surface);
  border: 1px solid var(--s-color-base-border-secondary);
  border-radius: 12px;
  color: var(--s-color-base-content-secondary);
  transition: border-color 160ms ease;

  &:focus-within {
    border-color: var(--s-color-theme-accent);
  }
}

.polkamarkt-input {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--s-color-base-content-primary);
  font: inherit;
}

.polkamarkt-filters {
  position: relative;
  flex: 0 0 auto;

  summary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 46px;
    padding: 0 14px;
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: 12px;
    cursor: pointer;
    list-style: none;
    font-size: 14px;

    &::-webkit-details-marker {
      display: none;
    }
  }

  &__count {
    color: var(--s-color-theme-accent);
    font-weight: 700;
  }

  &__panel {
    position: absolute;
    inset-inline-end: 0;
    top: calc(100% + 8px);
    z-index: 2;
    display: grid;
    gap: 16px;
    width: 300px;
    max-width: calc(100vw - 48px);
    padding: 16px;
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: 12px;
    background: var(--s-color-utility-surface);
    box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
  }
}

.polkamarkt-status-toggle {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;

  &__option {
    flex: 1 0 auto;
    min-height: 40px;
    padding: 0 10px;
    border: 0;
    border-radius: 8px;
    background: var(--s-color-utility-body);
    color: var(--s-color-base-content-secondary);
    cursor: pointer;
    font: inherit;
    font-size: 13px;

    &--active {
      background: var(--s-color-theme-accent);
      color: var(--s-color-utility-surface);
    }
  }
}

.polkamarkt-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  color: var(--s-color-base-content-secondary);
  font-size: 14px;
}

.polkamarkt-categories {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;

  &__option {
    flex: 0 0 auto;
    min-height: 40px;
    padding: 0 16px;
    border: 0;
    border-radius: 20px;
    background: transparent;
    color: var(--s-color-base-content-secondary);
    font: inherit;
    font-size: 14px;
    cursor: pointer;
    transition:
      background-color 160ms ease,
      color 160ms ease;

    &:hover,
    &--active {
      background: var(--s-color-utility-surface);
      color: var(--s-color-base-content-primary);
    }

    &--active {
      font-weight: 600;
    }
  }
}

.polkamarkt-text-action {
  padding: 4px 0;
  min-height: 40px;
  border: 0;
  background: transparent;
  color: var(--s-color-base-content-secondary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    color: var(--s-color-theme-accent);
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
}

.polkamarkt-empty {
  display: grid;
  gap: 16px;
  justify-items: center;
  padding: 48px 16px;
  color: var(--s-color-base-content-secondary);
  text-align: center;
}

.market-card {
  display: flex;
  flex-direction: column;
  gap: 22px;
  width: 100%;
  min-width: 0;
  padding: 22px;
  border: 1px solid var(--s-color-base-border-secondary);
  border-radius: 16px;
  background: var(--s-color-utility-surface);
  color: var(--s-color-base-content-primary);
  text-align: start;
  font: inherit;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    transform 160ms ease;

  &:hover,
  &--selected {
    border-color: var(--s-color-theme-accent);
  }

  &:hover {
    transform: translateY(-2px);
  }

  &__question {
    display: -webkit-box;
    min-height: 72px;
    overflow: hidden;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    font-size: 18px;
    font-weight: 600;
    line-height: 24px;
    overflow-wrap: anywhere;
  }

  &__outcomes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: auto;
  }

  &__outcome {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    padding: 12px;
    border-radius: 10px;
    background: var(--s-color-utility-body);
    color: var(--s-color-base-content-secondary);
    font-size: 12px;

    strong {
      font-size: 23px;
      font-weight: 600;
      color: var(--s-color-base-content-primary);
      font-variant-numeric: tabular-nums;
    }

    &--yes {
      background: color-mix(in srgb, var(--s-color-theme-accent) 10%, var(--s-color-utility-surface));
      color: var(--s-color-theme-accent);

      strong {
        color: inherit;
      }
    }
  }

  &__status,
  &__footer {
    color: var(--s-color-base-content-secondary);
    font-size: 12px;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__action {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--s-color-base-content-primary);
    font-weight: 600;

    span {
      transition: transform 160ms ease;
    }
  }

  &:hover &__action span {
    transform: translateX(3px);
  }
}

button:focus-visible,
summary:focus-visible {
  outline: 2px solid var(--s-color-theme-accent);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .market-card,
  .market-card:hover,
  .market-card__action span,
  .market-card:hover .market-card__action span,
  .polkamarkt-categories__option,
  .polkamarkt-search {
    transition: none;
    transform: none;
  }
}
</style>
