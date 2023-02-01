<template>
  <stats-card>
    <template #title>Token Supply</template>

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
      <!-- <formatted-amount class="chart-price" :value="amount.amount">
        <template v-if="!fees" #prefix>$</template>
        {{ amount.suffix }}
        <template v-if="fees">XOR</template>
      </formatted-amount>
      <price-change :value="priceChange" /> -->
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
import { SECONDS_IN_TYPE, ASSET_SUPPLY_LINE_FILTERS } from '@/consts/snapshots';
import { calcPriceChange, formatAmountWithSuffix } from '@/utils';
import { SnapshotTypes } from '@/types/filters';

import type { SnapshotFilter } from '@/types/filters';
import type { AmountWithSuffix } from '@/types/formats';

type AssetSupplySnapshot = {
  timestamp: number;
  supply: FPNumber;
  mint: FPNumber;
  burn: FPNumber;
};

const AssetSupplyQuery = gql`
  query AssetSupplyQuery($after: Cursor, $type: SnapshotType, $id: String, $from: Int, $to: Int) {
    assetSnapshots(
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

const AXIS_OFFSET = 8;

const toNumber = (value): number => {
  const fp = FPNumber.fromCodecValue(value);

  return fp.isFinity() ? fp.toNumber() : 0;
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
export default class StatsSupplyChart extends Mixins(mixins.LoadingMixin, ChartSpecMixin) {
  readonly FontSizeRate = WALLET_CONSTS.FontSizeRate;
  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;
  readonly filters = ASSET_SUPPLY_LINE_FILTERS;

  filter: SnapshotFilter = ASSET_SUPPLY_LINE_FILTERS[0];

  data: AssetSupplySnapshot[] = [];

  isFetchingError = false;

  created(): void {
    this.updateData();
  }

  get chartSpec() {
    return {
      dataset: {
        source: this.data.map((item) => [item.timestamp, item.supply, item.mint, item.burn]),
        dimensions: ['timestamp', 'supply', 'mint', 'burn'],
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
        type: 'log',
      },
      tooltip: {
        ...this.tooltipSpec(),
        formatter: (params) => {
          const { data } = params[0];
          const [timestamp, value] = data;
          return `$ ${new FPNumber(value).toLocaleString()}`;
        },
      },
      series: [
        this.lineSeriesSpec('supply', this.theme.color.theme.accent, false),
        this.lineSeriesSpec('mint', this.theme.color.status.success, false),
        this.lineSeriesSpec('burn', this.theme.color.status.error, false),
      ],
    };
  }

  changeFilter(filter: SnapshotFilter): void {
    this.filter = filter;
    this.updateData();
  }

  private async updateData(): Promise<void> {
    await this.withApi(async () => {
      try {
        const id = '0x0200000000000000000000000000000000000000000000000000000000000000';
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
  }

  private async fetchData(id: string, from: number, to: number, type: SnapshotTypes): Promise<AssetSupplySnapshot[]> {
    const buffer = [];

    let hasNextPage = true;
    let after = '';

    do {
      const response = await SubqueryExplorerService.request(AssetSupplyQuery, { after, id, from, to, type });

      if (!response || !response.assetSnapshots) return buffer;

      hasNextPage = response.assetSnapshots.pageInfo.hasNextPage;
      after = response.assetSnapshots.pageInfo.endCursor;

      response.assetSnapshots.nodes.forEach((node) => {
        buffer.push({
          timestamp: +node.timestamp * 1000,
          supply: toNumber(node.supply),
          mint: toNumber(node.mint),
          burn: toNumber(node.burn),
        });
      });
    } while (hasNextPage);

    return buffer;
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
