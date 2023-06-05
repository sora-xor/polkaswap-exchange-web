<template>
  <stats-card>
    <template #title>{{ t('networkStatisticsText') }}</template>

    <template #filters>
      <stats-filter :disabled="loading" :filters="filters" :value="filter" @input="changeFilter" />
    </template>

    <div class="stats-row">
      <div
        v-for="{ title, tooltip, value, change } in statsColumns"
        :key="title"
        class="stats-column"
        v-loading="loading"
      >
        <s-card size="small" border-radius="mini">
          <div slot="header" class="stats-card-title">
            <span>{{ title }}</span>
            <s-tooltip border-radius="mini" :content="tooltip">
              <s-icon name="info-16" size="14px" />
            </s-tooltip>
          </div>
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
import { FPNumber } from '@sora-substrate/math';
import { components, mixins, SubqueryExplorerService, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { gql } from '@urql/core';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components } from '@/consts';
import { SECONDS_IN_TYPE, NETWORK_STATS_FILTERS } from '@/consts/snapshots';
import { lazyComponent } from '@/router';
import type { SnapshotFilter } from '@/types/filters';
import type { AmountWithSuffix } from '@/types/formats';
import { calcPriceChange, formatAmountWithSuffix } from '@/utils';

import type {
  SnapshotTypes,
  EntitiesQueryResponse,
  NetworkSnapshotEntity,
} from '@soramitsu/soraneo-wallet-web/lib/services/subquery/types';

type NetworkSnapshot = {
  accounts: FPNumber;
  transactions: FPNumber;
  bridgeIncomingTransactions: FPNumber;
  bridgeOutgoingTransactions: FPNumber;
};

type NetworkSnapshotData = NetworkSnapshot & {
  timestamp: number;
};

type NetworkStatsColumn = {
  value: AmountWithSuffix;
  change: FPNumber;
  title: string;
  tooltip: string;
};

const StatsQuery = gql<EntitiesQueryResponse<NetworkSnapshotEntity>>`
  query StatsQuery($after: Cursor, $type: SnapshotType, $from: Int, $to: Int) {
    entities: networkSnapshots(
      after: $after
      orderBy: TIMESTAMP_DESC
      filter: {
        and: [
          { type: { equalTo: $type } }
          { timestamp: { lessThanOrEqualTo: $from } }
          { timestamp: { greaterThanOrEqualTo: $to } }
        ]
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
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

const parse = (node: NetworkSnapshotEntity): NetworkSnapshotData => {
  return {
    timestamp: +node.timestamp * 1000,
    accounts: new FPNumber(node.accounts),
    transactions: new FPNumber(node.transactions),
    bridgeIncomingTransactions: new FPNumber(node.bridgeIncomingTransactions),
    bridgeOutgoingTransactions: new FPNumber(node.bridgeOutgoingTransactions),
  };
};

@Component({
  components: {
    PriceChange: lazyComponent(Components.PriceChange),
    StatsCard: lazyComponent(Components.StatsCard),
    StatsFilter: lazyComponent(Components.StatsFilter),
    FormattedAmount: components.FormattedAmount,
  },
})
export default class NetworkStats extends Mixins(mixins.LoadingMixin, TranslationMixin) {
  readonly FontSizeRate = WALLET_CONSTS.FontSizeRate;
  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;
  readonly filters = NETWORK_STATS_FILTERS;

  filter = NETWORK_STATS_FILTERS[0];

  currData: Nullable<NetworkSnapshot> = null;
  prevData: Nullable<NetworkSnapshot> = null;

  created(): void {
    this.updateData();
  }

  get columns() {
    const { Sora, Ethereum } = this.TranslationConsts;
    const Arrow = String.fromCodePoint(0x2192);

    return [
      {
        title: this.tc('transactionText', 2),
        tooltip: this.t('tooltips.transactions'),
        prop: 'transactions',
      },
      {
        title: this.t('newAccountsText'),
        tooltip: this.t('tooltips.accounts'),
        prop: 'accounts',
      },
      {
        title: [Ethereum, Arrow, Sora].join(' '),
        tooltip: this.t('tooltips.bridgeTransactions', { from: Ethereum, to: Sora }),
        prop: 'bridgeIncomingTransactions',
      },
      {
        title: [Sora, Arrow, Ethereum].join(' '),
        tooltip: this.t('tooltips.bridgeTransactions', { from: Sora, to: Ethereum }),
        prop: 'bridgeOutgoingTransactions',
      },
    ];
  }

  get statsColumns(): NetworkStatsColumn[] {
    const { currData: curr, prevData: prev } = this;

    return this.columns.map(({ prop, title, tooltip }) => {
      const propCurr = curr?.[prop] ?? FPNumber.ZERO;
      const propPrev = prev?.[prop] ?? FPNumber.ZERO;
      const propChange = calcPriceChange(propCurr, propPrev);
      const value = formatAmountWithSuffix(propCurr);

      return { title, tooltip, value, change: propChange };
    });
  }

  changeFilter(filter: SnapshotFilter): void {
    this.filter = filter;
    this.updateData();
  }

  private groupData(data: NetworkSnapshotData[]): Nullable<NetworkSnapshot> {
    return data.reduce<Nullable<NetworkSnapshot>>((buffer, item) => {
      if (!buffer) return item;

      for (const { prop } of this.columns) {
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

        this.currData = Object.freeze(this.groupData(curr));
        this.prevData = Object.freeze(this.groupData(prev));
      });
    });
  }

  private async fetchData(from: number, to: number, type: SnapshotTypes): Promise<NetworkSnapshotData[]> {
    const data = await SubqueryExplorerService.fetchAllEntities(StatsQuery, { from, to, type }, parse);

    return data ?? [];
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
    display: flex;
    align-items: center;
    gap: $inner-spacing-mini;

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
