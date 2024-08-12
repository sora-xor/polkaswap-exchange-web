<template>
  <div class="collaterals-container container" :class="{ 'menu-collapsed': collapsed }">
    <div class="collaterals-search">
      <search-input
        class="search"
        autofocus
        :value="exploreQuery"
        :placeholder="t('searchText')"
        @input="updateSearch"
        @clear="resetSearch"
      />
    </div>
    <s-table
      ref="table"
      :data="tableItems"
      :highlight-current-row="false"
      size="small"
      class="collaterals-table explore-table"
      @cell-click="openSelectedPosition"
    >
      <!-- Index -->
      <s-table-column width="250" label="#">
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
          <div class="explore-table-item-info explore-table-item-info--head">
            <span class="explore-table__primary">DEBT / COLLATERAL</span>
          </div>
        </template>
        <template v-slot="{ $index, row }">
          <span class="explore-table-item-index explore-table-item-index--body">{{ $index + startIndex + 1 }}</span>
          <pair-token-logo
            class="explore-table-item-logo"
            size="small"
            :first-token="row.debtAsset"
            :second-token="row.lockedAsset"
          />
          <div class="explore-table-item-info explore-table-item-info--body">
            <div class="explore-table-item-name">{{ row.debtAsset.symbol }} / {{ row.lockedAsset.symbol }}</div>
          </div>
          <s-icon v-if="isLoggedIn && row.isAvailable" name="plus-16" size="12" />
        </template>
      </s-table-column>
      <!-- Interest -->
      <s-table-column width="140" header-align="right" align="right">
        <template #header>
          <sort-button name="stabilityFeeValue" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">{{ t('kensetsu.interest') }}</span>
            <s-tooltip border-radius="mini" :content="t('kensetsu.interestDescription')">
              <s-icon name="info-16" size="14px" />
            </s-tooltip>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <span class="explore-table__accent">{{ row.stabilityFee }}</span>
        </template>
      </s-table-column>
      <!-- Max LTV -->
      <s-table-column width="120" header-align="right" align="right">
        <template #header>
          <sort-button name="maxLtvValue" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">MAX LTV</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <span class="explore-table__accent">{{ row.maxLtv }}</span>
        </template>
      </s-table-column>
      <!-- Total locked -->
      <s-table-column min-width="180" header-align="right" align="right">
        <template #header>
          <sort-button name="totalLockedValue" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">Total locked</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <div class="explore-table-item-tokens">
            <div class="explore-table-cell">
              <formatted-amount
                class="explore-table-item-token"
                :font-size-rate="FontSizeRate.SMALL"
                :value="row.totalLocked"
              />
              <token-logo
                class="explore-table-item-logo explore-table-item-logo--plain"
                size="small"
                :token="row.lockedAsset"
              />
            </div>
            <div v-if="row.totalLockedFiat" class="explore-table-cell">
              <formatted-amount
                class="explore-table-item-token"
                is-fiat-value
                :font-size-rate="FontSizeRate.SMALL"
                :value="row.totalLockedFiat"
              />
            </div>
          </div>
        </template>
      </s-table-column>
      <!-- Total debt -->
      <s-table-column min-width="180" header-align="right" align="right">
        <template #header>
          <sort-button name="totalDebtValue" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">Total debt</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <div class="explore-table-item-tokens">
            <div class="explore-table-cell">
              <formatted-amount
                class="explore-table-item-token"
                :font-size-rate="FontSizeRate.SMALL"
                :value="row.totalDebt"
              />
              <token-logo
                class="explore-table-item-logo explore-table-item-logo--plain"
                size="small"
                :token="row.debtAsset"
              />
            </div>
            <div v-if="row.totalDebtFiat" class="explore-table-cell">
              <formatted-amount
                class="explore-table-item-token"
                is-fiat-value
                :font-size-rate="FontSizeRate.SMALL"
                :value="row.totalDebtFiat"
              />
            </div>
          </div>
        </template>
      </s-table-column>
      <!-- Available -->
      <s-table-column min-width="180" header-align="right" align="right">
        <template #header>
          <sort-button name="availableToBorrowValue" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">Available</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <div class="explore-table-item-tokens">
            <div class="explore-table-cell">
              <formatted-amount
                class="explore-table-item-token"
                :font-size-rate="FontSizeRate.SMALL"
                :value="row.availableToBorrow"
              />
              <token-logo
                class="explore-table-item-logo explore-table-item-logo--plain"
                size="small"
                :token="row.debtAsset"
              />
            </div>
            <div v-if="row.availableToBorrowFiat" class="explore-table-cell">
              <formatted-amount
                class="explore-table-item-token"
                is-fiat-value
                :font-size-rate="FontSizeRate.SMALL"
                :value="row.availableToBorrowFiat"
              />
            </div>
          </div>
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
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import ExplorePageMixin from '@/components/mixins/ExplorePageMixin';
import { Components, HundredNumber } from '@/consts';
import { lazyComponent } from '@/router';
import { state } from '@/store/decorators';

import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { Collateral } from '@sora-substrate/util/build/kensetsu/types';

type TableItem = {
  lockedAsset: RegisteredAccountAsset;
  debtAsset: RegisteredAccountAsset;
  stabilityFeeValue: number;
  stabilityFee: string;
  totalLockedValue: number;
  totalLocked: string;
  totalLockedFiat: Nullable<string>;
  totalDebtValue: number;
  totalDebt: string;
  totalDebtFiat: Nullable<string>;
  availableToBorrowValue: number;
  isAvailable: boolean;
  availableToBorrow: string;
  availableToBorrowFiat: Nullable<string>;
  maxLtv: string;
  maxLtvValue: number;
};

