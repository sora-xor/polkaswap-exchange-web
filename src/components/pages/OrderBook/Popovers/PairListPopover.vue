<template>
  <div class="order-book-popover">
    <div class="order-book-popover__title">
      <span>Choose orderbook</span>
      <s-tooltip slot="suffix" border-radius="mini" :content="t('alerts.typeTooltip')" placement="top" tabindex="-1">
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
        <s-table-column>
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
        <s-table-column>
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
    border-radius: 20px;
    display: flex;
    flex-flow: column nowrap;
    flex: 1;

    // overwrite table styles
    .el-table__body-wrapper {
      height: 400px;
      background-color: rgba(42, 23, 31, 0.07);
      background-color: var(--s-color-utility-body);
    }

    .el-table__header-wrapper {
      .el-table__header thead th {
        background-color: rgba(42, 23, 31, 0.07);
        color: var(--s-color-base-content-secondary);
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
  background: #f4f0f1;
  border: #f4f0f1;

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

  &__title {
    height: 40px;
    line-height: 40px;
    font-weight: 500;
    font-size: 17px;
    margin-left: 16px;

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
</style>
