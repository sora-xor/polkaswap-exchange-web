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
          {{ row.address }}
        </template>
      </s-table-column>
    </s-table>

    <history-pagination
      v-if="hasVisibleTransactions && total > pageAmount"
      :current-page="currentPage"
      :page-amount="pageAmount"
      :total="total"
      :loading="loadingState"
      :last-page="lastPage"
      @pagination-click="handlePaginationClick"
    />
  </base-widget>
</template>

<script lang="ts">
import { FPNumber, Operation } from '@sora-substrate/util';
import { getCurrentIndexer, components, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import dayjs from 'dayjs';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import ScrollableTableMixin from '@/components/mixins/ScrollableTableMixin';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { getter } from '@/store/decorators';

import type { HistoryItem } from '@sora-substrate/util';
import type { AccountAsset, RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { PageInfo } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

@Component({
  components: {
    BaseWidget: lazyComponent(Components.BaseWidget),
    HistoryPagination: components.HistoryPagination,
  },
})
export default class SwapTransactionsWidget extends Mixins(ScrollableTableMixin) {
  @getter.swap.tokenFrom tokenFrom!: Nullable<AccountAsset>;
  @getter.swap.tokenTo tokenTo!: Nullable<AccountAsset>;
  @getter.assets.assetDataByAddress public getAsset!: (addr?: string) => Nullable<RegisteredAccountAsset>;

  @Watch('assetsAddresses', { immediate: true })
  private async updateData() {
    this.resetPage();
    await this.fetchData();
  }

  private operationNames = [Operation.Swap, Operation.SwapAndSend];
  private pageInfo: Partial<PageInfo> = {};
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
  get tableItems() {
    return this.transactions.map((item) => {
      const id = item.id;
      const address = item.from;
      const inputAsset = this.getAsset(item.assetAddress);
      const outputAsset = this.getAsset(item.asset2Address);
      const inputAmount = new FPNumber(item.amount ?? 0).toLocaleString();
      const outputAmount = new FPNumber(item.amount2 ?? 0).toLocaleString();
      const date = dayjs(item.startTime);

      return {
        id,
        address,
        inputAsset,
        outputAsset,
        inputAmount,
        outputAmount,
        datetime: { date: date.format('M/DD'), time: date.format('HH:mm:ss') },
      };
    });
  }

  get hasVisibleTransactions(): boolean {
    return !!this.transactions.length;
  }

  get hasVisiblePagination(): boolean {
    return this.hasVisibleTransactions && this.total > this.pageAmount;
  }

  get assetsAddresses(): string[] {
    const filtered = [this.tokenFrom, this.tokenTo].filter((token) => !!token) as AccountAsset[];

    return filtered.map((token) => token.address);
  }

  async onPaginationClick(button: WALLET_CONSTS.PaginationButton): Promise<void> {
    this.handlePaginationClick(button);
    await this.fetchData();
  }

  async fetchData() {
    const indexer = getCurrentIndexer();
    const { assetsAddresses, operationNames, pageAmount, currentPage: page } = this;
    const filter = indexer.historyElementsFilter({
      query: { operationNames, assetsAddresses },
    });

    const variables = {
      filter,
      first: pageAmount,
      offset: pageAmount * (page - 1),
    };

    await this.withLoading(async () => {
      const response = await indexer.services.explorer.account.getHistoryPaged(variables);

      if (!response) return;

      const { edges, totalCount, pageInfo: pageInfoUpdated } = response;

      const transactions = [];

      for (const edge of edges) {
        const historyItem = await indexer.services.dataParser.parseTransactionAsHistoryItem(edge.node);

        if (historyItem) {
          transactions.push(historyItem);
        }
      }

      this.totalCount = totalCount;
      this.pageInfo = pageInfoUpdated;
      this.transactions = transactions;
    });
  }
}
</script>

<style lang="scss">
@include explore-table;
</style>
