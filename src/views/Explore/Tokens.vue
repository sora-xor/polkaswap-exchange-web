<template>
  <div>
    <assets-filter class="token-filter-options"></assets-filter>
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
      <s-table-column min-width="290" label="#">
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
            <span class="explore-table__secondary">({{ t('tokens.assetId') }})</span>
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
          <token-logo class="explore-table-item-logo" :token-symbol="row.symbol"></token-logo>
          <div class="explore-table-item-info explore-table-item-info--body">
            <div class="explore-table-item-name">{{ row.symbol }}</div>
            <div class="explore-table__secondary explore-table__token-name">{{ row.name }}</div>
            <div class="explore-table-item-address">
              <token-address
                class="explore-table-item-address__value"
                :show-name="false"
                :name="row.name"
                :symbol="row.symbol"
                :address="row.address"
              ></token-address>
            </div>
          </div>
        </template>
      </s-table-column>
      <!-- Price -->
      <s-table-column key="price" min-width="130" header-align="left" align="left">
        <template #header>
          <sort-button name="price" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">Price</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <formatted-amount
            is-fiat-value
            fiat-default-rounding
            :font-weight-rate="FontWeightRate.MEDIUM"
            :value="row.priceFormatted"
            class="explore-table-item-price"
          ></formatted-amount>
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
          <price-change :value="row.priceChangeDayFP"></price-change>
        </template>
      </s-table-column>
      <!-- 7D Price Change -->
      <s-table-column min-width="104" header-align="left" align="left">
        <template #header>
          <sort-button name="priceChangeWeek" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">7D %</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <price-change :value="row.priceChangeWeekFP"></price-change>
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
            is-fiat-value
            :font-weight-rate="FontWeightRate.MEDIUM"
            :value="row.tvlFormatted.amount"
            class="explore-table-item-price explore-table-item-amount"
          >
            {{ row.tvlFormatted.suffix }}
          </formatted-amount>
        </template>
      </s-table-column>
      <!-- Velocity -->
      <s-table-column min-width="88" header-align="right" align="right">
        <template #header>
          <sort-button name="velocity" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">VC.</span>
            <s-tooltip border-radius="mini">
              <s-icon name="info-16" size="14px"></s-icon>
              <template #content>
                <div>{{ t('tooltips.velocity') }}</div>
                <br />
                <span style="font-weight: 500">Velocity = Trading Volume USD / Market Cap USD</span>
              </template>
            </s-tooltip>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <formatted-amount
            :font-weight-rate="FontWeightRate.MEDIUM"
            :value="row.velocityFormatted"
            class="explore-table-item-price explore-table-item-amount"
          ></formatted-amount>
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
import { FPNumber } from '@sora-substrate/sdk';
import { KnownAssets } from '@sora-substrate/sdk/build/assets/consts';
import { components } from '@/shims/wallet-components';
import { SortDirection } from '@soramitsu-ui/ui/types';
import { computed, onMounted, ref, toRef, watch } from 'vue';

import { useExploreTable } from '@/composables/useExploreTable';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';
import { Components, ZeroStringValue } from '@/consts';
import { FontWeightRate } from '@/shims/wallet-consts';
import { getAssetsSubset } from '@/shims/wallet-util';
import { fetchTokensData } from '@/indexer/queries/asset/assets';
import type { TokenData } from '@/indexer/queries/asset/assets';
import { lazyComponent } from '@/router';
import { useAssetsStore } from '@/stores/assets';
import { useSettingsStore } from '@/stores/settings';
import type { AmountWithSuffix } from '@/types/formats';
import { formatAmountWithSuffix, sortAssets } from '@/utils';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import type { FilterOptions } from '@/shims/wallet-common-types';

type TableItem = {
  price: number;
  priceFormatted: string;
  priceChangeDay?: number;
  priceChangeDayFP?: FPNumber;
  priceChangeWeek?: number;
  priceChangeWeekFP?: FPNumber;
  volumeDay?: number;
  volumeDayFormatted?: AmountWithSuffix;
  tvl?: number;
  tvlFormatted?: AmountWithSuffix;
  // mcap: number;
  // mcapFormatted: AmountWithSuffix;
  velocity?: number;
  velocityFormatted?: string;
} & Asset;

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
  components: {
    AssetsFilter: components.AssetsFilter,
    PriceChange: lazyComponent(Components.PriceChange),
    SortButton: lazyComponent(Components.SortButton),
    TokenAddress: components.TokenAddress,
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
    HistoryPagination: components.HistoryPagination,
  },
});

