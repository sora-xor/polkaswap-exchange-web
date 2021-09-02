<template>
  <div class="container" v-loading="parentLoading">
    <div class="moonpay-history">
      <moonpay-logo :theme="libraryTheme" />
      <div class="moonpay-history-title">Purchase history</div>
      <div class="moonpay-history-list">
        <div v-for="item in formattedItems" :key="item.id" class="moonpay-history-item">
          <div class="moonpay-history-item-data">
            <div class="moonpay-history-item__date">{{ item.date }}</div>
            <div class="moonpay-history-item__amount">
              {{ item.cryptoAmount }} {{ item.crypto }} for
              {{ item.fiatAmount }} {{ item.fiat }}
            </div>
          </div>
          <s-icon class="moonpay-history-item-icon" name="basic-check-mark-24" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, State, Getter } from 'vuex-class'
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme'
import dayjs from 'dayjs'

import LoadingMixin from '@/components/mixins/LoadingMixin'
import TranslationMixin from '@/components/mixins/TranslationMixin'

import { MoonpayApi } from '@/utils/moonpay'
import { NetworkTypes } from '@/consts'

import MoonpayLogo from '@/components/logo/Moonpay.vue'

const namespace = 'moonpay'

@Component({
  components: {
    MoonpayLogo
  }
})
export default class MoonpayHistory extends Mixins(LoadingMixin, TranslationMixin) {
  @State(state => state[namespace].api) moonpayApi!: MoonpayApi
  @State(state => state[namespace].transactions) transactions!: Array<any>
  @State(state => state[namespace].transactionsFetching) transactionsFetching!: boolean
  @State(state => state.settings.apiKeys) apiKeys!: any
  @State(state => state.settings.soraNetwork) soraNetwork!: NetworkTypes
  @Getter libraryTheme!: Theme
  @Getter('currenciesById', { namespace }) currenciesById!: any
  @Action('getTransactions', { namespace }) getTransactions!: () => Promise<void>
  @Action('getCurrencies', { namespace }) getCurrencies!: () => Promise<void>

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

  get formattedItems (): Array<any> {
    const { currenciesById, transactions } = this
    const formatCurrencyName = (id: string) => (currenciesById[id]?.code ?? '').toUpperCase()

    return transactions.map(item => {
      return {
        id: item.id,
        fiat: formatCurrencyName(item.baseCurrencyId),
        fiatAmount: item.baseCurrencyAmount,
        crypto: formatCurrencyName(item.currencyId),
        cryptoAmount: item.quoteCurrencyAmount,
        date: dayjs(item.updatedAt).format('DD.MM.YYYY,HH:mm:ss')
      }
    })
  }
}
</script>

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
  }

  &-item {
    display: flex;
    flex-flow: row nowrap;
    letter-spacing: var(--s-letter-spacing-small);
    line-height: var(--s-line-height-medium);
    font-size: var(--s-font-size-small);
    font-weight: 300;
    padding: $inner-spacing-mini $inner-spacing-mini / 2;

    &-data {
      flex: 1
    }

    &__date {
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-mini);
    }
  }
}
</style>
