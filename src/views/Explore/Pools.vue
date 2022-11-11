<template>
  <div>
    <s-table
      ref="table"
      v-loading="loading"
      :data="tableItems"
      :highlight-current-row="false"
      size="small"
      class="explore-table"
    >
      <!-- Index -->
      <s-table-column width="280" label="#" fixed-position="left">
        <template #header>
          <div class="explore-table-item-index">
            <span @click="handleResetSort" :class="['explore-table-item-index--head', { active: isDefaultSort }]">#</span>
          </div>
          <div class="explore-table-item-logo">
            <s-icon name="various-bone-24" size="14px" class="explore-table-item-logo--head" />
          </div>
          <div class="explore-table-item-info explore-table-item-info--head">
            <span class="explore-table__primary">{{ t('tokens.name') }}</span>
          </div>
        </template>
        <template v-slot="{ $index, row }">
          <span class="explore-table-item-index explore-table-item-index--body">{{ $index + startIndex + 1 }}</span>
          <pair-token-logo
            :first-token="row.baseAsset"
            :second-token="row.targetAsset"
            size="small"
            class="explore-table-item-logo"
          />
          <div class="explore-table-item-info explore-table-item-info--body">
            <div class="explore-table-item-name">{{ row.name }}</div>
            <div v-if="row.description" class="explore-table__secondary">{{ row.description }}</div>
          </div>
        </template>
      </s-table-column>
      <!-- APY -->
      <s-table-column width="120" header-align="right" align="right">
        <template #header>
          <sort-button name="apy" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">APY</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <span class="explore-table__accent">{{ row.apyFormatted }}</span>
        </template>
      </s-table-column>
      <!-- TVL -->
      <s-table-column width="104" header-align="right" align="right">
        <template #header>
          <sort-button name="tvl" :sort="{ order, property }" @change-sort="changeSort">
            <span class="explore-table__primary">TVL</span>
          </sort-button>
        </template>
        <template v-slot="{ row }">
          <formatted-amount
            is-fiat-value
            :font-weight-rate="FontWeightRate.MEDIUM"
            :value="row.tvlFormatted.amount"
            class="explore-table-item-price explore-table-item-amount"
          >
            {{ row.tvlFormatted.suffix }}
          </formatted-amount>
        </template>
      </s-table-column>
    </s-table>

    <s-pagination
      class="explore-table-pagination"
      :layout="'prev, total, next'"
      :current-page.sync="currentPage"
      :page-size="pageAmount"
      :total="filteredItems.length"
      @prev-click="handlePrevClick"
      @next-click="handleNextClick"
    />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { api, components } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/util';
import { SortDirection } from '@soramitsu/soramitsu-js-ui/lib/components/Table/consts';

import ExplorePageMixin from '@/components/mixins/ExplorePageMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { formatAmountWithSuffix, formatDecimalPlaces } from '@/utils';

import SortButton from '@/components/SortButton.vue';

@Component({
  components: {
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    SortButton,
    FormattedAmount: components.FormattedAmount,
  },
})
export default class ExplorePools extends Mixins(ExplorePageMixin, TranslationMixin) {
  readonly defaultSort = { prop: 'tvl', order: SortDirection.DESC };

  // override ExplorePageMixin
  order = SortDirection.DESC;
  property = 'tvl';

  poolReserves: Record<string, string[]> = {};

  get preparedItems() {
    return Object.entries(this.poolReserves).reduce<any>((buffer, [key, reserves]) => {
      const matches = key.match(/0x\w{64}/g);

      if (!matches || !matches[0] || !matches[1]) return buffer;

      const baseAsset = this.getAsset(matches[0]);
      const targetAsset = this.getAsset(matches[1]);

      if (!baseAsset || !targetAsset) return buffer;

      const fpBaseAssetPrice = FPNumber.fromCodecValue(this.getAssetFiatPrice(baseAsset) ?? 0);
      const fpBaseAssetReserves = FPNumber.fromCodecValue(reserves[0] ?? 0);
      const fpApy = FPNumber.fromCodecValue(
        this.fiatPriceAndApyObject[targetAsset.address]?.strategicBonusApy ?? 0
      ).mul(FPNumber.HUNDRED);
      const fpTvl = fpBaseAssetPrice.mul(fpBaseAssetReserves).mul(new FPNumber(2));

      const name = [baseAsset, targetAsset].map((asset) => asset?.symbol ?? '').join('-');

      buffer.push({
        baseAsset,
        targetAsset,
        name,
        apy: fpApy.toNumber(),
        apyFormatted: formatDecimalPlaces(fpApy, true),
        tvl: fpTvl.toNumber(),
        tvlFormatted: formatAmountWithSuffix(fpTvl),
      });

      return buffer;
    }, []);
  }

  async updateExploreData(): Promise<void> {
    this.poolReserves = await api.poolXyk.getAllReserves();
  }
}
</script>