@Component({
  components: {
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    SortButton: lazyComponent(Components.SortButton),
    DataRowSkeleton: lazyComponent(Components.DataRowSkeleton),
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
    HistoryPagination: components.HistoryPagination,
    SearchInput: components.SearchInput,
  },
})
export default class ExplorePools extends Mixins(ExplorePageMixin) {
  @state.vault.collaterals private collaterals!: Record<string, Collateral>;
  @state.settings.percentFormat private percentFormat!: Nullable<Intl.NumberFormat>;
  @state.settings.menuCollapsed collapsed!: boolean;

  property = 'totalDebtValue';

  formatPercent(value: number): string {
    const percent = value / HundredNumber;
    return this.percentFormat?.format?.(percent) ?? `${percent * HundredNumber}%`;
  }

  get prefilteredItems(): TableItem[] {
    return Object.values(this.collaterals).reduce<TableItem[]>((acc, collateral) => {
      const lockedAsset = this.getAsset(collateral.lockedAssetId);
      const debtAsset = this.getAsset(collateral.debtAssetId);
      if (!(lockedAsset && debtAsset)) return acc;

      const stabilityFeeValue = collateral.riskParams.stabilityFeeAnnual.toNumber();
      const stabilityFee = this.formatPercent(stabilityFeeValue);

      const maxLtvValue = collateral.riskParams.liquidationRatioReversed;
      const maxLtv = this.formatPercent(maxLtvValue);

      const totalLocked = collateral.totalLocked.toLocaleString(2);
      const totalLockedFiatFp = this.getFPNumberFiatAmountByFPNumber(collateral.totalLocked, lockedAsset) ?? this.Zero;
      const totalLockedValue = totalLockedFiatFp.toNumber();
      const totalLockedFiat = totalLockedFiatFp.toLocaleString(2);

      const totalDebt = collateral.debtSupply.toLocaleString(2);
      const totalDebtFiatFp = this.getFPNumberFiatAmountByFPNumber(collateral.debtSupply, debtAsset) ?? this.Zero;
      const totalDebtValue = totalDebtFiatFp.toNumber();
      const totalDebtFiat = totalDebtFiatFp.toLocaleString(2);

      let availableToBorrowValue = 0;
      let availableToBorrow = '0';
      let availableToBorrowFiat: Nullable<string> = '0';
      let isAvailable = false;
      const availableToBorrowFp = collateral.riskParams.hardCap.sub(collateral.debtSupply).dp(2);
      if (availableToBorrowFp.isGtZero()) {
        isAvailable = true;
        availableToBorrow = availableToBorrowFp.toLocaleString(2);
        const availableToBorrowFiatFp =
          this.getFPNumberFiatAmountByFPNumber(availableToBorrowFp, debtAsset) ?? this.Zero;
        availableToBorrowValue = availableToBorrowFiatFp.toNumber();
        availableToBorrowFiat = availableToBorrowFiatFp.toLocaleString(2);
      }

      acc.push({
        lockedAsset,
        debtAsset,
        stabilityFeeValue,
        stabilityFee,
        totalLockedValue,
        totalLocked,
        totalLockedFiat,
        totalDebtValue,
        totalDebt,
        totalDebtFiat,
        availableToBorrowValue,
        availableToBorrow,
        availableToBorrowFiat,
        isAvailable,
        maxLtv,
        maxLtvValue,
      });
      return acc;
    }, []);
  }

  // ExplorePageMixin method implementation
  async updateExploreData(): Promise<void> {
    // Do nothing
  }

  openSelectedPosition(row: TableItem): void {
    if (!(this.isLoggedIn && row.isAvailable)) return;
    this.$emit('open', row.lockedAsset, row.debtAsset);
  }

  updateSearch(value: string): void {
    this.$emit('update-search', value);
  }

  resetSearch(): void {
    this.$emit('update-search', '');
  }
}
</script>

<style lang="scss">
@include explore-table;

.collaterals-table.explore-table.el-table.el-table--enable-row-hover .el-table__body tr:hover > td.el-table__cell {
  background-color: rgba(42, 23, 31, 0.06);
  cursor: pointer;
}
</style>

<style lang="scss" scoped>
$container-paddings: 2 * $inner-spacing-big + $inner-spacing-mini;
$container-max: 100vw;
$container-max-width: calc($container-max - $container-paddings - var(--sidebar-width));
$container-max-width--collapsed: calc($container-max - $container-paddings - $sidebar-collapsed-width);

$min_breakpoint_large-mobile: $breakpoint_large-mobile - 1px;

.collaterals {
  &-container {
    display: flex;
    flex-flow: column nowrap;
    gap: $inner-spacing-medium;
    padding: $inner-spacing-medium $inner-spacing-tiny;
    box-shadow: var(--s-shadow-element-pressed);

    @media (min-width: $min_breakpoint_large-mobile) and (max-width: 577px) {
      max-width: 414px; // TODO: improve this exception related to the responsive design
    }

    @include tablet {
      width: 100%;
      max-width: $container-max-width;
      &.menu-collapsed {
        max-width: $container-max-width--collapsed;
      }
    }

    .explore-table-pagination {
      margin: 0 $inner-spacing-medium;
    }
  }

  &-search {
    display: flex;
    justify-content: flex-end;
    padding: 0 $inner-spacing-small;
    > .search {
      max-width: $explore-search-input-max-width;
    }
  }
}
</style>
