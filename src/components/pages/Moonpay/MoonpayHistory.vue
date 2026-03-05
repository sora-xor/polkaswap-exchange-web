<template>
  <div class="moonpay-history">
    <moonpay-logo :theme="libraryTheme"></moonpay-logo>
    <template v-if="isHistoryView">
      <div class="moonpay-history-title">{{ t('moonpay.history.title') }}</div>
      <div :class="['moonpay-history-list', { empty: emptyHistory }]" v-loading="loading">
        <div
          v-button
          v-for="item in formattedItems"
          :key="item.id"
          class="moonpay-history-item"
          tabindex="0"
          @click="navigateToDetails(item)"
        >
          <div class="moonpay-history-item-data">
            <div class="moonpay-history-item__date">{{ item.formatted.date }}</div>
            <div class="moonpay-history-item__amount">
              <template v-if="item.formatted.cryptoAmount">
                <formatted-amount
                  class="moonpay-history-item-amount"
                  value-can-be-hidden
                  :value="item.formatted.cryptoAmount"
                  :font-size-rate="FontSizeRate.MEDIUM"
                  :asset-symbol="item.formatted.crypto"
                ></formatted-amount>
                <i class="network-icon network-icon--ethereum"></i>&nbsp; <span>{{ t('forText') }}</span>
                &nbsp;
              </template>
              <formatted-amount
                class="moonpay-history-item-amount"
                value-can-be-hidden
                :value="item.formatted.fiatAmount"
                :font-size-rate="FontSizeRate.MEDIUM"
                :asset-symbol="item.formatted.fiat"
              ></formatted-amount>
            </div>
            <div class="moonpay-history-item__wallet-address">
              {{ item.walletAddress }}
            </div>
          </div>
          <s-icon :class="['moonpay-history-item-icon', item.status]" :name="item.formatted.icon" size="14"></s-icon>
        </div>
        <span v-if="emptyHistory">{{ t('moonpay.history.empty') }}</span>
      </div>
      <history-pagination
        v-if="!emptyHistory"
        class="moonpay-history-pagination"
        :current-page="currentPage"
        :page-amount="pageAmount"
        :total="total"
        :loading="loading"
        :last-page="lastPage"
        @pagination-click="handlePaginationClick"
      ></history-pagination>
    </template>
    <template v-else>
      <i-frame-widget :src="detailsWidgetUrl" :allowed-origins="MOONPAY_WIDGET_ORIGINS"></i-frame-widget>
      <s-button
        v-if="isCompletedTransaction"
        :type="actionButtonType"
        :disabled="actionButtonDisabled"
        :loading="loading"
        class="moonpay-details-button s-typography-button--big"
        @click="handleTransaction"
      >
        {{ actionButtonText }}
      </s-button>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { WALLET_CONSTS, components } from '@wallet';
import { computed, onMounted, ref } from 'vue';

import MoonpayLogo from '@/components/shared/Logo/Moonpay.vue';
import { Components } from '@/consts';
import type { Theme } from '@/consts/theme';
import { lazyComponent } from '@/router';
import store from '@/store';
import { useMoonpayBridge } from '@/composables/useMoonpayBridge';
import { useTranslation } from '@/composables/useTranslation';
import { getCssVariableValue } from '@/utils';
import { resolveLibraryTheme } from '@/utils/resolveLibraryTheme';
import { MoonpayTransactionStatus, MOONPAY_WIDGET_ORIGINS, buildMoonpayTransactionDetailsUrl } from '@/utils/moonpay';

import type { MoonpayTransaction, MoonpayCurrency, MoonpayCurrenciesById } from '@/utils/moonpay';
import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';
import type { Nullable } from '@/types/common';

const HistoryView = 'history';
const DetailsView = 'details';
const pageAmount = 5;
const FontSizeRate = WALLET_CONSTS.FontSizeRate;

