<template>
  <div class="container" v-loading="parentLoading">
    <generic-page-header :title="t('tokens.title')" class="page-header-title--tokens" />
    <s-input
      ref="search"
      v-model="query"
      :placeholder="t('selectToken.searchPlaceholder')"
      class="tokens-table-search"
      prefix="el-icon-search"
      size="big"
    >
      <template #suffix>
        <s-button v-show="query" type="link" class="s-button--clear" icon="clear-X-16" @click="handleResetSearch" />
      </template>
    </s-input>
    <s-table :data="tableItems" :highlight-current-row="false" size="small" class="tokens-table">
      <s-table-column label="#" width="48">
        <template #header>
          <span @click="handleResetSort" :class="['tokens-item-head-index', { active: isDefaultSort }]">#</span>
        </template>
        <template v-slot="{ $index }">
          <span class="tokens-item-index">{{ $index + startIndex + 1 }}</span>
        </template>
      </s-table-column>
      <s-table-column width="112" header-align="center" align="center" prop="symbol">
        <template #header>
          <sort-button name="symbol" class="tokens-table--center" :sort="{ order, property }" @change-sort="changeSort">
            <span class="tokens-table__primary">{{ t('tokens.symbol') }}</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <div class="tokens-item-symbol">{{ row.symbol }}</div>
        </template>
      </s-table-column>
      <s-table-column width="52" header-align="center" align="center">
        <template #header>
          <s-icon name="various-bone-24" size="14px" class="tokens-table--center" />
        </template>
        <template v-slot="{ row }">
          <token-logo class="tokens-item-logo" :token-symbol="row.symbol" />
        </template>
      </s-table-column>
      <s-table-column>
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
import { Component, Mixins } from 'vue-property-decorator';
import { Getter } from 'vuex-class';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { SortDirection } from '@soramitsu/soramitsu-js-ui/lib/components/Table/consts';
import type { Asset } from '@sora-substrate/util/build/assets/types';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import AssetsSearchMixin from '@/components/mixins/AssetsSearchMixin';
import SortButton from '@/components/SortButton.vue';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    TokenLogo: lazyComponent(Components.TokenLogo),
    TokenAddress: lazyComponent(Components.TokenAddress),
    SortButton,
  },
})
export default class Tokens extends Mixins(
  mixins.LoadingMixin,
  mixins.PaginationSearchMixin,
  TranslationMixin,
  AssetsSearchMixin
) {
  @Getter('whitelistAssets', { namespace: 'assets' }) items!: Array<Asset>;

  order = '';
  property = '';

  mounted(): void {
    this.focusSearchInput();
  }

  get isDefaultSort(): boolean {
    return !this.order || !this.property;
  }

  get filteredItems(): Array<Asset> {
    return this.filterAssetsByQuery(this.items)(this.query) as Array<Asset>;
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
}
</script>

<style lang="scss">
.page-header-title--tokens {
  justify-content: center;
}

.tokens-table.el-table {
  background: transparent;

  thead {
    text-transform: uppercase;
    font-size: var(--s-font-size-small);
    letter-spacing: var(--s-letter-spacing-mini);
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
          padding: $inner-spacing-mini / 2 $inner-spacing-mini;
          display: flex;
          align-items: center;
        }
      }
    }
  }

  [class^='s-icon-'],
  [class*=' s-icon-'] {
    @include icon-styles;
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
</style>

<style lang="scss" scoped>
$icon-size: 36px;

@include search-item('tokens-table-search');

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

  &--center {
    margin: auto;
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
    &.token-logo {
      display: block;
      height: $icon-size;
      width: $icon-size;
    }
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
  }
  &-address {
    display: flex;
    font-size: var(--s-font-size-extra-mini);

    &__value {
      font-weight: 600;
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
