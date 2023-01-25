<template>
  <stats-card>
    <template #title>Network statistics</template>

    <template #filters>
      <stats-filter :disabled="loading" :filters="filters" :value="filter" @input="changeFilter" />
    </template>

    <div class="stats-row" v-loading="loading">
      <div v-for="{ title, value, change } in networkStats" :key="title" class="stats-column">
        <s-card size="small" border-radius="mini">
          <div slot="header" class="stats-card-title">{{ title }}</div>
          <div class="stats-card-data">
            <formatted-amount
              class="stats-card-value"
              :font-weight-rate="FontWeightRate.MEDIUM"
              :font-size-rate="FontSizeRate.MEDIUM"
              :value="value"
            />
            <price-change :value="change" />
          </div>
        </s-card>
      </div>
    </div>
  </stats-card>
</template>

<script lang="ts">
import { gql } from '@urql/core';
import first from 'lodash/fp/first';
import last from 'lodash/fp/last';
import { FPNumber } from '@sora-substrate/math';
import { Component, Mixins } from 'vue-property-decorator';
import { components, mixins, SubqueryExplorerService, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { Timeframes, SnapshotTypes } from '@/types/filters';
import { calcPriceChange, formatDecimalPlaces } from '@/utils';

import type { SnapshotFilter } from '@/types/filters';

type NetworkSnapshot = {
  accounts: FPNumber;
  transactions: FPNumber;
  bridgeIncomingTransactions: FPNumber;
  bridgeOutgoingTransactions: FPNumber;
  fees: FPNumber;
};

const StatsQuery = gql`
  query StatsQuery($first: Int, $type: SnapshotType) {
    networkSnapshots(first: $first, orderBy: TIMESTAMP_DESC, filter: { type: { equalTo: $type } }) {
      nodes {
        timestamp
        accounts
        transactions
        bridgeIncomingTransactions
        bridgeOutgoingTransactions
        fees
      }
    }
  }
`;

const NETWORK_STATS_FILTERS = [
  {
    name: Timeframes.DAY,
    label: '1D',
    type: SnapshotTypes.HOUR,
    count: 48,
    group: 24,
  },
  {
    name: Timeframes.WEEK,
    label: '1W',
    type: SnapshotTypes.DAY,
    count: 14,
    group: 7,
  },
  {
    name: Timeframes.MONTH,
    label: '1M',
    type: SnapshotTypes.DAY,
    count: 60,
    group: 30,
  },
  {
    name: Timeframes.QUARTER,
    label: '3M',
    type: SnapshotTypes.MONTH,
    count: 6,
    group: 3,
  },
  {
    name: Timeframes.YEAR,
    label: '1Y',
    type: SnapshotTypes.MONTH,
    count: 24,
    group: 12,
  },
];

const COLUMNS = [
  {
    title: 'Transactions',
    prop: 'transactions',
  },
  {
    title: 'Accounts',
    prop: 'accounts',
  },
  {
    title: 'Fees',
    prop: 'fees',
  },
  {
    title: 'ETH to SORA',
    prop: 'bridgeIncomingTransactions',
  },
  {
    title: 'SORA to ETH',
    prop: 'bridgeOutgoingTransactions',
  },
];

@Component({
  components: {
    PriceChange: lazyComponent(Components.PriceChange),
    StatsCard: lazyComponent(Components.StatsCard),
    StatsFilter: lazyComponent(Components.StatsFilter),
    FormattedAmount: components.FormattedAmount,
  },
})
export default class NetworkStats extends Mixins(mixins.LoadingMixin) {
  readonly FontSizeRate = WALLET_CONSTS.FontSizeRate;
  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;
  readonly filters = NETWORK_STATS_FILTERS;

  filter = NETWORK_STATS_FILTERS[0];
  data: NetworkSnapshot[] = [];

  created(): void {
    this.updateData();
  }

  get grous() {
    const groups: NetworkSnapshot[] = [];
    const { group } = this.filter;

    for (let i = 0; i < this.data.length; i++) {
      const current = this.data[i];

      if (!group || i % group === 0) {
        groups.push(current);
      } else {
        const lastGroup = last(groups);

        if (lastGroup) {
          lastGroup.accounts = lastGroup.accounts.add(current.accounts);
          lastGroup.transactions = lastGroup.transactions.add(current.transactions);
          lastGroup.bridgeIncomingTransactions = lastGroup.bridgeIncomingTransactions.add(
            current.bridgeIncomingTransactions
          );
          lastGroup.bridgeOutgoingTransactions = lastGroup.bridgeOutgoingTransactions.add(
            current.bridgeOutgoingTransactions
          );
          lastGroup.fees = lastGroup.fees.add(current.fees);
        }
      }
    }

    return groups;
  }

  get networkStats() {
    const [curr, prev] = [first(this.grous), last(this.grous)];

    return COLUMNS.map(({ title, prop }) => {
      const propCurr = curr?.[prop] ?? FPNumber.ZERO;
      const propPrev = prev?.[prop] ?? FPNumber.ZERO;
      const propChange = calcPriceChange(propCurr, propPrev);

      return { title, value: formatDecimalPlaces(propCurr), change: propChange };
    });
  }

  changeFilter(filter: SnapshotFilter): void {
    this.filter = filter;
    this.updateData();
  }

  private async updateData(): Promise<void> {
    this.data = [];

    await this.withLoading(async () => {
      this.data = await this.fetchData();
    });
  }

  private async fetchData(): Promise<NetworkSnapshot[]> {
    try {
      const { count: first, type } = this.filter;
      const response = await SubqueryExplorerService.request(StatsQuery, { first, type });

      if (!response || !response.networkSnapshots) return [];

      const data = response.networkSnapshots.nodes.map((node) => {
        return {
          timestamp: +node.timestamp * 1000,
          accounts: new FPNumber(node.accounts),
          transactions: new FPNumber(node.transactions),
          fees: FPNumber.fromCodecValue(node.fees),
          bridgeIncomingTransactions: new FPNumber(node.bridgeIncomingTransactions),
          bridgeOutgoingTransactions: new FPNumber(node.bridgeOutgoingTransactions),
        };
      });

      return data;
    } catch (error) {
      console.log(error);
      return [];
    }
  }
}
</script>

<style lang="scss" scoped>
.stats-row {
  display: flex;
  flex-flow: row wrap;
  gap: $inner-spacing-mini;
  margin-top: $inner-spacing-mini * 2.5;

  .stats-column {
    width: calc(20% - ((#{$inner-spacing-mini} * 4) / 5));
    min-width: 180px;
  }
}

.stats-card {
  &-title {
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-small);
    font-weight: 800;
    text-transform: uppercase;
  }
  &-data {
    display: flex;
    flex-flow: row nowrap;
    justify-content: space-between;
    margin-top: $inner-spacing-small;
  }
  &-value {
    font-size: var(--s-font-size-big);
    font-weight: 800;
  }
}
</style>
