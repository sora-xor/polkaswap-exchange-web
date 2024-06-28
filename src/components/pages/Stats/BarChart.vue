<template>
  <base-widget :title="title" :tooltip="tooltip">
    <template #filters>
      <stats-filter :filters="filters" :value="filter" @input="changeFilter" />
    </template>

    <chart-skeleton
      :loading="parentLoading || loading"
      :is-empty="data.length === 0"
      :is-error="isFetchingError"
      @retry="updateData"
    >
      <formatted-amount class="chart-price" :value="amount.amount">
        <template #prefix>{{ symbol }}</template>
        {{ amount.suffix }}
      </formatted-amount>
      <price-change :value="priceChange" />
      <v-chart ref="chart" class="chart" :key="chartKey" :option="chartSpec" autoresize />
    </chart-skeleton>
  </base-widget>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/math';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { components, mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import first from 'lodash/fp/first';
import last from 'lodash/fp/last';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import ChartSpecMixin from '@/components/mixins/ChartSpecMixin';
import { Components } from '@/consts';
import { SECONDS_IN_TYPE, NETWORK_STATS_FILTERS } from '@/consts/snapshots';
import { fetchData } from '@/indexer/queries/networkVolume';
import { lazyComponent } from '@/router';
import { getter } from '@/store/decorators';
import type { SnapshotFilter } from '@/types/filters';
import type { AmountWithSuffix } from '@/types/formats';
import { calcPriceChange, formatAmountWithSuffix, formatDecimalPlaces } from '@/utils';

type ChartData = {
  timestamp: number;
  value: FPNumber;
};

const getTotalValue = (data: readonly ChartData[]): FPNumber => {
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

@Component({
  components: {
    BaseWidget: lazyComponent(Components.BaseWidget),
    ChartSkeleton: lazyComponent(Components.ChartSkeleton),
    PriceChange: lazyComponent(Components.PriceChange),
    StatsFilter: lazyComponent(Components.StatsFilter),
    FormattedAmount: components.FormattedAmount,
    TokenLogo: components.TokenLogo,
  },
})
export default class StatsBarChart extends Mixins(mixins.LoadingMixin, ChartSpecMixin) {
  @getter.wallet.settings.exchangeRate private exchangeRate!: number;
  @getter.wallet.settings.currencySymbol private currencySymbol!: string;

  @Prop({ default: false, type: Boolean }) readonly fees!: boolean;

  readonly FontSizeRate = WALLET_CONSTS.FontSizeRate;
  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;
  readonly filters = NETWORK_STATS_FILTERS;
  readonly XOR = XOR;

  filter: SnapshotFilter = NETWORK_STATS_FILTERS[0];

  data: readonly ChartData[] = [];
  prevData: readonly ChartData[] = [];

  isFetchingError = false;

  created(): void {
    this.updateData();
  }

  get chartKey(): string | undefined {
    if (this.fees) return undefined;
    return `bar-chart-${this.currencySymbol}-rate-${this.exchangeRate}`;
  }

  get symbol(): string {
    return this.fees ? XOR.symbol : this.currencySymbol;
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
    if (this.fees) return formatAmountWithSuffix(this.total); // fees are always in XOR

    return formatAmountWithSuffix(this.total.mul(this.exchangeRate)); // amount is in currency
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
      grid: this.gridSpec({
        top: 20,
        left: 45,
      }),
      xAxis: this.xAxisSpec(),
      yAxis: this.yAxisSpec({
        axisLabel: {
          formatter: (value) => {
            const val = new FPNumber(value).mul(this.exchangeRate);
            const { amount, suffix } = formatAmountWithSuffix(val);
            return `${amount} ${suffix}`;
          },
        },
      }),
      tooltip: this.tooltipSpec({
        formatter: (params) => {
          const { data } = params[0];
          const [, value] = data; // [timestamp, value]

          if (this.fees) {
            return `${formatDecimalPlaces(value)} ${XOR.symbol}`; // fees are always in XOR
          }
          const currencyAmount = new FPNumber(value).mul(this.exchangeRate);
          return `${this.currencySymbol} ${formatDecimalPlaces(currencyAmount)}`; // amount is in currency
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

  async updateData(): Promise<void> {
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
            fetchData(fees, now, aTime, type),
            fetchData(fees, aTime, bTime, type),
          ]);

          this.data = Object.freeze(this.normalizeData(curr, seconds * 1000, now * 1000, aTime * 1000));
          this.prevData = Object.freeze(prev);

          this.isFetchingError = false;
        } catch (error) {
          console.error(error);
          this.isFetchingError = true;
        }
      });
    });
  }
}
</script>
