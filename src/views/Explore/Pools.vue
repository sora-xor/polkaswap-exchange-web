<template>
  <div>
    <s-table
      ref="tableRef"
      v-loading="loadingState"
      :data="tableItems"
      :highlight-current-row="false"
      size="small"
      class="explore-table"
    >
      <!-- Index -->
      <s-table-column min-width="240" label="#">
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
          <div class="explore-table-item-logo">
            <s-icon name="various-bone-24" size="14px" class="explore-table-item-logo--head"></s-icon>
          </div>
          <div class="explore-table-item-info explore-table-item-info--head">
            <span class="explore-table__primary">{{ t('nameText') }}</span>
          </div>
        </template>
        <template v-slot="{ $index, index, row }">
          <span class="explore-table-item-index explore-table-item-index--body">
            {{ ($index ?? index ?? 0) + startIndex + 1 }}
          </span>
          <pair-token-logo
            :first-token="row.baseAsset"
            :second-token="row.targetAsset"
            size="small"
            class="explore-table-item-logo"
          ></pair-token-logo>
          <div class="explore-table-item-info explore-table-item-info--body">
            <div class="explore-table-item-name">{{ row.baseAsset.symbol }}-{{ row.targetAsset.symbol }}</div>
          </div>
        </template>
      </s-table-column>
      <!-- Price -->
      <s-table-column min-width="130" header-align="right" align="right">
        <template #header>
          <sort-button name="priceUSD" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">Price</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <formatted-amount
            is-fiat-value
            fiat-default-rounding
            :font-weight-rate="FontWeightRate.MEDIUM"
            :value="row.priceUSDFormatted"
            class="explore-table-item-price"
          ></formatted-amount>
        </template>
      </s-table-column>
      <!-- APY -->
      <s-table-column min-width="120" header-align="right" align="right">
        <template #header>
          <sort-button name="apy" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">APY</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <span class="explore-table__accent">{{ row.apyFormatted }}</span>
        </template>
      </s-table-column>
      <!-- Account tokens -->
      <s-table-column v-if="isLoggedIn" key="logged" min-width="140" header-align="right" align="right">
        <template #header>
          <span class="explore-table__primary">{{ t('balanceText') }}</span>
        </template>
        <template v-slot="{ row }">
          <div class="explore-table-item-tokens">
            <div v-for="({ asset, balance }, index) in row.accountTokens" :key="index" class="explore-table-cell">
              <formatted-amount
                value-can-be-hidden
                :font-size-rate="FontSizeRate.SMALL"
                :value="balance"
                class="explore-table-item-token"
              ></formatted-amount>
              <token-logo
                size="small"
                class="explore-table-item-logo explore-table-item-logo--plain"
                :token="asset"
              ></token-logo>
            </div>
          </div>
        </template>
      </s-table-column>
      <!-- Pool tokens -->
      <s-table-column min-width="200" header-align="right" align="right">
        <template #header>
          <span class="explore-table__primary">Pool Tokens</span>
        </template>
        <template v-slot="{ row }">
          <div class="explore-table-item-tokens">
            <div v-for="({ asset, balance }, index) in row.poolTokens" :key="index" class="explore-table-cell">
              <formatted-amount
                :font-size-rate="FontSizeRate.SMALL"
                :value="balance"
                class="explore-table-item-token"
              ></formatted-amount>
              <token-logo
                size="small"
                class="explore-table-item-logo explore-table-item-logo--plain"
                :token="asset"
              ></token-logo>
            </div>
          </div>
        </template>
      </s-table-column>
      <!-- TVL -->
      <s-table-column key="tvl" min-width="104" header-align="right" align="right">
        <template #header>
          <sort-button name="tvl" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">{{ TranslationConsts.TVL }}</span>
            <s-tooltip border-radius="mini" :content="t('tooltips.tvl')">
              <s-icon name="info-16" size="14px"></s-icon>
            </s-tooltip>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <data-row-skeleton :loading="!pricesAvailable" rect>
            <formatted-amount
              is-fiat-value
              :font-weight-rate="FontWeightRate.MEDIUM"
              :value="row.tvlFormatted.amount"
              class="explore-table-item-price explore-table-item-amount"
            >
              {{ row.tvlFormatted.suffix }}
            </formatted-amount>
          </data-row-skeleton>
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
import { KnownAssets } from '@sora-substrate/sdk/build/assets/consts';
import { components, WALLET_CONSTS } from '@wallet';
import { computed, ref, watch } from 'vue';

