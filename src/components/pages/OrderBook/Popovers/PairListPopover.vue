<template>
  <div class="order-book-popover">
    <div class="order-book-popover__title">
      <span>Choose orderbook</span>
      <s-tooltip slot="suffix" border-radius="mini" :content="chooseOrderbookTooltip" placement="top" tabindex="-1">
        <s-icon name="info-16" size="14px" />
      </s-tooltip>
    </div>
    <s-scrollbar class="orderbook-whitelist__scrollbar">
      <s-table
        class="orderbook-whitelist-table"
        :data="tableItems"
        :highlight-current-row="false"
        @cell-click="chooseBook"
      >
        <s-table-column :width="'170'">
          <template #header>
            <span>Token pair</span>
          </template>
          <template v-slot="{ row }">
            <pair-token-logo :first-token="row.baseAsset" :second-token="row.targetAsset" size="small" />
            <div class="book-pair">
              <div>{{ row.pair }}</div>
            </div>
          </template>
        </s-table-column>
        <s-table-column width="85">
          <template #header>
            <span>Price</span>
          </template>
          <template v-slot="{ row }">
            <span class="price">{{ row.price }}</span>
          </template>
        </s-table-column>
        <s-table-column>
          <template #header>
            <span>Volume</span>
          </template>
          <template v-slot="{ row }">
            <span>{{ row.volume }}</span>
          </template>
        </s-table-column>
        <s-table-column>
          <template #header>
            <span>Daily change</span>
          </template>
          <template v-slot="{ row }">
            <span>{{ row.dailyChange }}</span>
          </template>
        </s-table-column>
        <s-table-column>
          <template #header>
            <span>Status</span>
          </template>
          <template v-slot="{ row }">
            <span :class="calculateColor(row.status)">{{ mapBookStatus(row.status) }}</span>
            <s-tooltip
              slot="suffix"
              border-radius="mini"
              :content="getTooltipText(row.status)"
              placement="top"
              tabindex="-1"
              class="status-tooltip"
            >
              <s-icon name="info-16" size="14px" />
            </s-tooltip>
          </template>
        </s-table-column>
      </s-table>
    </s-scrollbar>
  </div>
</template>

