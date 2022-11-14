<template>
  <div>
    <s-table
      ref="table"
      v-loading="loading"
      :data="tableItems"
      :highlight-current-row="false"
      size="small"
      class="explore-table"
    >
      <!-- Index -->
      <s-table-column width="280" label="#" fixed-position="left">
        <template #header>
          <div class="explore-table-item-index">
            <span @click="handleResetSort" :class="['explore-table-item-index--head', { active: isDefaultSort }]">#</span>
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
          <token-logo v-if="row.assets.length === 1" class="explore-table-item-logo" :token="row.assets[0]" />
          <pair-token-logo
            v-else
            :first-token="row.assets[0]"
            :second-token="row.assets[1]"
            size="small"
            class="explore-table-item-logo"
          />
          <div class="explore-table-item-info explore-table-item-info--body">
            <div class="explore-table-item-name">{{ row.name }}</div>
            <div v-if="row.description" class="explore-table__secondary">{{ row.description }}</div>
          </div>
        </template>
      </s-table-column>
      <!-- APR -->
      <s-table-column width="120" header-align="right" align="right">
        <template #header>
          <sort-button name="apr" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">{{ TranslationConsts.APR }}</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <span class="explore-table__accent">{{ row.aprFormatted }}</span>
          <calculator-button
            @click.native="
              showPoolCalculator({
                poolAsset: row.poolAsset.address,
                rewardAsset: row.rewardAsset.address,
                liquidity: row.liquidity,
              })
            "
          />
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
      <s-table-column v-if="isLoggedIn" width="140" header-align="right" align="right">
        <template #header>
          <span class="explore-table__primary">Investment</span>
        </template>
        <template v-slot="{ row }">
          <div class="explore-table-item-tokens">
            <div v-for="({ asset, balance }, index) in row.accountTokens" :key="index" class="explore-table-cell">
              <formatted-amount
                :font-size-rate="FontSizeRate.SMALL"
                :value="balance"
                class="explore-table-item-price explore-table-item-amount"
              />
              <token-logo size="small" class="explore-table-item-logo explore-table-item-logo--plain" :token="asset" />
            </div>
          </div>
        </template>
      </s-table-column>
      <!-- TVL -->
      <s-table-column width="104" header-align="right" align="right">
        <template #header>
          <sort-button name="tvl" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">TVL</span>
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
    </s-table>

    <s-pagination
      class="explore-table-pagination"
      :layout="'prev, total, next'"
      :current-page.sync="currentPage"
      :page-size="pageAmount"
      :total="filteredItems.length"
      @prev-click="handlePrevClick"
      @next-click="handleNextClick"
    />

    <calculator-dialog
      :visible.sync="showCalculatorDialog"
      :pool="selectedPool"
      :account-pool="selectedAccountPool"
      :liquidity="liquidity"
    />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { FPNumber } from '@sora-substrate/util';
import { api, components } from '@soramitsu/soraneo-wallet-web';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { SortDirection } from '@soramitsu/soramitsu-js-ui/lib/components/Table/consts';

import ExplorePageMixin from '@/components/mixins/ExplorePageMixin';
import DemeterBasePageMixin from '@/modules/demeterFarming/mixins/BasePageMixin';
import AprMixin from '@/modules/demeterFarming/mixins/AprMixin';

import { demeterLazyComponent } from '@/modules/demeterFarming/router';
import { DemeterComponents } from '@/modules/demeterFarming/consts';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { getter } from '@/store/decorators';
import { formatAmountWithSuffix, formatDecimalPlaces } from '@/utils';

import SortButton from '@/components/SortButton.vue';

import type { Asset } from '@sora-substrate/util/build/assets/types';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';
import type { DemeterPool, DemeterRewardToken } from '@sora-substrate/util/build/demeterFarming/types';
import type { AmountWithSuffix } from '@/types/formats';

type PoolData = {
  price: FPNumber;
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
  liquidity: Nullable<AccountLiquidity>;
};

@Component({
  components: {
    CalculatorButton: demeterLazyComponent(DemeterComponents.CalculatorButton),
    CalculatorDialog: demeterLazyComponent(DemeterComponents.CalculatorDialog),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    SortButton,
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
  },
})
export default class ExploreDemeter extends Mixins(ExplorePageMixin, DemeterBasePageMixin, AprMixin) {
  @getter.demeterFarming.tokenInfos private tokenInfos!: DataMap<DemeterRewardToken>;

