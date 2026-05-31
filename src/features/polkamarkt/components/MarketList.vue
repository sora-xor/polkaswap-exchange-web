<template>
  <section class="polkamarkt-list">
    <header class="polkamarkt-list__header">
      <div>
        <h2>{{ t('polkamarkt.markets.title') }}</h2>
        <p>{{ t('polkamarkt.markets.subtitle', { count: filteredMarkets.length }) }}</p>
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
      <s-select
        v-model="statusValue"
        class="polkamarkt-select"
        :label="t('polkamarkt.metrics.status')"
        :options="statusOptions"
        mandatory
      />
      <label class="polkamarkt-check">
        <input v-model="mineOnlyValue" type="checkbox" :disabled="!account" />
        <span>{{ t('polkamarkt.filters.mine') }}</span>
      </label>
    </div>

    <div v-if="loading" class="polkamarkt-empty">{{ t('polkamarkt.loadingMarkets') }}</div>
    <div v-else-if="!filteredMarkets.length" class="polkamarkt-empty">{{ t('polkamarkt.noMarkets') }}</div>

    <div v-else class="polkamarkt-list__items">
      <button
        v-for="market in filteredMarkets"
        :key="market.id"
        type="button"
        :class="['market-card', { 'market-card--selected': market.id === selectedId }]"
        @click="$emit('select', market)"
      >
        <span class="market-card__meta">
          <span>{{ market.category }}</span>
          <span>{{ market.status || t('polkamarkt.status.active') }}</span>
        </span>
        <strong>{{ market.title }}</strong>
        <span class="market-card__stats">
          <span>{{ t('polkamarkt.metrics.yesProbability') }} {{ formatProbability(market.probability) }}</span>
          <span>{{ t('polkamarkt.metrics.liquidity') }} {{ formatUsd(market.liquidity) }}</span>
        </span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { MARKET_CATEGORIES, type MarketCategory, type MarketStatusFilter } from '../consts';
import { filterMarkets } from '../lib/markets';

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
    loading?: boolean;
  }>(),
  {
    selectedId: '',
    search: '',
    category: 'all',
    status: 'active',
    account: '',
    mineOnly: false,
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
const categories = MARKET_CATEGORIES;
const categoryOptions = computed<SelectOption<MarketCategory | 'all'>[]>(() => [
  { label: t('polkamarkt.filters.allCategories'), value: 'all' },
  ...categories.map((category) => ({ label: category, value: category })),
]);
const statusOptions = computed<SelectOption<MarketStatusFilter>[]>(() => [
  { label: t('polkamarkt.filters.active'), value: 'active' },
  { label: t('polkamarkt.filters.finalized'), value: 'finalized' },
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
  })
);

const formatUsd = (value: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);

const formatProbability = (value?: number): string => (Number.isFinite(value) ? `${value}%` : t('polkamarkt.notIndexed'));
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
    display: grid;
    grid-template-columns: minmax(180px, 1fr) minmax(132px, 0.6fr) minmax(132px, 0.6fr) auto;
    gap: $inner-spacing-mini;
    align-items: center;

    @include tablet(true) {
      grid-template-columns: 1fr;
    }
  }

  &__items {
    display: flex;
    flex-direction: column;
    gap: $inner-spacing-mini;
  }
}

.polkamarkt-input,
.polkamarkt-select {
  min-height: 40px;
  width: 100%;
  min-width: 0;
  max-width: 100%;
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
  border: 1px dashed var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-small);
  padding: $inner-spacing-big;
  color: var(--s-color-base-content-secondary);
  text-align: center;
}

.market-card {
  display: flex;
  flex-direction: column;
  gap: $inner-spacing-small;
  width: 100%;
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
    font-size: var(--s-font-size-big);
    line-height: var(--s-line-height-medium);
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
