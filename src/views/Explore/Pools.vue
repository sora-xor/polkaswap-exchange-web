<template>
  <div>
    <s-table
      ref="table"
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
            <span @click="handleResetSort" :class="['explore-table-item-index--head', { active: isDefaultSort }]">
              #
            </span>
          </div>
          <div class="explore-table-item-logo">
            <s-icon name="various-bone-24" size="14px" class="explore-table-item-logo--head" />
          </div>
          <div class="explore-table-item-info explore-table-item-info--head">
            <span class="explore-table__primary">{{ t('nameText') }}</span>
          </div>
        </template>
        <template v-slot="{ $index, row }">
          <span class="explore-table-item-index explore-table-item-index--body">{{ $index + startIndex + 1 }}</span>
          <pair-token-logo
            :first-token="row.baseAsset"
            :second-token="row.targetAsset"
            size="small"
            class="explore-table-item-logo"
          />
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
          />
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
              />
              <token-logo size="small" class="explore-table-item-logo explore-table-item-logo--plain" :token="asset" />
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
              />
              <token-logo size="small" class="explore-table-item-logo explore-table-item-logo--plain" :token="asset" />
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
              <s-icon name="info-16" size="14px" />
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
    />
  </div>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import ExplorePageMixin from '@/components/mixins/ExplorePageMixin';
import { Components } from '@/consts';
import { fetchPoolsData } from '@/indexer/queries/pools';
import type { PoolData } from '@/indexer/queries/pools';
import { lazyComponent } from '@/router';
import { state } from '@/store/decorators';
import type { AmountWithSuffix } from '@/types/formats';
import { formatAmountWithSuffix, formatDecimalPlaces, sortPools } from '@/utils';

import type { Asset } from '@sora-substrate/util/build/assets/types';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';

type PoolToken = {
  asset: Asset;
  balance: string;
};

type TableItem = {
  baseAsset: Asset;
  targetAsset: Asset;
  priceUSD: number;
  priceUSDFormatted: string;
  apy: number;
  apyFormatted: string;
  tvl: number;
  tvlFormatted: AmountWithSuffix;
  isAccountItem: boolean;
  poolTokens: PoolToken[];
  accountTokens: PoolToken[];
};

@Component({
  components: {
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    SortButton: lazyComponent(Components.SortButton),
    DataRowSkeleton: lazyComponent(Components.DataRowSkeleton),
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
    HistoryPagination: components.HistoryPagination,
  },
})
export default class ExplorePools extends Mixins(ExplorePageMixin) {
  @state.pool.accountLiquidity private accountLiquidity!: Array<AccountLiquidity>;

  private poolsData: readonly PoolData[] = [];

  get items(): TableItem[] {
    const items = this.poolsData.reduce<any>((buffer, pool) => {
      const { baseAssetId, targetAssetId, priceUSD, apy } = pool;

      const baseAsset = this.getAsset(baseAssetId);
      const targetAsset = this.getAsset(targetAssetId);

      if (!(baseAsset && targetAsset)) return buffer;

      const name = `${baseAsset.symbol}-${targetAsset.symbol}`; // For search

      const baseAssetReserves = FPNumber.fromCodecValue(pool.baseAssetReserves ?? 0, baseAsset.decimals);
      const targetAssetReserves = FPNumber.fromCodecValue(pool.targetAssetReserves ?? 0, targetAsset.decimals);
      const tvlUSD = targetAssetReserves.mul(priceUSD).mul(FPNumber.TWO);

      const poolTokens = [
        {
          asset: baseAsset,
          balance: formatDecimalPlaces(baseAssetReserves),
        },
        {
          asset: targetAsset,
          balance: formatDecimalPlaces(targetAssetReserves),
        },
      ];

      const accountPool = this.accountLiquidity.find(
        (liquidity) => liquidity.firstAddress === baseAsset.address && liquidity.secondAddress === targetAsset.address
      );
      const accountTokens = [
        {
          asset: baseAsset,
          balance: formatDecimalPlaces(FPNumber.fromCodecValue(accountPool?.firstBalance ?? 0)),
        },
        {
          asset: targetAsset,
          balance: formatDecimalPlaces(FPNumber.fromCodecValue(accountPool?.secondBalance ?? 0)),
        },
      ];

      buffer.push({
        name,
        baseAsset,
        targetAsset,
        priceUSD: priceUSD.toNumber(),
        priceUSDFormatted: priceUSD.toLocaleString(),
        apy: apy.toNumber(),
        apyFormatted: formatDecimalPlaces(apy, true),
        tvl: tvlUSD.toNumber(),
        tvlFormatted: formatAmountWithSuffix(tvlUSD),
        isAccountItem: !!accountPool,
        accountTokens,
        poolTokens,
      });

      return buffer;
    }, []);

    const defaultSorted = [...items].sort((a, b) =>
      sortPools(
        { baseAsset: a.baseAsset, poolAsset: a.targetAsset },
        { baseAsset: b.baseAsset, poolAsset: b.targetAsset }
      )
    );

    return defaultSorted;
  }

  get prefilteredItems(): TableItem[] {
    return this.isAccountItemsOnly ? this.items.filter((item) => item.isAccountItem) : this.items;
  }

  // ExplorePageMixin method implementation
  async updateExploreData(): Promise<void> {
    await this.withLoading(async () => {
      await this.withParentLoading(async () => {
        this.poolsData = Object.freeze(await fetchPoolsData(this.allowedAssets));
      });
    });
  }
}
</script>

<style lang="scss">
@include explore-table;
</style>
