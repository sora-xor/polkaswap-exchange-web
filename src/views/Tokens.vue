<template>
  <div class="container container--tokens" v-loading="parentLoading || loading">
    <generic-page-header :title="t('pageTitle.Tokens')" class="page-header-title--tokens">
      <search-input
        v-model="query"
        :placeholder="t('selectToken.searchPlaceholder')"
        autofocus
        @clear="handleResetSearch"
        class="tokens-table-search"
      />
    </generic-page-header>

    <s-table ref="table" :data="tableItems" :highlight-current-row="false" size="small" class="tokens-table">
      <!-- Index -->
      <s-table-column width="280" label="#" fixed-position="left">
        <template #header>
          <div class="tokens-item-index">
            <span @click="handleResetSort" :class="['tokens-item-index--head', { active: isDefaultSort }]">#</span>
          </div>
          <div class="tokens-item-logo">
            <s-icon name="various-bone-24" size="14px" class="tokens-item-logo--head" />
          </div>
          <div class="tokens-item-info tokens-item-info--head">
            <span class="tokens-table__primary">{{ t('tokens.name') }}</span>
            <span class="tokens-table__secondary">({{ t('tokens.assetId') }})</span>
          </div>
        </template>
        <template v-slot="{ $index, row }">
          <span class="tokens-item-index tokens-item-index--body">{{ $index + startIndex + 1 }}</span>
          <token-logo class="tokens-item-logo tokens-item-logo--body" :token-symbol="row.symbol" />
          <div class="tokens-item-info tokens-item-info--body">
            <div class="tokens-item-name">{{ row.name }}</div>
            <div class="tokens-item-address">
              <span>{{ t('soraText') }}:</span>&nbsp;
              <token-address
                class="tokens-item-address__value"
                :show-name="false"
                :name="row.name"
                :symbol="row.symbol"
                :address="row.address"
              />
            </div>
            <div v-if="row.externalAddress" class="tokens-item-address">
              <span>{{ t('ethereumText') }}:</span>&nbsp;
              <token-address
                class="tokens-item-address__value"
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
          <sort-button name="symbol" class="tokens-table--center" :sort="{ order, property }" @change-sort="changeSort">
            <span class="tokens-table__primary">{{ t('tokens.symbol') }}</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <div class="tokens-item-symbol">{{ row.symbol }}</div>
        </template>
      </s-table-column>
      <!-- Price -->
      <s-table-column width="104" header-align="left" align="left">
        <template #header>
          <sort-button name="price" :sort="{ order, property }" @change-sort="changeSort">
            <span class="tokens-table__primary">Price</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <formatted-amount
            is-fiat-value
            fiat-default-rounding
            :font-weight-rate="FontWeightRate.MEDIUM"
            :value="row.priceFormatted"
            class="tokens-item-price"
          />
        </template>
      </s-table-column>
      <!-- 1D Price Change -->
      <s-table-column width="104" header-align="right" align="right">
        <template #header>
          <sort-button name="priceChangeDay" :sort="{ order, property }" @change-sort="changeSort">
            <span class="tokens-table__primary">1D %</span>
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
            <span class="tokens-table__primary">7D %</span>
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
            <span class="tokens-table__primary">1D Vol.</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <formatted-amount
            is-fiat-value
            :font-weight-rate="FontWeightRate.MEDIUM"
            :value="row.volumeWeekFormatted.amount"
            class="tokens-item-price tokens-item-amount"
          >
            {{ row.volumeWeekFormatted.suffix }}
          </formatted-amount>
        </template>
      </s-table-column>
      <!-- TVL -->
      <s-table-column width="104" header-align="right" align="right">
        <template #header>
          <sort-button name="tvl" :sort="{ order, property }" @change-sort="changeSort">
            <span class="tokens-table__primary">TVL</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <formatted-amount
            is-fiat-value
            :font-weight-rate="FontWeightRate.MEDIUM"
            :value="row.tvlFormatted.amount"
            class="tokens-item-price tokens-item-amount"
          >
            {{ row.tvlFormatted.suffix }}
          </formatted-amount>
        </template>
      </s-table-column>
    </s-table>

    <s-pagination
      class="tokens-table-pagination"
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
import { Component, Mixins, Ref } from 'vue-property-decorator';
import { mixins, components, SubqueryExplorerService, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SortDirection } from '@soramitsu/soramitsu-js-ui/lib/components/Table/consts';
import SScrollbar from '@soramitsu/soramitsu-js-ui/lib/components/Scrollbar';
import type { Asset } from '@sora-substrate/util/build/assets/types';
import type { RegisteredAccountAssetWithDecimals } from '@/store/assets/types';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { calcPriceChange } from '@/utils';
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

