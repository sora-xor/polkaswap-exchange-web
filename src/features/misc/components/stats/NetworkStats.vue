<template>
  <base-widget v-bind="$attrs" :title="t('networkStatisticsText')">
    <template #filters>
      <stats-filter
        :disabled="loadingState"
        :filters="filters"
        :model-value="filter"
        @update:model-value="changeFilter"
      ></stats-filter>
    </template>

    <div class="stats-row">
      <div
        v-for="{ title, tooltip, value, change } in statsColumns"
        :key="title"
        class="stats-column app-loading-overlay__host"
      >
        <div v-if="loadingState" class="app-loading-overlay el-loading-mask">
          <div class="app-loading-overlay__spinner el-loading-spinner"></div>
        </div>
        <s-card size="small" border-radius="mini">
          <div slot="header" class="stats-card-title">
            <span>{{ title }}</span>
            <s-tooltip border-radius="mini" :content="tooltip">
              <s-icon name="info-16" size="14px"></s-icon>
            </s-tooltip>
          </div>
          <div class="stats-card-data">
            <formatted-amount
              v-if="value"
              class="stats-card-value"
              :font-weight-rate="FontWeightRate.MEDIUM"
              :font-size-rate="FontSizeRate.MEDIUM"
              :value="value.amount"
              :asset-symbol="value.suffix"
              :integer-only="!value.amount.includes(FPNumber.DELIMITERS_CONFIG.decimal)"
              symbol-as-decimal
            ></formatted-amount>
            <span v-else data-testid="network-metric-unavailable">{{ t('footer.statistics.title.unavailable') }}</span>
            <price-change v-if="change" :value="change"></price-change>
          </div>
        </s-card>
      </div>
    </div>
    <details
      v-if="
        !loadingState &&
        currData?.archivedDays.length &&
        (currData.transactions === null ||
          currData.bridgeIncomingTransactions === null ||
          currData.bridgeOutgoingTransactions === null)
      "
      class="archive-days"
      data-testid="archive-days"
    >
      <summary>{{ t('networkVerifiedDays') }}</summary>
      <div class="archive-days__scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">{{ t('bridgeTransaction.networkInfo.date') }} (UTC)</th>
              <th scope="col">{{ columns[0].title }}</th>
              <th scope="col">{{ columns[3].title }}</th>
              <th scope="col">{{ columns[4].title }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="day in currData.archivedDays" :key="day.date">
              <th scope="row">
                <time :datetime="day.date">{{ day.date }}</time>
              </th>
              <td v-for="key in archivedFields" :key="key">
                {{ day[key] ?? t('footer.statistics.title.unavailable') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
    <a
      v-if="settingsStore.soraNetwork === SoraNetwork.Prod"
      class="stats-download"
      :href="verifiedDaysCsv"
      download="polkaswap-verified-days-2026-11-10.csv"
      data-testid="verified-days-download"
      >{{ t('networkVerifiedDays') }} (CSV)</a
    >
  </base-widget>
</template>

<script setup lang="ts">
import { FPNumber } from '@sora-substrate/math';
import { computed, getCurrentScope, onMounted, onScopeDispose, ref, watch } from 'vue';

import PriceChange from '@/components/shared/PriceChange.vue';
import StatsFilter from '@/components/shared/Stats/StatsFilter.vue';
import BaseWidget from '@/components/shared/Widget/Base.vue';
import { SECONDS_IN_TYPE, NETWORK_STATS_FILTERS } from '@/consts/snapshots';
import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';
import {
  fetchActiveAccounts,
  readNetworkPeriodCounts,
  type NetworkCounts,
  type ArchiveDayCounts,
} from '@/indexer/queries/network/stats';
import { FontSizeRate, FontWeightRate, SoraNetwork } from '@/lib/soraneo-wallet/src/consts';
import verifiedDaysCsv from '@/assets/stats/polkaswap-verified-days-2026-11-10.csv?url&no-inline';
import FormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';
import { useSettingsStore } from '@/stores/settings';
import { createStatsRange } from '@/features/misc/components/stats/range';
import type { SnapshotFilter } from '@/types/filters';
import type { AmountWithSuffix } from '@/types/formats';
import type { Nullable } from '@/types/common';
import { calcPriceChange, formatAmountWithSuffix } from '@/utils';

type NetworkSnapshot = NetworkCounts & { activeAccounts: FPNumber | null; archivedDays: ArchiveDayCounts[] };

type NetworkStatsColumn = {
  value: AmountWithSuffix | null;
  change: FPNumber | null;
  title: string;
  tooltip: string;
};

const props = withDefaults(
  defineProps<{
    parentLoading?: boolean;
  }>(),
  {
    parentLoading: false,
  }
);

const filters = NETWORK_STATS_FILTERS;
const filter = ref<SnapshotFilter>(filters[0]);

const currData = ref<Nullable<NetworkSnapshot>>(null);
const prevData = ref<Nullable<NetworkSnapshot>>(null);
const hasResolvedData = ref(false);
let pendingRead: AbortController | undefined;

const parentLoading = computed(() => props.parentLoading);
const { loading, withLoading, withParentLoading } = useLoading({ parentLoading });
const { t, tc, TranslationConsts } = useTranslation();
const settingsStore = useSettingsStore();
const nodeIsConnected = computed(() => settingsStore.nodeIsConnected);
const indexerEndpoint = computed(() => {
  const type = settingsStore.indexerType;

  return type ? (settingsStore.indexers?.[type]?.endpoint ?? '') : '';
});
const loadingState = computed(() => parentLoading.value || loading.value || !hasResolvedData.value);

const arrow = String.fromCodePoint(0x2192);
const archivedFields = ['transactions', 'bridgeIncomingTransactions', 'bridgeOutgoingTransactions'] as const;

const columns = computed(() => {
  const { Sora, Ethereum } = TranslationConsts;

  return [
    {
      title: tc('transactionText', 2),
      tooltip: t('tooltips.transactions'),
      prop: 'transactions' as const,
    },
    {
      title: t('activeAccountsText'),
      tooltip: t('tooltips.activeAccounts'),
      prop: 'activeAccounts' as const,
    },
    {
      title: t('newAccountsText'),
      tooltip: t('tooltips.accounts'),
      prop: 'accounts' as const,
    },
    {
      title: [Ethereum, arrow, Sora].join(' '),
      tooltip: t('tooltips.bridgeTransactions', { from: Ethereum, to: Sora }),
      prop: 'bridgeIncomingTransactions' as const,
    },
    {
      title: [Sora, arrow, Ethereum].join(' '),
      tooltip: t('tooltips.bridgeTransactions', { from: Sora, to: Ethereum }),
      prop: 'bridgeOutgoingTransactions' as const,
    },
  ];
});

const statsColumns = computed<NetworkStatsColumn[]>(() => {
  return columns.value.map(({ prop, title, tooltip }) => {
    const current = currData.value?.[prop];
    const previous = prevData.value?.[prop];
    return {
      title,
      tooltip,
      value: current ? formatAmountWithSuffix(current) : null,
      change: current && previous ? calcPriceChange(current, previous) : null,
    } satisfies NetworkStatsColumn;
  });
});

/** Distinct counts from retained transactions need the same period’s transaction coverage. */
async function fetchPeriod(
  from: number,
  to: number,
  type: SnapshotFilter['type'],
  signal: AbortSignal
): Promise<NetworkSnapshot> {
  const [metrics, activity] = await Promise.allSettled([
    readNetworkPeriodCounts(from, to, type, signal),
    // Account activity accepts an inclusive lower bound. The Stats period is (to, from].
    fetchActiveAccounts(from, to + 1),
  ]);
  const period = metrics.status === 'fulfilled' ? metrics.value : null;
  const counts = period?.counts;
  return {
    transactions: counts?.transactions ?? null,
    accounts: counts?.accounts ?? null,
    bridgeIncomingTransactions: counts?.bridgeIncomingTransactions ?? null,
    bridgeOutgoingTransactions: counts?.bridgeOutgoingTransactions ?? null,
    archivedDays: period?.archivedDays ?? [],
    activeAccounts:
      period?.retainedTransactionsComplete && counts?.transactions && activity.status === 'fulfilled'
        ? activity.value
        : null,
  };
}

/** Refresh both periods together and discard obsolete results when the filter or endpoint changes. */
const updateData = async () => {
  pendingRead?.abort();
  const controller = new AbortController();
  pendingRead = controller;
  await withLoading(async () => {
    await withParentLoading(async () => {
      const { type, count } = filter.value;
      const { from, to, previousFrom, previousTo } = createStatsRange(Date.now(), SECONDS_IN_TYPE[type], count);
      const [current, previous] = await Promise.all([
        fetchPeriod(from, to, type, controller.signal),
        fetchPeriod(previousFrom, previousTo, type, controller.signal),
      ]);
      if (controller.signal.aborted) return;
      currData.value = Object.freeze(current);
      prevData.value = Object.freeze(previous);
      hasResolvedData.value =
        nodeIsConnected.value ||
        Boolean(indexerEndpoint.value) ||
        columns.value.some(({ prop }) => current[prop] !== null) ||
        current.archivedDays.length > 0;
    });
  });
};

const changeFilter = (value: SnapshotFilter) => {
  filter.value = value;
  updateData();
};

watch(nodeIsConnected, (connected) => {
  if (!connected) {
    hasResolvedData.value = false;
    return;
  }

  if (!hasResolvedData.value) {
    void updateData();
  }
});

watch(indexerEndpoint, (endpoint, previousEndpoint) => {
  if (endpoint === previousEndpoint) return;
  pendingRead?.abort();
  currData.value = null;
  prevData.value = null;
  hasResolvedData.value = false;
  if (endpoint) void updateData();
});

onMounted(() => {
  void updateData();
});

if (getCurrentScope()) {
  onScopeDispose(() => {
    pendingRead?.abort();
    currData.value = null;
    prevData.value = null;
    hasResolvedData.value = false;
  });
}
</script>

<style lang="scss">
.stats-column .el-loading-mask {
  border-radius: var(--s-border-radius-mini);
}
</style>

<style lang="scss" scoped>
$gap: $inner-spacing-mini;

.stats-row {
  display: flex;
  flex-flow: row wrap;
  gap: $gap;

  .stats-column {
    @include columns(2, $gap);

    @include desktop {
      @include columns(5, $gap);
    }
  }
}

.stats-download {
  display: inline-block;
  margin-top: $inner-spacing-small;
  text-decoration: underline;
}

.archive-days {
  margin-top: $inner-spacing-small;
  summary {
    cursor: pointer;
    color: var(--s-color-theme-accent);
  }
  &__scroll {
    overflow-x: auto;
  }
  table {
    width: 100%;
    margin-top: $inner-spacing-mini;
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
  }
  th,
  td {
    padding: $inner-spacing-mini;
    text-align: end;
  }
  th:first-child {
    text-align: start;
    white-space: nowrap;
  }
}

.stats-card {
  &-title {
    display: flex;
    align-items: center;
    gap: $inner-spacing-mini;

    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-small);
    font-weight: 800;
    text-transform: uppercase;
  }
  &-data {
    display: flex;
    flex-flow: row nowrap;
    justify-content: space-between;
    margin-top: $inner-spacing-small;
  }
  &-value {
    font-size: var(--s-font-size-big);
  }
}
</style>
