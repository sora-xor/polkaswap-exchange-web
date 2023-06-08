<template>
  <stats-card>
    <template #title>
      <span>Supply</span>
      <s-tooltip border-radius="mini" :content="t('tooltips.supply')">
        <s-icon name="info-16" size="14px" />
      </s-tooltip>
    </template>

    <template #filters>
      <stats-filter :filters="filters" :value="filter" @input="changeFilter" />
    </template>

    <template #types>
      <token-select-dropdown
        :token="token"
        :tokens="tokens"
        :disabled="parentLoading || loading"
        @select="changeToken"
      />
    </template>

    <chart-skeleton
      :loading="parentLoading || loading"
      :is-empty="data.length === 0"
      :is-error="isFetchingError"
      @retry="updateData"
    >
      <formatted-amount class="chart-price" :value="amount.amount">
        {{ amount.suffix }}
      </formatted-amount>
      <price-change :value="priceChange" />
      <v-chart ref="chart" class="chart" :option="chartSpec" autoresize />
    </chart-skeleton>
  </stats-card>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/math';
import { XOR, VAL, PSWAP, XSTUSD, XST, TBCD } from '@sora-substrate/util/build/assets/consts';
import { components, mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import first from 'lodash/fp/first';
import last from 'lodash/fp/last';
import { Component, Mixins } from 'vue-property-decorator';

import ChartSpecMixin from '@/components/mixins/ChartSpecMixin';
import { Components } from '@/consts';
import { SECONDS_IN_TYPE, ASSET_SUPPLY_LINE_FILTERS } from '@/consts/snapshots';
import { fetchData } from '@/indexer/queries/assetSupply';
import { lazyComponent } from '@/router';
import type { SnapshotFilter } from '@/types/filters';
import type { AmountWithSuffix } from '@/types/formats';
import { calcPriceChange, formatAmountWithSuffix, formatDecimalPlaces } from '@/utils';

import type { Asset } from '@sora-substrate/util/build/assets/types';

type ChartData = {
  timestamp: number;
  value: number;
  mint: number;
  burn: number;
};

const getExtremum = (data: readonly ChartData[], prop: string, min = false) => {
  return data.reduce((acc, item) => Math[min ? 'min' : 'max'](acc, item[prop]), min ? Infinity : 0);
};

@Component({
  components: {
    ChartSkeleton: lazyComponent(Components.ChartSkeleton),
    PriceChange: lazyComponent(Components.PriceChange),
    StatsCard: lazyComponent(Components.StatsCard),
    StatsFilter: lazyComponent(Components.StatsFilter),
    TokenSelectDropdown: lazyComponent(Components.TokenSelectDropdown),
    FormattedAmount: components.FormattedAmount,
  },
})
export default class StatsSupplyChart extends Mixins(mixins.LoadingMixin, ChartSpecMixin) {
  readonly FontSizeRate = WALLET_CONSTS.FontSizeRate;
  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;
  readonly filters = ASSET_SUPPLY_LINE_FILTERS;
  readonly tokens = [XOR, VAL, PSWAP, XSTUSD, XST, TBCD];

  filter: SnapshotFilter = ASSET_SUPPLY_LINE_FILTERS[0];
  token = XOR;

  data: readonly ChartData[] = [];

  isFetchingError = false;

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

  get mintBurnRange(): [number, number] {
    const max = Math.max(getExtremum(this.data, 'mint'), getExtremum(this.data, 'burn'));
    const min = Math.min(getExtremum(this.data, 'mint', true), getExtremum(this.data, 'burn', true));
    const diff = (max - min) * 1.05; // boundary
    return [max + diff, min];
  }

  created(): void {
    this.updateData();
  }

  get chartSpec() {
    return {
      dataset: {
        source: this.data.map((item) => [item.timestamp, item.value, item.mint, item.burn]),
        dimensions: ['timestamp', 'supply', 'mint', 'burn'],
      },
      grid: this.gridSpec({
        top: 40,
        left: 50,
        right: 50,
      }),
      xAxis: this.xAxisSpec(),
      yAxis: [
        this.yAxisSpec({
          name: 'Remint\nBurn',
          nameGap: 12,
          nameTextStyle: {
            align: 'right',
          },
          type: 'log',
          min: 1,
          axisLabel: {
            formatter: (value) => {
              const val = new FPNumber(value);
              const { amount, suffix } = formatAmountWithSuffix(val);
              return `${amount} ${suffix}`;
            },
          },
          splitLine: false,
        }),
        this.yAxisSpec({
          name: 'Supply',
          nameGap: 22,
          nameTextStyle: {
            align: 'left',
          },
          axisLabel: {
            formatter: (value) => {
              const val = new FPNumber(value);
              const { amount, suffix } = formatAmountWithSuffix(val);
              return `${amount} ${suffix}`;
            },
          },
        }),
      ],
      tooltip: this.tooltipSpec({
        formatter: (params) => {
          return `
              <table>
                ${params
                  .map(
                    (param) => `
                  <tr>
                    <td>${param.marker} ${param.seriesName}</td>
                    <td align="right">${formatDecimalPlaces(param.data[param.seriesIndex + 1])}</td>
                  </tr>
                `
                  )
                  .join('')}
              </table>
            `;
        },
      }),
      series: [
        this.lineSeriesSpec({
          encode: { y: 'value' },
          itemStyle: {
            color: this.theme.color.status.info,
          },
          name: 'Supply',
          yAxisIndex: 1,
          areaStyle: undefined,
        }),
        this.seriesSpec({
          type: 'bar',
          encode: { y: 'mint' },
          itemStyle: {
            color: this.theme.color.status.success,
            opacity: 0.5,
          },
          name: 'Remint',
          yAxisIndex: 0,
          areaStyle: undefined,
        }),
        this.seriesSpec({
          type: 'bar',
          encode: { y: 'burn' },
          itemStyle: {
            color: this.theme.color.status.error,
            opacity: 0.5,
          },
          name: 'Burn',
          yAxisIndex: 0,
          areaStyle: undefined,
        }),
      ],
      legend: {
        orient: 'horizontal',
        top: 0,
        left: 'center',
        icon: 'circle',
        textStyle: {
          color: this.theme.color.base.content.primary,
          fontSize: 12,
          fontWeight: 400,
          lineHeight: 1.5,
        },
        selectedMode: false,
      },
    };
  }

  changeFilter(filter: SnapshotFilter): void {
    this.filter = filter;
    this.updateData();
  }

  changeToken(token: Asset): void {
    if (this.token.address === token.address) return;

    this.token = token;
    this.updateData();
  }

  async updateData(): Promise<void> {
    await this.withLoading(async () => {
      await this.withParentLoading(async () => {
        try {
          const id = this.token.address;
          const { type, count } = this.filter;
          const seconds = SECONDS_IN_TYPE[type];
          const now = Math.floor(Date.now() / (seconds * 1000)) * seconds; // rounded to latest snapshot type
          const aTime = now - seconds * count;

          this.data = Object.freeze(await fetchData(id, now, aTime, type));
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