type AmountWithSuffix = {
  amount: string;
  suffix: string;
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
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    PriceChange: lazyComponent(Components.PriceChange),
    SortButton,
    TokenAddress: components.TokenAddress,
    SearchInput: components.SearchInput,
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

  @Ref('table') readonly tableComponent!: any;

  @getter.assets.whitelistAssets private items!: Array<Asset>;
  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<RegisteredAccountAssetWithDecimals>;

  @action.assets.updateRegisteredAssets private updateRegisteredAssets!: AsyncVoidFn;

  order = '';
  property = '';

  tokensData: Record<string, TokenData> = {};

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
        volumeWeekFormatted: this.formatAmount(fpVolumeWeek),
        tvl: tvl.toNumber(),
        tvlFormatted: this.formatAmount(tvl),
      };
    });
  }

  get filteredItems(): TableItem[] {
    return this.filterAssetsByQuery(this.preparedItems)(this.searchQuery) as TableItem[];
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

  private formatAmount(value: FPNumber): AmountWithSuffix {
    const val = value.toNumber();
    const format = (value: string) => new FPNumber(value).toLocaleString();

    if (Math.trunc(val / 1_000_000) > 0) {
      const amount = format((val / 1_000_000).toFixed(2));
      return { amount, suffix: 'M' };
    } else if (Math.trunc(val / 1_000) > 0) {
      const amount = format((val / 1_000).toFixed(2));
      return { amount, suffix: 'K' };
    } else {
      const amount = format(val.toFixed(2));
      return { amount, suffix: '' };
    }
  }
}
</script>

<style lang="scss">
$fixed-column-width: 280px;

.page-header-title--tokens {
  justify-content: space-between;
  align-items: center;
}

.tokens-table.el-table {
  background: transparent;

  thead {
    text-transform: uppercase;
    font-size: var(--s-font-size-small);
    letter-spacing: var(--s-letter-spacing-mini);

    [class^='s-icon-'],
    [class*=' s-icon-'] {
      @include icon-styles;
    }
  }

  tr,
  th {
    &,
    &:hover {
      & > td,
      & > th {
        background: var(--s-color-utility-surface);
        .cell {
          padding: $inner-spacing-mini / 2 $inner-spacing-mini;
        }
      }
    }
  }

  .el-table__fixed {
    height: 100% !important;

    &:before,
    &:after {
      content: unset;
    }

    .el-table__fixed-body-wrapper {
      height: 100% !important;
    }
  }

  .el-table__body-wrapper {
    height: auto !important;

    &.is-scrolling-left ~ .el-table__fixed {
      box-shadow: inherit;
    }

    .el-scrollbar__bar.is-horizontal {
      right: 0;
      left: unset;
      width: calc(100% - #{$fixed-column-width});
    }
  }

  .el-table__empty-text {
    color: var(--s-color-base-content-tertiary); // TODO [1.4]: remove after fix in ui-lib
  }

  .tokens-item {
    &-amount.formatted-amount--fiat-value {
      color: var(--s-color-base-content-primary);
    }
    &-address {
      .tokens-item-address__value {
        &.token-address {
          font-size: var(--s-font-size-extra-mini);
          font-weight: 400;
          color: var(--s-color-base-content-primary);
        }
      }
    }
  }
}

.tokens-table-pagination {
  display: flex;
  margin-top: $inner-spacing-medium;

  .el-pagination__total {
    margin: auto;
  }
}

.tokens-table-search {
  .s-button--clear:focus {
    outline: none !important;
    i {
      @include focus-outline($inner: true, $borderRadius: 50%);
    }
  }
}
</style>

<style lang="scss" scoped>
$search-input-width: 382px;
$container-max-width: 50vw;
$container-min-width: $breakpoint_mobile;
$cell-index-width: 40px;
$cell-logo-width: 32px;

.container--tokens {
  max-width: $container-max-width;
  min-width: $container-min-width;
}

.tokens-table {
  display: flex;
  flex-flow: column nowrap;
  flex: 1;

  &__primary {
    color: var(--s-color-base-content-secondary);
  }
  &__secondary {
    color: var(--s-color-base-content-quaternary);
    font-size: var(--s-font-size-extra-mini);
  }

  &-head {
    display: flex;
    align-items: center;
    margin: auto;
  }

  &-search {
    max-width: $search-input-width;
    margin-left: $inner-spacing-medium;
  }
}

.tokens-item {
  &-index {
    width: $cell-index-width;
    display: inline-block;
    vertical-align: middle;

    &--body {
      color: var(--s-color-base-content-tertiary);
      font-size: var(--s-font-size-small);
      font-weight: 800;
    }

    &--head {
      cursor: pointer;

      &.active {
        color: var(--s-color-theme-accent);
      }
    }
  }
  &-logo {
    display: inline-block;
    vertical-align: middle;
    text-align: center;
    width: $cell-logo-width;
    margin: 0 $inner-spacing-mini;
  }
  &-info {
    display: inline-block;
    vertical-align: middle;
    line-height: var(--s-line-height-medium);
    letter-spacing: var(--s-letter-spacing-mini);
    margin: 0 $inner-spacing-mini;

    &--head {
      flex-flow: column wrap;
      line-height: var(--s-line-height-small);

      & > span {
        margin-right: $inner-spacing-mini / 2;
        white-space: nowrap;
      }
    }

    &--body {
      font-weight: 300;
    }
  }
  &-symbol {
    flex: 1;
    background-color: var(--s-color-base-border-secondary);
    border-radius: var(--s-border-radius-medium);
    font-size: var(--s-font-size-big);
    font-weight: 800;
    line-height: var(--s-line-height-big);
    letter-spacing: var(--s-letter-spacing-small);
    text-align: center;
  }
  &-name {
    font-size: var(--s-font-size-small);
    font-weight: 600;
  }
  &-address {
    display: flex;
    font-size: var(--s-font-size-extra-mini);
  }

  &-price {
    font-size: var(--s-font-size-medium);
    white-space: nowrap;
  }
}
</style>
