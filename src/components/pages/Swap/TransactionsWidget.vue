<template>
  <base-widget title="All trades" tooltip="Some text">
    <s-table
      ref="table"
      v-loading="loadingState"
      :data="tableItems"
      :highlight-current-row="false"
      size="small"
      class="explore-table"
    >
      <s-table-column width="88">
        <template #header>
          <span>Time</span>
        </template>
        <template v-slot="{ row }">
          <div>
            <div>{{ row.datetime.date }}</div>
            <div>{{ row.datetime.time }}</div>
          </div>
        </template>
      </s-table-column>
      <s-table-column width="112">
        <template #header>
          <span>Account</span>
        </template>
        <template v-slot="{ row }">
          <formatted-address :value="row.address" :symbols="10" />
        </template>
      </s-table-column>
      <s-table-column width="112">
        <template #header>
          <span>Tx ID</span>
        </template>
        <template v-slot="{ row }">
          <formatted-address :value="row.id" :symbols="10" :tooltip-text="t('transaction.txId')" />
        </template>
      </s-table-column>
      <s-table-column width="120" header-align="right" align="right">
        <template #header>
          <span>Sold Token</span>
        </template>
        <template v-slot="{ row }">
          <div class="explore-table-cell">
            <token-logo
              size="small"
              class="explore-table-item-logo explore-table-item-logo--plain"
              :token="row.inputAsset"
            />
            <span>{{ row.inputAssetSymbol }}</span>
          </div>
        </template>
      </s-table-column>
      <s-table-column width="120" header-align="right" align="right">
        <template #header>
          <span>Bought Token</span>
        </template>
        <template v-slot="{ row }">
          <div class="explore-table-cell">
            <token-logo
              size="small"
              class="explore-table-item-logo explore-table-item-logo--plain"
              :token="row.outputAsset"
            />
            <span>{{ row.outputAssetSymbol }}</span>
          </div>
        </template>
      </s-table-column>
      <s-table-column width="120" header-align="right" align="right">
        <template #header>
          <span>Sold AMount</span>
        </template>
        <template v-slot="{ row }">
          <formatted-amount value-can-be-hidden :font-size-rate="FontSizeRate.SMALL" :value="row.inputAmount" />
        </template>
      </s-table-column>
      <s-table-column width="120" header-align="right" align="right">
        <template #header>
          <span>Bought Amount</span>
        </template>
        <template v-slot="{ row }">
          <formatted-amount value-can-be-hidden :font-size-rate="FontSizeRate.SMALL" :value="row.outputAmount" />
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
import isEqual from 'lodash/fp/isEqual';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import ScrollableTableMixin from '@/components/mixins/ScrollableTableMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { getter } from '@/store/decorators';
import { debouncedInputHandler } from '@/utils';

import type { HistoryItem } from '@sora-substrate/util';
import type { Asset, AccountAsset } from '@sora-substrate/util/build/assets/types';

type TableItem = {
  id: string;
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
};

const UPDATE_INTERVAL = 15_000;

@Component({
  components: {
    BaseWidget: lazyComponent(Components.BaseWidget),
    TokenLogo: components.TokenLogo,
    FormattedAmount: components.FormattedAmount,
    FormattedAddress: components.FormattedAddress,
    HistoryPagination: components.HistoryPagination,
  },
})
export default class SwapTransactionsWidget extends Mixins(ScrollableTableMixin) {
  @getter.swap.tokenFrom tokenFrom!: Nullable<AccountAsset>;
  @getter.swap.tokenTo tokenTo!: Nullable<AccountAsset>;
  @getter.wallet.account.assetsDataTable private assetsDataTable!: WALLET_TYPES.AssetsTable;

  @Watch('assetsAddresses', { immediate: true })
  private resetData(current: string[], prev: string[]): void {
    if (!isEqual(current)(prev)) {
      this.resetPage();
      this.updateTransactions();
    }
  }

