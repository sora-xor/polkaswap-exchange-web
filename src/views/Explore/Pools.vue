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
      <!-- APY -->
      <s-table-column v-if="hasApyColumnData" key="apy" width="120" header-align="right" align="right">
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
      <s-table-column v-if="isLoggedIn" key="logged" width="140" header-align="right" align="right">
        <template #header>
          <span class="explore-table__primary">{{ t('balanceText') }}</span>
        </template>
        <template v-slot="{ row }">
          <div class="explore-table-item-tokens">
            <div
              v-for="({ asset, balance, balancePrefix }, index) in row.accountTokens"
              :key="index"
              class="explore-table-cell"
            >
              <formatted-amount
                value-can-be-hidden
                :font-size-rate="FontSizeRate.SMALL"
                :value="balance"
                class="explore-table-item-price explore-table-item-amount"
              >
                <template #prefix>{{ balancePrefix }}</template>
              </formatted-amount>
              <token-logo size="small" class="explore-table-item-logo explore-table-item-logo--plain" :token="asset" />
            </div>
          </div>
        </template>
      </s-table-column>
      <!-- TVL -->
      <s-table-column v-if="pricesAvailable" key="tvl" width="104" header-align="right" align="right">
        <template #header>
          <sort-button name="tvl" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">{{ TranslationConsts.TVL }}</span>
            <s-tooltip border-radius="mini" :content="t('tooltips.tvl')">
              <s-icon name="info-16" size="14px" />
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
import { api, components } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/util';
import { SortDirection } from '@soramitsu/soramitsu-js-ui/lib/components/Table/consts';

import ExplorePageMixin from '@/components/mixins/ExplorePageMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import PoolApyMixin from '@/components/mixins/PoolApyMixin';

import { state, getter } from '@/store/decorators';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { formatAmountWithSuffix, formatDecimalPlaces } from '@/utils';

import type { Asset, Whitelist } from '@sora-substrate/util/build/assets/types';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';
import type { AmountWithSuffix } from '@/types/formats';

type TableItem = {
  baseAsset: Asset;
  targetAsset: Asset;
  apy: number;
  apyFormatted: string;
  tvl: number;
  tvlFormatted: AmountWithSuffix;
  isAccountItem: boolean;
  accountTokens: { asset: Asset; balance: string; balancePrefix: string }[];
};

@Component({
  components: {
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    SortButton: lazyComponent(Components.SortButton),
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
  },
})
export default class ExplorePools extends Mixins(ExplorePageMixin, TranslationMixin, PoolApyMixin) {
  @state.pool.accountLiquidity private accountLiquidity!: Array<AccountLiquidity>;
  @getter.wallet.account.whitelist private whitelist!: Whitelist;

  // override ExplorePageMixin
  order = SortDirection.DESC;
  property = 'tvl';

  poolReserves: Record<string, string[]> = {};

  get items(): TableItem[] {
    return Object.entries(this.poolReserves).reduce<any>((buffer, [key, reserves]) => {
      const matches = key.match(/0x\w{64}/g);

      if (!matches || !matches[0] || !matches[1] || !this.whitelist[matches[0]] || !this.whitelist[matches[1]])
        return buffer;

      const baseAsset = this.getAsset(matches[0]);
      const targetAsset = this.getAsset(matches[1]);

      if (!(baseAsset && targetAsset)) return buffer;

      const name = `${baseAsset.symbol}-${targetAsset.symbol}`; // For search

      const accountPool = this.accountLiquidity.find(
        (liquidity) => liquidity.firstAddress === baseAsset.address && liquidity.secondAddress === targetAsset.address
      );

      const fpBaseAssetPrice = FPNumber.fromCodecValue(this.getAssetFiatPrice(baseAsset) ?? 0);
      const fpBaseAssetReserves = FPNumber.fromCodecValue(reserves[0] ?? 0);
      const fpApy = FPNumber.fromCodecValue(this.getPoolApy(baseAsset.address, targetAsset.address) ?? 0).mul(
        FPNumber.HUNDRED
      );
      const fpTvl = fpBaseAssetPrice.mul(fpBaseAssetReserves).mul(new FPNumber(2));

      const accountTokens = [
        {
          asset: baseAsset,
          balance: formatDecimalPlaces(FPNumber.fromCodecValue(accountPool?.firstBalance ?? 0)),
          balancePrefix: accountPool ? '~' : '',
        },
        {
          asset: targetAsset,
          balance: formatDecimalPlaces(FPNumber.fromCodecValue(accountPool?.secondBalance ?? 0)),
          balancePrefix: accountPool ? '~' : '',
        },
      ];

      buffer.push({
        name,
        baseAsset,
        targetAsset,
        apy: fpApy.toNumber(),
        apyFormatted: formatDecimalPlaces(fpApy, true),
        tvl: fpTvl.toNumber(),
        tvlFormatted: formatAmountWithSuffix(fpTvl),
        isAccountItem: !!accountPool,
        accountTokens,
      });

      return buffer;
    }, []);
  }

  get preparedItems(): TableItem[] {
    if (!this.isAccountItems) return this.items;

    return this.items.filter((item) => item.isAccountItem);
  }

  get hasApyColumnData(): boolean {
    return this.items.some((item) => item.apy !== 0);
  }

  // ExplorePageMixin method implementation
  async updateExploreData(): Promise<void> {
    await this.withLoading(async () => {
      await this.withParentLoading(async () => {
        this.poolReserves = await api.poolXyk.getAllReserves();
      });
    });
  }
}
</script>

<style lang="scss">
@include explore-table;
</style>
