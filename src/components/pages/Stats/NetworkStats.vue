<template>
  <stats-card>
    <template #title>Network statistics</template>

    <template #filters>
      <stats-filter :disabled="loading" :filters="filters" :value="filter" @input="changeFilter" />
    </template>

    <div class="stats-row">
      <div v-for="{ title, value, change } in columns" :key="title" class="stats-column" v-loading="loading">
        <s-card size="small" border-radius="mini">
          <div slot="header" class="stats-card-title">{{ title }}</div>
          <div class="stats-card-data">
            <formatted-amount
              class="stats-card-value"
              :font-weight-rate="FontWeightRate.MEDIUM"
              :font-size-rate="FontSizeRate.MEDIUM"
              :value="value.amount"
              :asset-symbol="value.suffix"
              symbol-as-decimal
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
import { FPNumber } from '@sora-substrate/math';
import { Component, Mixins } from 'vue-property-decorator';
import { components, mixins, SubqueryExplorerService, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import type { SnapshotTypes } from '@soramitsu/soraneo-wallet-web/lib/services/subquery/types';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { SECONDS_IN_TYPE, NETWORK_STATS_FILTERS } from '@/consts/snapshots';
import { calcPriceChange, formatAmountWithSuffix } from '@/utils';

import type { AmountWithSuffix } from '@/types/formats';
import type { SnapshotFilter } from '@/types/filters';

type NetworkSnapshot = {
  accounts: FPNumber;
  transactions: FPNumber;
  bridgeIncomingTransactions: FPNumber;
  bridgeOutgoingTransactions: FPNumber;
};

type NetworkStatsColumn = {
  value: AmountWithSuffix;
  change: FPNumber;
  title: string;
};

const StatsQuery = gql`
  query StatsQuery($type: SnapshotType, $from: Int, $to: Int) {
    networkSnapshots(
      orderBy: TIMESTAMP_DESC
      filter: {
        and: [
          { type: { equalTo: $type } }
          { timestamp: { lessThanOrEqualTo: $from } }
          { timestamp: { greaterThanOrEqualTo: $to } }
        ]
      }
    ) {
      nodes {
        timestamp
        accounts
        transactions
        bridgeIncomingTransactions
        bridgeOutgoingTransactions
      }
    }
  }
`;

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

  currData: Nullable<NetworkSnapshot> = null;
  prevData: Nullable<NetworkSnapshot> = null;

  created(): void {
    this.updateData();
  }

  get columns(): NetworkStatsColumn[] {
    const { currData: curr, prevData: prev } = this;

    return COLUMNS.map(({ prop, title }) => {
      const propCurr = curr?.[prop] ?? FPNumber.ZERO;
      const propPrev = prev?.[prop] ?? FPNumber.ZERO;
      const propChange = calcPriceChange(propCurr, propPrev);
      const value = formatAmountWithSuffix(propCurr);

      return { title, value, change: propChange };
    });
  }

  changeFilter(filter: SnapshotFilter): void {
    this.filter = filter;
    this.updateData();
  }

  private groupData(data: NetworkSnapshot[]): Nullable<NetworkSnapshot> {
    return data.reduce<Nullable<NetworkSnapshot>>((buffer, item) => {
      if (!buffer) return item;

      for (const { prop } of COLUMNS) {
        (buffer[prop] as FPNumber) = (buffer[prop] as FPNumber).add(item[prop]);
      }

      return buffer;
    }, null);
  }

  private async updateData(): Promise<void> {
    await this.withLoading(async () => {
      await this.withParentLoading(async () => {
        const { type, count } = this.filter;
        const seconds = SECONDS_IN_TYPE[type];
        const now = Math.floor(Date.now() / (seconds * 1000)) * seconds; // rounded to latest snapshot type
        const aTime = now - seconds * count;
        const bTime = aTime - seconds * count;

        const [curr, prev] = await Promise.all([this.fetchData(now, aTime, type), this.fetchData(aTime, bTime, type)]);

        this.currData = this.groupData(curr);
        this.prevData = this.groupData(prev);
      });
    });
  }

  private async fetchData(from: number, to: number, type: SnapshotTypes): Promise<NetworkSnapshot[]> {
    try {
      const response = await SubqueryExplorerService.request(StatsQuery, { from, to, type });

      if (!response || !response.networkSnapshots) return [];

      const data = response.networkSnapshots.nodes.map((node) => {
        return {
          timestamp: +node.timestamp * 1000,
          accounts: new FPNumber(node.accounts),
          transactions: new FPNumber(node.transactions),
          bridgeIncomingTransactions: new FPNumber(node.bridgeIncomingTransactions),
          bridgeOutgoingTransactions: new FPNumber(node.bridgeOutgoingTransactions),
        };
      });

      return data;
    } catch (error) {
      console.error(error);
      return [];
    }
  }
}
</script>

<style lang="scss">
.stats-column .el-loading-mask {
  border-radius: var(--s-border-radius-mini);
}
</style>

<style lang="scss" scoped>
$gap: $inner-spacing-mini;

.stats-row {
  display: flex;
  flex-flow: row wrap;
  gap: $gap;
  margin-top: $inner-spacing-mini * 2.5;

  .stats-column {
    @include columns(2, $gap);

    @include desktop {
      @include columns(4, $gap);
    }
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
  }
}
</style>
