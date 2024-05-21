<template>
  <base-widget extensive :title="tc('transactionText', 2)" class="swap-transactions-widget">
    <s-table
      ref="table"
      v-loading="loadingState"
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
      <s-table-column width="106" header-align="right" align="right">
        <template #header>
          <span>{{ t('removeLiquidity.input') }}</span>
        </template>
        <template v-slot="{ row }">
          <formatted-amount
            class="explore-table-item-token"
            :font-size-rate="FontSizeRate.SMALL"
            :value="row.inputAmount"
          />
        </template>
      </s-table-column>
      <s-table-column width="106" header-align="left" align="left">
        <template #header>
          <span>{{ t('removeLiquidity.output') }}</span>
        </template>
        <template v-slot="{ row }">
          <formatted-amount
            class="explore-table-item-token"
            :font-size-rate="FontSizeRate.SMALL"
            :value="row.outputAmount"
          />
        </template>
      </s-table-column>
      <s-table-column width="112" header-align="left" align="left">
        <template #header>
          <span>{{ t('transfers.from') }}</span>
        </template>
        <template v-slot="{ row }">
          <div class="explore-table-cell">
            <token-logo
              size="small"
              class="explore-table-item-logo explore-table-item-logo--plain"
              :token="row.inputAsset"
            />
            <span class="explore-table-item-token">{{ row.inputAssetSymbol }}</span>
          </div>
        </template>
      </s-table-column>
      <s-table-column width="112" header-align="left" align="left">
        <template #header>
          <span>{{ t('transfers.to') }}</span>
        </template>
        <template v-slot="{ row }">
          <div class="explore-table-cell">
            <token-logo
              size="small"
              class="explore-table-item-logo explore-table-item-logo--plain"
              :token="row.outputAsset"
            />
            <span class="explore-table-item-token">{{ row.outputAssetSymbol }}</span>
          </div>
        </template>
      </s-table-column>
      <s-table-column width="94">
        <template #header>
          <span>{{ tc('accountText', 1) }}</span>
        </template>
        <template v-slot="{ row }">
          <formatted-address :value="row.address" :symbols="8" />
        </template>
      </s-table-column>
      <s-table-column width="48" header-align="center">
        <template #header>
          <s-icon name="basic-eye-no-24" size="16px" />
        </template>
        <template v-slot="{ row }">
          <links-dropdown v-if="row.links.length" :links="row.links" />
        </template>
      </s-table-column>
    </s-table>

    <history-pagination
      class="explore-table-pagination"
      :current-page="currentPage"
      :page-amount="pageAmount"
      :total="total"
      :loading="loadingState"
      :last-page="lastPage"
      @pagination-click="onPaginationClick"
    />
  </base-widget>
</template>

