<template>
  <div class="container" v-loading="parentLoading || loading">
    <generic-page-header :title="t('tokens.title')" class="page-header-title--tokens" />
    <s-table
      v-if="whitelist.length"
      :data="tableItems"
      :highlight-current-row="false"
      size="small"
      class="tokens-table"
    >
      <s-table-column label="#" width="40">
        <template v-slot="{ row }">
          <span class="tokens-item-index">{{ row.idx + 1 }}</span>
        </template>
      </s-table-column>
      <s-table-column width="112" header-align="center" align="center">
        <template #header>
          <span class="tokens-table__primary">{{ t('tokens.symbol') }}</span>
        </template>
        <template v-slot="{ row }">
          <div class="tokens-item-symbol">{{ row.symbol }}</div>
        </template>
      </s-table-column>
      <s-table-column width="52" header-align="center" align="center">
        <template #header>
          <tokens-icon class="tokens-icon" />
        </template>
        <template v-slot="{ row }">
          <img class="tokens-item-logo" :src="row.icon" width="36px"/>
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
      :total="whitelist.length"
      @prev-click="handlePrevClick"
      @next-click="handleNextClick"
    />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Asset } from '@sora-substrate/util'
import axios from '@/api'

import { Components } from '@/consts'
import { lazyComponent } from '@/router'

import LoadingMixin from '@/components/mixins/LoadingMixin'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import TokensIcon from '@/components/TokensIcon.vue'

@Component({
  components: {
    TokensIcon,
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    TokenLogo: lazyComponent(Components.TokenLogo),
    TokenAddress: lazyComponent(Components.TokenAddress)
  }
})
export default class Tokens extends Mixins(LoadingMixin, TranslationMixin) {
  currentPage = 1
  pageAmount = 10
  whitelist = []

  async created (): Promise<void> {
    await this.withLoading(async () => {
      const { data } = await axios.get('/whitelist.json')
      this.whitelist = data.map((item, idx) => ({ ...item, idx }))
    })
  }

  get tableItems (): Array<Asset> {
    return this.whitelist.slice((this.currentPage - 1) * this.pageAmount, this.currentPage * this.pageAmount)
  }

  handlePrevClick (current: number): void {
    this.currentPage = current
  }

  handleNextClick (current: number): void {
    this.currentPage = current
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
    color: var(--s-color-base-on-accent);
  }

  tr, th {
    &, &:hover {
      background: transparent;

      & > td,
      & > th {
        background: transparent;

        .cell {
          padding: $inner-spacing-mini / 2 $inner-spacing-mini;
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

.tokens-icon {
  width: 14px;
  height: 14px;
}
</style>

<style lang="scss" scoped>
$icon-size: 36px;

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
}

.tokens-item {
  &-index {
    color: var(--s-color-base-content-tertiary);
    font-size: var(--s-font-size-small);
    font-weight: 800;
  }
  &-symbol {
    background-color: #EDE4E7;
    border-radius: var(--s-border-radius-medium);
    font-size: 18px;
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
    font-size: 11px;

    &__value {
      font-weight: 600;
    }
  }
}
</style>
