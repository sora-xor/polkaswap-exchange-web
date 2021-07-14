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
      <template #suffix v-if="query">
        <s-button type="link" class="s-button--clear" icon="clear-X-16" @click="handleClearSearch" />
      </template>
    </s-input>
    <s-table
      :data="tableItems"
      :highlight-current-row="false"
      size="small"
      class="tokens-table"
    >
      <s-table-column label="#" width="48">
        <template #header>
          <span @click="resetSort" :class="['tokens-item-head-index', { active: isDefaultSort }]">#</span>
        </template>
        <template v-slot="{ $index }">
          <span class="tokens-item-index">{{ $index + startIndex + 1 }}</span>
        </template>
      </s-table-column>
      <s-table-column width="112" header-align="center" align="center" prop="symbol">
        <template #header>
          <sort-button name="symbol" :sort="{ order, property }" @change-sort="changeSort">
            <span class="tokens-table__primary">{{ t('tokens.symbol') }}</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <div class="tokens-item-symbol">{{ row.symbol }}</div>
        </template>
      </s-table-column>
      <s-table-column width="52" header-align="center" align="center">
        <template #header>
          <s-icon name="various-bone-24" size="14px" />
        </template>
        <template v-slot="{ row }">
          <token-logo class="tokens-item-logo" :token-symbol="row.symbol" />
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span class="tokens-table__primary">{{ t('tokens.name') }}</span>&nbsp;
          <span class="tokens-table__secondary">({{ t('tokens.assetId') }})</span>
        </template>
        <template v-slot="{ row }">
          <div class="tokens-item-info">
            <div class="tokens-item-name">{{ row.name }}</div>
            <div class="tokens-item-address">
              <span>{{ t('soraText') }}:</span>&nbsp;
              <token-address class="tokens-item-address__value" :show-name="false" :name="row.name" :symbol="row.symbol" :address="row.address" />
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
import { Component, Mixins } from 'vue-property-decorator'
import { Getter } from 'vuex-class'
import { Asset } from '@sora-substrate/util'
import { SortDirection } from '@soramitsu/soramitsu-js-ui/src/components/Table/consts'

import { Components } from '@/consts'
import { lazyComponent } from '@/router'

import LoadingMixin from '@/components/mixins/LoadingMixin'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import AssetsSearchMixin from '@/components/mixins/AssetsSearchMixin'
import SortButton from '@/components/SortButton.vue'

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    TokenLogo: lazyComponent(Components.TokenLogo),
    TokenAddress: lazyComponent(Components.TokenAddress),
    SortButton
  }
})
export default class Tokens extends Mixins(LoadingMixin, TranslationMixin, AssetsSearchMixin) {
  @Getter('whitelistAssets', { namespace: 'assets' }) items!: Array<Asset>

  currentPage = 1
  pageAmount = 10
  query = ''
  order = ''
  property = ''

  mounted (): void {
    this.focusSearchInput()
  }

  get isDefaultSort (): boolean {
    return !this.order || !this.property
  }

  get startIndex (): number {
    return (this.currentPage - 1) * this.pageAmount
  }

  get lastIndex (): number {
    return this.currentPage * this.pageAmount
  }

  get filteredItems (): Array<Asset> {
    return this.filterAssetsByQuery(this.items)(this.query) as Array<Asset>
  }

  get sortedItems (): Array<Asset> {
    if (!this.order || !this.property) return this.filteredItems

    const isAscending = this.order === SortDirection.ASC

    return [...this.filteredItems].sort((a, b) => {
      const aValue = a[this.property]
      const bValue = b[this.property]

      if (aValue === bValue) return 0

      return (isAscending ? aValue > bValue : aValue < bValue) ? 1 : -1
    })
  }

  get tableItems (): Array<Asset> {
    return this.sortedItems.slice(this.startIndex, this.lastIndex)
  }

  handlePrevClick (current: number): void {
    this.currentPage = current
  }

  handleNextClick (current: number): void {
    this.currentPage = current
  }

  handleClearSearch (): void {
    this.query = ''
  }

  changeSort ({ order = '', property = '' } = {}): void {
    this.order = order
    this.property = property
  }

  resetSort (): void {
    this.order = ''
    this.property = ''
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

  tr, th {
    &, &:hover {
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

  .el-table__body-wrapper {
    height: auto !important;
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
    font-size: var(--s-font-size-mini);
  }

  &-head {
    display: flex;
    align-items: center;
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
