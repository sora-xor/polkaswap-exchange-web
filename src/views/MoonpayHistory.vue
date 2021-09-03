<template>
  <div class="container" v-loading="parentLoading">
    <div class="moonpay-history">
      <moonpay-logo :theme="libraryTheme" />
      <div class="moonpay-history-title">Purchase history</div>
      <div :class="['moonpay-history-list', { empty: emptyHistory }]" v-loading="loading">
        <div v-for="item in formattedItems" :key="item.id" class="moonpay-history-item">
          <div class="moonpay-history-item-data">
            <div class="moonpay-history-item__date">{{ item.formatted.date }}</div>
            <div class="moonpay-history-item__amount">
              <formatted-amount
                class="moonpay-history-item-amount"
                :value="item.formatted.cryptoAmount"
                :font-size-rate="FontSizeRate.MEDIUM"
                :asset-symbol="item.formatted.crypto"
              />
              <i class="s-icon--network s-icon-eth" />&nbsp;
              <span>for</span>&nbsp;
              <formatted-amount
                class="moonpay-history-item-amount"
                :value="item.formatted.fiatAmount"
                :font-size-rate="FontSizeRate.MEDIUM"
                :asset-symbol="item.formatted.fiat"
              />
            </div>
          </div>
          <s-icon :class="['moonpay-history-item-icon', item.status]" :name="item.formatted.icon" size="14" />
        </div>
        <span v-if="emptyHistory">No data</span>
      </div>
      <s-pagination
        v-if="transactions.length"
        class="moonpay-history-pagination"
        :layout="'prev, total, next'"
        :current-page.sync="currentPage"
        :page-size="pageAmount"
        :total="transactions.length"
        @prev-click="handlePrevClick"
        @next-click="handleNextClick"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, State, Getter } from 'vuex-class'
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme'
import dayjs from 'dayjs'
import { FormattedAmount, FontSizeRate } from '@soramitsu/soraneo-wallet-web'

import LoadingMixin from '@/components/mixins/LoadingMixin'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import PaginationSearchMixin from '@/components/mixins/PaginationSearchMixin'

import { MoonpayApi } from '@/utils/moonpay'
import { NetworkTypes } from '@/consts'

import MoonpayLogo from '@/components/logo/Moonpay.vue'

const namespace = 'moonpay'

@Component({
  components: {
    MoonpayLogo,
    FormattedAmount
  }
})
export default class MoonpayHistory extends Mixins(LoadingMixin, TranslationMixin, PaginationSearchMixin) {
  readonly FontSizeRate = FontSizeRate

  @State(state => state[namespace].api) moonpayApi!: MoonpayApi
  @State(state => state[namespace].transactions) transactions!: Array<any>
  @State(state => state[namespace].transactionsFetching) transactionsFetching!: boolean
  @State(state => state.settings.apiKeys) apiKeys!: any
  @State(state => state.settings.soraNetwork) soraNetwork!: NetworkTypes
  @Getter libraryTheme!: Theme
  @Getter('currenciesById', { namespace }) currenciesById!: any
  @Action('getTransactions', { namespace }) getTransactions!: () => Promise<void>
  @Action('getCurrencies', { namespace }) getCurrencies!: () => Promise<void>

  pageAmount = 5

  created (): void {
    this.withApi(async () => {
      this.moonpayApi.setPublicKey(this.apiKeys.moonpay)
      this.moonpayApi.setNetwork(this.soraNetwork)

      await Promise.all([
        this.getTransactions(),
        this.getCurrencies()
      ])
    })
  }

  get emptyHistory (): boolean {
    return this.transactions.length === 0
  }

  get historyItems (): Array<any> {
    return this.getPageItems(this.transactions)
  }

  get formattedItems (): Array<any> {
    const { currenciesById, historyItems } = this
    const formatCurrencyName = (id: string) => (currenciesById[id]?.code ?? '').toUpperCase()
    const iconStatus = status => {
      if (status === 'completed') return 'basic-check-mark-24'
      if (status === 'failed') return 'basic-clear-X-24'
      return 'basic-more-horizontal-24'
    }

    return historyItems.map(item => {
      return {
        ...item,
        formatted: {
          fiat: formatCurrencyName(item.baseCurrencyId),
          fiatAmount: String(item.baseCurrencyAmount),
          crypto: formatCurrencyName(item.currencyId),
          cryptoAmount: String(item.quoteCurrencyAmount),
          date: dayjs(item.updatedAt).format('DD.MM.YYYY,HH:mm:ss'),
          icon: iconStatus(item.status)
        }
      }
    })
  }
}
</script>

<style lang="scss">
.moonpay-history-pagination {
  display: flex;
  width: 100%;

  .el-pagination__total {
    margin: auto;
  }
}
</style>

<style lang="scss" scoped>
.moonpay-history {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;

  & > *:not(:last-child) {
    margin-bottom: $inner-spacing-medium;
  }

  &-title {
    font-size: var(--s-font-size-extra-small);
    font-weight: 300;
    line-height: var(--s-line-height-base);
  }

  &-list {
    width: 100%;
    &.empty {
      text-align: center;
    }
  }

  &-item {
    display: flex;
    align-items: center;
    border-radius: var(--s-border-radius-small);
    flex-flow: row nowrap;
    letter-spacing: var(--s-letter-spacing-small);
    line-height: var(--s-line-height-medium);
    font-size: var(--s-font-size-small);
    font-weight: 300;
    padding: $inner-spacing-mini $inner-spacing-medium;
    margin: 0 -#{$inner-spacing-small};

    &:hover {
      background-color: var(--s-color-base-background-hover);
      cursor: pointer;
    }

    &-data {
      flex: 1
    }

    &__date {
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-mini);
    }

    &__amount {
      display: flex;
      align-items: center;
    }

    &-amount {
      font-weight: 600;
    }

    &-icon {
      color: var(--s-color-base-content-secondary);

      &.completed {
        color: var(--s-color-status-success);
      }
      &.failed {
        color: var(--s-color-status-error);
      }
    }
  }
}
</style>
