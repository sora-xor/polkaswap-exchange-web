<template>
  <div class="order-book-popover">
    <div class="order-book-popover__title">
      <span>{{ t('orderBook.tradingPair.choosePair') }}</span>
      <s-tooltip
        slot="suffix"
        border-radius="mini"
        :content="t('orderBook.tooltip.pairsList')"
        placement="top"
        tabindex="-1"
      >
        <s-icon name="info-16" size="14px" />
      </s-tooltip>
    </div>
    <s-table
      class="orderbook-whitelist-table"
      :data="tableItems"
      :highlight-current-row="false"
      @row-click="chooseBook"
    >
      <s-table-column width="184">
        <template #header>
          <span>{{ t('orderBook.tokenPair') }}</span>
        </template>
        <template v-slot="{ row }">
          <pair-token-logo :first-token="row.baseAsset" :second-token="row.targetAsset" size="small" />
          <div class="book-pair">
            <div>{{ row.pair }}</div>
          </div>
        </template>
      </s-table-column>
      <s-table-column width="130">
        <template #header>
          <span>{{ t('priceText') }}</span>
        </template>
        <template v-slot="{ row }">
          <formatted-amount :value="row.price" fiat-sign="" />
        </template>
      </s-table-column>
      <s-table-column width="110">
        <template #header>
          <span>{{ t('orderBook.tradingPair.volume') }}</span>
        </template>
        <template v-slot="{ row }">
          <formatted-amount :value="row.volume" is-fiat-value />
        </template>
      </s-table-column>
      <s-table-column width="100">
        <template #header>
          <span>1D %</span>
        </template>
        <template v-slot="{ row }">
          <price-change :value="row.priceChange" />
        </template>
      </s-table-column>
      <s-table-column width="176">
        <template #header>
          <span>{{ t('orderBook.tradingPair.status') }}</span>
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
            <s-icon name="info-16" size="14px" @click.native="handleClickStatusTooltip" />
          </s-tooltip>
        </template>
      </s-table-column>
    </s-table>
  </div>
</template>

<script lang="ts">
import { OrderBookStatus } from '@sora-substrate/liquidity-proxy';
import { FPNumber } from '@sora-substrate/sdk';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { state, getter, mutation } from '@/store/decorators';
import type { OrderBookStats } from '@/types/orderBook';
import { getBookDecimals } from '@/utils/orderBook';

import type { OrderBook, OrderBookId } from '@sora-substrate/liquidity-proxy';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

interface BookFields {
  id: OrderBookId;
  pair: string;
  baseAsset?: Nullable<AccountAsset>;
  targetAsset?: Nullable<AccountAsset>;
  price: string;
  priceChange: FPNumber;
  volumeNumber: number;
  volume: string;
  status: string;
}

