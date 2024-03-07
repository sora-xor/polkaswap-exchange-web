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
      <s-table-column width="240" label="#" fixed-position="left">
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
          <token-logo
            v-if="row.assets.length === 1"
            key="token"
            class="explore-table-item-logo"
            :token="row.assets[0]"
          />
          <pair-token-logo
            v-else
            key="pair"
            :first-token="row.assets[0]"
            :second-token="row.assets[1]"
            size="small"
            class="explore-table-item-logo"
          />
          <div class="explore-table-item-info explore-table-item-info--body">
            <div class="explore-table-item-name">{{ row.name }}</div>
            <div v-if="row.description" key="description" class="explore-table__secondary">{{ row.description }}</div>
          </div>
        </template>
      </s-table-column>
      <!-- Reward Token -->
      <s-table-column width="120" header-align="left" align="left">
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
            />
            <div class="explore-table-item-name">{{ row.rewardAsset.symbol }}</div>
          </div>
        </template>
      </s-table-column>
      <!-- APR -->
      <s-table-column width="140" header-align="right" align="right">
        <template #header>
          <sort-button name="apr" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">{{ TranslationConsts.APR }}</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <data-row-skeleton :loading="!hasAprColumnData" rect circle>
            <span class="explore-table__accent">{{ row.aprFormatted }}</span>
            <calculator-button
              @click.native="
                showPoolCalculator({
                  baseAsset: row.baseAsset.address,
                  poolAsset: row.poolAsset.address,
                  rewardAsset: row.rewardAsset.address,
                  liquidity: row.liquidity,
                })
              "
            />
          </data-row-skeleton>
        </template>
      </s-table-column>
      <!-- Fee -->
      <s-table-column width="80" header-align="right" align="right">
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
      <s-table-column v-if="isLoggedIn" key="logged" width="140" header-align="right" align="right">
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
              <token-logo size="small" class="explore-table-item-logo explore-table-item-logo--plain" :token="asset" />
            </div>
          </div>
        </template>
      </s-table-column>
      <!-- TVL -->
      <s-table-column width="104" header-align="right" align="right">
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

    <calculator-dialog :visible.sync="showCalculatorDialog" v-bind="selectedDerivedPool" :liquidity="liquidity" />
  </div>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
import { api, components } from '@soramitsu/soraneo-wallet-web';
import { SortDirection } from '@soramitsu-ui/ui-vue2/lib/components/Table/consts';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import ExplorePageMixin from '@/components/mixins/ExplorePageMixin';
import { Components } from '@/consts';
import { DemeterStakingComponents } from '@/modules/staking/demeter/consts';
import DemeterBasePageMixin from '@/modules/staking/demeter/mixins/BasePageMixin';
import type { DemeterPoolDerivedData } from '@/modules/staking/demeter/types';
import { demeterStakingLazyComponent } from '@/modules/staking/router';
import { lazyComponent } from '@/router';
import type { AmountWithSuffix } from '@/types/formats';
import { formatAmountWithSuffix, formatDecimalPlaces, sortPools } from '@/utils';

import type { Asset } from '@sora-substrate/util/build/assets/types';
import type { DemeterPool } from '@sora-substrate/util/build/demeterFarming/types';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';

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

const lpKey = (baseAsset: string, poolAsset: string): string => {
  return [baseAsset, poolAsset].join(';');
};

@Component({
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
})
export default class ExploreDemeter extends Mixins(DemeterBasePageMixin, ExplorePageMixin) {
  @Watch('pools', { deep: true })
  private async updatePoolsData() {
    await this.updateExploreData();
  }

  // override ExplorePageMixin
  property = 'apr';

  poolsData: Record<string, PoolData> = {};

  get list(): DemeterPool[] {
    return Object.values(this.pools)
      .map((poolMap) => Object.values(poolMap))
      .flat(2)
      .filter((pool) => !pool.isRemoved);
  }

  get selectedDerivedPool(): Nullable<DemeterPoolDerivedData> {
    if (!this.selectedPool) return null;

    return this.prepareDerivedPoolData(this.selectedPool, this.selectedAccountPool, this.liquidity);
  }

