<template>
  <stats-card>
    <template #title>Supply</template>

    <template #filters>
      <stats-filter :filters="filters" :value="filter" @input="changeFilter" />
    </template>

    <template #types>
      <s-dropdown ref="dropdown" tabindex="-1" trigger="click" class="token-select-dropdown" @select="handleSelect">
        <token-select-button :token="token" icon="chevron-down-rounded-16" @click="handleButtonClick" />

        <template #menu>
          <s-dropdown-item v-for="item in tokens" :value="item.address" :key="item.address" tabindex="0">
            {{ item.symbol }}
          </s-dropdown-item>
        </template>
      </s-dropdown>
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
import { Component, Mixins, Ref } from 'vue-property-decorator';
import { components, mixins, SubqueryExplorerService, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/math';
import { NativeAssets } from '@sora-substrate/util/build/assets/consts';

import ChartSpecMixin from '@/components/shared/Chart/SpecMixin';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { SECONDS_IN_TYPE, ASSET_SUPPLY_LINE_FILTERS } from '@/consts/snapshots';
import { calcPriceChange, formatAmountWithSuffix } from '@/utils';
import { SnapshotTypes } from '@/types/filters';

import type { SnapshotFilter } from '@/types/filters';
import type { AmountWithSuffix } from '@/types/formats';

import type SDropdown from '@soramitsu/soramitsu-js-ui/lib/components/Dropdown/SDropdown/SDropdown.vue';

type AssetSupplySnapshot = {
  timestamp: number;
  supply: number;
  mint: number;
  burn: number;
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

const toNumber = (value: string): number => {
  const fp = FPNumber.fromCodecValue(value);

  return fp.isFinity() ? fp.toNumber() : 0;
};

const getExtremum = (data, prop: string, min = false) => {
  return data.reduce((acc, item) => Math[min ? 'min' : 'max'](acc, item[prop]), min ? Infinity : 0);
};

@Component({
  components: {
    ChartSkeleton: lazyComponent(Components.ChartSkeleton),
    PriceChange: lazyComponent(Components.PriceChange),
    StatsCard: lazyComponent(Components.StatsCard),
    StatsFilter: lazyComponent(Components.StatsFilter),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    FormattedAmount: components.FormattedAmount,
  },
})
export default class StatsSupplyChart extends Mixins(mixins.LoadingMixin, ChartSpecMixin) {
  @Ref('dropdown') readonly dropdown!: SDropdown;

  readonly FontSizeRate = WALLET_CONSTS.FontSizeRate;
  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;
  readonly filters = ASSET_SUPPLY_LINE_FILTERS;
  readonly tokens = NativeAssets;

  filter: SnapshotFilter = ASSET_SUPPLY_LINE_FILTERS[0];
  token = NativeAssets[0];

  data: AssetSupplySnapshot[] = [];

  isFetchingError = false;

  get firstValue(): FPNumber {
    return new FPNumber(first(this.data)?.supply ?? 0);
  }

  get lastValue(): FPNumber {
    return new FPNumber(last(this.data)?.supply ?? 0);
  }

  get amount(): AmountWithSuffix {
    return formatAmountWithSuffix(this.firstValue);
  }

  get priceChange(): FPNumber {
    return calcPriceChange(this.firstValue, this.lastValue);
  }

  get supplyRange(): [number, number] {
    const max = getExtremum(this.data, 'supply');
    const min = getExtremum(this.data, 'supply', true);
    const diff = max - min;

    return [max, min - diff];
  }

  get mintBurnRange(): [number, number] {
    const max = Math.max(getExtremum(this.data, 'mint'), getExtremum(this.data, 'burn'));
    const min = Math.min(getExtremum(this.data, 'mint', true), getExtremum(this.data, 'burn', true));
    const diff = max - min;
    return [max + diff, min];
  }

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
      tooltip: {
        ...this.tooltipSpec(),
        // formatter: (params) => {
        //   const { data } = params[0];
        //   const [timestamp, value] = data;
        //   return `$ ${new FPNumber(value).toLocaleString()}`;
        // },
      },
      series: [
        {
          ...this.lineSeriesSpec('supply', this.theme.color.theme.accent, false),
          yAxisIndex: 0,
        },
        {
          ...this.lineSeriesSpec('mint', this.theme.color.status.success, false),
          yAxisIndex: 1,
        },
        {
          ...this.lineSeriesSpec('burn', this.theme.color.status.error, false),
          yAxisIndex: 1,
        },
      ],
    };
  }

  changeFilter(filter: SnapshotFilter): void {
    this.filter = filter;
    this.updateData();
  }

  handleSelect(address: string): void {
    this.token = this.tokens.find((token) => token.address === address) ?? this.tokens[0];
    this.updateData();
  }

  handleButtonClick(): void {
    // emulate click in el-dropdown
    (this.dropdown.$refs.dropdown as SDropdown).handleClick();
  }

  private async updateData(): Promise<void> {
    await this.withApi(async () => {
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
  }

  private async fetchData(id: string, from: number, to: number, type: SnapshotTypes): Promise<AssetSupplySnapshot[]> {
    const buffer: AssetSupplySnapshot[] = [];

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

<style lang="scss">
.token-select-dropdown {
  & > span {
    & > i {
      display: none;
    }
  }
}
</style>

<style lang="scss" scoped>
.chart-price {
  margin-bottom: $inner-spacing-tiny;
  font-weight: 600;
  font-size: var(--s-heading3-font-size);
  line-height: var(--s-line-height-extra-small);
}
</style>