<script lang="ts">
import { OrderBookStatus } from '@sora-substrate/liquidity-proxy';
import { FPNumber } from '@sora-substrate/util';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { api, components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { state, getter, action, mutation } from '@/store/decorators';

import type { OrderBook, PriceVariant } from '@sora-substrate/liquidity-proxy';
import type { Asset, AccountAsset, Whitelist } from '@sora-substrate/util/build/assets/types';

interface BookFields {
  pair: string;
  baseAsset?: Nullable<AccountAsset>;
  targetAsset?: Nullable<AccountAsset>;
  price?: string;
  dailyChange?: string;
  volume?: string;
  status: string;
}

@Component({
  components: {
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
  },
})
export default class PairListPopover extends Mixins(TranslationMixin, mixins.LoadingMixin) {
  @state.orderBook.orderBooks orderBooks!: Record<string, OrderBook>;

  @mutation.orderBook.setCurrentOrderBook setCurrentOrderBook!: (orderBookId: string) => void;
  @mutation.orderBook.resetAsks resetAsks!: () => void;
  @mutation.orderBook.resetBids resetBids!: () => void;

  @getter.assets.assetDataByAddress getAsset!: (addr?: string) => Nullable<AccountAsset>;

  @action.orderBook.getOrderBooksInfo getOrderBooksInfo!: AsyncFnWithoutArgs;

  orderBooksFormatted: Array<BookFields> = [];

  get tableItems() {
    return this.orderBooksFormatted;
  }

  get chooseOrderbookTooltip(): string {
    return 'A real-time list showing current buy and sell orders for a cryptocurrency. It helps you understand the demand, potential price direction, and trade volume on the SORA Network and Polkaswap DEX';
  }

  getTooltipText(status: OrderBookStatus): string {
    switch (status) {
      case OrderBookStatus.Trade:
        return 'Full trading functionality enabled. You can place new orders or cancel existing ones.';
      case OrderBookStatus.PlaceAndCancel:
        return 'Limited functionality. You can place new orders and cancel existing ones, but some features may be unavailable.';
      case OrderBookStatus.OnlyCancel:
        return 'You can only cancel existing orders. New order placement is currently disabled.';
      case OrderBookStatus.Stop:
        return 'All trading activities are currently halted. No orders can be placed or canceled at this time.';
      default:
        return 'Unknown';
    }
  }

  deserializeKey(key: string) {
    const [base, quote] = key.split(',');
    return { base, quote };
  }

  serializedKey(base: string, quote: string): string {
    if (!(base && quote)) return '';
    return `${base},${quote}`;
  }

  chooseBook(row): void {
    this.setCurrentOrderBook(this.serializedKey(row.baseAsset.address, XOR.address));
  }

  prepareOrderBooks() {
    Object.entries(this.orderBooks).forEach(([orderBookId, value]) => {
      if (!orderBookId) return null;
      const { base, quote } = this.deserializeKey(orderBookId);
      const row = {
        baseAsset: this.getAsset(base),
        targetAsset: this.getAsset(quote),
        pair: `${this.getAsset(base)?.symbol}-${this.getAsset(quote)?.symbol}`,
        status: value.status,
        price: '50.34',
        dailyChange: '+34.30%',
        volume: '3343242000',
      };

      this.orderBooksFormatted.push(row);
    });
  }

  calculateColor(status: OrderBookStatus): string | undefined {
    if ([OrderBookStatus.Trade, OrderBookStatus.PlaceAndCancel].includes(status)) return 'status-live';
    if ([OrderBookStatus.OnlyCancel, OrderBookStatus.Stop].includes(status)) return 'status-stop';
  }

  mapBookStatus(status: OrderBookStatus): string {
    switch (status) {
      case OrderBookStatus.Trade:
        return 'Active';
      case OrderBookStatus.PlaceAndCancel:
        return 'Placeable';
      case OrderBookStatus.OnlyCancel:
        return 'Cancelable';
      case OrderBookStatus.Stop:
        return 'Inactive';
      default:
        return 'Unknown';
    }
  }

  async mounted(): Promise<void> {
    await this.withApi(async () => {
      await this.getOrderBooksInfo();
    });

    if (this.orderBooks && Object.keys(this.orderBooks).length) {
      this.prepareOrderBooks();
    }
  }
}
</script>

<style lang="scss">
.orderbook-whitelist {
  &-table {
    width: 750px;
    border-bottom-left-radius: var(--s-border-radius-small);
    border-bottom-right-radius: var(--s-border-radius-small);
    display: flex;
    flex-flow: column nowrap;
    flex: 1;

    // overwrite table styles
    .el-table__body-wrapper {
      height: 400px;
      background-color: var(--s-color-utility-body);
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
      }
    }

    .el-table__header-wrapper {
      .el-table__header thead th {
        background-color: rgba(42, 23, 31, 0.07);
        .cell {
          font-weight: 400 !important;
        }
      }
    }

    tr.el-table__row {
      background-color: var(--s-color-utility-body);
    }
  }

  &__scrollbar {
    @include scrollbar;
  }
}

.el-table--enable-row-hover .el-table__body tr:hover > td.el-table__cell {
  background-color: rgba(42, 23, 31, 0.06);
  cursor: pointer;
}

.order-book-popover {
  width: 750px;
  background-color: var(--s-color-utility-body);
  border-radius: var(--s-border-radius-small);

  .cell {
    display: flex;
    align-items: center;

    .book-pair {
      display: inline-block;
      font-weight: 500;
    }
  }

  .price {
    color: var(--s-color-status-info);
  }

  .status-tooltip {
    margin-left: 8px;
    margin-bottom: 3px;
  }

  &__title {
    height: 40px;
    line-height: 40px;
    font-weight: 500;
    font-size: 17px;
    margin-left: 16px;
    color: var(--s-color-base-content-primary);

    .el-tooltip {
      margin-left: 8px;
    }
  }

  .status-live {
    color: var(--status-day-success, #34ad87);
    font-weight: 600;
    text-transform: uppercase;
  }

  .status-stop {
    color: var(--status-day-error, #f754a3);
    font-weight: 600;
    text-transform: uppercase;
  }
}

[design-system-theme='dark'] {
  .orderbook-whitelist {
    &-table {
      .el-table__header-wrapper {
        .el-table__header thead th {
          background-color: var(--s-color-utility-body);
        }
      }
    }
  }
}
</style>
