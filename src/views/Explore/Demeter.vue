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
        <template v-slot="{ $index, row }">
          <span class="explore-table-item-index explore-table-item-index--body">{{ $index + startIndex + 1 }}</span>
          <token-logo
            v-if="row.assets.length === 1"
            key="token"
            class="explore-table-item-logo"
            :token="row.assets[0]"
          ></token-logo>
          <pair-token-logo
            v-else
            key="pair"
            :first-token="row.assets[0]"
            :second-token="row.assets[1]"
            size="small"
            class="explore-table-item-logo"
          ></pair-token-logo>
          <div class="explore-table-item-info explore-table-item-info--body">
            <div class="explore-table-item-name">{{ row.name }}</div>
            <div v-if="row.description" key="description" class="explore-table__secondary">{{ row.description }}</div>
          </div>
        </template>
      </s-table-column>
      <!-- Reward Token -->
      <s-table-column min-width="120" header-align="left" align="left">
        <template #header>
          <sort-button name="rewardAssetSymbol" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">Reward</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <div class="explore-table-cell">
            <token-logo
              size="small"
              class="explore-table-item-logo explore-table-item-logo--plain"
              :token-symbol="row.rewardAsset.symbol"
            ></token-logo>
            <div class="explore-table-item-name">{{ row.rewardAsset.symbol }}</div>
          </div>
        </template>
      </s-table-column>
      <!-- APR -->
      <s-table-column min-width="140" header-align="right" align="right">
        <template #header>
          <sort-button name="apr" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">{{ TranslationConsts.APR }}</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <data-row-skeleton :loading="!hasAprColumnData" rect circle>
            <span class="explore-table__accent">{{ row.aprFormatted }}</span>
            <calculator-button
              @click="
                showPoolCalculator({
                  baseAsset: row.baseAsset.address,
                  poolAsset: row.poolAsset.address,
                  rewardAsset: row.rewardAsset.address,
                  liquidity: row.liquidity,
                })
              "
            ></calculator-button>
          </data-row-skeleton>
        </template>
      </s-table-column>
      <!-- Fee -->
      <s-table-column min-width="80" header-align="right" align="right">
        <template #header>
          <sort-button name="depositFee" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">Fee</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          {{ row.depositFeeFormatted }}
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
              >
              </formatted-amount>
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

    <calculator-dialog
      v-model:visible="showCalculatorDialog"
      v-bind="selectedDerivedPool"
      :liquidity="liquidity"
    ></calculator-dialog>
  </div>
</template>

<script lang="ts" setup>
import { FPNumber } from '@sora-substrate/sdk';
import { api, components, WALLET_CONSTS } from '@wallet';
import { computed, onMounted, ref, watch } from 'vue';

import { SortDirection } from '@soramitsu-ui/ui/types';
import { useExploreTable } from '@/composables/useExploreTable';
import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';
import { Components, TranslationConsts } from '@/consts';
import { DemeterStakingComponents } from '@/modules/staking/demeter/consts';
import { useDemeterBasePage } from '@/modules/staking/demeter/composables/useDemeterBasePage';
import { useDemeterPage } from '@/modules/staking/demeter/composables/useDemeterPage';
import type { DemeterPoolDerivedData } from '@/modules/staking/demeter/types';
import { demeterStakingLazyComponent } from '@/modules/staking/router';
import { lazyComponent } from '@/router';
import store from '@/store';
import type { AmountWithSuffix } from '@/types/formats';
import { formatAmountWithSuffix, formatDecimalPlaces, sortPools } from '@/utils';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import type { DemeterPool } from '@sora-substrate/sdk/build/demeterFarming/types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';

type PoolData = {
  priceCoefficient: FPNumber;
  supply?: FPNumber;
  reserves?: FPNumber[];
  address?: string;
};

type TableItem = {
  assets: Asset[];
  name: string;
  description: string;
  poolAsset: Asset;
  rewardAsset: Asset;
  rewardAssetSymbol: string;
  depositFee: number;
  depositFeeFormatted: string;
  tvl: number;
  tvlFormatted: AmountWithSuffix;
  apr: number;
  aprFormatted: string;
  isAccountItem: boolean;
  accountTokens: { asset: Asset; balance: string }[];
  liquidity: Nullable<AccountLiquidity>;
};

const lpKey = (baseAsset: string, poolAsset: string): string => [baseAsset, poolAsset].join(';');

