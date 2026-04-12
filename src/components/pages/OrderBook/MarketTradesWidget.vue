<template>
  <base-widget
    v-bind="$attrs"
    extensive
    class="market-trades"
    :title="t('orderBook.marketTrades')"
    :tooltip="t('orderBook.tooltip.marketWidget')"
  >
    <s-table class="market-trades-table" :data="completedOrders">
      <s-table-column>
        <template #header>
          <span class="market-trades__header">{{ t('priceText') }}</span>
        </template>
        <template #default="scope">
          <span class="order-info price" :class="{ buy: scope?.row?.isBuy }">
            {{ scope?.row?.price }}
          </span>
        </template>
      </s-table-column>
      <s-table-column>
        <template #header>
          <span class="market-trades__header">{{ t('orderBook.time') }}</span>
        </template>
        <template #default="scope">
          <span class="order-info time">{{ scope?.row?.time }}</span>
        </template>
      </s-table-column>
      <s-table-column header-align="right" align="right">
        <template #header>
          <span class="market-trades__header">{{ t('orderBook.amount') }}</span>
        </template>
        <template #default="scope">
          <span class="order-info">{{ scope?.row?.amount }}</span>
        </template>
      </s-table-column>
    </s-table>
  </base-widget>
</template>

<script setup lang="ts">
import { Components } from '@/consts';
import { useOrderBook } from '@/composables/useOrderBook';
import { usePiniaTelemetry } from '@/composables/usePiniaTelemetry';
import { useTranslation } from '@/composables/useTranslation';
import { lazyComponent } from '@/router';
import { useOrderBookStore } from '@/stores/orderBook';

defineOptions({
  components: {
    BaseWidget: lazyComponent(Components.BaseWidget),
  },
});

const { t } = useTranslation();
const { completedOrders, orderBookId, baseAsset, quoteAsset } = useOrderBook();
const orderBookStore = useOrderBookStore();

usePiniaTelemetry('order-book', [{ store: orderBookStore, storeId: 'orderBook' }], {
  metadata: () => ({
    widget: 'market-trades',
    orderBookId: orderBookId.value || null,
    baseAsset: baseAsset.value?.symbol ?? null,
    quoteAsset: quoteAsset.value?.symbol ?? null,
  }),
});

defineExpose({ completedOrders });
</script>

<style lang="scss">
.market-trades {
  min-height: 272px;

  .order-info {
    &.time {
      font-size: var(--s-font-size-extra-small);
      color: var(--s-color-base-content-secondary);
    }
    &.price {
      color: var(--s-color-status-error);
      &.buy {
        color: var(--s-color-status-success);
      }
    }
  }

  &__header {
    opacity: 0.3;
    color: var(--s-color-base-content-primary);
    font-size: var(--s-font-size-small);
    font-style: normal;
    font-weight: 550;
    line-height: 150%;
    letter-spacing: -0.26px;
    text-transform: uppercase;
  }
}

.market-trades-table {
  .el-table__body-wrapper {
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  &.el-table {
    background: transparent;

    tr,
    th {
      background: transparent;
    }

    .el-table__body-wrapper {
      min-height: 272px;
    }
  }
}
</style>
