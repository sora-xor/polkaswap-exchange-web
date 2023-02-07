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
      <s-table-column width="320" label="#" fixed-position="left">
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
            <span class="explore-table__secondary">({{ t('tokens.assetId') }})</span>
          </div>
        </template>
        <template v-slot="{ $index, row }">
          <span class="explore-table-item-index explore-table-item-index--body">{{ $index + startIndex + 1 }}</span>
          <token-logo class="explore-table-item-logo" :token-symbol="row.symbol" />
          <div class="explore-table-item-info explore-table-item-info--body">
            <div class="explore-table-item-name">{{ row.name }}</div>
            <div class="explore-table-item-address">
              <token-address
                class="explore-table-item-address__value"
                :show-name="false"
                :name="row.name"
                :symbol="row.symbol"
                :address="row.address"
              />
            </div>
          </div>
        </template>
      </s-table-column>
      <!-- Symbol -->
      <s-table-column width="108" header-align="center" align="center" prop="symbol">
        <template #header>
          <sort-button name="symbol" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">{{ t('tokens.symbol') }}</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <div class="explore-table-item-symbol">{{ row.symbol }}</div>
        </template>
      </s-table-column>
      <!-- Price -->
      <s-table-column v-if="pricesAvailable" key="price" width="130" header-align="left" align="left">
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
          />
        </template>
      </s-table-column>

      <template v-if="hasTokensData">
        <!-- 1D Price Change -->
        <s-table-column width="104" header-align="right" align="right">
          <template #header>
            <sort-button name="priceChangeDay" :sort="{ order, property }" @change-sort="changeSort">
              <span class="explore-table__primary">1D %</span>
            </sort-button>
          </template>
          <template v-slot="{ row }">
            <price-change :value="row.priceChangeDayFP" />
          </template>
        </s-table-column>
        <!-- 7D Price Change -->
        <s-table-column width="104" header-align="left" align="left">
          <template #header>
            <sort-button name="priceChangeWeek" :sort="{ order, property }" @change-sort="changeSort">
              <span class="explore-table__primary">7D %</span>
            </sort-button>
          </template>
          <template v-slot="{ row }">
            <price-change :value="row.priceChangeWeekFP" />
          </template>
        </s-table-column>
        <!-- 1D Volume -->
        <s-table-column width="104" header-align="right" align="right">
          <template #header>
            <sort-button name="volumeWeek" :sort="{ order, property }" @change-sort="changeSort">
              <span class="explore-table__primary">1D Vol.</span>
            </sort-button>
          </template>
          <template v-slot="{ row }">
            <formatted-amount
              is-fiat-value
              :font-weight-rate="FontWeightRate.MEDIUM"
              :value="row.volumeWeekFormatted.amount"
              class="explore-table-item-price explore-table-item-amount"
            >
              {{ row.volumeWeekFormatted.suffix }}
            </formatted-amount>
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
      </template>
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
import { gql } from '@urql/core';
import { FPNumber } from '@sora-substrate/util';
import { Component, Mixins } from 'vue-property-decorator';
import { components, SubqueryExplorerService } from '@soramitsu/soraneo-wallet-web';
import { SortDirection } from '@soramitsu/soramitsu-js-ui/lib/components/Table/consts';
import type { Asset } from '@sora-substrate/util/build/assets/types';
import type { AmountWithSuffix } from '@/types/formats';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { calcPriceChange, formatAmountWithSuffix } from '@/utils';
import { getter } from '@/store/decorators';

import ExplorePageMixin from '@/components/mixins/ExplorePageMixin';

import TranslationMixin from '@/components/mixins/TranslationMixin';

type TokenData = {
  reserves: FPNumber;
  startPriceDay: FPNumber;
  startPriceWeek: FPNumber;
  volume: FPNumber;
};

type TableItem = {
  price: number;
  priceFormatted: string;
  priceChangeDay: number;
  priceChangeDayFP: FPNumber;
  priceChangeWeek: number;
  priceChangeWeekFP: FPNumber;
  volumeWeek: number;
  volumeWeekFormatted: AmountWithSuffix;
  tvl: number;
  tvlFormatted: AmountWithSuffix;
} & Asset;

