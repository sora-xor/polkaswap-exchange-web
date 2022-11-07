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
            <span class="explore-table__secondary">({{ t('tokens.assetId') }})</span>
          </div>
        </template>
        <template v-slot="{ $index, row }">
          <span class="explore-table-item-index explore-table-item-index--body">{{ $index + startIndex + 1 }}</span>
          <token-logo class="explore-table-item-logo explore-table-item-logo--body" :token-symbol="row.symbol" />
          <div class="explore-table-item-info explore-table-item-info--body">
            <div class="explore-table-item-name">{{ row.name }}</div>
            <div class="explore-table-item-address">
              <span>{{ TranslationConsts.Sora }}:</span>&nbsp;
              <token-address
                class="explore-table-item-address__value"
                :show-name="false"
                :name="row.name"
                :symbol="row.symbol"
                :address="row.address"
              />
            </div>
            <div v-if="row.externalAddress" class="explore-table-item-address">
              <span>{{ TranslationConsts.Ethereum }}:</span>&nbsp;
              <token-address
                class="explore-table-item-address__value"
                :show-name="false"
                :name="row.name"
                :symbol="row.symbol"
                :address="row.externalAddress"
              />
            </div>
          </div>
        </template>
      </s-table-column>
      <!-- Symbol -->
      <s-table-column width="104" header-align="center" align="center" prop="symbol">
        <template #header>
          <sort-button name="symbol" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">{{ t('tokens.symbol') }}</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <div class="explore-table-item-symbol">{{ row.symbol }}</div>
        </template>
      </s-table-column>

      <template v-if="hasTokensData">
        <!-- Price -->
        <s-table-column width="104" header-align="left" align="left">
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
import Vue from 'vue';
import { gql } from '@urql/core';
import { FPNumber } from '@sora-substrate/util';
import { Component, Mixins, Ref, Prop } from 'vue-property-decorator';
import { mixins, components, SubqueryExplorerService, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SortDirection } from '@soramitsu/soramitsu-js-ui/lib/components/Table/consts';
import SScrollbar from '@soramitsu/soramitsu-js-ui/lib/components/Scrollbar';
import type { Asset } from '@sora-substrate/util/build/assets/types';
import type { RegisteredAccountAssetWithDecimals } from '@/store/assets/types';
import type { AmountWithSuffix } from '@/types/formats';

import { Components, PageNames } from '@/consts';
import { lazyComponent } from '@/router';
import { calcPriceChange, formatAmountWithSuffix } from '@/utils';
import { getter, action } from '@/store/decorators';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import AssetsSearchMixin from '@/components/mixins/AssetsSearchMixin';
import SortButton from '@/components/SortButton.vue';

type TokenData = {
  reserves: FPNumber;
  startPriceDay: FPNumber;
  startPriceWeek: FPNumber;
  volume: FPNumber;
};

type TableItem = {
  externalAddress: string;
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
        reserves: poolXYK {
          targetAssetReserves
        }
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
    SortButton,
    TokenAddress: components.TokenAddress,
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
  },
})
export default class Tokens extends Mixins(
  mixins.LoadingMixin,
  mixins.PaginationSearchMixin,
  mixins.FormattedAmountMixin,
  TranslationMixin,
  AssetsSearchMixin
) {
  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;

  @Prop({ default: '', type: String }) readonly exploreQuery!: string;

  @Ref('table') readonly tableComponent!: any;

  @getter.assets.whitelistAssets private items!: Array<Asset>;
  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<RegisteredAccountAssetWithDecimals>;

  @action.assets.updateRegisteredAssets private updateRegisteredAssets!: AsyncVoidFn;

  order = '';
  property = '';

  tokensData: Record<string, TokenData> = {};

  get pageTitle(): string {
    return this.t(`pageTitle.${PageNames.ExploreTokens}`);
  }

  get hasTokensData(): boolean {
    return Object.keys(this.tokensData).length !== 0;
  }

  get isDefaultSort(): boolean {
    return !this.order || !this.property;
  }

  get preparedItems(): TableItem[] {
    return this.items.map((item) => {
      const externalAddress = this.getAsset(item.address)?.externalAddress ?? '';

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
        externalAddress,
        price: fpPrice.toNumber(),
        priceFormatted: fpPrice.toLocaleString(),
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

  get filteredItems(): TableItem[] {
    return this.filterAssetsByQuery(this.preparedItems)(this.exploreQuery) as TableItem[];
  }

  get sortedItems(): TableItem[] {
    if (!this.order || !this.property) return this.filteredItems;

    const isAscending = this.order === SortDirection.ASC;

    return [...this.filteredItems].sort((a, b) => {
      const aValue = a[this.property];
      const bValue = b[this.property];

      if (aValue === bValue) return 0;

      return (isAscending ? aValue > bValue : aValue < bValue) ? 1 : -1;
    });
  }

  get tableItems(): TableItem[] {
    return this.getPageItems(this.sortedItems);
  }

  async mounted(): Promise<void> {
    await this.$nextTick();

    this.initScrollbar();

    await this.withLoading(async () => {
      await this.withParentLoading(async () => {
        await Promise.all([this.updateRegisteredAssets(), this.updateAssetsData()]);
      });
    });
  }

  private initScrollbar(): void {
    const Scrollbar = Vue.extend(SScrollbar);
    const scrollbar = new Scrollbar();
    scrollbar.$mount();

    const elTable = this.tableComponent.$refs.table;
    const elTableBodyWrapper = elTable.$refs.bodyWrapper;
    const elTableHeaderWrapper = elTable.$refs.headerWrapper;
    const elTableNativeTable = elTableBodyWrapper.getElementsByTagName('table')[0];
    const scrollbarWrap = scrollbar.$el.getElementsByClassName('el-scrollbar__wrap')[0];
    const scrollbarView = scrollbar.$el.getElementsByClassName('el-scrollbar__view')[0];

    elTableBodyWrapper.appendChild(scrollbar.$el);
    scrollbarView.appendChild(elTableNativeTable);

    this.$watch(
      () => (scrollbar.$children[0] as any).moveX,
      () => {
        const scrollLeft = scrollbarWrap.scrollLeft;
        // to scroll table content
        elTableBodyWrapper.scrollLeft = scrollLeft;
        elTableHeaderWrapper.scrollLeft = scrollLeft;
        // to render box shadow on fixed table
        elTable.scrollPosition = scrollLeft === 0 ? 'left' : 'right';
      }
    );
  }

  changeSort({ order = '', property = '' } = {}): void {
    this.order = order;
    this.property = property;
  }

  handleResetSort(): void {
    this.changeSort();
  }

  handleResetSearch(): void {
    this.resetPage();
    this.resetSearch();
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
            reserves: new FPNumber(item.reserves?.targetAssetReserves ?? 0),
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

  private async updateAssetsData(): Promise<void> {
    this.tokensData = await this.fetchTokensData();
  }
}
</script>

<style lang="scss">
@include explore-table;
</style>