import { SortDirection } from '@soramitsu-ui/ui/types';
import { useExploreTable } from '@/composables/useExploreTable';
import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';
import { Components, TranslationConsts } from '@/consts';
import { fetchPoolsData, type PoolData } from '@/indexer/queries/pool/pools';
import { lazyComponent } from '@/router';
import store from '@/store';
import { useAssetsStore } from '@/stores/assets';
import { buildPoolTableItems, filterPoolTableItems, type PoolExploreTableItem } from '@/views/Explore/poolsTable';

import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';

defineOptions({
  components: {
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    SortButton: lazyComponent(Components.SortButton),
    DataRowSkeleton: lazyComponent(Components.DataRowSkeleton),
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
    HistoryPagination: components.HistoryPagination,
  },
});

const FontSizeRate = WALLET_CONSTS.FontSizeRate;
const FontWeightRate = WALLET_CONSTS.FontWeightRate;

const props = defineProps({
  parentLoading: { type: Boolean, default: false },
  exploreQuery: { type: String, default: '' },
  isAccountItemsOnly: { type: Boolean, default: false },
});

const { t } = useTranslation();
const parentLoading = computed(() => props.parentLoading);
const { loading, withLoading, withParentLoading } = useLoading({ parentLoading });
const loadingState = computed(() => loading.value || parentLoading.value);

const assetsStore = useAssetsStore();
const whitelistAssets = computed(() => assetsStore.whitelistAssets ?? []);
const allowedAssets = computed(() => (whitelistAssets.value.length ? whitelistAssets.value : KnownAssets));

const getAsset = (address?: string) => assetsStore.assetDataByAddress(address);
const accountLiquidity = computed<readonly AccountLiquidity[]>(() => store.state.pool.accountLiquidity ?? []);
const poolsData = ref<readonly PoolData[]>([]);

const items = computed<PoolExploreTableItem[]>(() =>
  buildPoolTableItems({
    pools: poolsData.value,
    accountLiquidity: accountLiquidity.value,
    getAsset,
  })
);

const prefilteredItems = computed(() =>
  props.isAccountItemsOnly ? items.value.filter((item) => item.isAccountItem) : items.value
);

const exploreQuery = computed(() => props.exploreQuery ?? '');

const table = useExploreTable<PoolExploreTableItem>({
  items: prefilteredItems,
  query: exploreQuery,
  filter: filterPoolTableItems,
  defaultOrder: SortDirection.DESC,
  defaultProperty: 'tvl',
});

const {
  tableItems,
  order,
  property,
  isDefaultSort,
  handlePaginationClick,
  changeSort,
  handleResetSort,
  currentPage,
  pageAmount,
  total,
  lastPage,
  startIndex,
  tableRef,
} = table;

const pricesAvailable = computed(() => {
  const fiatPriceObject = store.state.wallet.account.fiatPriceObject ?? {};
  return Object.keys(fiatPriceObject).length > 0;
});

const isLoggedIn = computed(() => store.getters.wallet.account.isLoggedIn as boolean);
const whitelistSignature = computed(() => whitelistAssets.value.map((asset) => asset.address).join(';'));

const updateExploreData = async (): Promise<void> => {
  if (loading.value) return;

  await withLoading(async () => {
    await withParentLoading(async () => {
      const data = await fetchPoolsData(allowedAssets.value);
      poolsData.value = Object.freeze(data ?? []);
    });
  });
};

watch(
  () => whitelistSignature.value,
  () => {
    updateExploreData();
  },
  { immediate: true }
);
</script>

<style lang="scss">
@include explore-table;
</style>