defineOptions({
  components: {
    CalculatorButton: demeterStakingLazyComponent(DemeterStakingComponents.CalculatorButton),
    CalculatorDialog: demeterStakingLazyComponent(DemeterStakingComponents.CalculatorDialog),
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
  isFarmingPage: { type: Boolean, default: true },
});

const { t } = useTranslation();
const parentLoading = computed(() => props.parentLoading);
const { loading, withLoading, withParentLoading } = useLoading({ parentLoading });
const loadingState = computed(() => loading.value || parentLoading.value);

const base = useDemeterBasePage({ isFarmingPage: computed(() => props.isFarmingPage) });
const page = useDemeterPage(base, { parentLoading });

const poolsData = ref<Record<string, PoolData>>({});

const poolsList = computed(() => {
  const pools = base.pools.value ?? {};
  return Object.values(pools)
    .map((poolMap) => Object.values(poolMap ?? {}))
    .flat(2)
    .filter((pool): pool is DemeterPool => Boolean(pool && !pool.isRemoved));
});

const items = computed<TableItem[]>(() => {
  const assetsData = base.demeterAssetsData.value ?? {};
  const tokenInfos = base.tokenInfos.value ?? {};

  const mapped = poolsList.value.map((pool) => {
    const baseAsset = assetsData[pool.baseAsset] as Asset;
    const poolAsset = assetsData[pool.poolAsset] as Asset;
    const rewardAsset = assetsData[pool.rewardAsset] as Asset;
    const rewardAssetSymbol = rewardAsset?.symbol ?? '';
    const rewardAssetPrice = FPNumber.fromCodecValue(base.getAssetFiatPrice(rewardAsset as Asset) ?? 0);
    const tokenInfo = tokenInfos[pool.rewardAsset];
    const accountPool = base.getAccountPool(pool);
    const isAccountItem = !!accountPool && base.isActiveAccountPool(accountPool);
    const poolData = poolsData.value[lpKey(pool.baseAsset, pool.poolAsset)];
    const poolTokenPriceCoefficient = poolData?.priceCoefficient ?? FPNumber.ZERO;
    const poolAssetPrice = FPNumber.fromCodecValue(base.getAssetFiatPrice(poolAsset as Asset) ?? 0);
    const poolTokenPrice = poolAssetPrice.mul(poolTokenPriceCoefficient);
    const poolBaseReserves = poolData?.reserves?.[0] ?? FPNumber.ZERO;
    const poolTargetReserves = poolData?.reserves?.[1] ?? FPNumber.ZERO;
    const poolSupply = poolData?.supply ?? FPNumber.ZERO;
    const accountPooledTokens = accountPool?.pooledTokens ?? FPNumber.ZERO;
    const liquidity: Nullable<AccountLiquidity> = pool.isFarm
      ? {
          address: poolData?.address ?? '',
          balance: poolSupply.toCodecString(),
          firstAddress: baseAsset?.address ?? '',
          firstBalance: poolBaseReserves.toCodecString(),
          secondAddress: poolAsset?.address ?? '',
          secondBalance: poolTargetReserves.toCodecString(),
          poolShare: '1',
          reserveA: '1',
          reserveB: '1',
          totalSupply: '1',
        }
      : null;

    const assets = pool.isFarm ? [baseAsset, poolAsset] : [poolAsset];
    const name = assets.map((asset) => asset?.symbol ?? '').join('-');
    const description = pool.isFarm ? '' : (poolAsset?.name ?? '');
    const depositFee = new FPNumber(pool.depositFee ?? 0).mul(FPNumber.HUNDRED);
    const tvl = poolTokenPrice.mul(pool.totalTokensInPool);
    const emission = base.getEmission(pool, tokenInfo);
    const apr = base.getApr(emission, tvl, rewardAssetPrice);
    const accountTokens = (
      pool.isFarm
        ? [
            {
              asset: baseAsset,
              balance: !poolSupply.isZero() ? poolBaseReserves.mul(accountPooledTokens).div(poolSupply) : FPNumber.ZERO,
            },
            {
              asset: poolAsset,
              balance: !poolSupply.isZero()
                ? poolTargetReserves.mul(accountPooledTokens).div(poolSupply)
                : FPNumber.ZERO,
            },
          ]
        : [{ asset: poolAsset, balance: accountPooledTokens }]
    ).map((item) => ({
      ...item,
      balance: formatDecimalPlaces(item.balance),
    }));

    return {
      assets,
      name,
      description,
      baseAsset,
      poolAsset,
      rewardAsset,
      rewardAssetSymbol,
      depositFee: depositFee.toNumber(),
      depositFeeFormatted: formatDecimalPlaces(depositFee, true),
      tvl: tvl.toNumber(),
      tvlFormatted: formatAmountWithSuffix(tvl),
      apr: apr.toNumber(),
      aprFormatted: formatDecimalPlaces(apr, true),
      isAccountItem,
      accountTokens,
      liquidity,
    };
  });

  return [...mapped].sort((a, b) =>
    sortPools(
      { baseAsset: a.poolAsset, poolAsset: a.rewardAsset },
      { baseAsset: b.poolAsset, poolAsset: b.rewardAsset }
    )
  );
});

const prefilteredItems = computed(() => {
  return props.isAccountItemsOnly ? items.value.filter((item) => item.isAccountItem) : items.value;
});

const filterItems = (list: readonly TableItem[], search: string): TableItem[] => {
  const filterAsset = (asset?: Asset | null): boolean =>
    asset?.name?.toLowerCase?.().includes(search) ||
    asset?.symbol?.toLowerCase?.().includes(search) ||
    asset?.address?.toLowerCase?.() === search;

  return list.filter((item) => {
    return (
      item.name.toLowerCase().includes(search) ||
      filterAsset(item.poolAsset) ||
      filterAsset(item.baseAsset) ||
      filterAsset(item.rewardAsset) ||
      item.assets.some((asset) => filterAsset(asset))
    );
  });
};

const exploreQuery = computed(() => props.exploreQuery ?? '');

const table = useExploreTable<TableItem>({
  items: prefilteredItems,
  query: exploreQuery,
  filter: filterItems,
  defaultOrder: SortDirection.DESC,
  defaultProperty: 'apr',
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
  const fiatObject = store.state.wallet.account.fiatPriceObject ?? {};
  return Object.keys(fiatObject).length > 0;
});

const isLoggedIn = computed(() => store.getters.wallet.account.isLoggedIn as boolean);
const hasAprColumnData = computed(() => items.value.some((item) => item.apr !== 0));
const showCalculatorDialog = computed({
  get: () => base.showCalculatorDialog.value,
  set: (value: boolean) => {
    base.showCalculatorDialog.value = value;
  },
});
const liquidity = computed(() => base.liquidity.value);
const selectedDerivedPool = computed<Nullable<DemeterPoolDerivedData>>(() => page.selectedDerivedPool.value ?? null);

const showPoolCalculator = base.showPoolCalculator;

/**
 * Hydrates cached pool coefficients so APR/TVL rows render with fiat data.
 */
const updateExploreData = async (): Promise<void> => {
  if (loading.value) return;

  await withLoading(async () => {
    await withParentLoading(async () => {
      const buffer: Record<string, PoolData> = {};
      const isFarm = base.isFarmingPage.value;
      const keys = poolsList.value.map((pool) => lpKey(pool.baseAsset, pool.poolAsset));
      const poolKeys = [...new Set(keys)];

      await Promise.allSettled(
        poolKeys.map(async (key) => {
          if (buffer[key]) return;
          const data = await getPoolData(key, isFarm);
          if (data) buffer[key] = data;
        })
      );

      poolsData.value = Object.freeze(buffer);
    });
  });
};

/**
 * Fetches reserves/supply data for a Demeter pair (farms need pool math for APR).
 */
const getPoolData = async (key: string, isFarm: boolean): Promise<Nullable<PoolData>> => {
  const [baseAsset, poolAsset] = key.split(';');

  if (isFarm) {
    const poolInfo = api.poolXyk.getInfo(baseAsset, poolAsset);
    if (!poolInfo) return null;

    const address = poolInfo.address;
    const totalIssuance = await api.api.query.poolXYK.totalIssuances(poolInfo.address);
    const supply = totalIssuance.isEmpty ? FPNumber.ZERO : new FPNumber(totalIssuance);
    const reserves = (await api.poolXyk.getReserves(baseAsset, poolAsset)).map((reserve) =>
      FPNumber.fromCodecValue(reserve)
    );
    const poolAssetReserves = reserves[1];
    const priceCoefficient = supply.isZero() ? FPNumber.ZERO : poolAssetReserves.mul(new FPNumber(2)).div(supply);

    return { priceCoefficient, supply, reserves, address };
  }

  return { priceCoefficient: FPNumber.ONE };
};

watch(
  () => base.pools.value,
  () => {
    updateExploreData();
  },
  { deep: true }
);

watch(
  () => base.isFarmingPage.value,
  () => {
    updateExploreData();
  }
);

onMounted(() => {
  updateExploreData();
});
</script>

<style lang="scss">
@include explore-table;
</style>
