<template>
  <main class="polkamarkt">
    <section class="polkamarkt__top">
      <div>
        <h1>{{ t('pageTitle.Polkamarkt') }}</h1>
        <p>{{ t('polkamarkt.pageSubtitle') }}</p>
        <a class="polkamarkt__external-link" href="https://polkamarkt.com" target="_blank" rel="nofollow noopener noreferrer">
          {{ t('polkamarkt.officialSite') }}
        </a>
        <p class="polkamarkt__disclaimer">{{ t('polkamarkt.disclaimer') }}</p>
      </div>
      <div class="polkamarkt__actions">
        <s-button v-if="!isConnected" type="secondary" @click="connectSoraWallet">
          {{ t('connectWalletText') }}
        </s-button>
        <s-button type="primary" @click="createDialogVisible = true">
          {{ t('polkamarkt.actions.createMarket') }}
        </s-button>
      </div>
    </section>

    <section class="polkamarkt__layout">
      <market-list
        v-model:search="search"
        v-model:category="category"
        v-model:status="status"
        v-model:mine-only="mineOnly"
        :markets="markets"
        :selected-id="selectedMarket?.id"
        :account="accountAddress"
        :loading="marketsLoading"
        @select="selectMarket"
        @refresh="refreshMarkets"
      />

      <div class="polkamarkt__workspace">
        <market-detail
          :market="selectedMarket"
          :history="marketHistory"
          :history-loading="marketHistoryLoading"
          :current-block="currentBlock"
        />
        <trade-ticket
          :market="selectedMarket"
          :account-position="selectedPosition"
          @submitted="handleTransactionSubmitted"
        />
      </div>
    </section>

    <my-positions-panel
      :markets="markets"
      :positions="positions"
      :trades="trades"
      :account="accountAddress"
      :is-logged-in="isConnected"
      :loading="activityLoading"
      @connect="connectSoraWallet"
      @select="selectMarket"
      @open-position="selectPositionMarket"
    />

    <p v-if="marketsError" class="polkamarkt__error">{{ marketsError }}</p>
    <p v-if="activityError" class="polkamarkt__error">{{ activityError }}</p>

    <create-market-dialog v-model:visible="createDialogVisible" @created="handleMarketCreated" />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useInternalConnect } from '@/composables/useInternalConnect';
import { useTranslation } from '@/composables/useTranslation';
import { IndexerType, PageNames } from '@/consts';
import { useSettingsStore } from '@/stores/settings';
import CreateMarketDialog from '../components/CreateMarketDialog.vue';
import MarketDetail from '../components/MarketDetail.vue';
import MarketList from '../components/MarketList.vue';
import MyPositionsPanel from '../components/MyPositionsPanel.vue';
import TradeTicket from '../components/TradeTicket.vue';
import { fetchPolkamarktAccountActivity } from '../services/accountActivity';
import { fetchPolkamarktMarketHistory } from '../services/marketHistory';
import { fetchPolkamarktMarkets } from '../services/markets';

import type { AccountPosition, AccountTrade, MarketHistoryPoint, PolkamarktMarket } from '../types';
import type { MarketCategory, MarketStatusFilter } from '../consts';

defineOptions({
  name: 'PolkamarktPage',
});

const { t } = useTranslation();
const router = useRouter();
const route = useRoute();
const settingsStore = useSettingsStore();
const { isLoggedIn, soraAddress, connectSoraWallet } = useInternalConnect();

const markets = ref<PolkamarktMarket[]>([]);
const marketsLoading = ref(false);
const marketsError = ref('');
const activityLoading = ref(false);
const activityError = ref('');
const positions = ref<AccountPosition[]>([]);
const trades = ref<AccountTrade[]>([]);
const marketHistory = ref<MarketHistoryPoint[]>([]);
const marketHistoryLoading = ref(false);
const selectedMarketId = ref('');
const search = ref('');
const category = ref<MarketCategory | 'all'>('all');
const status = ref<MarketStatusFilter>('active');
const mineOnly = ref(false);
const createDialogVisible = ref(false);

type MaybeValue<T> = T | { value: T };

const isConnectedSource = isLoggedIn as unknown as MaybeValue<boolean>;
const accountAddressSource = soraAddress as unknown as MaybeValue<string | undefined>;
const isConnected = computed(() => Boolean(typeof isConnectedSource === 'object' ? isConnectedSource.value : isConnectedSource));
const accountAddress = computed(() =>
  String(typeof accountAddressSource === 'object' ? accountAddressSource.value ?? '' : accountAddressSource ?? '')
);
const currentBlock = computed(() => Number(settingsStore.blockNumber ?? 0));
const polkaswapIndexerEndpoint = computed(() =>
  String(settingsStore.indexers?.[IndexerType.POLKASWAP]?.endpoint ?? '')
);
const selectedMarket = computed(() => {
  if (!markets.value.length) return undefined;
  const id = selectedMarketId.value || String(route.params.marketId ?? '');
  const selected =
    markets.value.find((market) => String(market.chainId ?? market.id) === id || market.id === id) ?? markets.value[0];
  return selected;
});

const selectedPosition = computed(() => {
  const marketId = selectedMarket.value?.chainId;
  if (marketId === undefined) return undefined;
  return positions.value.find((position) => position.marketId === marketId);
});