defineOptions({
  components: {
    MoonpayLogo,
    FormattedAmount: components.FormattedAmount,
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    IFrameWidget: lazyComponent(Components.IFrameWidget),
    HistoryPagination: components.HistoryPagination,
  },
});

const { t, language, formatDate } = useTranslation();
const {
  loading,
  withApi,
  initMoonpayApi,
  prepareEvmNetwork,
  showHistory,
  prepareMoonpayTxForBridgeTransfer,
  getBridgeHistoryItemByMoonpayId,
  walletConnect,
} = useMoonpayBridge();

const transactions = computed(() => store.state.moonpay.transactions as MoonpayTransaction[]);
const currencies = computed(() => store.state.moonpay.currencies as MoonpayCurrency[]);
const isValidNetwork = computed(() => Boolean(store.getters.web3.isValidNetwork));
const libraryTheme = computed(() => resolveLibraryTheme(store) as Theme);

const currentPage = ref(1);
const currentView = ref<string>(HistoryView);
const selectedItem = ref<Record<string, unknown>>({});

const total = computed(() => transactions.value.length);
const lastPage = computed(() => (total.value ? Math.ceil(total.value / pageAmount) : 1));
const startIndex = computed(() => (currentPage.value - 1) * pageAmount);
const lastIndex = computed(() => currentPage.value * pageAmount);

const currenciesById = computed<MoonpayCurrenciesById>(() =>
  currencies.value.reduce((result, item) => ({ ...result, [item.id]: item }), {} as MoonpayCurrenciesById)
);

const historyItems = computed(() => transactions.value.slice(startIndex.value, lastIndex.value));

const formattedItems = computed(() => {
  const formatCurrencyName = (id: string) => (currenciesById.value[id]?.code ?? '').toUpperCase();
  const formatCurrencyAmount = (amount: number) => (Number.isFinite(amount) ? String(amount) : amount);
  const iconStatus = (status: string) => {
    if (status === MoonpayTransactionStatus.Completed) return 'basic-check-mark-24';
    if (status === MoonpayTransactionStatus.Failed) return 'basic-clear-X-24';

    return 'basic-more-horizontal-24';
  };

  return historyItems.value.map((item) => ({
    ...item,
    formatted: {
      fiat: formatCurrencyName(item.baseCurrencyId),
      fiatAmount: formatCurrencyAmount(item.baseCurrencyAmount),
      crypto: formatCurrencyName(item.currencyId),
      cryptoAmount: formatCurrencyAmount(item.quoteCurrencyAmount),
      date: formatDate(new Date(item.updatedAt).getTime()),
      icon: iconStatus(item.status),
    },
  }));
});

const detailsWidgetUrl = computed(() => {
  const item = selectedItem.value;
  const transactionId = typeof item?.id === 'string' ? item.id : '';
  const returnUrl = typeof item?.returnUrl === 'string' ? item.returnUrl : '';

  return buildMoonpayTransactionDetailsUrl({
    returnUrl,
    transactionId,
    language: language.value,
    colorCode: getCssVariableValue('--s-color-theme-accent'),
  });
});

const bridgeTxToSora = computed<Nullable<EthHistory>>(() => {
  const itemId = selectedItem.value?.id as string | undefined;
  if (!itemId) return undefined;

  return getBridgeHistoryItemByMoonpayId(itemId);
});

const evmAddress = computed(() => walletConnect.evmAddress.value?.toLowerCase?.() ?? '');

const isCompletedTransaction = computed(() => selectedItem.value?.status === MoonpayTransactionStatus.Completed);

const externalAccountIsMoonpayRecipient = computed(() => {
  const walletAddress = (selectedItem.value?.walletAddress as string | undefined)?.toLowerCase?.();
  return walletAddress ? walletAddress === evmAddress.value : false;
});

const actionButtonType = computed(() => (bridgeTxToSora.value ? 'secondary' : 'primary'));
const actionButtonDisabled = computed(() => !externalAccountIsMoonpayRecipient.value);

