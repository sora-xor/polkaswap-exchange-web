<template>
  <base-widget extensive v-loading="loadingState">
    <div class="order-book-tabs">
      <s-tabs :value="currentTab" type="card" @update:model-value="handleChangeTab">
        <s-tab
          v-for="bookTab in LimitOrderTabsItems"
          :key="bookTab"
          :label="t(`orderBook.${bookTab}`)"
          :name="bookTab"
        ></s-tab>
      </s-tabs>
    </div>
    <div>
      <buy-sell></buy-sell>
    </div>
  </base-widget>
</template>

<script setup lang="ts">
import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { computed, ref, watch } from 'vue';
import BuySell from '@/components/pages/OrderBook/BuySell.vue';
import BaseWidget from '@/components/shared/Widget/Base.vue';

import { useOrderBook } from '@/composables/useOrderBook';
import { usePiniaTelemetry } from '@/composables/usePiniaTelemetry';
import { useTranslation } from '@/composables/useTranslation';
import { useOrderBookStore } from '@/stores/orderBook';

const { t } = useTranslation();
const { PriceVariant: orderBookPriceVariant, side, setSide, orderBookId, baseAsset, quoteAsset } = useOrderBook();
const orderBookStore = useOrderBookStore();

const LimitOrderTabsItems = orderBookPriceVariant ?? PriceVariant;

const currentTab = ref(side.value ?? PriceVariant.Buy);

usePiniaTelemetry('order-book', [{ store: orderBookStore, storeId: 'orderBook' }], {
  metadata: () => ({
    widget: 'set-limit-order',
    orderBookId: orderBookId.value || null,
    baseAsset: baseAsset.value?.symbol ?? null,
    quoteAsset: quoteAsset.value?.symbol ?? null,
  }),
});

watch(
  side,
  (side) => {
    if (side && side !== currentTab.value) {
      currentTab.value = side;
    }
  },
  { immediate: true }
);

const loadingState = computed(() => false);

const handleChangeTab = (side: PriceVariant) => {
  currentTab.value = side;
  setSide(side);
};
</script>

<style lang="scss">
$book-tabs-height: 64px;

.order-book-tabs {
  border-radius: var(--s-border-radius-small);
  padding-top: 0;
  padding-right: 0;
  padding-left: 0;
  .s-tabs {
    background-color: inherit;
    &,
    .el-tabs__header,
    .el-tabs__nav-wrap,
    .el-tabs__active-bar {
      border-top-right-radius: inherit;
      border-top-left-radius: inherit;
    }
  }
  .el-tabs__header,
  .el-tabs__nav {
    width: 100%;
  }
  .el-tabs__header {
    margin: 0 0 $inner-spacing-mini;
    .el-tabs {
      &__nav,
      &__nav-wrap,
      &__item {
        height: $book-tabs-height;
        line-height: $book-tabs-height;
      }
      &__nav {
        .el-tabs__item {
          width: 50%;
        }
      }
      &__nav-wrap {
        .el-tabs__item {
          &,
          &.is-active {
            border-top-right-radius: 0;
            border-top-left-radius: inherit;

            @include page-header-title(true);
          }
          &:last-child {
            border-top-right-radius: inherit;
            border-top-left-radius: 0;
          }
        }
      }
    }
  }
  .s-tabs + * {
    padding-top: $inner-spacing-big;
    padding-right: $inner-spacing-big;
    padding-left: $inner-spacing-big;
  }
}
</style>
