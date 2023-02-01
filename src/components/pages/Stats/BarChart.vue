<template>
  <stats-card>
    <template #title>{{ title }}</template>

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
import { gql } from '@urql/core';
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { components, mixins, SubqueryExplorerService, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/math';

import ChartSpecMixin from '@/components/shared/Chart/SpecMixin';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { SECONDS_IN_TYPE, NETWORK_STATS_FILTERS } from '@/consts/snapshots';
import { calcPriceChange, formatAmountWithSuffix } from '@/utils';
import { SnapshotTypes } from '@/types/filters';

import type { SnapshotFilter } from '@/types/filters';
import type { AmountWithSuffix } from '@/types/formats';

type NetworkTvlSnapshot = {
  timestamp: number;
  value: FPNumber;
};

const NetworkVolumeQuery = gql`
  query NetworkVolumeQuery($fees: Boolean!, $type: SnapshotType, $from: Int, $to: Int) {
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
        volumeUSD @skip(if: $fees)
        fees @include(if: $fees)
      }
    }
  }
`;

const AXIS_OFFSET = 8;

const getTotalValue = (data: NetworkTvlSnapshot[]) => {
  return data.reduce((acc, item) => acc.add(item.value), FPNumber.ZERO);
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
export default class StatsBarChart extends Mixins(mixins.LoadingMixin, ChartSpecMixin) {
  @Prop({ default: false, type: Boolean }) readonly fees!: boolean;

  readonly FontSizeRate = WALLET_CONSTS.FontSizeRate;
  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;
  readonly filters = NETWORK_STATS_FILTERS;

  filter: SnapshotFilter = NETWORK_STATS_FILTERS[0];

  data: NetworkTvlSnapshot[] = [];
  prevData: NetworkTvlSnapshot[] = [];

  isFetchingError = false;

  created(): void {
    this.updateData();
  }

  get title(): string {
    return this.fees ? 'Fees' : 'Volume';
  }

  get firstValue(): FPNumber {
    return new FPNumber(first(this.data)?.value ?? 0);
  }

  get lastValue(): FPNumber {
    return new FPNumber(last(this.data)?.value ?? 0);
  }

  get total() {
    return getTotalValue(this.data);
  }

  get amount(): AmountWithSuffix {
    return formatAmountWithSuffix(this.total);
  }

  get priceChange(): FPNumber {
    const prev = getTotalValue(this.prevData);

    return calcPriceChange(this.total, prev);
  }

  get chartSpec() {
    return {
      dataset: {
        source: this.data.map((item) => [item.timestamp, item.value.toNumber()]),
        dimensions: ['timestamp', 'value'],
      },
      grid: {
        top: 20,
        left: 0,
        right: 0,
        bottom: 20 + AXIS_OFFSET,
      },
      xAxis: {
        ...this.xAxisSpec(),
      },
      yAxis: {
        show: false,
      },
      tooltip: {
        ...this.tooltipSpec(),
        formatter: (params) => {
          const { data } = params[0];
          const [timestamp, value] = data;
          return `$ ${new FPNumber(value).toLocaleString()}`;
        },
      },
      series: [this.barSeriesSpec('value')],
    };
  }

  changeFilter(filter: SnapshotFilter): void {
    this.filter = filter;
    this.updateData();
  }

  private normalizeData(collection: NetworkTvlSnapshot[], difference: number, from: number, to: number) {
    const sample: NetworkTvlSnapshot[] = [];

    const iterate = (prevTimestamp: number, currentTimestamp: number, difference: number) => {
      const buffer: NetworkTvlSnapshot[] = [];

      while ((currentTimestamp += difference) < prevTimestamp) {
        buffer.push({
          timestamp: currentTimestamp,
          value: FPNumber.ZERO,
        });
      }

      return buffer.reverse();
    };

    for (const item of collection) {
      const prevTimestamp = last(sample)?.timestamp ?? from;
      const buffer = iterate(prevTimestamp, item.timestamp, difference);

      sample.push(...buffer, item);
    }

    const lastSampleTimestamp = last(sample)?.timestamp ?? from;
    const buffer = iterate(lastSampleTimestamp, to, difference);
    sample.push(...buffer);

    return sample;
  }

  private async updateData(): Promise<void> {
    await this.withApi(async () => {
      try {
        const { fees } = this;
        const { type, count } = this.filter;
        const seconds = SECONDS_IN_TYPE[type];
        const now = Math.floor(Date.now() / (seconds * 1000)) * seconds; // rounded to latest snapshot type
        const aTime = now - seconds * count;
        const bTime = aTime - seconds * count;

        const [curr, prev] = await Promise.all([
          this.fetchData(fees, now, aTime, type),
          this.fetchData(fees, aTime, bTime, type),
        ]);

        this.data = this.normalizeData(curr, seconds * 1000, now * 1000, aTime * 1000);
        this.prevData = prev;

        this.isFetchingError = false;
      } catch (error) {
        console.error(error);
        this.isFetchingError = true;
      }
    });
  }

  private async fetchData(fees: boolean, from: number, to: number, type: SnapshotTypes): Promise<NetworkTvlSnapshot[]> {
    const response = await SubqueryExplorerService.request(NetworkVolumeQuery, { fees, from, to, type });

    if (!response || !response.networkSnapshots) return [];

    const data = response.networkSnapshots.nodes.map((node) => {
      const value = fees ? FPNumber.fromCodecValue(node.fees) : new FPNumber(node.volumeUSD);

      return {
        timestamp: +node.timestamp * 1000,
        value: value.isFinity() ? value : FPNumber.ZERO,
      };
    });

    return data;
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