let marketHistoryRequestId = 0;

async function refreshMarkets(): Promise<void> {
  marketsLoading.value = true;
  marketsError.value = '';
  try {
    markets.value = await fetchPolkamarktMarkets();
    if (!selectedMarketId.value && route.params.marketId) {
      selectedMarketId.value = String(route.params.marketId);
    }
    if (!selectedMarketId.value && markets.value[0]) {
      selectedMarketId.value = String(markets.value[0].chainId ?? markets.value[0].id);
    }
  } catch (err) {
    marketsError.value = err instanceof Error ? err.message : t('polkamarkt.errors.loadMarkets');
  } finally {
    marketsLoading.value = false;
  }
}

async function refreshActivity(): Promise<void> {
  if (!isConnected.value || !accountAddress.value) {
    positions.value = [];
    trades.value = [];
    activityError.value = '';
    return;
  }

  activityLoading.value = true;
  activityError.value = '';
  try {
    const activity = await fetchPolkamarktAccountActivity(accountAddress.value);
    positions.value = activity.positions;
    trades.value = activity.trades;
  } catch (err) {
    positions.value = [];
    trades.value = [];
    activityError.value = err instanceof Error ? err.message : t('polkamarkt.errors.loadActivity');
  } finally {
    activityLoading.value = false;
  }
}

async function refreshMarketHistory(market = selectedMarket.value): Promise<void> {
  const requestId = ++marketHistoryRequestId;

  if (!market) {
    marketHistory.value = [];
    marketHistoryLoading.value = false;
    return;
  }

  marketHistoryLoading.value = true;
  try {
    const history = await fetchPolkamarktMarketHistory(market);
    if (requestId === marketHistoryRequestId) {
      marketHistory.value = history;
    }
  } finally {
    if (requestId === marketHistoryRequestId) {
      marketHistoryLoading.value = false;
    }
  }
}

function selectMarket(market: PolkamarktMarket): void {
  const id = String(market.chainId ?? market.id);
  selectedMarketId.value = id;
  router.push({ name: PageNames.Polkamarkt, params: { marketId: id } });
}

function selectPositionMarket(position: AccountPosition): void {
  const market = markets.value.find((item) => item.chainId === position.marketId);
  if (market) {
    selectMarket(market);
  }
}

async function handleTransactionSubmitted(): Promise<void> {
  await Promise.allSettled([refreshMarkets(), refreshActivity(), refreshMarketHistory()]);
}

async function handleMarketCreated(marketId?: number): Promise<void> {
  await refreshMarkets();
  if (marketId !== undefined) {
    const market = markets.value.find((item) => item.chainId === marketId);
    if (market) selectMarket(market);
  }
}

watch(
  () => route.params.marketId,
  (value) => {
    selectedMarketId.value = String(value ?? '');
  },
  { immediate: true }
);

watch([isConnected, accountAddress], () => void refreshActivity(), { immediate: true });

watch(selectedMarket, (market) => void refreshMarketHistory(market), { immediate: true });

watch(polkaswapIndexerEndpoint, (endpoint, previousEndpoint) => {
  if (!endpoint || endpoint === previousEndpoint) return;

  void refreshMarkets();
});

onMounted(() => {
  void refreshMarkets();
});

defineExpose({
  markets,
  selectedMarket,
  marketHistory,
  positions,
  trades,
  refreshMarkets,
  refreshActivity,
  refreshMarketHistory,
});
</script>

<style lang="scss" scoped>
.polkamarkt {
  display: grid;
  gap: $inner-spacing-big;
  margin: 0 $inner-spacing-big $inner-spacing-big 0;

  @include tablet(true) {
    margin: 0 $inner-spacing-mini $inner-spacing-big;
  }

  &__top {
    display: flex;
    justify-content: space-between;
    gap: $inner-spacing-medium;
    align-items: flex-start;

    @include tablet(true) {
      flex-direction: column;
    }

    h1 {
      margin: 0;
      font-size: var(--s-heading2-font-size);
      line-height: 1.2;
      letter-spacing: 0;
    }

    p {
      margin: $inner-spacing-tiny 0 0;
      color: var(--s-color-base-content-secondary);
      max-width: 760px;
      line-height: 1.6;
    }
  }

  &__external-link {
    display: inline-flex;
    margin-top: $inner-spacing-tiny;
    color: var(--s-color-theme-accent);
    font-weight: 700;
    line-height: 1.4;
    text-decoration: none;

    &:hover,
    &:focus {
      text-decoration: underline;
    }
  }

  &__disclaimer {
    font-size: var(--s-font-size-mini);
  }

  &__actions {
    display: flex;
    gap: $inner-spacing-mini;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  &__layout {
    display: grid;
    grid-template-columns: minmax(300px, 0.42fr) minmax(0, 1fr);
    gap: $inner-spacing-big;
    align-items: flex-start;

    @include desktop(true) {
      grid-template-columns: 1fr;
    }
  }

  &__workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
    gap: $inner-spacing-big;
    align-items: flex-start;

    @include desktop(true) {
      grid-template-columns: 1fr;
    }
  }

  &__error {
    color: var(--s-color-status-error);
    margin: 0;
  }
}
</style>