<script lang="ts">
import { FPNumber, Operation } from '@sora-substrate/util';
import { getCurrentIndexer, components, WALLET_CONSTS, WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';
import dayjs from 'dayjs';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import IndexerDataFetchMixin from '@/components/mixins/IndexerDataFetchMixin';
import ScrollableTableMixin from '@/components/mixins/ScrollableTableMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';
import { type FetchVariables } from '@/types/indexers';
import { soraExplorerLinks, showMostFittingValue } from '@/utils';

import type { HistoryItem } from '@sora-substrate/util';
import type { Asset, AccountAsset } from '@sora-substrate/util/build/assets/types';

type TableItem = {
  address: string;
  inputAsset: Nullable<Asset>;
  inputAssetSymbol: string;
  outputAsset: Nullable<Asset>;
  outputAssetSymbol: string;
  inputAmount: string;
  outputAmount: string;
  datetime: {
    date: string;
    time: string;
  };
  links: WALLET_CONSTS.ExplorerLink[];
};

@Component({
  components: {
    BaseWidget: lazyComponent(Components.BaseWidget),
    LinksDropdown: lazyComponent(Components.LinksDropdown),
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
    FormattedAddress: components.FormattedAddress,
    HistoryPagination: components.HistoryPagination,
  },
})
export default class SwapTransactionsWidget extends Mixins(ScrollableTableMixin, IndexerDataFetchMixin) {
  @state.wallet.settings.soraNetwork private soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;

  @getter.swap.tokenFrom tokenFrom!: Nullable<AccountAsset>;
  @getter.swap.tokenTo tokenTo!: Nullable<AccountAsset>;
  @getter.wallet.account.assetsDataTable private assetsDataTable!: WALLET_TYPES.AssetsTable;

  @Watch('assetsAddresses', { immediate: true })
  private resetData(curr: string[], prev: string[]): void {
    this.checkTriggerUpdate<string[]>(curr, prev);
  }

  pageAmount = 8; // override PaginationSearchMixin

  private readonly operations = [Operation.Swap];
  private readonly fromTimestamp = dayjs().subtract(1, 'month').startOf('day').unix(); // month ago, start of the day

  // override ScrollableTableMixin
  get tableItems(): TableItem[] {
    return this.items.map((item) => {
      const txId = item.id ?? '';
      const blockId = item.blockId ?? '';
      const address = item.from ?? '';
      const inputAsset = item.assetAddress ? this.assetsDataTable[item.assetAddress] : null;
      const inputAssetSymbol = inputAsset?.symbol ?? '??';
      const outputAsset = item.asset2Address ? this.assetsDataTable[item.asset2Address] : null;
      const outputAssetSymbol = outputAsset?.symbol ?? '??';
      const inputAmount = showMostFittingValue(new FPNumber(item.amount ?? 0));
      const outputAmount = showMostFittingValue(new FPNumber(item.amount2 ?? 0));
      const date = dayjs(item.startTime);
      const links = soraExplorerLinks(this.soraNetwork, txId, blockId);

      return {
        address,
        inputAsset,
        inputAssetSymbol,
        outputAsset,
        outputAssetSymbol,
        inputAmount,
        outputAmount,
        datetime: { date: date.format('M/DD'), time: date.format('HH:mm:ss') },
        links,
      };
    });
  }

  get assetsAddresses(): string[] {
    const filtered = [this.tokenFrom, this.tokenTo].filter((token) => !!token) as AccountAsset[];

    return filtered
      .map((token) => token.address)
      .sort((a, b) => {
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      });
  }

  private createFilter(timestamp?: number) {
    const indexer = getCurrentIndexer();
    const { operations, tokenFrom, tokenTo } = this;
    const assetAddress = tokenFrom?.address;
    const assetsAddresses = tokenTo?.address ? [tokenTo.address] : [];
    const filter = indexer.historyElementsFilter({
      operations,
      assetAddress,
      timestamp,
      query: { assetsAddresses },
    });

    return filter;
  }

  // override IndexerDataFetchMixin
  get dataVariables(): FetchVariables {
    return {
      filter: this.createFilter(this.fromTimestamp),
      first: this.pageAmount,
      offset: this.pageAmount * (this.currentPage - 1),
    };
  }

  // override IndexerDataFetchMixin
  get updateVariables(): FetchVariables {
    return {
      filter: this.createFilter(this.intervalTimestamp),
    };
  }

  // override IndexerDataFetchMixin
  getItemTimestamp(item: Nullable<VaultEvent>): number {
    return item?.startTime ?? 0;
  }

  // override IndexerDataFetchMixin
  async requestData(variables: FetchVariables): Promise<{ items: HistoryItem[]; totalCount: number }> {
    const indexer = getCurrentIndexer();
    const response = await indexer.services.explorer.account.getHistory(variables);

    if (!response)
      return {
        items: [],
        totalCount: 0,
      };

    const { nodes, totalCount } = response;

    const items: HistoryItem[] = [];

    for (const node of nodes) {
      const historyItem = await indexer.services.dataParser.parseTransactionAsHistoryItem(node);

      if (historyItem) {
        items.push(historyItem);
      }
    }

    return { items, totalCount };
  }
}
</script>

<style lang="scss">
@include explore-table;
</style>

<style lang="scss" scoped>
.swap-transactions-widget {
  .explore-table-pagination {
    padding: 0 $inner-spacing-mini $inner-spacing-medium;
  }
}
</style>