  get items(): TableItem[] {
    const items = this.list.map((pool) => {
      const baseAsset = this.demeterAssetsData[pool.baseAsset] as Asset;
      const poolAsset = this.demeterAssetsData[pool.poolAsset] as Asset;
      const rewardAsset = this.demeterAssetsData[pool.rewardAsset] as Asset;
      const rewardAssetSymbol = rewardAsset?.symbol ?? '';
      const rewardAssetPrice = FPNumber.fromCodecValue(
        this.getAssetFiatPrice({ address: pool.rewardAsset } as Asset) ?? 0
      );
      const tokenInfo = this.tokenInfos[pool.rewardAsset];
      const accountPool = this.getAccountPool(pool);
      const isAccountItem = !!accountPool && this.isActiveAccountPool(accountPool);
      const poolData = this.poolsData[lpKey(pool.baseAsset, pool.poolAsset)];
      const poolTokenPriceCoefficient = poolData?.priceCoefficient ?? FPNumber.ZERO;
      const poolAssetPrice = FPNumber.fromCodecValue(this.getAssetFiatPrice(poolAsset) ?? 0);
      const poolTokenPrice = poolAssetPrice.mul(poolTokenPriceCoefficient);
      const poolBaseReserves = poolData?.reserves?.[0] ?? FPNumber.ZERO;
      const poolTargetReserves = poolData?.reserves?.[1] ?? FPNumber.ZERO;
      const poolSupply = poolData?.supply ?? FPNumber.ZERO;
      const accountPooledTokens = accountPool?.pooledTokens ?? FPNumber.ZERO;
      const liquidity: Nullable<AccountLiquidity> = pool.isFarm
        ? {
            address: poolData?.address ?? '',
            balance: poolSupply.toCodecString(),
            firstAddress: baseAsset.address ?? '',
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
      const description = pool.isFarm ? '' : poolAsset?.name ?? '';
      const depositFee = new FPNumber(pool.depositFee ?? 0).mul(FPNumber.HUNDRED);
      const tvl = poolTokenPrice.mul(pool.totalTokensInPool);
      const emission = this.getEmission(pool, tokenInfo);
      const apr = this.getApr(emission, tvl, rewardAssetPrice);
      const accountTokens = (
        pool.isFarm
          ? [
              {
                asset: baseAsset,
                balance: !poolSupply.isZero()
                  ? poolBaseReserves.mul(accountPooledTokens).div(poolSupply)
                  : FPNumber.ZERO,
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

    const defaultSorted = [...items].sort((a, b) =>
      sortPools(
        { baseAsset: a.poolAsset, poolAsset: a.rewardAsset },
        { baseAsset: b.poolAsset, poolAsset: b.rewardAsset }
      )
    );

    return defaultSorted;
  }

  get prefilteredItems(): TableItem[] {
    return this.isAccountItemsOnly ? this.items.filter((item) => item.isAccountItem) : this.items;
  }

  get hasAprColumnData(): boolean {
    return this.items.some((item) => item.apr !== 0);
  }

  // ExplorePageMixin method implementation
  async updateExploreData(): Promise<void> {
    // return if method is already called by "watch" or "mounted"
    if (this.loading) return;

    await this.withLoading(async () => {
      await this.withParentLoading(async () => {
        const buffer = {};
        const isFarm = this.isFarmingPage;
        const keys = this.list.map((item) => lpKey(item.baseAsset, item.poolAsset));
        const poolKeys = [...new Set(keys)];

        await Promise.allSettled(
          poolKeys.map(async (key) => {
            if (!buffer[key]) {
              const poolData = await this.getPoolData(key, isFarm);

              if (poolData) {
                buffer[key] = poolData;
              }
            }
          })
        );

        this.poolsData = Object.freeze(buffer);
      });
    });
  }

  private async getPoolData(key: string, isFarm: boolean): Promise<Nullable<PoolData>> {
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
    } else {
      return { priceCoefficient: FPNumber.ONE };
    }
  }
}
</script>

<style lang="scss">
@include explore-table;
</style>
