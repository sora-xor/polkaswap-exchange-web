<template>
  <stats-card>
    <template #title>
      <span>{{ title }}</span>
      <s-tooltip border-radius="mini" :content="tooltip">
        <s-icon name="info-16" size="14px" />
      </s-tooltip>
    </template>

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
        <template v-if="!fees" #prefix>$</template>
        {{ amount.suffix }}
        <template v-if="fees">&nbsp;{{ XOR.symbol }}</template>
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
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { FPNumber } from '@sora-substrate/math';
import type {
  SnapshotTypes,
  EntitiesQueryResponse,
  NetworkSnapshotEntity,
} from '@soramitsu/soraneo-wallet-web/lib/services/subquery/types';

import ChartSpecMixin from '@/components/mixins/ChartSpecMixin';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { SECONDS_IN_TYPE, NETWORK_STATS_FILTERS } from '@/consts/snapshots';
import { calcPriceChange, formatAmountWithSuffix, formatDecimalPlaces } from '@/utils';

import type { SnapshotFilter } from '@/types/filters';
import type { AmountWithSuffix } from '@/types/formats';

type ChartData = {
  timestamp: number;
  value: FPNumber;
};

const NetworkVolumeQuery = gql<EntitiesQueryResponse<NetworkSnapshotEntity>>`
  query NetworkVolumeQuery($after: Cursor, $fees: Boolean!, $type: SnapshotType, $from: Int, $to: Int) {
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
        volumeUSD @skip(if: $fees)
        fees @include(if: $fees)
      }
    }
  }
`;

const getTotalValue = (data: ChartData[]): FPNumber => {
  return data.reduce((acc, item) => acc.add(item.value), FPNumber.ZERO);
};

const iterate = (prevTimestamp: number, currentTimestamp: number, difference: number): ChartData[] => {
  const buffer: ChartData[] = [];

  while ((currentTimestamp += difference) < prevTimestamp) {
    buffer.push({
      timestamp: currentTimestamp,
      value: FPNumber.ZERO,
    });
  }

  return buffer.reverse();
};

const normalizeTo = (sample: ChartData[], difference: number, from: number, to: number): void => {
  const prevTimestamp = last(sample)?.timestamp ?? from;
  const buffer = iterate(prevTimestamp, to, difference);

  sample.push(...buffer);
};

const parse =
  (fees: boolean) =>
  (node: NetworkSnapshotEntity): ChartData => {
    const value = fees ? FPNumber.fromCodecValue(node.fees) : new FPNumber(node.volumeUSD);

    return {
      timestamp: +node.timestamp * 1000,
      value: value.isFinity() ? value : FPNumber.ZERO,
    };
  };

@Component({
  components: {
    ChartSkeleton: lazyComponent(Components.ChartSkeleton),
    PriceChange: lazyComponent(Components.PriceChange),
    StatsCard: lazyComponent(Components.StatsCard),
    StatsFilter: lazyComponent(Components.StatsFilter),
    FormattedAmount: components.FormattedAmount,
    TokenLogo: components.TokenLogo,
  },
})
export default class StatsBarChart extends Mixins(mixins.LoadingMixin, ChartSpecMixin) {
  @Prop({ default: false, type: Boolean }) readonly fees!: boolean;

  readonly FontSizeRate = WALLET_CONSTS.FontSizeRate;
  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;
  readonly filters = NETWORK_STATS_FILTERS;
  readonly XOR = XOR;

  filter: SnapshotFilter = NETWORK_STATS_FILTERS[0];

  data: ChartData[] = [];
  prevData: ChartData[] = [];

  isFetchingError = false;

  created(): void {
    this.updateData();
  }

  get title(): string {
    return this.fees ? 'Fees' : 'Volume';
  }

  get tooltip(): string {
    return this.t(this.fees ? 'tooltips.fees' : 'tooltips.volume');
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
      grid: this.gridSpec(),
      xAxis: this.xAxisSpec(),
      yAxis: {
        show: false,
      },
      tooltip: this.tooltipSpec({
        formatter: (params) => {
          const { data } = params[0];
          const [timestamp, value] = data;
          const amount = formatDecimalPlaces(value);

          return this.fees ? `${amount} ${XOR.symbol}` : `$ ${amount}`;
        },
      }),
      series: [
        this.barSeriesSpec({
          itemStyle: {
            color: '#C86FFF', // new purple color
          },
        }),
      ],
    };
  }

  changeFilter(filter: SnapshotFilter): void {
    this.filter = filter;
    this.updateData();
  }

  private normalizeData(collection: ChartData[], difference: number, from: number, to: number) {
    const sample: ChartData[] = [];

    for (const item of collection) {
      normalizeTo(sample, difference, from, item.timestamp);
      sample.push(item);
    }

    normalizeTo(sample, difference, from, to);

    return sample;
  }

  private async updateData(): Promise<void> {
    await this.withLoading(async () => {
      await this.withParentLoading(async () => {
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
    });
  }

  private async fetchData(fees: boolean, from: number, to: number, type: SnapshotTypes): Promise<ChartData[]> {
    const data = await SubqueryExplorerService.fetchAllEntities(
      NetworkVolumeQuery,
      { fees, from, to, type },
      parse(fees)
    );

    return data ?? [];
  }
}
</script>
