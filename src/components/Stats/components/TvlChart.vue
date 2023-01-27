<template>
  <stats-card>
    <template #title>TVL</template>

    <template #filters>
      <stats-filter :filters="filters" :value="filter" @input="changeFilter" />
    </template>

    <chart-skeleton
      :loading="parentLoading || loading"
      :is-empty="data.length === 0"
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
import dayjs from 'dayjs';
import first from 'lodash/fp/first';
import last from 'lodash/fp/last';
import { graphic } from 'echarts';
import { gql } from '@urql/core';
import { Component, Mixins } from 'vue-property-decorator';
import { components, mixins, SubqueryExplorerService, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/math';

import ThemePaletteMixin from '@/components/mixins/ThemePaletteMixin';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { SECONDS_IN_TYPE, NETWORK_STATS_FILTERS } from '@/consts/snapshots';
import { calcPriceChange, formatAmountWithSuffix } from '@/utils';
import { SnapshotTypes } from '@/types/filters';

import type { SnapshotFilter } from '@/types/filters';
import type { AmountWithSuffix } from '@/types/formats';

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

const AXIS_LABEL_CSS = {
  fontFamily: 'Sora',
  fontSize: 10,
  fontWeight: 300,
  lineHeigth: 1.5,
};

@Component({
  components: {
    ChartSkeleton: lazyComponent(Components.ChartSkeleton),
    PriceChange: lazyComponent(Components.PriceChange),
    StatsCard: lazyComponent(Components.StatsCard),
    StatsFilter: lazyComponent(Components.StatsFilter),
    FormattedAmount: components.FormattedAmount,
  },
})
export default class TvlChart extends Mixins(mixins.LoadingMixin, mixins.TranslationMixin, ThemePaletteMixin) {
  readonly FontSizeRate = WALLET_CONSTS.FontSizeRate;
  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;
  readonly filters = NETWORK_STATS_FILTERS;

  filter: SnapshotFilter = NETWORK_STATS_FILTERS[0];

  data: NetworkTvlSnapshot[] = [];

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
      grid: {
        top: 20,
        left: 0,
        right: 0,
        bottom: 20,
      },
      xAxis: {
        type: 'time',
        axisTick: {
          show: false,
        },
        axisLine: {
          show: false,
        },
        axisLabel: {
          formatter: (value) => {
            const date = dayjs(+value);
            const isNewDay = date.hour() === 0 && date.minute() === 0;
            const isNewMonth = date.date() === 1 && isNewDay;
            // TODO: "LT" formatted labels (hours) sometimes overlaps (AM\PM issue)
            const timeFormat = isNewMonth ? 'MMMM' : isNewDay ? 'D' : 'HH:mm';
            const formatted = this.formatDate(+value, timeFormat);

            if (isNewMonth) {
              return `{monthStyle|${formatted.charAt(0).toUpperCase() + formatted.slice(1)}}`;
            }
            if (isNewDay) {
              return `{dateStyle|${formatted}}`;
            }

            return formatted;
          },
          rich: {
            monthStyle: {
              fontSize: 10,
              fontWeight: 'bold',
            },
            dateStyle: {
              fontSize: 10,
              fontWeight: 'bold',
            },
          },
          color: this.theme.color.base.content.secondary,
          ...AXIS_LABEL_CSS,
        },
        axisPointer: {
          lineStyle: {
            color: this.theme.color.status.success,
          },
        },
        boundaryGap: false,
      },
      yAxis: {
        show: false,
        type: 'value',
      },
      tooltip: {
        show: true,
        trigger: 'axis',
        backgroundColor: this.theme.color.utility.body,
        borderColor: this.theme.color.base.border.secondary,
        extraCssText: `box-shadow: ${this.theme.shadow.dialog}; border-radius: ${this.theme.border.radius.mini}`,
        textStyle: {
          color: this.theme.color.base.content.secondary,
          fontSize: 11,
          fontFamily: 'Sora',
          fontWeight: 400,
        },
      },
      series: [
        {
          type: 'line',
          encode: {
            y: 'value',
          },
          showSymbol: false,
          itemStyle: {
            color: this.theme.color.theme.accent,
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
.chart-price {
  margin-bottom: $inner-spacing-tiny;
  font-weight: 600;
  font-size: var(--s-heading3-font-size);
  line-height: var(--s-line-height-extra-small);
}
</style>
