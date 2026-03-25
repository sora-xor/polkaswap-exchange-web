<template>
  <div class="order-book-popover">
    <div class="order-book-popover__title">
      <span>{{ t('orderBook.tradingPair.choosePair') }}</span>
      <s-tooltip border-radius="mini" :content="t('orderBook.tooltip.pairsList')" placement="top" tabindex="-1">
        <s-icon name="info-16" size="14px"></s-icon>
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
        <template #default="{ row }">
          <pair-token-logo :first-token="row.baseAsset" :second-token="row.targetAsset" size="small"></pair-token-logo>
          <div class="book-pair">
            <div>{{ row.pair }}</div>
          </div>
        </template>
      </s-table-column>
      <s-table-column width="130">
        <template #header>
          <span>{{ t('priceText') }}</span>
        </template>
        <template #default="{ row }">
          <formatted-amount :value="row.price" fiat-sign=""></formatted-amount>
        </template>
      </s-table-column>
      <s-table-column width="110">
        <template #header>
          <span>{{ t('orderBook.tradingPair.volume') }}</span>
        </template>
        <template #default="{ row }">
          <formatted-amount :value="row.volume" is-fiat-value></formatted-amount>
        </template>
      </s-table-column>
      <s-table-column width="100">
        <template #header>
          <span>1D %</span>
        </template>
        <template #default="{ row }">
          <price-change :value="row.priceChange"></price-change>
        </template>
      </s-table-column>
      <s-table-column width="176">
        <template #header>
          <span>{{ t('orderBook.tradingPair.status') }}</span>
        </template>
        <template #default="{ row }">
          <span :class="calculateColor(row.status)">{{ mapBookStatus(row.status) }}</span>
          <s-tooltip
            border-radius="mini"
            :content="getTooltipText(row.status)"
            placement="top"
            tabindex="-1"
            class="status-tooltip"
          >
            <button class="status-tooltip__trigger" type="button" @click="handleClickStatusTooltip">
              <s-icon name="info-16" size="14px"></s-icon>
            </button>
          </s-tooltip>
        </template>
      </s-table-column>
    </s-table>
  </div>
</template>

<script setup lang="ts">
import { OrderBookStatus } from '@sora-substrate/liquidity-proxy';
import { FPNumber } from '@sora-substrate/sdk';
import { components } from '@/shims/wallet-components';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Components } from '@/consts';
import { useOrderBookPairList } from '@/composables/useOrderBookPairList';
import { useTranslation } from '@/composables/useTranslation';
import { lazyComponent } from '@/router';
import { useAssetsStore } from '@/stores/assets';
import { getBookDecimals } from '@/utils/orderBook';

import type { OrderBookId } from '@sora-substrate/liquidity-proxy';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Nullable } from '@/types/common';

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

defineOptions({
  components: {
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    PriceChange: lazyComponent(Components.PriceChange),
    FormattedAmount: components.FormattedAmount,
  },
});

const emit = defineEmits<{ (event: 'close'): void }>();

const { t } = useTranslation();
const route = useRoute();
const router = useRouter();
const assetsStore = useAssetsStore();
const { orderBooks, orderBooksStats, selectOrderBook } = useOrderBookPairList();

const getTooltipText = (status: OrderBookStatus): string => {
  switch (status) {
    case OrderBookStatus.Trade:
      return t('orderBook.tooltip.bookStatus.active');
    case OrderBookStatus.PlaceAndCancel:
      return t('orderBook.tooltip.bookStatus.placeable');
    case OrderBookStatus.OnlyCancel:
      return t('orderBook.tooltip.bookStatus.cancelable');
    case OrderBookStatus.Stop:
      return t('orderBook.tooltip.bookStatus.inactive');
    default:
      return t('unknownErrorText');
  }
};

const mapBookStatus = (status: OrderBookStatus): string => {
  switch (status) {
    case OrderBookStatus.Trade:
      return t('orderBook.bookStatus.active');
    case OrderBookStatus.PlaceAndCancel:
      return t('orderBook.bookStatus.placeable');
    case OrderBookStatus.OnlyCancel:
      return t('orderBook.bookStatus.cancelable');
    case OrderBookStatus.Stop:
      return t('orderBook.bookStatus.inactive');
    default:
      return t('unknownErrorText');
  }
};

const calculateColor = (status: OrderBookStatus): string | undefined => {
  if ([OrderBookStatus.Trade, OrderBookStatus.PlaceAndCancel].includes(status)) {
    return 'status-live';
  }

  if ([OrderBookStatus.OnlyCancel, OrderBookStatus.Stop].includes(status)) {
    return 'status-stop';
  }

  return undefined;
};

/**
 * Builds the formatted list of trading pairs shown in the popover, sorted by status and volume.
 */
const tableItems = computed<BookFields[]>(() => {
  return Object.entries(orderBooks.value).reduce<BookFields[]>((buffer, [orderBookKey, value]) => {
    if (!orderBookKey) return buffer;

    const { base, quote } = value.orderBookId;
    const decimals = getBookDecimals(value);
    const stats = orderBooksStats.value[orderBookKey];
    const price = (stats?.price ?? FPNumber.ZERO).dp(decimals);
    const priceChange = stats?.priceChange ?? FPNumber.ZERO;
    const volume = stats?.volume ?? FPNumber.ZERO;
    const baseAsset = assetsStore.assetDataByAddress(base);
    const targetAsset = assetsStore.assetDataByAddress(quote);

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

    const insertIndex = buffer.findIndex(
      (item) =>
        row.status > item.status ||
        (row.status === item.status && row.id.dexId > item.id.dexId) ||
        (row.status === item.status && row.id.dexId === item.id.dexId && row.volumeNumber > item.volumeNumber)
    );

    if (insertIndex !== -1) {
      buffer.splice(insertIndex, 0, row);
    } else {
      buffer.push(row);
    }

    return buffer;
  }, []);
});

/**
 * Selects the chosen order book and closes the popover.
 */
const chooseBook = (row: BookFields): void => {
  selectOrderBook(row.id);
  const routeName = (route.name as string) || 'OrderBook';
  void router.replace({
    name: routeName,
    params: {
      first: row.id.base,
      second: row.id.quote,
    },
  });
  emit('close');
};

const handleClickStatusTooltip = (event?: Event): void => {
  event?.stopPropagation();
};

defineExpose({
  tableItems,
  chooseBook,
  getTooltipText,
  mapBookStatus,
  calculateColor,
});
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

    &__trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      cursor: pointer;

      @include focus-outline;
    }
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
