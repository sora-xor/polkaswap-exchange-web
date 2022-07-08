<template>
  <div class="container container--tokens" v-loading="parentLoading">
    <generic-page-header :title="t('tokens.title')" class="page-header-title--tokens">
      <search-input
        v-model="query"
        :placeholder="t('selectToken.searchPlaceholder')"
        autofocus
        @clear="handleResetSearch"
        class="tokens-table-search"
      />
    </generic-page-header>

    <s-table :data="tableItems" :highlight-current-row="false" size="small" class="tokens-table">
      <!-- Index -->
      <s-table-column width="48" label="#">
        <template #header>
          <span @click="handleResetSort" :class="['tokens-item-head-index', { active: isDefaultSort }]">#</span>
        </template>
        <template v-slot="{ $index }">
          <span class="tokens-item-index">{{ $index + startIndex + 1 }}</span>
        </template>
      </s-table-column>
      <!-- Icon -->
      <s-table-column width="52" header-align="center" align="center">
        <template #header>
          <s-icon name="various-bone-24" size="14px" class="tokens-table--center" />
        </template>
        <template v-slot="{ row }">
          <token-logo class="tokens-item-logo" :token-symbol="row.symbol" />
        </template>
      </s-table-column>
      <!-- Name -->
      <s-table-column width="180">
        <template #header>
          <div class="tokens-item-info-header">
            <span class="tokens-table__primary">{{ t('tokens.name') }}</span>
            <span class="tokens-table__secondary">({{ t('tokens.assetId') }})</span>
          </div>
        </template>
        <template v-slot="{ row }">
          <div class="tokens-item-info">
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
      <s-table-column width="140" header-align="right" align="right">
        <template #header>
          <sort-button name="price" :sort="{ order, property }" @change-sort="changeSort">
            <span class="tokens-table__primary">Price</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <formatted-amount is-fiat-value fiat-default-rounding :value="row.priceFormatted" class="tokens-item-price" />
        </template>
      </s-table-column>
      <!-- 1D Price Change -->
      <s-table-column width="140" header-align="right" align="right">
        <template #header>
          <sort-button name="priceChangeDay" :sort="{ order, property }" @change-sort="changeSort">
            <span class="tokens-table__primary">1D Change</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <price-change :value="row.priceChangeDayFP" />
        </template>
      </s-table-column>
      <!-- 7D Price Change -->
      <s-table-column width="140" header-align="right" align="right">
        <template #header>
          <sort-button name="priceChangeWeek" :sort="{ order, property }" @change-sort="changeSort">
            <span class="tokens-table__primary">7D Change</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <price-change :value="row.priceChangeWeekFP" />
        </template>
      </s-table-column>
      <!-- 1D Volume -->
      <s-table-column width="110" header-align="right" align="right">
        <template #header>
          <sort-button name="volumeWeek" :sort="{ order, property }" @change-sort="changeSort">
            <span class="tokens-table__primary">1D Volume</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <div class="tokens-item-amount">
            <span class="tokens-item-amount__currency">~$</span>
            <span>{{ row.volumeWeekFormatted }}</span>
          </div>
        </template>
      </s-table-column>
      <!-- TVL -->
      <s-table-column width="110" header-align="right" align="right">
        <template #header>
          <sort-button name="tvl" :sort="{ order, property }" @change-sort="changeSort">
            <span class="tokens-table__primary">TVL</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <div class="tokens-item-amount">
            <span class="tokens-item-amount__currency">~$</span>
            <span>{{ row.tvlFormatted }}</span>
          </div>
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
import { FPNumber } from '@sora-substrate/util';
import { Component, Mixins } from 'vue-property-decorator';
import { mixins, components, SubqueryExplorerService } from '@soramitsu/soraneo-wallet-web';
import { SortDirection } from '@soramitsu/soramitsu-js-ui/lib/components/Table/consts';
import type { Asset } from '@sora-substrate/util/build/assets/types';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { calcPriceChange } from '@/utils';
import { getter } from '@/store/decorators';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import AssetsSearchMixin from '@/components/mixins/AssetsSearchMixin';
import SortButton from '@/components/SortButton.vue';

type TokenData = {
  reserves: FPNumber;
  startPriceDay: FPNumber;
  startPriceWeek: FPNumber;
  volume: FPNumber;
};

