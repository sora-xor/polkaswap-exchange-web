<template>
  <stats-card>
    <template #title>TVL</template>

    <template #filters>
      <stats-filter :filters="filters" :value="filter" @input="changeFilter" />
    </template>

    <chart-skeleton
      :loading="parentLoading || loading"
      :is-empty="data.length === 0"
      :is-error="isFetchingError"
      :y-label="false"
      @retry="updateData"
    >
      <formatted-amount class="chart-price" :value="amount.amount">
        <template #prefix>$</template>
        {{ amount.suffix }}
      </formatted-amount>
      <price-change :value="priceChange" />
      <v-chart ref="chart" class="chart" :option="chartSpec" autoresize />
    </chart-skeleton>
  </stats-card>
</template>

<script lang="ts">
import first from 'lodash/fp/first';
import last from 'lodash/fp/last';
import { graphic } from 'echarts';
import { gql } from '@urql/core';
import { Component, Mixins } from 'vue-property-decorator';
import { components, mixins, SubqueryExplorerService, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SnapshotTypes } from '@soramitsu/soraneo-wallet-web/lib/services/subquery/types';
import { FPNumber } from '@sora-substrate/math';

import ChartSpecMixin from '@/components/mixins/ChartSpecMixin';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { SECONDS_IN_TYPE, NETWORK_STATS_FILTERS } from '@/consts/snapshots';
import { calcPriceChange, formatAmountWithSuffix, formatDecimalPlaces } from '@/utils';

import type { SnapshotFilter } from '@/types/filters';
import type { AmountWithSuffix } from '@/types/formats';

type NetworkTvlSnapshot = {
  timestamp: number;
  value: number;
};

const NetworkTvlQuery = gql`
  query NetworkTvlQuery($after: Cursor, $type: SnapshotType, $from: Int, $to: Int) {
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
        liquidityUSD
      }
    }
  }
`;

@Component({
  components: {
    ChartSkeleton: lazyComponent(Components.ChartSkeleton),
    PriceChange: lazyComponent(Components.PriceChange),
    StatsCard: lazyComponent(Components.StatsCard),
    StatsFilter: lazyComponent(Components.StatsFilter),
    FormattedAmount: components.FormattedAmount,
  },
})
export default class StatsTvlChart extends Mixins(mixins.LoadingMixin, ChartSpecMixin) {
  readonly FontSizeRate = WALLET_CONSTS.FontSizeRate;
  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;
  readonly filters = NETWORK_STATS_FILTERS;

  filter: SnapshotFilter = NETWORK_STATS_FILTERS[0];

  data: NetworkTvlSnapshot[] = [];
  isFetchingError = false;

  created(): void {
    this.updateData();
  }

  get firstValue(): FPNumber {
    return new FPNumber(first(this.data)?.value ?? 0);
  }

  get lastValue(): FPNumber {
    return new FPNumber(last(this.data)?.value ?? 0);
  }

  get amount(): AmountWithSuffix {
    return formatAmountWithSuffix(this.firstValue);
  }

  get priceChange(): FPNumber {
    return calcPriceChange(this.firstValue, this.lastValue);
  }

  get chartSpec() {
    return {
      dataset: {
        source: this.data.map((item) => [item.timestamp, item.value]),
        dimensions: ['timestamp', 'value'],
      },
      grid: this.gridSpec(),
      xAxis: this.xAxisSpec(),
      yAxis: {
        show: false,
        type: 'value',
      },
      tooltip: this.tooltipSpec({
        formatter: (params) => {
          const { data } = params[0];
          const [timestamp, value] = data;
          return `$ ${formatDecimalPlaces(value)}`;
        },
      }),
      series: [
        this.lineSeriesSpec({
          areaStyle: {
            opacity: 0.8,
            color: new graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: 'rgba(248, 8, 123, 0.25)',
              },
              {
                offset: 1,
                color: 'rgba(255, 49, 148, 0.03)',
              },
            ]),
          },
        }),
      ],
    };
  }

  changeFilter(filter: SnapshotFilter): void {
    this.filter = filter;
    this.updateData();
  }

  private async updateData(): Promise<void> {
    await this.withLoading(async () => {
      await this.withParentLoading(async () => {
        try {
          const { type, count } = this.filter;
          const seconds = SECONDS_IN_TYPE[type];
          const now = Math.floor(Date.now() / (seconds * 1000)) * seconds; // rounded to latest snapshot type
          const to = now - seconds * count;

          this.data = await this.fetchData(now, to, type);
          this.isFetchingError = false;
        } catch (error) {
          console.error(error);
          this.isFetchingError = true;
        }
      });
    });
  }

  private async fetchData(from: number, to: number, type: SnapshotTypes): Promise<NetworkTvlSnapshot[]> {
    const buffer: NetworkTvlSnapshot[] = [];

    let hasNextPage = true;
    let after = '';

    do {
      const response = await SubqueryExplorerService.request(NetworkTvlQuery, { after, from, to, type });

      if (!response || !response.entities) return buffer;

      hasNextPage = response.entities.pageInfo.hasNextPage;
      after = response.entities.pageInfo.endCursor;

      response.entities.nodes.forEach((node) => {
        const value = +node.liquidityUSD;

        buffer.push({
          timestamp: +node.timestamp * 1000,
          value: Number.isFinite(value) ? value : 0,
        });
      });
    } while (hasNextPage);

    return buffer;
  }
}
</script>
