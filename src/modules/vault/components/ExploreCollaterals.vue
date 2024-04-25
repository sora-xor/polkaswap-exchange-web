<template>
  <div class="collaterals-container">
    <s-table
      ref="table"
      :data="tableItems"
      :highlight-current-row="false"
      size="small"
      class="collaterals-table explore-table"
    >
      <!-- Index -->
      <s-table-column width="270" label="#">
        <template #header>
          <div class="explore-table-item-index">
            <span @click="handleResetSort" :class="['explore-table-item-index--head', { active: isDefaultSort }]">
              #
            </span>
          </div>
          <div class="explore-table-item-info explore-table-item-info--head">
            <span class="explore-table__primary">DEBT / COLLATERAL TOKEN</span>
          </div>
        </template>
        <template v-slot="{ $index, row }">
          <span class="explore-table-item-index explore-table-item-index--body">{{ $index + startIndex + 1 }}</span>
          <pair-token-logo
            :first-token="row.debtAsset"
            :second-token="row.lockedAsset"
            size="small"
            class="explore-table-item-logo"
          />
          <div class="explore-table-item-info explore-table-item-info--body">
            <div class="explore-table-item-name">{{ row.debtAsset.symbol }} / {{ row.lockedAsset.symbol }}</div>
          </div>
        </template>
      </s-table-column>
      <!-- Stability Fee -->
      <s-table-column width="140" header-align="right" align="right">
        <template #header>
          <sort-button name="stabilityFeeValue" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">Interest</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <span class="explore-table__accent">{{ row.stabilityFee }}</span>
        </template>
      </s-table-column>
      <!-- Liquidation penalty -->
      <s-table-column width="200" header-align="right" align="right">
        <template #header>
          <sort-button name="liquidationPenaltyValue" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">MAX LTV</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <span class="explore-table__accent">{{ row.liquidationPenalty }}</span>
        </template>
      </s-table-column>
      <!-- Total debt -->
      <s-table-column width="180" header-align="right" align="right">
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
      <!-- Available to borrow -->
      <s-table-column width="220" header-align="right" align="right">
        <template #header>
          <sort-button name="availableToBorrowValue" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">Available to borrow</span>
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
      <!-- Actions -->
      <s-table-column width="100" header-align="right" align="right">
        <template v-slot="{ row }">
          <s-button class="s-typography-button--small" type="primary" size="small" @click="openSelectedPosition(row)">
            <s-icon name="finance-send-24" size="16" />
            {{ t('kensetsu.borrowMore') }}
          </s-button>
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
import { FPNumber } from '@sora-substrate/math';
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import ExplorePageMixin from '@/components/mixins/ExplorePageMixin';
import { Components, HundredNumber } from '@/consts';
import { lazyComponent } from '@/router';
import { state, getter } from '@/store/decorators';

import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { Collateral } from '@sora-substrate/util/build/kensetsu/types';

type TableItem = {
  lockedAsset: RegisteredAccountAsset;
  debtAsset: RegisteredAccountAsset;
  stabilityFeeValue: number;
  stabilityFee: string;
  totalDebtValue: number;
  totalDebt: string;
  totalDebtFiat: Nullable<string>;
  availableToBorrowValue: number;
  availableToBorrow: string;
  availableToBorrowFiat: Nullable<string>;
  liquidationPenalty: string;
  liquidationPenaltyValue: number;
};

@Component({
  components: {
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    SortButton: lazyComponent(Components.SortButton),
    DataRowSkeleton: lazyComponent(Components.DataRowSkeleton),
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
    HistoryPagination: components.HistoryPagination,
  },
})
export default class ExplorePools extends Mixins(ExplorePageMixin) {
  @getter.vault.kusdToken private kusdToken!: Nullable<RegisteredAccountAsset>;
  @state.vault.collaterals private collaterals!: Record<string, Collateral>;
  @state.settings.percentFormat private percentFormat!: Nullable<Intl.NumberFormat>;

  property = 'totalDebtValue';

  formatPercent(value: number): string {
    const percent = value / HundredNumber;
    return this.percentFormat?.format?.(percent) ?? `${percent * HundredNumber}%`;
  }

  get prefilteredItems(): TableItem[] {
    const debtAsset = this.kusdToken;
    if (!debtAsset) return [];

    return Object.entries(this.collaterals).reduce<TableItem[]>((acc, [collateralAssetId, collateral]) => {
      const lockedAsset = this.getAsset(collateralAssetId);
      if (!lockedAsset) return acc;

      const stabilityFeeValue = collateral.riskParams.stabilityFeeAnnual.toNumber();
      const stabilityFee = this.formatPercent(stabilityFeeValue);

      const liquidationPenaltyValue = collateral.riskParams.liquidationRatioReversed;
      const liquidationPenalty = this.formatPercent(liquidationPenaltyValue);

      const totalDebtValue = collateral.kusdSupply.toNumber();
      const totalDebt = collateral.kusdSupply.dp(2).toString();
      const totalDebtFiat = this.getFiatAmount(totalDebt, debtAsset);

      const availableToBorrowFp = collateral.riskParams.hardCap.sub(collateral.kusdSupply);
      const availableToBorrowValue = availableToBorrowFp.toNumber();
      const availableToBorrow = availableToBorrowFp.dp(2).toString();
      const availableToBorrowFiat = this.getFiatAmount(availableToBorrow, debtAsset);

      acc.push({
        lockedAsset,
        debtAsset,
        stabilityFeeValue,
        stabilityFee,
        totalDebtValue,
        totalDebt,
        totalDebtFiat,
        availableToBorrowValue,
        availableToBorrow,
        availableToBorrowFiat,
        liquidationPenalty,
        liquidationPenaltyValue,
      });
      return acc;
    }, []);
  }

  // ExplorePageMixin method implementation
  async updateExploreData(): Promise<void> {
    // Do nothing
  }

  openSelectedPosition(row: TableItem): void {
    // Do nothing
  }
}
</script>

<style lang="scss">
@include explore-table;
</style>

<style lang="scss" scoped>
$container-max-width: 75vw;

.collaterals {
  &-container {
    display: flex;
    flex-flow: column nowrap;
    gap: $inner-spacing-medium;
    margin: $inner-spacing-big $inner-spacing-big 0;

    @include tablet {
      max-width: $container-max-width;
    }
  }
}
</style>
