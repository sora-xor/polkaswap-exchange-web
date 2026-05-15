<template>
  <base-widget v-bind="$attrs" extensive delimeter class="order-history-widget s-flex-column">
    <template #title>
      <div class="order-history-buttons order-history-buttons--filter-buttons">
        <span
          v-button
          :class="['order-history-button', { active: currentFilter === FilterEnum.open }]"
          @click="switchFilter(FilterEnum.open)"
        >
          {{ openOrdersText }}
        </span>
        <span
          v-button
          :class="['order-history-button', { active: currentFilter === FilterEnum.all }]"
          @click="switchFilter(FilterEnum.all)"
        >
          {{ t('orderBook.history.orderHistory') }}
        </span>
        <span
          v-button
          :class="['order-history-button', { active: currentFilter === FilterEnum.executed }]"
          @click="switchFilter(FilterEnum.executed)"
        >
          {{ t('orderBook.history.tradeHistory') }}
        </span>
      </div>
      <div v-if="isLoggedIn" class="order-history-buttons order-history-buttons--cancel-buttons">
        <span
          v-button
          :class="['order-history-button', 'order-history-button--cancel', { inactive: isCancelMultipleInactive }]"
          @click="cancelOrders(CancelEnum.multiple)"
        >
          {{ cancelText }}
        </span>
        <span
          v-button
          :class="['order-history-button', 'order-history-button--cancel', { inactive: isCancelAllInactive }]"
          @click="openConfirmCancelDialog"
        >
          {{ cancelAllText }}
        </span>
      </div>
    </template>

    <div class="order-history-main s-flex-column" v-if="isLoggedIn">
      <open-orders v-if="currentFilter === FilterEnum.open" :parent-loading="openOrdersLoading"></open-orders>
      <all-orders v-else :filter="currentFilter"></all-orders>
    </div>
    <div v-else class="order-history-connect-account">
      <div class="order-history-connect-account-button">
        <h4 class="h4">{{ t('orderBook.history.connect') }}</h4>
        <s-button
          type="primary"
          class="btn s-typography-button--medium order-book-connect-btn"
          @click="connectSoraWallet"
        >
          {{ t('connectWalletText') }}
        </s-button>
      </div>
    </div>
    <cancel-confirm v-model:visible="confirmDialogVisible" @confirm="cancelOrders"></cancel-confirm>
  </base-widget>
</template>
<script setup lang="ts">
import { OrderBookStatus } from '@sora-substrate/liquidity-proxy';
import { api } from '@/lib/soraneo-wallet/src/api';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import CancelConfirm from '@/features/misc/components/order-book/Dialogs/CancelOrders.vue';
import AllOrders from '@/features/misc/components/order-book/Tables/AllOrders.vue';
import OpenOrders from '@/features/misc/components/order-book/Tables/OpenOrders.vue';
import BaseWidget from '@/components/shared/Widget/Base.vue';

import { useConfirmDialog } from '@/composables/useConfirmDialog';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import { useOrderBook } from '@/composables/useOrderBook';
import { usePiniaTelemetry } from '@/composables/usePiniaTelemetry';
import { useOrderBookUserOrders } from '@/composables/useOrderBookUserOrders';
import { useOrderBookStore } from '@/stores/orderBook';
import { Filter, Cancel } from '@/types/orderBook';

import type { OrderBook } from '@sora-substrate/liquidity-proxy';
import type { LimitOrder } from '@sora-substrate/sdk/build/orderBook/types';

const FilterEnum = Filter;
const CancelEnum = Cancel;

const { t } = useTranslation();
const { isLoggedIn, connectSoraWallet, soraAddress } = useInternalConnect();
const { loading, withNotifications } = useTransaction();
const { confirmDialogVisible, confirmOrExecute } = useConfirmDialog();
const { orderBookId, baseAsset, quoteAsset } = useOrderBook();
const orderBookStore = useOrderBookStore();

usePiniaTelemetry('order-book', [{ store: orderBookStore, storeId: 'orderBook' }], {
  metadata: () => ({
    widget: 'history',
    orderBookId: orderBookId.value || null,
    baseAsset: baseAsset.value?.symbol ?? null,
    quoteAsset: quoteAsset.value?.symbol ?? null,
  }),
});

