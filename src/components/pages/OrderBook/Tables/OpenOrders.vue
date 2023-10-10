<template>
  <div>
    <s-table
      class="limit-order-table"
      :data="openOrders"
      :highlight-current-row="false"
      @selection-change="handleSelectionChange"
    >
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
import { Component, Mixins, Watch } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { getter, state, action } from '@/store/decorators';
import { delay } from '@/utils';

@Component
export default class OpenOrders extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @state.orderBook.baseAssetAddress baseAssetAddress!: string;
  @state.orderBook.userLimitOrders userLimitOrders!: Array<any>;

  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  @action.orderBook.subscribeToUserLimitOrders subscribeToOpenOrders!: ({ base }) => void;

  openLimitOrders: Array<any> = [];

  get openOrders(): any {
    return this.openLimitOrders;
  }

  prepareOrderLimits(): void {
    console.log('userLimitOrders', this.userLimitOrders);

    this.userLimitOrders.forEach((limitOrder) => {
      const row = {
        id: limitOrder.id,
        amount: limitOrder.amount,
        price: limitOrder.price,
        side: limitOrder.side,
        filled: '100',
        expired: 'a week',
        total: '13,3423.77',
        date: { date: '8/25', time: '11:15:45' },
      };

      this.openLimitOrders.push(row);
    });

    console.log(this.openLimitOrders);
  }

  handleSelectionChange(rows): void {
    console.log('rows', rows);
  }

  @Watch('baseAssetAddress')
  private async subscribeToLimitOrderUpdates(baseAssetAddress: Nullable<string>): Promise<void> {
    if (baseAssetAddress) {
      await this.withLoading(async () => {
        // wait for node connection & wallet init (App.vue)
        await this.withParentLoading(async () => {
          this.openLimitOrders = [];
          this.subscribeToOpenOrders({ base: this.baseAssetAddress });

          await delay(500);

          this.prepareOrderLimits();
        });
      });
    }
  }
}
</script>

<style lang="scss">
@include limit-order-table;
</style>