  @Watch('pools', { deep: true })
  private async updatePoolsData() {
    await this.withLoading(async () => {
      await this.withParentLoading(async () => {
        this.poolsData = {};
        for (const pool of this.items) {
          if (!this.poolsData[pool.poolAsset]) {
            const poolData = await this.getPoolData(pool.poolAsset, pool.isFarm);

            if (poolData) {
              this.poolsData = { ...this.poolsData, [pool.poolAsset]: poolData };
            }
          }
        }
      });
    });
  }

  // override ExplorePageMixin
  order = SortDirection.DESC;
  property = 'apr';

  poolsData: Record<string, PoolData> = {};

  get items(): DemeterPool[] {
    return Object.values(this.pools).flat() as DemeterPool[];
  }

  get preparedItems(): TableItem[] {
    return this.items.map((pool) => {
      const poolAsset = this.getAsset(pool.poolAsset) as Asset;
      const rewardAsset = this.getAsset(pool.rewardAsset) as Asset;
      const rewardAssetSymbol = rewardAsset?.symbol ?? '';
      const tokenInfo = this.tokenInfos[pool.rewardAsset];
      const accountPool = this.getAccountPool(pool);
      const poolData = this.poolsData[pool.poolAsset];
      const poolTokenPrice = poolData?.price ?? FPNumber.ZERO;
      const poolBaseReserves = poolData?.reserves?.[0] ?? FPNumber.ZERO;
      const poolTargetReserves = poolData?.reserves?.[1] ?? FPNumber.ZERO;
      const poolSupply = poolData?.supply ?? FPNumber.ZERO;
      const accountPooledTokens = accountPool?.pooledTokens ?? FPNumber.ZERO;
      const liquidity: Nullable<AccountLiquidity> = pool.isFarm
        ? {
            address: poolData?.address ?? '',
            balance: poolSupply.toCodecString(),
            firstAddress: XOR.address,
            firstBalance: poolBaseReserves.toCodecString(),
            secondAddress: poolAsset?.address ?? '',
            secondBalance: poolTargetReserves.toCodecString(),
            poolShare: '1',
          }
        : null;

      const assets = pool.isFarm ? [XOR, poolAsset] : [poolAsset];
      const name = assets.map((asset) => asset?.symbol ?? '').join('-');
      const description = pool.isFarm ? '' : poolAsset?.name ?? '';
      const depositFee = new FPNumber(pool.depositFee ?? 0).mul(FPNumber.HUNDRED);
      const tvl = poolTokenPrice.mul(pool.totalTokensInPool);
      const apr = this.getApr(pool, tokenInfo, tvl);
      const accountTokens = (
        pool.isFarm
          ? [
              {
                asset: XOR,
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
      ).map((item) => ({ ...item, balance: formatDecimalPlaces(item.balance) }));

      return {
        assets,
        name,
        description,
        poolAsset,
        rewardAsset,
        rewardAssetSymbol,
        depositFee: depositFee.toNumber(),
        depositFeeFormatted: formatDecimalPlaces(depositFee, true),
        tvl: tvl.toNumber(),
        tvlFormatted: formatAmountWithSuffix(tvl),
        apr: apr.toNumber(),
        aprFormatted: formatDecimalPlaces(apr, true),
        accountTokens,
        liquidity,
      };
    });
  }

  private async getPoolData(poolAssetAddress: string, isFarm: boolean): Promise<Nullable<PoolData>> {
    const poolAssetPrice = FPNumber.fromCodecValue(this.getAssetFiatPrice({ address: poolAssetAddress } as Asset) ?? 0);

    if (isFarm) {
      const poolInfo = api.poolXyk.getInfo(XOR.address, poolAssetAddress);

      if (!poolInfo) return null;

      const address = poolInfo.address;
      const supply = new FPNumber(await api.api.query.poolXYK.totalIssuances(poolInfo.address));
      const reserves = (await api.poolXyk.getReserves(XOR.address, poolAssetAddress)).map((reserve) =>
        FPNumber.fromCodecValue(reserve)
      );
      const poolAssetReserves = reserves[1];
      const poolTokenPrice = poolAssetReserves.mul(poolAssetPrice).mul(new FPNumber(2)).div(supply);

      return { price: poolTokenPrice, supply, reserves, address };
    } else {
      return { price: poolAssetPrice };
    }
  }
}
</script>

<style lang="scss">
@include explore-table;
</style>