const AssetsQuery = gql`
  query AssetsQuery($after: Cursor, $ids: [String!], $dayTimestamp: Int, $weekTimestamp: Int) {
    assets(after: $after, filter: { id: { in: $ids } }) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        liquidity
        daySnapshots: data(
          filter: { and: [{ timestamp: { greaterThanOrEqualTo: $dayTimestamp } }, { type: { equalTo: HOUR } }] }
          orderBy: [TIMESTAMP_ASC]
        ) {
          nodes {
            timestamp
            priceUSD
            volume
          }
        }
        weekSnapshot: data(
          filter: { timestamp: { greaterThanOrEqualTo: $weekTimestamp } }
          orderBy: [TIMESTAMP_ASC]
          first: 1
        ) {
          nodes {
            timestamp
            priceUSD
            volume
          }
        }
      }
    }
  }
`;

@Component({
  components: {
    PriceChange: lazyComponent(Components.PriceChange),
    SortButton: lazyComponent(Components.SortButton),
    TokenAddress: components.TokenAddress,
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
  },
})
export default class Tokens extends Mixins(ExplorePageMixin, TranslationMixin) {
  @getter.assets.whitelistAssets private items!: Array<Asset>;

  tokensData: Record<string, TokenData> = {};
  // override ExplorePageMixin
  order = SortDirection.DESC;
  property = 'tvl';

  get hasTokensData(): boolean {
    return Object.keys(this.tokensData).length !== 0;
  }

  get preparedItems(): TableItem[] {
    return this.items.map((item) => {
      const fpPrice = FPNumber.fromCodecValue(this.getAssetFiatPrice(item) ?? 0);
      const fpPriceDay = this.tokensData[item.address]?.startPriceDay ?? FPNumber.ZERO;
      const fpPriceWeek = this.tokensData[item.address]?.startPriceWeek ?? FPNumber.ZERO;
      const fpVolumeWeek = this.tokensData[item.address]?.volume ?? FPNumber.ZERO;

      const fpPriceChangeDay = calcPriceChange(fpPrice, fpPriceDay);
      const fpPriceChangeWeek = calcPriceChange(fpPrice, fpPriceWeek);

      const reserves = this.tokensData[item.address]?.reserves ?? FPNumber.ZERO;
      const tvl = reserves.mul(fpPrice);

      return {
        ...item,
        price: fpPrice.toNumber(),
        priceFormatted: new FPNumber(fpPrice.toFixed(7)).toLocaleString(),
        priceChangeDay: fpPriceChangeDay.toNumber(),
        priceChangeDayFP: fpPriceChangeDay,
        priceChangeWeek: fpPriceChangeWeek.toNumber(),
        priceChangeWeekFP: fpPriceChangeWeek,
        volumeWeek: fpVolumeWeek.toNumber(),
        volumeWeekFormatted: formatAmountWithSuffix(fpVolumeWeek),
        tvl: tvl.toNumber(),
        tvlFormatted: formatAmountWithSuffix(tvl),
      };
    });
  }

  // ExplorePageMixin method implementation
  async updateExploreData(): Promise<void> {
    await this.withLoading(async () => {
      await this.withParentLoading(async () => {
        this.tokensData = await this.fetchTokensData();
      });
    });
  }

  private async fetchTokensData(): Promise<Record<string, TokenData>> {
    const now = Math.floor(Date.now() / (5 * 60 * 1000)) * (5 * 60); // rounded to latest 5min snapshot (unix)
    const dayTimestamp = now - 60 * 60 * 24; // latest day snapshot (unix)
    const weekTimestamp = now - 60 * 60 * 24 * 7; // latest week snapshot (unix)
    const ids = this.items.map((item) => item.address);

    const tokensData = {};
    let hasNextPage = true;
    let after = '';

    try {
      do {
        const response = await SubqueryExplorerService.request(AssetsQuery, {
          after,
          ids,
          dayTimestamp,
          weekTimestamp,
        });

        if (!response || !response.assets) return tokensData;

        hasNextPage = response.assets.pageInfo.hasNextPage;
        after = response.assets.pageInfo.endCursor;

        response.assets.nodes.forEach((item) => {
          const volume = item.daySnapshots.nodes.reduce((buffer, snapshot) => {
            const hourVolume = new FPNumber(snapshot.volume.amountUSD);

            return buffer.add(hourVolume);
          }, FPNumber.ZERO);

          tokensData[item.id] = {
            reserves: FPNumber.fromCodecValue(item.liquidity ?? 0),
            startPriceDay: new FPNumber(item.daySnapshots.nodes?.[0]?.priceUSD?.open ?? 0),
            startPriceWeek: new FPNumber(item.weekSnapshot.nodes?.[0]?.priceUSD?.open ?? 0),
            volume,
          };
        });
      } while (hasNextPage);

      return tokensData;
    } catch (error) {
      console.error(error);
      return tokensData;
    }
  }
}
</script>

<style lang="scss">
@include explore-table;
</style>