@Component({
  components: {
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    PriceChange: lazyComponent(Components.PriceChange),
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
  },
})
export default class PairListPopover extends Mixins(
  TranslationMixin,
  mixins.LoadingMixin,
  mixins.FormattedAmountMixin
) {
  @state.orderBook.orderBooks private orderBooks!: Record<string, OrderBook>;
  @state.orderBook.orderBooksStats private orderBooksStats!: Record<string, OrderBookStats>;

  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<AccountAsset>;
  @mutation.orderBook.setCurrentOrderBook private setCurrentOrderBook!: (id: OrderBookId) => void;

  getTooltipText(status: OrderBookStatus): string {
    switch (status) {
      case OrderBookStatus.Trade:
        return this.t('orderBook.tooltip.bookStatus.active');
      case OrderBookStatus.PlaceAndCancel:
        return this.t('orderBook.tooltip.bookStatus.placeable');
      case OrderBookStatus.OnlyCancel:
        return this.t('orderBook.tooltip.bookStatus.cancelable');
      case OrderBookStatus.Stop:
        return this.t('orderBook.tooltip.bookStatus.inactive');
      default:
        return this.t('unknownErrorText');
    }
  }

  chooseBook(row: BookFields): void {
    this.setCurrentOrderBook(row.id);
    this.$emit('close');
  }

  get tableItems(): Array<BookFields> {
    if (!this.orderBooks) return [];

    return Object.entries(this.orderBooks).reduce<BookFields[]>((buffer, [orderBookId, value]) => {
      if (!orderBookId) return buffer;
      const { base, quote } = value.orderBookId;
      const decimals = getBookDecimals(value);
      const price = (this.orderBooksStats[orderBookId]?.price ?? FPNumber.ZERO).dp(decimals);
      const priceChange = this.orderBooksStats[orderBookId]?.priceChange ?? FPNumber.ZERO;
      const volume = this.orderBooksStats[orderBookId]?.volume ?? FPNumber.ZERO;
      const baseAsset = this.getAsset(base);
      const targetAsset = this.getAsset(quote);
      const row: BookFields = {
        id: value.orderBookId,
        baseAsset,
        targetAsset,
        pair: `${baseAsset?.symbol}-${targetAsset?.symbol}`,
        status: value.status,
        price: price.toLocaleString(),
        priceChange,
        volumeNumber: volume.toNumber(),
        volume: volume.toLocaleString(),
      };
      const index = buffer.findIndex(
        (item) =>
          row.status > item.status ||
          (row.status === item.status && row.id.dexId > item.id.dexId) ||
          (row.status === item.status && row.id.dexId === item.id.dexId && row.volumeNumber > item.volumeNumber)
      );
      if (index !== -1) {
        buffer.splice(index, 0, row);
      } else {
        buffer.push(row);
      }
      return buffer;
    }, []);
  }

  calculateColor(status: OrderBookStatus): string | undefined {
    if ([OrderBookStatus.Trade, OrderBookStatus.PlaceAndCancel].includes(status)) return 'status-live';
    if ([OrderBookStatus.OnlyCancel, OrderBookStatus.Stop].includes(status)) return 'status-stop';
  }

  mapBookStatus(status: OrderBookStatus): string {
    switch (status) {
      case OrderBookStatus.Trade:
        return this.t('orderBook.bookStatus.active');
      case OrderBookStatus.PlaceAndCancel:
        return this.t('orderBook.bookStatus.placeable');
      case OrderBookStatus.OnlyCancel:
        return this.t('orderBook.bookStatus.cancelable');
      case OrderBookStatus.Stop:
        return this.t('orderBook.bookStatus.inactive');
      default:
        return this.t('unknownErrorText');
    }
  }

  handleClickStatusTooltip(e?: Event): void {
    e?.stopPropagation();
  }
}
</script>

<style lang="scss">
.orderbook-whitelist {
  &-table {
    width: 700px;
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
        background-color: rgba(231, 218, 221, 0.45);
        .cell {
          font-weight: 400 !important;
        }
      }
    }

    tr.el-table__row {
      background-color: var(--s-color-utility-body);
    }
  }
}

.el-table--enable-row-hover .el-table__body tr:hover > td.el-table__cell {
  background-color: rgba(42, 23, 31, 0.06);
  cursor: pointer;
}

.order-book-popover {
  width: 700px;
  background-color: var(--s-color-utility-body);
  border-radius: var(--s-border-radius-small);

  @include tablet(true) {
    width: 624px;
  }

  @include mobile(true) {
    width: 370px;
  }

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
    margin-left: $inner-spacing-mini;
    margin-bottom: 3px;
  }

  &__title {
    height: 40px;
    line-height: 40px;
    font-weight: 500;
    font-size: 17px;
    margin-left: $basic-spacing;
    color: var(--s-color-base-content-primary);

    .el-tooltip {
      margin-left: $inner-spacing-mini;
    }
  }

  .status-live {
    color: var(--status-day-success, #34ad87);
    text-transform: uppercase;
    font-weight: 600;
  }

  .status-stop {
    color: var(--status-day-error, #f754a3);
    text-transform: uppercase;
    font-weight: 600;
  }
}

[design-system-theme='dark'] {
  .orderbook-whitelist {
    &-table {
      .el-table__header-wrapper {
        .el-table__header thead th {
          background-color: #693d81;
        }
      }
    }
  }
}
</style>
