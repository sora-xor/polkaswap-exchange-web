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
      <s-table-column key="price" min-width="130" header-align="right" align="right">
        <template #header>
          <sort-button name="price" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">Price</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <formatted-amount
            fiat-default-rounding
            :font-weight-rate="FontWeightRate.MEDIUM"
            :value="row.priceFormatted"
            class="explore-table-item-price"
          />
          <formatted-amount
            is-fiat-value
            fiat-default-rounding
            :font-weight-rate="FontWeightRate.MEDIUM"
            :value="row.priceUSDFormatted"
            class="explore-table-item-price"
          />
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
          <price-change :value="row.priceChangeDayFP" />
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
import { FPNumber } from '@sora-substrate/sdk';
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import ExplorePageMixin from '@/components/mixins/ExplorePageMixin';
import { Components } from '@/consts';
import { fetchOrderBooks } from '@/indexer/queries/orderBook/orderBooks';
import { lazyComponent } from '@/router';
import type { AmountWithSuffix } from '@/types/formats';
import type { OrderBookWithStats } from '@/types/orderBook';
import { formatAmountWithSuffix, sortPools, showMostFittingValue } from '@/utils';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

type TableItem = {
  name: string;
  baseAsset: Asset;
  targetAsset: Asset;
  price: number;
  priceFormatted: string;
  priceUSDFormatted: string;
  priceChangeDay: number;
  priceChangeDayFP: FPNumber;
  volumeDay: number;
  volumeDayFormatted: AmountWithSuffix;
  tvl: number;
  tvlFormatted: AmountWithSuffix;
};

@Component({
  components: {
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    PriceChange: lazyComponent(Components.PriceChange),
    SortButton: lazyComponent(Components.SortButton),
    TokenAddress: components.TokenAddress,
    FormattedAmount: components.FormattedAmount,
    HistoryPagination: components.HistoryPagination,
  },
})
export default class ExploreBooks extends Mixins(ExplorePageMixin) {
  private orderBooks: readonly OrderBookWithStats[] = [];

  get prefilteredItems(): TableItem[] {
    const items = this.orderBooks.reduce<TableItem[]>((buffer, item) => {
      const {
        id: { base, quote },
        stats: { baseAssetReserves, quoteAssetReserves, price, priceChange, volume },
      } = item;

      const baseAsset = this.getAsset(base);
      const targetAsset = this.getAsset(quote);

      if (!(baseAsset && targetAsset)) return buffer;

      const name = `${baseAsset.symbol}-${targetAsset.symbol}`; // For search

      const fpBaseAssetPrice = FPNumber.fromCodecValue(this.getAssetFiatPrice(baseAsset) ?? 0);
      const fpQuoteAssetPrice = FPNumber.fromCodecValue(this.getAssetFiatPrice(targetAsset) ?? 0);
      const fpBaseAssetReserves = FPNumber.fromCodecValue(baseAssetReserves ?? 0, baseAsset.decimals);
      const fpQuoteAssetReserves = FPNumber.fromCodecValue(quoteAssetReserves ?? 0, targetAsset.decimals);
      const fpBaseAssetTvl = fpBaseAssetPrice.mul(fpBaseAssetReserves);
      const fpQuoteAssetTvl = fpQuoteAssetPrice.mul(fpQuoteAssetReserves);
      const fpTvl = fpBaseAssetTvl.add(fpQuoteAssetTvl);
      const fpPriceUSD = price.mul(fpQuoteAssetPrice);

      buffer.push({
        name,
        baseAsset,
        targetAsset,
        price: price.toNumber(),
        priceFormatted: showMostFittingValue(price),
        priceUSDFormatted: fpPriceUSD.toLocaleString(),
        priceChangeDay: priceChange.toNumber(),
        priceChangeDayFP: priceChange,
        volumeDay: volume.toNumber(),
        volumeDayFormatted: formatAmountWithSuffix(volume),
        tvl: fpTvl.toNumber(),
        tvlFormatted: formatAmountWithSuffix(fpTvl),
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

  // ExplorePageMixin method implementation
  async updateExploreData(): Promise<void> {
    await this.withLoading(async () => {
      await this.withParentLoading(async () => {
        this.orderBooks = Object.freeze((await fetchOrderBooks(this.allowedAssets)) ?? []);
      });
    });
  }
}
</script>

<style lang="scss">
@include explore-table;
</style>