const { t, TranslationConsts } = useTranslation();
const { getAssetFiatPrice } = useFormattedAmount();
const parentLoading = toRef(props, 'parentLoading');
const { loading, withLoading, withParentLoading } = useLoading({ parentLoading });
const assetsStore = useAssetsStore();
const settingsStore = useSettingsStore();

const loadingState = computed(() => parentLoading.value || loading.value);
const tokensData = ref<Record<string, TokenData>>({});

const getAsset = (addr?: string) => assetsStore.assetDataByAddress(addr) as Nullable<Asset>;
const whitelistAssets = computed(() => assetsStore.whitelistAssets as Array<Asset>);
const allowedAssets = computed<Array<Asset>>(() =>
  whitelistAssets.value.length ? whitelistAssets.value : [...KnownAssets]
);
const assetsFilter = computed(() => settingsStore.assetsFilter as FilterOptions);

const items = computed<TableItem[]>(() => {
  if (!Object.keys(tokensData.value).length) {
    return allowedAssets.value.map((asset) => {
      const price = FPNumber.fromCodecValue(getAssetFiatPrice(asset) ?? ZeroStringValue);
      const zero = FPNumber.ZERO;

      return {
        ...asset,
        price: price.toNumber(),
        priceFormatted: price.toLocaleString(7),
        priceChangeDay: zero.toNumber(),
        priceChangeDayFP: zero,
        priceChangeWeek: zero.toNumber(),
        priceChangeWeekFP: zero,
        volumeDay: zero.toNumber(),
        volumeDayFormatted: formatAmountWithSuffix(zero),
        tvl: zero.toNumber(),
        tvlFormatted: formatAmountWithSuffix(zero),
        velocity: zero.toNumber(),
        velocityFormatted: String(zero.toNumber(2)),
      };
    });
  }

  return Object.entries(tokensData.value).reduce<TableItem[]>((buffer, [address, tokenData]) => {
    const asset = getAsset(address);
    if (!asset) return buffer;

    buffer.push({
      ...asset,
      price: tokenData.priceUSD.toNumber(),
      priceFormatted: tokenData.priceUSD.toLocaleString(7),
      priceChangeDay: tokenData.priceChangeDay.toNumber(),
      priceChangeDayFP: tokenData.priceChangeDay,
      priceChangeWeek: tokenData.priceChangeWeek.toNumber(),
      priceChangeWeekFP: tokenData.priceChangeWeek,
      volumeDay: tokenData.volumeDayUSD.toNumber(),
      volumeDayFormatted: formatAmountWithSuffix(tokenData.volumeDayUSD),
      tvl: tokenData.tvlUSD.toNumber(),
      tvlFormatted: formatAmountWithSuffix(tokenData.tvlUSD),
      velocity: tokenData.velocity.toNumber(),
      velocityFormatted: String(tokenData.velocity.toNumber(2)),
    });

    return buffer;
  }, []);
});

const prefilteredItems = computed<TableItem[]>(() => {
  return getAssetsSubset(
    [...items.value].sort((a, b) => sortAssets(a, b)),
    assetsFilter.value
  );
});

const filterItems = (items: readonly TableItem[], search: string): readonly TableItem[] => {
  return items.filter((item) =>
    [item.symbol, item.name, item.address].some((value) => value?.toLowerCase?.().includes(search))
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

watch(assetsFilter, () => {
  currentPage.value = 1;
});

const updateExploreData = async (): Promise<void> => {
  await withLoading(async () => {
    await withParentLoading(async () => {
      tokensData.value = Object.freeze(await fetchTokensData(allowedAssets.value));
    });
  });
};

onMounted(() => {
  void updateExploreData();
});
</script>

<style lang="scss">
@include explore-table;
</style>

<style lang="scss" scoped>
.explore-table__token-name {
  max-width: 155px;
  overflow-x: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.token-filter-options {
  margin-bottom: $inner-spacing-mini;
}
</style>
