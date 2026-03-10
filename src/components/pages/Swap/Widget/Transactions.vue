<template>
  <base-widget v-bind="$attrs" :title="tc('transactionText', 2)" class="swap-transactions-widget">
    <template #types>
      <token-select-button
        :icon="selectTokenIcon"
        :token="selectedToken"
        :tabindex="tokenTabIndex"
        :disabled="areActionsDisabled"
        @click.stop="handleSelectToken"
      ></token-select-button>
      <select-token
        v-if="!predefinedToken"
        disabled-custom
        v-model:visible="showSelectTokenDialog"
        :asset="selectedToken"
        @select="changeToken"
      ></select-token>
    </template>

    <s-table
      ref="tableRef"
      v-loading="loading"
      :data="tableItems"
      :highlight-current-row="false"
      size="small"
      class="explore-table"
    >
      <s-table-column width="74">
        <template #header>
          <span>{{ t('transaction.startTime') }}</span>
        </template>
        <template v-slot="{ row }">
          <div class="explore-table-item-date">
            <div>{{ row.datetime.date }}</div>
            <div>{{ row.datetime.time }}</div>
          </div>
        </template>
      </s-table-column>
      <s-table-column header-align="right" align="right">
        <template #header>
          <span>{{ t('removeLiquidity.input') }}</span>
        </template>
        <template v-slot="{ row }">
          <formatted-amount-with-fiat-value
            class="explore-table-item-token tx-amount"
            :font-size-rate="FontSizeRate.SMALL"
            :value="row.inputAmount"
            :fiat-value="row.inputAmountUSD"
          ></formatted-amount-with-fiat-value>
        </template>
      </s-table-column>
      <s-table-column header-align="left" align="left">
        <template #header>
          <span>{{ t('removeLiquidity.output') }}</span>
        </template>
        <template v-slot="{ row }">
          <formatted-amount-with-fiat-value
            class="explore-table-item-token tx-amount"
            :font-size-rate="FontSizeRate.SMALL"
            :value="row.outputAmount"
            :fiat-value="row.outputAmountUSD"
          ></formatted-amount-with-fiat-value>
        </template>
      </s-table-column>
      <s-table-column header-align="left" align="left">
        <template #header>
          <span>{{ t('transfers.from') }}</span>
        </template>
        <template v-slot="{ row }">
          <div class="explore-table-cell">
            <token-logo
              size="small"
              class="explore-table-item-logo explore-table-item-logo--plain"
              :token="row.inputAsset"
              :token-symbol="row.inputAssetSymbol"
            ></token-logo>
            <span class="explore-table-item-token">{{ row.inputAssetSymbol }}</span>
          </div>
        </template>
      </s-table-column>
      <s-table-column header-align="left" align="left">
        <template #header>
          <span>{{ t('transfers.to') }}</span>
        </template>
        <template v-slot="{ row }">
          <div class="explore-table-cell">
            <token-logo
              size="small"
              class="explore-table-item-logo explore-table-item-logo--plain"
              :token="row.outputAsset"
              :token-symbol="row.outputAssetSymbol"
            ></token-logo>
            <span class="explore-table-item-token">{{ row.outputAssetSymbol }}</span>
          </div>
        </template>
      </s-table-column>
      <s-table-column width="94">
        <template #header>
          <span>{{ tc('accountText', 1) }}</span>
        </template>
        <template v-slot="{ row }">
          <formatted-address :value="row.address" :symbols="8"></formatted-address>
        </template>
      </s-table-column>
      <s-table-column width="48" header-align="center">
        <template #header>
          <s-icon name="basic-eye-no-24" size="16px"></s-icon>
        </template>
        <template v-slot="{ row }">
          <links-dropdown v-if="row.links.length" :links="row.links"></links-dropdown>
        </template>
      </s-table-column>
    </s-table>

    <history-pagination
      class="explore-table-pagination"
      :current-page="currentPage"
      :page-amount="pageAmount"
      :total="total"
      :loading="loading"
      :last-page="lastPage"
      @pagination-click="handlePaginationClick"
    ></history-pagination>
  </base-widget>
</template>

<script setup lang="ts">
import { FPNumber, Operation } from '@sora-substrate/sdk';
import { getCurrentIndexer, components, WALLET_CONSTS, WALLET_TYPES } from '@wallet';
import dayjs from 'dayjs/esm';
import { computed, watch, type Ref } from 'vue';

import { useIndexerDataFetch } from '@/composables/useIndexerDataFetch';
import { useScrollableTable } from '@/composables/useScrollableTable';
import { useWidgetTokenSelect } from '@/composables/useWidgetTokenSelect';
import { useTranslation } from '@/composables/useTranslation';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import store from '@/store';
import { type FetchVariables } from '@/types/indexers';
import { soraExplorerLinks, showMostFittingValue } from '@/utils';

import type { HistoryItem } from '@sora-substrate/sdk';
import type { Asset } from '@sora-substrate/sdk/build/assets/types';

type TableItem = {
  address: string;
  inputAsset: Nullable<Asset>;
  inputAssetSymbol: string;
  outputAsset: Nullable<Asset>;
  outputAssetSymbol: string;
  inputAmount: string;
  inputAmountUSD: string;
  outputAmount: string;
  outputAmountUSD: string;
  datetime: {
    date: string;
    time: string;
  };
  links: WALLET_CONSTS.ExplorerLink[];
};