const actionButtonText = computed(() => {
  if (!evmAddress.value) return t('connectWalletText');
  if (bridgeTxToSora.value) return t('moonpay.buttons.view');
  if (!externalAccountIsMoonpayRecipient.value) return t('changeAccountText');
  if (!isValidNetwork.value) return t('changeNetworkText');

  return t('moonpay.buttons.transfer');
});

const isHistoryView = computed(() => currentView.value === HistoryView);
const emptyHistory = computed(() => !transactions.value.length);

const changeView = (view: string) => {
  currentView.value = view;
};

const handlePaginationClick = (button: WALLET_CONSTS.PaginationButton) => {
  let nextPage = currentPage.value;

  switch (button) {
    case WALLET_CONSTS.PaginationButton.Prev:
      nextPage = currentPage.value - 1;
      break;
    case WALLET_CONSTS.PaginationButton.Next:
      nextPage = currentPage.value + 1;
      break;
    case WALLET_CONSTS.PaginationButton.Last:
      nextPage = lastPage.value;
      break;
  }

  currentPage.value = nextPage;
};

const handleBack = () => {
  loading.value = false;
  changeView(HistoryView);
};

const navigateToDetails = (item: MoonpayTransaction) => {
  selectedItem.value = item;
  changeView(DetailsView);
};

const handleTransaction = async () => {
  const item = selectedItem.value;
  if (!item?.id) return;

  if (!isValidNetwork.value) {
    walletConnect.changeEvmNetworkProvided();
    return;
  }

  if (bridgeTxToSora.value?.id) {
    await prepareEvmNetwork();
    await showHistory(bridgeTxToSora.value.id);
    return;
  }

  await prepareMoonpayTxForBridgeTransfer(item);
};

const loadMoonpayData = async () => {
  await withApi(async () => {
    initMoonpayApi();
    await prepareEvmNetwork();
    await Promise.all([store.dispatch.moonpay.getTransactions(), store.dispatch.moonpay.getCurrencies()]);
  });
};

onMounted(() => {
  void loadMoonpayData();
});
</script>

<style lang="scss">
.page-header-title--moonpay-history {
  .page-header-title {
    margin: auto;
  }
}
.moonpay-history-pagination {
  width: 100%;
}

.pay-option-tab {
  display: block;
}
</style>

<style lang="scss" scoped>
$list-item-min-height: 76px;
$separator-margin: calc(var(--s-basic-spacing) / 2);

.moonpay-history {
  position: relative;
  display: flex;
  flex-flow: column nowrap;
  align-items: center;

  & > *:not(:last-child) {
    margin-bottom: $inner-spacing-medium;
  }

  &-title {
    font-size: var(--s-font-size-extra-small);
    font-weight: 300;
    line-height: var(--s-line-height-base);
  }

  &-list {
    width: 100%;
    min-height: $list-item-min-height;
    &.empty {
      text-align: center;
    }
  }

  &-item {
    display: flex;
    align-items: center;
    border-radius: var(--s-border-radius-small);
    flex-flow: row nowrap;
    line-height: var(--s-line-height-medium);
    font-size: var(--s-font-size-small);
    font-weight: 300;
    padding: $inner-spacing-mini $inner-spacing-medium;
    margin: 0 -#{$inner-spacing-small};
    min-height: $list-item-min-height;

    &:hover {
      background-color: var(--s-color-base-background-hover);
      cursor: pointer;
    }

    &-data {
      flex: 1;
    }

    &__date {
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-mini);
    }

    &__wallet-address {
      color: var(--s-color-base-content-secondary);
    }

    &__amount {
      display: flex;
      align-items: center;
    }

    &-amount {
      font-weight: 600;
    }

    &-icon {
      color: var(--s-color-base-content-secondary);

      &.completed {
        color: var(--s-color-status-success);
      }
      &.failed {
        color: var(--s-color-status-error);
      }
    }

    .network-icon {
      margin-left: $separator-margin;
    }
  }
}

.moonpay-details {
  &-button {
    width: 100%;
  }
}
</style>
