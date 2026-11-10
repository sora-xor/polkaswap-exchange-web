<template>
  <div>
    <s-table
      ref="tableRef"
      v-loading="loadingState"
      :data="tableItems"
      :adapt-breakpoint="0"
      :highlight-current-row="false"
      size="small"
      class="explore-table"
    >
      <!-- Index -->
      <s-table-column width="240" label="#">
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
            {{
              (typeof ($index ?? index) === 'number' && Number.isFinite($index ?? index)
                ? ($index ?? index)
                : tableItems.indexOf(row)) +
              startIndex +
              1
            }}
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
      <s-table-column key="price" min-width="130" header-align="right" align="right">
        <template #header>
          <sort-button name="price" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">Price</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <formatted-amount
            v-if="row.priceFormatted != null"
            fiat-default-rounding
            :font-weight-rate="FontWeightRate.MEDIUM"
            :integer-only="isAmountValueIntegerOnly(row.priceFormatted)"
            :value="row.priceFormatted"
            class="explore-table-item-price"
          ></formatted-amount>
          <market-unavailable v-else />
          <formatted-amount
            v-if="row.priceUSDFormatted != null"
            is-fiat-value
            fiat-default-rounding
            :font-weight-rate="FontWeightRate.MEDIUM"
            :value="row.priceUSDFormatted"
            class="explore-table-item-price"
          ></formatted-amount>
          <market-unavailable v-else />
        </template>
      </s-table-column>
      <!-- 1D Price Change -->
      <s-table-column min-width="104" header-align="right" align="right">
        <template #header>
          <sort-button name="priceChangeDay" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">1D %</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <price-change v-if="row.priceChangeDayFP != null" :value="row.priceChangeDayFP"></price-change>
          <market-unavailable v-else />
        </template>
      </s-table-column>
      <!-- 1D Volume -->
      <s-table-column min-width="104" header-align="right" align="right">
        <template #header>
          <sort-button name="volumeDay" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">1D Vol.</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <formatted-amount
            is-fiat-value
            :font-weight-rate="FontWeightRate.MEDIUM"
            fiat-default-rounding
            :value="row.volumeDayFormatted.amount"
            class="explore-table-item-price explore-table-item-amount"
          >
            {{ row.volumeDayFormatted.suffix }}
          </formatted-amount>
        </template>
      </s-table-column>
      <!-- TVL -->
      <s-table-column min-width="104" header-align="right" align="right">
        <template #header>
          <sort-button name="tvl" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">{{ TranslationConsts.TVL }}</span>
            <s-tooltip border-radius="mini" :content="t('tooltips.tvl')">
              <s-icon name="info-16" size="14px"></s-icon>
            </s-tooltip>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <formatted-amount
            v-if="row.tvlFormatted != null"
            is-fiat-value
            :font-weight-rate="FontWeightRate.MEDIUM"
            fiat-default-rounding
            :value="row.tvlFormatted.amount"
            class="explore-table-item-price explore-table-item-amount"
          >
            {{ row.tvlFormatted.suffix }}
          </formatted-amount>
          <market-unavailable v-else />
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

<script setup lang="ts">
import MarketUnavailable from '@/shared/ui/MarketUnavailable.vue';
import { valueAtMarketPrice } from '@/lib/soraneo-wallet/src/services/indexer/marketPrice';
import { FPNumber } from '@sora-substrate/sdk';
import { KnownAssets } from '@sora-substrate/sdk/build/assets/consts';
import { SortDirection } from '@soramitsu-ui/ui/types';
import { computed, ref, toRef, watch } from 'vue';

import { useExploreTable } from '@/composables/useExploreTable';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useLoading } from '@/composables/useLoading';
import { createCoalescedAsyncTask } from '@/utils/asyncTask';
import { useTranslation } from '@/composables/useTranslation';
import { fetchOrderBooks } from '@/indexer/queries/orderBook/orderBooks';
import { FontWeightRate } from '@/lib/soraneo-wallet/src/consts';
import { useAssetsStore } from '@/stores/assets';
import { useSettingsStore } from '@/stores/settings';
import type { AmountWithSuffix } from '@/types/formats';
import type { OrderBookWithStats } from '@/types/orderBook';
import { formatAmountWithSuffix, isAmountValueIntegerOnly, sortPools } from '@/utils';

