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
      :y-label="false"
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
import first from 'lodash/fp/first';
import last from 'lodash/fp/last';
import { gql } from '@urql/core';
import { Component, Mixins } from 'vue-property-decorator';
import { components, mixins, SubqueryExplorerService, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/math';
import { XOR, VAL, PSWAP, XSTUSD, XST, TBCD } from '@sora-substrate/util/build/assets/consts';
import type { Asset } from '@sora-substrate/util/build/assets/types';
import type {
  SnapshotTypes,
  EntitiesQueryResponse,
  AssetSnapshotEntity,
} from '@soramitsu/soraneo-wallet-web/lib/services/subquery/types';

import ChartSpecMixin from '@/components/mixins/ChartSpecMixin';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { SECONDS_IN_TYPE, ASSET_SUPPLY_LINE_FILTERS } from '@/consts/snapshots';
import { calcPriceChange, formatAmountWithSuffix, formatDecimalPlaces } from '@/utils';

import type { SnapshotFilter } from '@/types/filters';
import type { AmountWithSuffix } from '@/types/formats';

type ChartData = {
  timestamp: number;
  value: number;
  mint: number;
  burn: number;
};

const AssetSupplyQuery = gql<EntitiesQueryResponse<AssetSnapshotEntity>>`
  query AssetSupplyQuery($after: Cursor, $type: SnapshotType, $id: String, $from: Int, $to: Int) {
    entities: assetSnapshots(
      after: $after
      orderBy: TIMESTAMP_DESC
      filter: {
        and: [
          { type: { equalTo: $type } }
          { assetId: { equalTo: $id } }
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
        supply
        mint
        burn
      }
    }
  }
`;

const toNumber = (value: string): number => {
  const fp = FPNumber.fromCodecValue(value);

  return fp.isFinity() ? fp.toNumber() : 0;
};

const getExtremum = (data, prop: string, min = false) => {
  return data.reduce((acc, item) => Math[min ? 'min' : 'max'](acc, item[prop]), min ? Infinity : 0);
};

const parse = (node: AssetSnapshotEntity): ChartData => {
  return {
    timestamp: +node.timestamp * 1000,
    value: toNumber(node.supply),
    mint: toNumber(node.mint),
    burn: toNumber(node.burn),
  };
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

  data: ChartData[] = [];

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

  get supplyRange(): [number, number] {
    const max = getExtremum(this.data, 'value');
    const min = getExtremum(this.data, 'value', true);
    const diff = (max - min) * 1.05; // boundary

    return [max, min - diff];
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
      }),
      xAxis: this.xAxisSpec(),
      yAxis: [
        {
          type: 'value',
          show: false,
          max: this.supplyRange[0],
          min: this.supplyRange[1],
        },
        {
          type: 'value',
          show: false,
          max: this.mintBurnRange[0],
          min: this.mintBurnRange[1],
        },
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
            color: this.theme.color.status.warning,
          },
          name: 'Supply',
          yAxisIndex: 0,
          areaStyle: undefined,
        }),
        this.lineSeriesSpec({
          encode: { y: 'mint' },
          itemStyle: {
            color: this.theme.color.status.success,
          },
          name: 'Remint',
          yAxisIndex: 1,
          areaStyle: undefined,
        }),
        this.lineSeriesSpec({
          encode: { y: 'burn' },
          itemStyle: {
            color: this.theme.color.status.error,
          },
          name: 'Burn',
          yAxisIndex: 1,
          areaStyle: undefined,
        }),
      ],
      legend: {
        orient: 'horizontal',
        top: 0,
        left: 0,
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
    this.token = token;
    this.updateData();
  }

  private async updateData(): Promise<void> {
    await this.withLoading(async () => {
      await this.withParentLoading(async () => {
        try {
          const id = this.token.address;
          const { type, count } = this.filter;
          const seconds = SECONDS_IN_TYPE[type];
          const now = Math.floor(Date.now() / (seconds * 1000)) * seconds; // rounded to latest snapshot type
          const aTime = now - seconds * count;

          const data = await this.fetchData(id, now, aTime, type);

          this.data = data;

          this.isFetchingError = false;
        } catch (error) {
          console.error(error);
          this.isFetchingError = true;
        }
      });
    });
  }

  private async fetchData(id: string, from: number, to: number, type: SnapshotTypes): Promise<ChartData[]> {
    const data = await SubqueryExplorerService.fetchAllEntities(AssetSupplyQuery, { id, from, to, type }, parse);

    return data ?? [];
  }
}
</script>
