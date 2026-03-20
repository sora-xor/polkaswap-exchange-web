<template>
  <base-widget v-bind="$attrs" :title="t('networkStatisticsText')">
    <template #filters>
      <stats-filter :disabled="loadingState" :filters="filters" :value="filter" @input="changeFilter"></stats-filter>
    </template>

    <div class="stats-row">
      <div
        v-for="{ title, tooltip, value, change } in statsColumns"
        :key="title"
        class="stats-column app-loading-overlay__host"
      >
        <div v-if="loadingState" class="app-loading-overlay">
          <div class="app-loading-overlay__spinner"></div>
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
              class="stats-card-value"
              :font-weight-rate="FontWeightRate.MEDIUM"
              :font-size-rate="FontSizeRate.MEDIUM"
              :value="value.amount"
              :asset-symbol="value.suffix"
              symbol-as-decimal
            ></formatted-amount>
            <price-change :value="change"></price-change>
          </div>
        </s-card>
      </div>
    </div>
  </base-widget>
</template>

<script setup lang="ts">
import { FPNumber } from '@sora-substrate/math';
import { components, WALLET_CONSTS } from '@wallet';
import { computed, getCurrentScope, onMounted, onScopeDispose, ref, watch } from 'vue';

import { Components } from '@/consts';
import { SECONDS_IN_TYPE, NETWORK_STATS_FILTERS } from '@/consts/snapshots';
import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';
import { fetchData } from '@/indexer/queries/network/stats';
import { lazyComponent } from '@/router';
import { useSettingsStore } from '@/stores/settings';
import type { SnapshotFilter } from '@/types/filters';
import type { AmountWithSuffix } from '@/types/formats';
import type { Nullable } from '@/types/common';
import { calcPriceChange, formatAmountWithSuffix } from '@/utils';

type NetworkSnapshot = {
  accounts: FPNumber;
  transactions: FPNumber;
  bridgeIncomingTransactions: FPNumber;
  bridgeOutgoingTransactions: FPNumber;
};

type NetworkSnapshotData = NetworkSnapshot & {
  timestamp: number;
};

type NetworkStatsColumn = {
  value: AmountWithSuffix;
  change: FPNumber;
  title: string;
  tooltip: string;
};

const BaseWidget = lazyComponent(Components.BaseWidget);
const StatsFilter = lazyComponent(Components.StatsFilter);
const PriceChange = lazyComponent(Components.PriceChange);
const { FormattedAmount } = components;

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

const parentLoading = computed(() => props.parentLoading);
const { loading, withLoading, withParentLoading } = useLoading({ parentLoading });
const { t, tc, TranslationConsts } = useTranslation();
const settingsStore = useSettingsStore();
const nodeIsConnected = computed(() => settingsStore.nodeIsConnected);
const loadingState = computed(() => parentLoading.value || loading.value || !hasResolvedData.value);

const FontSizeRate = WALLET_CONSTS.FontSizeRate;
const FontWeightRate = WALLET_CONSTS.FontWeightRate;
const arrow = String.fromCodePoint(0x2192);

const columns = computed(() => {
  const { Sora, Ethereum } = TranslationConsts;

  return [
    {
      title: tc('transactionText', 2),
      tooltip: t('tooltips.transactions'),
      prop: 'transactions' as const,
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
    const current = currData.value?.[prop] ?? FPNumber.ZERO;
    const previous = prevData.value?.[prop] ?? FPNumber.ZERO;
    return {
      title,
      tooltip,
      value: formatAmountWithSuffix(current),
      change: calcPriceChange(current, previous),
    } satisfies NetworkStatsColumn;
  });
});

const groupData = (data: NetworkSnapshotData[]): Nullable<NetworkSnapshot> => {
  return data.reduce<Nullable<NetworkSnapshot>>((buffer, item) => {
    if (!buffer) return item;

    for (const { prop } of columns.value) {
      buffer[prop] = (buffer[prop] as FPNumber).add(item[prop]);
    }

    return buffer;
  }, null);
};

const updateData = async () => {
  await withLoading(async () => {
    await withParentLoading(async () => {
      try {
        const { type, count } = filter.value;
        const seconds = SECONDS_IN_TYPE[type];
        const now = Math.floor(Date.now() / (seconds * 1000)) * seconds;
        const aTime = now - seconds * count;
        const bTime = aTime - seconds * count;

        const [current, previous] = await Promise.all([fetchData(now, aTime, type), fetchData(aTime, bTime, type)]);

        currData.value = Object.freeze(groupData(current));
        prevData.value = Object.freeze(groupData(previous));
        hasResolvedData.value = current.length > 0 || previous.length > 0 || nodeIsConnected.value;
      } catch (error) {
        console.error(error);
        hasResolvedData.value = nodeIsConnected.value;
      }
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

onMounted(() => {
  void updateData();
});

if (getCurrentScope()) {
  onScopeDispose(() => {
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
      @include columns(4, $gap);
    }
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