const AssetsQuery = `
query AssetsQuery ($ids: [String!], $dayTimestamp: Int, $weekTimestamp: Int) {
  assets (filter: { id: { in: $ids } }) {
    nodes {
      id
      reserves: poolXYK {
        targetAssetReserves
      }
      daySnapshots: data (
        filter: { and: [
          { timestamp: { greaterThanOrEqualTo: $dayTimestamp } },
          { type: { equalTo: HOUR } }
        ] },
        orderBy: [TIMESTAMP_ASC]
      ) {
        nodes {
          timestamp
          priceUSD
          volume
        }
      }
      weekSnapshot: data(
        filter: { timestamp: { greaterThanOrEqualTo: $weekTimestamp } },
        orderBy: [TIMESTAMP_ASC],
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
  @getter.assets.whitelistAssets private items!: Array<Asset>;

  order = '';
  property = '';

  tokensData: Record<string, TokenData> = {};

  get isDefaultSort(): boolean {
    return !this.order || !this.property;
  }

  get preparedItems() {
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

  get filteredItems(): Array<Asset> {
    return this.filterAssetsByQuery(this.preparedItems)(this.searchQuery) as Array<Asset>;
  }

  get sortedItems(): Array<Asset> {
    if (!this.order || !this.property) return this.filteredItems;

    const isAscending = this.order === SortDirection.ASC;

    return [...this.filteredItems].sort((a, b) => {
      const aValue = a[this.property];
      const bValue = b[this.property];

      if (aValue === bValue) return 0;

      return (isAscending ? aValue > bValue : aValue < bValue) ? 1 : -1;
    });
  }

  get tableItems(): Array<Asset> {
    return this.getPageItems(this.sortedItems);
  }

  async mounted(): Promise<void> {
    await this.updateAssetsData();
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
    try {
      const now = Math.floor(Date.now() / (5 * 60 * 1000)) * (5 * 60); // rounded to latest 5min snapshot (unix)
      const dayTimestamp = now - 60 * 60 * 24; // latest day snapshot (unix)
      const weekTimestamp = now - 60 * 60 * 24 * 7; // latest week snapshot (unix)
      const ids = this.items.map((item) => item.address);

      const { assets } = await SubqueryExplorerService.request(AssetsQuery, { ids, dayTimestamp, weekTimestamp });

      if (!Array.isArray(assets?.nodes)) return {};

      const data = assets.nodes.reduce((buffer, item) => {
        const volume = item.daySnapshots.nodes.reduce((buffer, snapshot) => {
          const hourVolume = new FPNumber(snapshot.volume.amountUSD);

          return buffer.add(hourVolume);
        }, FPNumber.ZERO);

        return {
          ...buffer,
          [item.id]: {
            reserves: new FPNumber(item.reserves?.targetAssetReserves ?? 0),
            startPriceDay: new FPNumber(item.daySnapshots.nodes?.[0]?.priceUSD?.open ?? 0),
            startPriceWeek: new FPNumber(item.weekSnapshot.nodes?.[0]?.priceUSD?.open ?? 0),
            volume,
          },
        };
      }, {});

      return data;
    } catch (error) {
      console.error(error);
      return {};
    }
  }

  private async updateAssetsData(): Promise<void> {
    await this.withLoading(async () => {
      this.tokensData = await this.fetchTokensData();
    });
  }

  private formatAmount(value: FPNumber) {
    const val = value.toNumber();
    const format = (value: string) => new FPNumber(value).toLocaleString();

    if (Math.trunc(val / 1_000_000) > 0) {
      const amount = format((val / 1_000_000).toFixed(2));
      return `${amount}M`;
    } else if (Math.trunc(val / 1_000) > 0) {
      const amount = format((val / 1_000).toFixed(2));
      return `${amount}K`;
    } else {
      return format(val.toFixed(2));
    }
  }
}
</script>

<style lang="scss">
.page-header-title--tokens {
  justify-content: space-between;
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
      background: transparent;

      & > td,
      & > th {
        background: transparent;

        .cell {
          padding: $inner-spacing-mini / 2;
        }
      }
    }
  }

  .el-table__body-wrapper {
    height: auto !important;
  }

  .el-table__empty-text {
    color: var(--s-color-base-content-tertiary); // TODO [1.4]: remove after fix in ui-lib
  }

  .token-address {
    &__name {
      display: block;
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

.tokens-item-address {
  .tokens-item-address__value {
    &.token-address {
      font-size: var(--s-font-size-extra-mini);
      font-weight: 400;
      color: var(--s-color-base-content-primary);
    }
  }
}
</style>

<style lang="scss" scoped>
$icon-size: 36px;
$container-max-width: 1072px;

.container--tokens {
  max-width: $container-max-width;
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
    max-width: 382px;
  }
}

.tokens-item {
  &-index {
    color: var(--s-color-base-content-tertiary);
    font-size: var(--s-font-size-small);
    font-weight: 800;
  }
  &-symbol {
    flex: 1;
    background-color: var(--s-color-base-border-secondary);
    border-radius: var(--s-border-radius-medium);
    font-size: var(--s-font-size-big);
    font-weight: 800;
    line-height: var(--s-line-height-big);
    text-align: center;
  }
  &-logo {
    display: inline-block;
    height: $icon-size;
    width: $icon-size;
  }
  &-info {
    line-height: var(--s-line-height-medium);
    letter-spacing: var(--s-letter-spacing-mini);
    font-weight: 300;

    &-header {
      flex-flow: column wrap;
      line-height: var(--s-line-height-small);

      & > span {
        margin-right: $inner-spacing-mini / 2;
        white-space: nowrap;
      }
    }
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

  &-amount {
    color: var(--s-color-base-content-primary);
    font-size: var(--s-font-size-medium);
    font-weight: 600;
    letter-spacing: var(--s-letter-spacing-mini);
    white-space: nowrap;

    &__currency {
      color: var(--s-color-base-content-secondary);
      margin-right: $inner-spacing-mini / 4;
    }
  }

  &-head {
    &-index {
      cursor: pointer;

      &.active {
        color: var(--s-color-theme-accent);
      }
    }
  }
}
</style>
