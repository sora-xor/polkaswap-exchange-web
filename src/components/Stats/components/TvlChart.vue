<template>
  <stats-card>
    <template #title>TVL</template>

    <template #filters>
      <stats-filter :filters="filters" :value="filter" @input="changeFilter" />
    </template>

    <v-chart ref="chart" class="chart" :option="chartSpec" autoresize />
  </stats-card>
</template>

<script lang="ts">
import dayjs from 'dayjs';
import { graphic } from 'echarts';
import { gql } from '@urql/core';
import { Component, Mixins } from 'vue-property-decorator';
import { components, mixins, SubqueryExplorerService, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { SECONDS_IN_TYPE, NETWORK_STATS_FILTERS } from '@/consts/snapshots';
import { Timeframes, SnapshotTypes } from '@/types/filters';

import type { SnapshotFilter } from '@/types/filters';

type NetworkTvlSnapshot = {
  timestamp: number;
  value: number;
};

const NetworkTvlQuery = gql`
  query NetworkTvlQuery($type: SnapshotType, $from: Int, $to: Int) {
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
        liquidityUSD
      }
    }
  }
`;

@Component({
  components: {
    PriceChange: lazyComponent(Components.PriceChange),
    StatsCard: lazyComponent(Components.StatsCard),
    StatsFilter: lazyComponent(Components.StatsFilter),
    FormattedAmount: components.FormattedAmount,
  },
})
export default class TvlChart extends Mixins(mixins.LoadingMixin) {
  readonly filters = NETWORK_STATS_FILTERS;

  filter: SnapshotFilter = NETWORK_STATS_FILTERS[0];

  data: NetworkTvlSnapshot[] = [];

  created(): void {
    this.updateData();
  }

  get chartSpec() {
    return {
      grid: {
        top: 20,
        left: 10,
        right: 10,
        bottom: 20,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: this.data.map((item) => item.timestamp),
        axisLabel: {
          formatter(value) {
            return dayjs(+value).format('DD');
          },
        },
        axisPointer: {
          show: true,
          type: 'line',
          animation: false,
          label: {
            show: false,
          },
          lineStyle: {
            color: '#ADB9CE',
            type: 'solid',
          },
        },
        axisTick: {
          show: false,
        },
        axisLine: {
          show: false,
        },
      },
      yAxis: {
        show: false,
        type: 'value',
      },
      series: [
        {
          data: this.data.map((item) => item.value),
          type: 'line',
          showSymbol: false,
          itemStyle: {
            color: '#0263F5',
          },
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
          emphasis: {
            disabled: true,
          },
        },
      ],
    };
  }

  changeFilter(filter: SnapshotFilter): void {
    this.filter = filter;
    this.updateData();
  }

  private async updateData(): Promise<void> {
    await this.withLoading(async () => {
      const { type, count } = this.filter;
      const seconds = SECONDS_IN_TYPE[type];
      const now = Math.floor(Date.now() / (seconds * 1000)) * seconds; // rounded to latest snapshot type
      const to = now - seconds * count;

      this.data = await this.fetchData(now, to, type);
    });
  }

  private async fetchData(from: number, to: number, type: SnapshotTypes): Promise<NetworkTvlSnapshot[]> {
    try {
      const response = await SubqueryExplorerService.request(NetworkTvlQuery, { from, to, type });

      if (!response || !response.networkSnapshots) return [];

      const data = response.networkSnapshots.nodes.map((node) => {
        return {
          timestamp: +node.timestamp * 1000,
          value: +node.liquidityUSD,
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
.chart {
  height: 283px;
}

@include large-desktop {
  .chart {
    height: 323px;
  }
}
</style>
