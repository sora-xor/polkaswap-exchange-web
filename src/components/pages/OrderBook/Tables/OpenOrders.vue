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
          <span>TIME</span>
        </template>
        <template v-slot="{ row }">
          <div class="limit-order-table__date">
            <div>{{ row.date.date }}</div>
            <div>{{ row.date.time }}</div>
          </div>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>PAIR</span>
        </template>
        <template v-slot="{ row }">
          <div class="limit-order-table__pair">
            <span>{{ row.pair }}</span>
          </div>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>SIDE</span>
        </template>
        <template v-slot="{ row }">
          <div class="limit-order-table__side">
            <span>{{ row.side }}</span>
          </div>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>PRICE</span>
        </template>
        <template v-slot="{ row }">
          <span>{{ row.price }}</span>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>AMOUNT</span>
        </template>
        <template v-slot="{ row }">
          <span>{{ row.amount }}</span>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>FILLED</span>
        </template>
        <template v-slot="{ row }">
          <span>{{ row.filled }}</span>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>LIFETIME</span>
        </template>
        <template v-slot="{ row }">
          <span>{{ row.expired }}</span>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span>TOTAL</span>
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

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

@Component
export default class OpenOrders extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @state.orderBook.baseAssetAddress baseAssetAddress!: string;
  @state.orderBook.currentOrderBook currentOrderBook!: any;
  @state.orderBook.userLimitOrders userLimitOrders!: Array<any>;

  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.assets.assetDataByAddress getAsset!: (addr?: string) => Nullable<AccountAsset>;

  @action.orderBook.subscribeToUserLimitOrders subscribeToOpenOrders!: ({ base }) => void;

  openLimitOrders: Array<any> = [];

  get openOrders(): any {
    return this.openLimitOrders;
  }

  deserializeKey(key: string) {
    const [base, quote] = key.split(',');
    return { base, quote };
  }

  @Watch('userLimitOrders')
  prepareOrderLimits(): void {
    this.openLimitOrders = [];

    this.userLimitOrders.forEach((limitOrder) => {
      const { amount, price, side, id, orderBookId, time } = limitOrder;

      const pair = `${this.getAsset(orderBookId.base)?.symbol}-${this.getAsset(orderBookId.quote)?.symbol}`;
      const date = new Date(time);

      const row = {
        limitOrderId: id,
        orderBookId,
        amount,
        pair,
        price,
        side,
        filled: '100',
        expired: 'month',
        total: amount.mul(price),
        date: { date: `${date.getUTCMonth() + 1}/${date.getUTCDate()}`, time: date.toLocaleTimeString() },
      };

      this.openLimitOrders.push(row);
    });
  }

  handleSelectionChange(rows): void {
    this.$emit('cancelled-orders', rows);
  }

  @Watch('baseAssetAddress')
  private async subscribeToLimitOrderUpdates(baseAssetAddress: Nullable<string>): Promise<void> {
    if (baseAssetAddress) {
      await this.withLoading(async () => {
        // wait for node connection & wallet init (App.vue)
        await this.withParentLoading(async () => {
          this.subscribeToOpenOrders({ base: this.baseAssetAddress });

          await delay(500);

          this.prepareOrderLimits();
        });
      });
    }
  }

  async mounted(): Promise<void> {
    await this.subscribeToLimitOrderUpdates(this.baseAssetAddress);
  }
}
</script>

<style lang="scss">
.limit-order-table {
  .el-table__header-wrapper {
    background-color: rgba(42, 23, 31, 0.04);
    th {
      background-color: rgba(42, 23, 31, 0.04);
      color: var(--s-color-base-content-secondary);
    }
  }
  .el-table__body-wrapper {
    background-color: var(--s-color-utility-surface);

    .el-table__row {
      background-color: var(--s-color-utility-surface);
    }

    .el-checkbox__inner::after {
      left: 5px;
    }

    .el-checkbox__inner {
      border-radius: unset;
    }
  }

  .limit-order-table__date {
    color: var(--s-color-base-content-secondary);
    font-size: 14px;
  }

  .limit-order-table__pair {
    font-weight: 500;
  }

  .limit-order-table__side {
    text-transform: uppercase;
  }

  height: 430px !important;
}
</style>