const {
  userLimitOrders,
  ordersToBeCancelled,
  nodeIsConnected,
  currentOrderBook,
  isBookStopped,
  subscribeToUserLimitOrders,
  unsubscribeFromUserLimitOrders,
  setOrdersToBeCancelled,
} = useOrderBookUserOrders();

const currentFilter = ref(FilterEnum.open);
const openOrdersLoading = ref(false);

const subscribe = async () => {
  if (!(isLoggedIn.value && nodeIsConnected.value && orderBookId.value)) {
    openOrdersLoading.value = false;
    await unsubscribeFromUserLimitOrders();
    return;
  }

  openOrdersLoading.value = true;
  try {
    await unsubscribeFromUserLimitOrders();
    await subscribeToUserLimitOrders();
  } catch (error) {
    console.error('[orderBook] Failed to refresh user limit orders subscription', error);
  } finally {
    openOrdersLoading.value = false;
  }
};

watch([orderBookId, soraAddress, nodeIsConnected, isLoggedIn], subscribe, { immediate: true });

onBeforeUnmount(() => {
  unsubscribeFromUserLimitOrders();
});

const openOrdersCount = computed(() => {
  if (!isLoggedIn.value) return '';
  const count = userLimitOrders.value.length;
  return count > 0 ? `(${count})` : '';
});

const openOrdersText = computed(() => t('orderBook.history.openOrders', { value: openOrdersCount.value }));
const hasSelectedForCancellation = computed(() => ordersToBeCancelled.value.length > 0);
const cancelText = computed(() =>
  hasSelectedForCancellation.value
    ? t('orderBook.history.cancel', { value: `(${ordersToBeCancelled.value.length})` })
    : t('orderBook.history.cancel')
);
const cancelAllText = computed(() => t('orderBook.history.cancelAll'));

const isCancelAllInactive = computed(() => loading.value || isBookStopped.value || userLimitOrders.value.length === 0);
const isCancelMultipleInactive = computed(
  () => loading.value || isBookStopped.value || !hasSelectedForCancellation.value
);

const switchFilter = (filter: Filter) => {
  currentFilter.value = filter;
};

const cancelOrders = async (cancel: Cancel = CancelEnum.all) => {
  if (loading.value || isBookStopped.value || userLimitOrders.value.length === 0) return;

  const orders = cancel === CancelEnum.multiple ? ordersToBeCancelled.value : userLimitOrders.value;
  if (!orders.length) return;

  await withNotifications(async () => {
    const {
      orderBookId: { base, quote },
    } = orders[0];
    const ids = orders.map((order: LimitOrder) => order.id);

    if (ids.length > 1) {
      await api.orderBook.cancelLimitOrderBatch(base, quote, ids);
    } else {
      await api.orderBook.cancelLimitOrder(base, quote, ids[0]);
    }
    setOrdersToBeCancelled([]);
  });
};

const openConfirmCancelDialog = async () => {
  if (isBookStopped.value || userLimitOrders.value.length === 0) return;
  await confirmOrExecute(() => cancelOrders());
};

defineExpose({
  cancelOrders,
  switchFilter,
  openConfirmCancelDialog,
  currentFilter,
  openOrdersLoading,
});
</script>

<style lang="scss">
.order-history-widget {
  min-height: 570px;

  .el-table-column--selection.is-leaf > .cell {
    visibility: hidden;
  }

  .inactive-tab {
    opacity: 0.4;

    &:hover {
      cursor: not-allowed;
      color: var(--s-color-base-content-secondary);
    }
  }
}
</style>

<style lang="scss" scoped>
.order-history {
  &-buttons {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    justify-content: flex-end;
    gap: $inner-spacing-tiny $inner-spacing-medium;

    color: var(--s-color-base-content-secondary);

    &--cancel-buttons {
      flex: 1;
    }
  }

  &-button {
    &--cancel {
      color: var(--s-color-theme-accent);
    }

    &:hover {
      cursor: pointer;
      color: var(--s-color-theme-accent);
    }

    &.active {
      color: var(--s-color-theme-accent);
    }

    &.inactive {
      opacity: 0.5;

      &:hover {
        cursor: not-allowed;
      }
    }
  }

  &-main {
    flex: 1;
  }

  &-connect-account {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;

    &-button {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      .order-book-connect-btn {
        width: fit-content;
        max-width: 100%;
        margin-top: $inner-spacing-mini;
      }
    }
  }
}
</style>
