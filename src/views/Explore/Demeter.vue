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
            <span class="explore-table__primary">{{ t('tokens.name') }}</span>
          </div>
        </template>
        <template v-slot="{ $index, row }">
          <span class="explore-table-item-index explore-table-item-index--body">{{ $index + startIndex + 1 }}</span>
          <token-logo
            class="explore-table-item-logo explore-table-item-logo--body"
            :token-symbol="row.poolAsset.symbol"
          />
          <div class="explore-table-item-info explore-table-item-info--body">
            <div class="explore-table-item-name">{{ row.poolAsset.symbol }}</div>
            <div class="explore-table__secondary">{{ row.poolAsset.name }}</div>
          </div>
        </template>
      </s-table-column>
      <!-- Reward Token -->
      <s-table-column width="152" header-align="left" align="left">
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
      <s-table-column width="104" header-align="right" align="right">
        <template #header>
          <sort-button name="apr" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">{{ TranslationConsts.APR }}</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <span class="explore-table__accent">{{ row.aprFormatted }}</span>
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
      <!-- Balance -->
      <s-table-column v-if="isLoggedIn" width="118" header-align="right" align="right">
        <template #header>
          <span class="explore-table__primary">Your token</span>
        </template>
        <template v-slot="{ row }">
          <formatted-amount
            :font-size-rate="FontSizeRate.SMALL"
            :value="row.balance"
            class="explore-table-item-price explore-table-item-amount"
          />
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
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { FPNumber } from '@sora-substrate/util';
import { components } from '@soramitsu/soraneo-wallet-web';

import ExplorePageMixin from '@/components/mixins/ExplorePageMixin';
import DemeterPageMixin from '@/modules/demeterFarming/mixins/PageMixin';
import AprMixin from '@/modules/demeterFarming/mixins/AprMixin';

import { getter } from '@/store/decorators';
import { formatAmountWithSuffix } from '@/utils';

import SortButton from '@/components/SortButton.vue';

import type { DemeterPool, DemeterRewardToken } from '@sora-substrate/util/build/demeterFarming/types';

@Component({
  components: {
    SortButton,
    TokenAddress: components.TokenAddress,
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
  },
})
export default class ExploreDemeter extends Mixins(ExplorePageMixin, DemeterPageMixin, AprMixin) {
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.demeterFarming.tokenInfos private tokenInfos!: DataMap<DemeterRewardToken>;

  liquiditiesInPools = {};

  get items(): DemeterPool[] {
    return Object.values(this.pools).flat() as DemeterPool[];
  }

  get preparedItems() {
    return this.items.map((pool) => {
      const poolAsset = this.getAsset(pool.poolAsset);
      const rewardAsset = this.getAsset(pool.rewardAsset);
      const tokenInfo = this.tokenInfos[pool.rewardAsset];
      const accountPool = this.getAccountPool(pool);

      const depositFee = new FPNumber(pool.depositFee ?? 0).mul(FPNumber.HUNDRED);
      const liquidityInPool = this.liquiditiesInPools[pool.poolAsset]?.[pool.rewardAsset] ?? FPNumber.ZERO;
      const apr = this.getApr(pool, tokenInfo, liquidityInPool);
      const balance = accountPool?.pooledTokens ?? FPNumber.ZERO;

      return {
        poolAsset,
        rewardAsset,
        rewardAssetSymbol: rewardAsset?.symbol ?? '',
        depositFee: depositFee.toNumber(),
        depositFeeFormatted: depositFee.dp(2).toLocaleString() + '%',
        tvl: liquidityInPool.toNumber(),
        tvlFormatted: formatAmountWithSuffix(liquidityInPool),
        apr: apr.toNumber(),
        aprFormatted: apr.dp(2).toLocaleString() + '%',
        balance: balance.dp(2).toLocaleString(),
      };
    });
  }

  // ExplorePageMixin method implementation
  async updateExploreData(): Promise<void> {
    await Promise.all(
      this.items.map(async (pool) => {
        const { poolAsset, rewardAsset } = pool;
        const liquidity = await this.getLiquidityInPool(pool);
        if (!this.liquiditiesInPools[poolAsset]) {
          this.liquiditiesInPools[poolAsset] = {};
        }
        this.liquiditiesInPools[poolAsset][rewardAsset] = liquidity;
      })
    );
  }
}
</script>

<style lang="scss">
@include explore-table;
</style>
