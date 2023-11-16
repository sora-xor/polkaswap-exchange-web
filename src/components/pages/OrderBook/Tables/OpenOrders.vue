<template>
  <div>
    <s-table
      class="limit-order-table"
      empty-text="No open orders"
      ref="multipleOrdersTable"
      :data="openOrders"
      :highlight-current-row="false"
      @cell-click="handleSelectRow"
      @selection-change="handleSelectionChange"
    >
      <s-table-column type="selection" :selectable="isSelectionAllowed" />
      <s-table-column :width="'70'">
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
      <s-table-column :width="'126'">
        <template #header>
          <span>PAIR</span>
        </template>
        <template v-slot="{ row }">
          <span class="limit-order-table__pair">{{ row.pair }}</span>
        </template>
      </s-table-column>
      <s-table-column :width="'65'">
        <template #header>
          <span>SIDE</span>
        </template>
        <template v-slot="{ row }">
          <span class="limit-order-table__side">{{ row.side }}</span>
        </template>
      </s-table-column>
      <s-table-column :width="'126'">
        <template #header>
          <span>PRICE</span>
        </template>
        <template v-slot="{ row }">
          <div class="limit-order-table__price">
            <span class="price">{{ row.price }}</span>
            <span>{{ ` ${quoteAsset.symbol}` }}</span>
          </div>
        </template>
      </s-table-column>
      <s-table-column :width="'140'">
        <template #header>
          <span>AMOUNT</span>
        </template>
        <template v-slot="{ row }">
          <div class="limit-order-table__amount">
            <span class="amount">{{ row.amount }}</span>
            <span>{{ ` ${baseAsset.symbol}` }}</span>
          </div>
        </template>
      </s-table-column>
      <s-table-column :width="'98'">
        <template #header>
          <span>% FILLED</span>
        </template>
        <template v-slot="{ row }">
          <span>{{ row.filled }}</span>
        </template>
      </s-table-column>
      <s-table-column :width="'94'">
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
          <span class="limit-order-table__total">{{ fiatAmount(row.total) }}</span>
        </template>
      </s-table-column>
    </s-table>
  </div>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { getter, state, action } from '@/store/decorators';
import { delay } from '@/utils';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

@Component
export default class OpenOrders extends Mixins(TranslationMixin, mixins.LoadingMixin, mixins.FormattedAmountMixin) {
  @state.orderBook.baseAssetAddress baseAssetAddress!: string;
  @state.orderBook.currentOrderBook currentOrderBook!: any;
  @state.orderBook.userLimitOrders userLimitOrders!: Array<any>;

  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.orderBook.baseAsset baseAsset!: AccountAsset;
  @getter.orderBook.quoteAsset quoteAsset!: AccountAsset;
  @getter.assets.assetDataByAddress getAsset!: (addr?: string) => Nullable<AccountAsset>;

  @action.orderBook.subscribeToUserLimitOrders subscribeToOpenOrders!: ({ base }) => void;

  openLimitOrders: Array<any> = [];

  get openOrders(): any {
    return this.openLimitOrders;
  }

  fiatAmount(amount: string): string {
    const fiat = this.getFiatAmount(amount, this.quoteAsset);

    return `$${FPNumber.fromNatural(fiat || '0').toString()}`;
  }

  deserializeKey(key: string) {
    const [base, quote] = key.split(',');
    return { base, quote };
  }

  @Watch('userLimitOrders')
  prepareOrderLimits(): void {
    this.openLimitOrders = [];

    this.userLimitOrders.forEach((limitOrder) => {
      const { amount, price, side, id, orderBookId, time, originalAmount } = limitOrder;

      const pair = `${this.getAsset(orderBookId.base)?.symbol}-${this.getAsset(orderBookId.quote)?.symbol}`;
      const date = new Date(time);

      const proportion = amount.div(originalAmount).mul(FPNumber.HUNDRED);
      const filled = FPNumber.HUNDRED.sub(proportion).toFixed(2).toString();

      const row = {
        limitOrderId: id,
        orderBookId,
        amount,
        pair,
        price,
        side,
        filled: `${filled}%`,
        expired: 'month',
        total: amount.mul(price),
        date: { date: `${date.getUTCMonth() + 1}/${date.getUTCDate()}`, time: date.toLocaleTimeString() },
      };

      this.openLimitOrders.push(row);
    });
  }

  handleSelectRow(row): void {
    if (this.$refs.multipleOrdersTable) {
      (this.$refs.multipleOrdersTable as any).toggleRowSelection(row);
    }
  }

  handleSelectionChange(rows): void {
    this.$emit('cancelled-orders', rows);
  }

  isSelectionAllowed(): boolean {
    const [book]: any = Object.values(this.currentOrderBook);

    return !(book.status === 'Stop');
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
  border-bottom-left-radius: var(--s-border-radius-small);
  border-bottom-right-radius: var(--s-border-radius-small);
  font-size: 12px;

  .el-table__header-wrapper {
    background-color: rgba(42, 23, 31, 0.04);
    th {
      background-color: rgba(42, 23, 31, 0.04);
      color: var(--s-color-base-content-secondary);
    }
  }
  .el-table__body-wrapper {
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }

    background-color: var(--s-color-utility-surface);

    .el-table__row {
      background-color: var(--s-color-utility-surface);
    }

    .el-checkbox__inner {
      border-radius: 4px;
    }

    .el-table__empty-text {
      color: var(--s-color-base-content-secondary);
      font-size: 20px;
    }
  }

  .limit-order-table {
    &__date {
      color: var(--s-color-base-content-secondary);
      font-size: 12.5px;
    }

    &__pair {
      font-weight: 500;
    }

    &__side {
      text-transform: uppercase;
      font-weight: 500;
    }

    &__price {
      .price {
        font-weight: 500;
      }
    }

    &__amount {
      .amount {
        font-weight: 500;
      }
    }

    &__total {
      color: var(--s-color-fiat-value);
      font-family: var(--s-font-family-default);
      font-weight: 400;
      line-height: var(--s-line-height-medium);
      letter-spacing: var(--s-letter-spacing-small);
    }
  }

  .el-table__body-wrapper {
    height: 380px;
  }
}

[design-system-theme='dark'] {
  .el-table__header-wrapper {
    background-color: var(--s-color-utility-surface);
    th {
      background-color: var(--s-color-utility-surface);
    }
  }
}
</style>
