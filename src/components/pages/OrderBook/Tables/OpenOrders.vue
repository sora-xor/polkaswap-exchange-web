<template>
  <div>
    <s-table :data="openOrders" :highlight-current-row="false" @selection-change="handleSelectionChange">
      <s-table-column type="selection" />
      <s-table-column>
        <template #header>
          <span>Time</span>
        </template>
        <template v-slot="{ row }">
          <div>
            <div>{{ row.date.date }}</div>
            <div>{{ row.date.time }}</div>
          </div>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>Pair</span>
        </template>
        <template v-slot="{ row }">
          <div>
            <div>{{ row.pair }}</div>
          </div>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>Side</span>
        </template>
        <template v-slot="{ row }">
          <div>
            <div>{{ row.side }}</div>
          </div>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>Price</span>
        </template>
        <template v-slot="{ row }">
          <span>{{ row.price }}</span>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>Amount</span>
        </template>
        <template v-slot="{ row }">
          <span>{{ row.amount }}</span>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>Filled</span>
        </template>
        <template v-slot="{ row }">
          <span>{{ row.filled }}</span>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>Lifetime</span>
        </template>
        <template v-slot="{ row }">
          <span>{{ row.expired }}</span>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>Total</span>
        </template>
        <template v-slot="{ row }">
          <span>{{ row.total }}</span>
        </template>
      </s-table-column>
    </s-table>
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component
export default class OpenOrders extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  get openOrders(): any {
    return [
      {
        date: { date: '8/26', time: '14:12:25' },
        pair: 'XOR-ETH',
        side: 'buy',
        price: '103.39',
        amount: '5',
        filled: '100',
        expired: 'a week',
        total: '13,3423.77',
      },
      {
        date: { date: '8/26', time: '16:19:11' },
        pair: 'XOR-ETH',
        side: 'buy',
        price: '103.39',
        amount: '5',
        filled: '100',
        expired: 'a week',
        total: '13,3423.77',
      },
      {
        date: { date: '8/25', time: '11:15:45' },
        pair: 'XOR-ETH',
        side: 'buy',
        price: '103.39',
        amount: '5',
        filled: '100',
        expired: 'a week',
        total: '13,3423.77',
      },
    ];

    // return [];
  }

  handleSelectionChange(rows): void {
    console.log('rows', rows);
  }
}
</script>