import type { Asset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import WalletComponentTokenAddress from '@/lib/soraneo-wallet/src/components/TokenAddress.vue';
import WalletComponentFormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';
import WalletComponentHistoryPagination from '@/lib/soraneo-wallet/src/components/HistoryPagination.vue';
import PairTokenLogo from '@/components/shared/PairTokenLogo.vue';
import PriceChange from '@/components/shared/PriceChange.vue';
import SortButton from '@/components/shared/Button/SortButton.vue';

type TableItem = {
  name: string;
  baseAsset: Asset;
  targetAsset: Asset;
  price: number | null;
  priceFormatted: string | null;
  priceUSDFormatted: string | null;
  priceChangeDay: number | null;
  priceChangeDayFP: FPNumber | null;
  volumeDay: number;
  volumeDayFormatted: AmountWithSuffix;
  tvl: number | null;
  tvlFormatted: AmountWithSuffix | null;
};

const props = withDefaults(
  defineProps<{
    exploreQuery?: string;
    isAccountItemsOnly?: boolean;
    parentLoading?: boolean;
  }>(),
  {
    exploreQuery: '',
    isAccountItemsOnly: false,
    parentLoading: false,
  }
);

defineOptions({
  name: 'ExploreBooksPage',
  components: {
    PairTokenLogo,
    PriceChange,
    SortButton,
    TokenAddress: WalletComponentTokenAddress,
    FormattedAmount: WalletComponentFormattedAmount,
    HistoryPagination: WalletComponentHistoryPagination,
  },
});

const { t, TranslationConsts } = useTranslation();
const { getAssetFiatPrice } = useFormattedAmount();
const parentLoading = toRef(props, 'parentLoading');
const { loading, withLoading, withParentLoading } = useLoading({ parentLoading });
const assetsStore = useAssetsStore();
const settingsStore = useSettingsStore();

const loadingState = computed(() => parentLoading.value || loading.value);
const orderBooks = ref<readonly OrderBookWithStats[]>([]);

const getAsset = (addr?: string) => assetsStore.assetDataByAddress(addr) as Nullable<RegisteredAccountAsset>;
const whitelistAssets = computed(() => assetsStore.whitelistAssets as Array<Asset>);
const allowedAssets = computed<Array<Asset>>(() =>
  whitelistAssets.value.length ? whitelistAssets.value : [...KnownAssets]
);
const whitelistSignature = computed(() => whitelistAssets.value.map((asset) => asset.address).join(';'));
const indexerEndpoint = computed(() => {
  const type = settingsStore.indexerType;

  return type ? (settingsStore.indexers?.[type]?.endpoint ?? '') : '';
});

const prefilteredItems = computed<TableItem[]>(() => {
  const items = orderBooks.value.reduce<TableItem[]>((buffer, item) => {
    const {
      id: { base, quote },
      stats: { baseAssetReserves, quoteAssetReserves, price, priceChange, volume },
    } = item;

    const baseAsset = getAsset(base);
    const targetAsset = getAsset(quote);

    if (!(baseAsset && targetAsset)) return buffer;

    const name = `${baseAsset.symbol}-${targetAsset.symbol}`;
    const baseQuote = getAssetFiatPrice(baseAsset);
    const targetQuote = getAssetFiatPrice(targetAsset);
    const fpBaseAssetPrice = baseQuote == null ? null : FPNumber.fromCodecValue(baseQuote);
    const fpQuoteAssetPrice = targetQuote == null ? null : FPNumber.fromCodecValue(targetQuote);
    const fpBaseAssetReserves = FPNumber.fromCodecValue(baseAssetReserves ?? 0, baseAsset.decimals);
    const fpQuoteAssetReserves = FPNumber.fromCodecValue(quoteAssetReserves ?? 0, targetAsset.decimals);
    const baseValue = valueAtMarketPrice(fpBaseAssetReserves, fpBaseAssetPrice);
    const quoteValue = valueAtMarketPrice(fpQuoteAssetReserves, fpQuoteAssetPrice);
    const fpTvl =
      baseValue && quoteValue
        ? new FPNumber(baseValue.toString(), Math.max(baseValue.precision, quoteValue.precision)).add(quoteValue)
        : null;
    const fpPriceUSD = price && valueAtMarketPrice(price, fpQuoteAssetPrice);

    buffer.push({
      name,
      baseAsset,
      targetAsset,
      price: price?.toNumber(price.precision) ?? null,
      priceFormatted: price?.toLocaleString(price.precision) ?? null,
      priceUSDFormatted: fpPriceUSD?.toLocaleString(fpPriceUSD.precision) ?? null,
      priceChangeDay: price ? priceChange.toNumber() : null,
      priceChangeDayFP: price ? priceChange : null,
      volumeDay: volume.toNumber(),
      volumeDayFormatted: formatAmountWithSuffix(volume),
      tvl: fpTvl?.toNumber(fpTvl.precision) ?? null,
      tvlFormatted: fpTvl ? formatAmountWithSuffix(fpTvl) : null,
    });

    return buffer;
  }, []);

  return [...items].sort((a, b) =>
    sortPools(
      { baseAsset: a.baseAsset, poolAsset: a.targetAsset },
      { baseAsset: b.baseAsset, poolAsset: b.targetAsset }
    )
  );
});

const filterItems = (items: readonly TableItem[], search: string): readonly TableItem[] => {
  return items.filter((item) =>
    [item.name, item.baseAsset.name, item.baseAsset.symbol, item.baseAsset.address, item.targetAsset.name]
      .concat([item.targetAsset.symbol, item.targetAsset.address])
      .some((value) => value?.toLowerCase?.().includes(search))
  );
};

const {
  order,
  property,
  currentPage,
  pageAmount,
  total,
  lastPage,
  startIndex,
  tableItems,
  tableRef,
  isDefaultSort,
  changeSort,
  handleResetSort,
  handlePaginationClick,
} = useExploreTable<TableItem>({
  items: prefilteredItems,
  query: () => props.exploreQuery,
  filter: filterItems,
  defaultOrder: SortDirection.DESC,
  defaultProperty: 'tvl',
});

const updateExploreData = createCoalescedAsyncTask(async () => {
  await withLoading(async () => {
    await withParentLoading(async () => {
      orderBooks.value = Object.freeze((await fetchOrderBooks(allowedAssets.value)) ?? []);
    });
  });
});

watch(
  () => whitelistSignature.value,
  () => {
    void updateExploreData();
  },
  { immediate: true }
);

watch(indexerEndpoint, (endpoint, previousEndpoint) => {
  if (!endpoint || endpoint === previousEndpoint) return;

  void updateExploreData();
});
</script>

<style lang="scss">
@include explore-table;
</style>
