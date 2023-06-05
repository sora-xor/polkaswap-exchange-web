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
      <s-table-column width="280" label="#" fixed-position="left">
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
            <div class="explore-table-item-name">{{ row.symbol }}</div>
            <div class="explore-table__secondary">{{ row.name }}</div>
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
        <!-- Velocity -->
        <s-table-column width="88" header-align="right" align="right">
          <template #header>
            <sort-button name="velocity" :sort="{ order, property }" @change-sort="changeSort">
              <span class="explore-table__primary">VC.</span>
              <s-tooltip border-radius="mini">
                <s-icon name="info-16" size="14px" />
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
            />
          </template>
        </s-table-column>
      </template>
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
import { SortDirection } from '@soramitsu/soramitsu-js-ui/lib/components/Table/consts';
import { components, SubqueryExplorerService } from '@soramitsu/soraneo-wallet-web';
import { gql } from '@urql/core';
import last from 'lodash/fp/last';
import { Component, Mixins } from 'vue-property-decorator';

import ExplorePageMixin from '@/components/mixins/ExplorePageMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { getter } from '@/store/decorators';
import type { AmountWithSuffix } from '@/types/formats';
import { calcPriceChange, formatAmountWithSuffix } from '@/utils';

import type { Asset } from '@sora-substrate/util/build/assets/types';
import type {
  AssetEntity,
  AssetSnapshotEntity,
  EntitiesQueryResponse,
} from '@soramitsu/soraneo-wallet-web/lib/services/subquery/types';

type AssetData = AssetEntity & {
  hourSnapshots: {
    nodes: AssetSnapshotEntity[];
  };
  daySnapshots: {
    nodes: AssetSnapshotEntity[];
  };
};

type TokenData = {
  reserves: FPNumber;
  startPriceDay: FPNumber;
  startPriceWeek: FPNumber;
  volumeDay: FPNumber;
  volumeWeek: FPNumber;
};

type TableItem = {
  price: number;
  priceFormatted: string;
  priceChangeDay: number;
  priceChangeDayFP: FPNumber;
  priceChangeWeek: number;
  priceChangeWeekFP: FPNumber;
  volumeDay: number;
  volumeDayFormatted: AmountWithSuffix;
  tvl: number;
  tvlFormatted: AmountWithSuffix;
  // mcap: number;
  // mcapFormatted: AmountWithSuffix;
  velocity: number;
  velocityFormatted: string;
} & Asset;

const AssetsQuery = gql<EntitiesQueryResponse<AssetData>>`
  query AssetsQuery($after: Cursor, $ids: [String!], $dayTimestamp: Int, $weekTimestamp: Int) {
    entities: assets(after: $after, filter: { and: [{ id: { in: $ids } }, { liquidity: { greaterThan: "1" } }] }) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        liquidity
        hourSnapshots: data(
          filter: { and: [{ timestamp: { greaterThanOrEqualTo: $dayTimestamp } }, { type: { equalTo: HOUR } }] }
          orderBy: [TIMESTAMP_DESC]
        ) {
          nodes {
            priceUSD
            volume
          }
        }
        daySnapshots: data(
          filter: { and: [{ timestamp: { greaterThanOrEqualTo: $weekTimestamp } }, { type: { equalTo: DAY } }] }
          orderBy: [TIMESTAMP_DESC]
        ) {
          nodes {
            priceUSD
            volume
          }
        }
      }
    }
  }
`;

const calcVolume = (nodes: AssetSnapshotEntity[]): FPNumber => {
  return nodes.reduce((buffer, snapshot) => {
    const snapshotVolume = new FPNumber(snapshot.volume.amountUSD);

    return buffer.add(snapshotVolume);
  }, FPNumber.ZERO);
};

const parse = (item: AssetData): Record<string, TokenData> => {
  return {
    [item.id]: {
      reserves: FPNumber.fromCodecValue(item.liquidity ?? 0),
      startPriceDay: new FPNumber(last(item.hourSnapshots.nodes)?.priceUSD?.open ?? 0),
      startPriceWeek: new FPNumber(last(item.daySnapshots.nodes)?.priceUSD?.open ?? 0),
      volumeDay: calcVolume(item.hourSnapshots.nodes),
      volumeWeek: calcVolume(item.daySnapshots.nodes),
    },
  };
};

@Component({
  components: {
    PriceChange: lazyComponent(Components.PriceChange),
    SortButton: lazyComponent(Components.SortButton),
    TokenAddress: components.TokenAddress,
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
    HistoryPagination: components.HistoryPagination,
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
    return Object.entries(this.tokensData).reduce<TableItem[]>((buffer, [address, tokenData]) => {
      const asset = this.getAsset(address);

      if (!asset) return buffer;

      const fpPrice = FPNumber.fromCodecValue(this.getAssetFiatPrice(asset) ?? 0);
      const fpPriceDay = tokenData?.startPriceDay ?? FPNumber.ZERO;
      const fpPriceWeek = tokenData?.startPriceWeek ?? FPNumber.ZERO;
      const fpVolumeDay = tokenData?.volumeDay ?? FPNumber.ZERO;
      const fpVolumeWeek = tokenData?.volumeWeek ?? FPNumber.ZERO;
      const fpPriceChangeDay = calcPriceChange(fpPrice, fpPriceDay);
      const fpPriceChangeWeek = calcPriceChange(fpPrice, fpPriceWeek);

      const reserves = tokenData?.reserves ?? FPNumber.ZERO;
      const tvl = reserves.mul(fpPrice);
      const velocity = tvl.isZero() ? FPNumber.ZERO : fpVolumeWeek.div(tvl);

      buffer.push({
        ...asset,
        price: fpPrice.toNumber(),
        priceFormatted: new FPNumber(fpPrice.toFixed(7)).toLocaleString(),
        priceChangeDay: fpPriceChangeDay.toNumber(),
        priceChangeDayFP: fpPriceChangeDay,
        priceChangeWeek: fpPriceChangeWeek.toNumber(),
        priceChangeWeekFP: fpPriceChangeWeek,
        volumeDay: fpVolumeDay.toNumber(),
        volumeDayFormatted: formatAmountWithSuffix(fpVolumeDay),
        tvl: tvl.toNumber(),
        tvlFormatted: formatAmountWithSuffix(tvl),
        velocity: velocity.toNumber(),
        velocityFormatted: String(velocity.toNumber(2)),
      });

      return buffer;
    }, []);
  }

  // ExplorePageMixin method implementation
  async updateExploreData(): Promise<void> {
    await this.withLoading(async () => {
      await this.withParentLoading(async () => {
        this.tokensData = Object.freeze(await this.fetchTokensData());
      });
    });
  }

  private async fetchTokensData(): Promise<Record<string, TokenData>> {
    const now = Math.floor(Date.now() / (5 * 60 * 1000)) * (5 * 60); // rounded to latest 5min snapshot (unix)
    const dayTimestamp = now - 60 * 60 * 24; // latest day snapshot (unix)
    const weekTimestamp = now - 60 * 60 * 24 * 7; // latest week snapshot (unix)
    const ids = this.items.map((item) => item.address); // only whitelisted assets

    const variables = { ids, dayTimestamp, weekTimestamp };
    const items = await SubqueryExplorerService.fetchAllEntities(AssetsQuery, variables, parse);

    if (!items) return {};

    return items.reduce((acc, item) => ({ ...acc, ...item }), {});
  }
}
</script>

<style lang="scss">
@include explore-table;
</style>