  private readonly operations = [Operation.Swap];
  private interval: Nullable<ReturnType<typeof setInterval>> = null;
  private updateTransactions = debouncedInputHandler(this.updateData, 250, { leading: false });

  private timestamp = 0;
  private totalCount = 0;
  private transactions: HistoryItem[] = [];

  get loadingState(): boolean {
    return this.parentLoading || this.loading;
  }

  // override ScrollableTableMixin
  get total(): number {
    return this.totalCount;
  }

  // override ScrollableTableMixin
  get tableItems(): TableItem[] {
    return this.transactions.map((item) => {
      const id = item.id ?? '';
      const address = item.from ?? '';
      const inputAsset = item.assetAddress ? this.assetsDataTable[item.assetAddress] : null;
      const inputAssetSymbol = inputAsset?.symbol ?? '??';
      const outputAsset = item.asset2Address ? this.assetsDataTable[item.asset2Address] : null;
      const outputAssetSymbol = outputAsset?.symbol ?? '??';
      const inputAmount = new FPNumber(item.amount ?? 0).toLocaleString();
      const outputAmount = new FPNumber(item.amount2 ?? 0).toLocaleString();
      const date = dayjs(item.startTime);

      return {
        id,
        address,
        inputAsset,
        inputAssetSymbol,
        outputAsset,
        outputAssetSymbol,
        inputAmount,
        outputAmount,
        datetime: { date: date.format('M/DD'), time: date.format('HH:mm:ss') },
      };
    });
  }

  get assetsAddresses(): string[] {
    const filtered = [this.tokenFrom, this.tokenTo].filter((token) => !!token) as AccountAsset[];

    return filtered.map((token) => token.address).sort();
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

  async onPaginationClick(button: WALLET_CONSTS.PaginationButton): Promise<void> {
    this.handlePaginationClick(button);
    this.updateTransactions();
  }

  private async updateData(): Promise<void> {
    this.resetDataSubscription();

    await this.fetchData();

    if (this.currentPage === 1) {
      this.updateTimestamp();
      this.subscribeOnData();
    }
  }

  private async fetchData(): Promise<void> {
    const { pageAmount, currentPage } = this;

    const variables = {
      filter: this.createFilter(),
      first: pageAmount,
      offset: pageAmount * (currentPage - 1),
    };

    await this.withLoading(async () => {
      await this.withParentLoading(async () => {
        const { totalCount, transactions } = await this.requestData(variables);

        this.totalCount = totalCount;
        this.transactions = transactions;
      });
    });
  }

  private async fetchDataUpdates(): Promise<void> {
    const variables = { filter: this.createFilter(this.timestamp) };
    const { transactions, totalCount } = await this.requestData(variables);

    this.transactions = [...transactions, ...this.transactions];
    this.totalCount = this.totalCount + totalCount;
    this.updateTimestamp();
  }

  private async requestData(variables): Promise<{ transactions: HistoryItem[]; totalCount: number }> {
    const indexer = getCurrentIndexer();
    const response = await indexer.services.explorer.account.getHistory(variables);

    if (!response)
      return {
        transactions: [],
        totalCount: 0,
      };

    const { nodes, totalCount } = response;

    const transactions: HistoryItem[] = [];

    for (const node of nodes) {
      const historyItem = await indexer.services.dataParser.parseTransactionAsHistoryItem(node);

      if (historyItem) {
        transactions.push(historyItem);
      }
    }

    return { transactions, totalCount };
  }

  private updateTimestamp(): void {
    this.timestamp = Math.floor((this.transactions[0]?.startTime ?? 0) / 1000);
  }

  private subscribeOnData(): void {
    this.resetDataSubscription();
    this.interval = setInterval(() => this.fetchDataUpdates(), UPDATE_INTERVAL);
  }

  private resetDataSubscription(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.interval = null;
  }

  beforeDestroy(): void {
    this.resetDataSubscription();
  }
}
</script>

<style lang="scss">
@include explore-table;
</style>