defineOptions({
  name: 'SwapTransactionsWidget',
  components: {
    BaseWidget: lazyComponent(Components.BaseWidget),
    LinksDropdown: lazyComponent(Components.LinksDropdown),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    SelectToken: lazyComponent(Components.SelectToken),
    TokenLogo: components.TokenLogo,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
    FormattedAddress: components.FormattedAddress,
    HistoryPagination: components.HistoryPagination,
  },
});

const props = withDefaults(
  defineProps<{
    predefinedToken?: Nullable<Asset>;
  }>(),
  {
    predefinedToken: null,
  }
);

const predefinedToken = computed<Nullable<Asset>>(() => props.predefinedToken);
const { t, tc } = useTranslation();
const soraNetwork = computed(() => store.state?.wallet?.settings?.soraNetwork as Nullable<WALLET_CONSTS.SoraNetwork>);
const assetsDataTable = computed(
  () =>
    (store.getters?.wallet?.account?.assetsDataTable as WALLET_TYPES.AssetsTable) ?? ({} as WALLET_TYPES.AssetsTable)
);
const FontSizeRate = WALLET_CONSTS.FontSizeRate;
const operations = [Operation.Swap];
const fromTimestamp = dayjs().subtract(1, 'week').startOf('day').unix();

let indexerLoadingRef: Nullable<Ref<boolean>> = null;
let parseHistoryWarningShown = false;

const {
  selectedToken,
  areActionsDisabled,
  selectTokenIcon,
  tokenTabIndex,
  showSelectTokenDialog,
  handleSelectToken,
  changeToken,
} = useWidgetTokenSelect({
  predefinedToken,
  loading: () => indexerLoadingRef?.value ?? false,
});

const createFilter = (timestamp?: number) => {
  const indexer = getCurrentIndexer();
  const assetAddress = selectedToken.value?.address;

  return indexer.historyElementsFilter({
    operations,
    assetAddress,
    timestamp,
  });
};

const requestHistoryData = async (variables: FetchVariables): Promise<{ items: HistoryItem[]; totalCount: number }> => {
  const indexer = getCurrentIndexer();
  const response = await indexer.services.explorer.account.getHistory(variables);

  if (!response)
    return {
      items: [],
      totalCount: 0,
    };

  const { nodes, totalCount } = response;
  const parsedItems: HistoryItem[] = [];

  for (const node of nodes) {
    let historyItem: Nullable<HistoryItem> = null;

    try {
      historyItem = await indexer.services.dataParser.parseTransactionAsHistoryItem(node);
    } catch (error) {
      if (!parseHistoryWarningShown) {
        parseHistoryWarningShown = true;
        console.warn('[swap-transactions] failed to parse one or more history items', error);
      }
      continue;
    }

    if (historyItem) {
      parsedItems.push(historyItem);
    }
  }

  return { items: parsedItems, totalCount };
};

const { loading, pageAmount, currentPage, total, lastPage, visibleItems, handlePaginationClick, checkTriggerUpdate } =
  useIndexerDataFetch<HistoryItem>({
    fetchAmount: 100,
    pageAmount: 5,
    requestData: requestHistoryData,
    getItemTimestamp: (item) => item?.startTime ?? 0,
    buildDataVariables: ({ fetchAmount, fetchPage }) => ({
      filter: createFilter(fromTimestamp),
      first: fetchAmount,
      offset: fetchAmount * (fetchPage - 1),
    }),
    buildUpdateVariables: ({ intervalTimestamp }) => ({
      filter: createFilter(intervalTimestamp),
    }),
  });

indexerLoadingRef = loading;

const tableItems = computed<TableItem[]>(() =>
  visibleItems.value.map((item) => {
    const txId = item.id ?? '';
    const blockId = item.blockId ?? '';
    const address = item.from ?? '';
    const inputAsset = item.assetAddress ? assetsDataTable.value[item.assetAddress] : null;
    const inputAssetSymbol = inputAsset?.symbol || item.symbol || '??';
    const outputAsset = item.asset2Address ? assetsDataTable.value[item.asset2Address] : null;
    const outputAssetSymbol = outputAsset?.symbol || item.symbol2 || '??';
    const inputAmount = showMostFittingValue(new FPNumber(item.amount ?? 0));
    const inputAmountUSD = new FPNumber(item.payload.amountUSD ?? 0).toLocaleString();
    const outputAmount = showMostFittingValue(new FPNumber(item.amount2 ?? 0));
    const outputAmountUSD = new FPNumber(item.payload.amount2USD ?? 0).toLocaleString();
    const date = dayjs(item.startTime);
    const links = soraExplorerLinks(soraNetwork.value, txId, blockId);

    return {
      address,
      inputAsset,
      inputAssetSymbol,
      outputAsset,
      outputAssetSymbol,
      inputAmount,
      inputAmountUSD,
      outputAmount,
      outputAmountUSD,
      datetime: { date: date.format('M/DD'), time: date.format('HH:mm:ss') },
      links,
    };
  })
);

const { tableRef } = useScrollableTable({ tableItems });

const assetsAddresses = computed(() => {
  const token = selectedToken.value;
  return token ? [token.address] : [];
});

watch(
  assetsAddresses,
  (current, previous) => {
    checkTriggerUpdate(current, previous);
  },
  { immediate: true }
);
</script>

<style lang="scss">
@include explore-table;

.swap-transactions-widget {
  .tx-amount.formatted-amount__container {
    text-align: inherit;
    & > * {
      width: 100%;
      text-align: inherit;
    }
  }
}
</style>

<style lang="scss" scoped>
.swap-transactions-widget {
  .explore-table-pagination {
    padding: 0 $inner-spacing-mini $inner-spacing-medium;
  }
}
</style>
