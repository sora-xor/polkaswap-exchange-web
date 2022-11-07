<template>
  <s-table :data="preparedItems" :highlight-current-row="false" size="small" class="explore-table">
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
          <span class="explore-table__secondary">({{ t('tokens.assetId') }})</span>
        </div>
      </template>
      <template v-slot="{ $index, row }">
        <span class="explore-table-item-index explore-table-item-index--body">{{ $index + startIndex + 1 }}</span>
        <token-logo
          class="explore-table-item-logo explore-table-item-logo--body"
          :token-symbol="row.stakingAsset.symbol"
        />
        <div class="explore-table-item-info explore-table-item-info--body">
          <div class="explore-table-item-name">{{ row.stakingAsset.name }}</div>
          <div class="explore-table-item-address">
            <span>{{ TranslationConsts.Sora }}:</span>&nbsp;
            <token-address
              class="explore-table-item-address__value"
              :show-name="false"
              :name="row.name"
              :symbol="row.stakingAsset.symbol"
              :address="row.stakingAsset.address"
            />
          </div>
        </div>
      </template>
    </s-table-column>
    <!-- TVL -->
    <!-- <s-table-column width="104" header-align="right" align="right">
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
    </s-table-column> -->
  </s-table>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { FPNumber } from '@sora-substrate/util';
import { mixins, components } from '@soramitsu/soraneo-wallet-web';

import DemeterPageMixin from '@/modules/demeterFarming/mixins/PageMixin';

import { getter } from '@/store/decorators';
import { formatAmountWithSuffix } from '@/utils';

import SortButton from '@/components/SortButton.vue';

import type { Asset } from '@sora-substrate/util/build/assets/types';
import type { DemeterPool } from '@sora-substrate/util/build/demeterFarming/types';
import type { RegisteredAccountAssetWithDecimals } from '@/store/assets/types';

@Component({
  components: {
    SortButton,
    TokenAddress: components.TokenAddress,
    TokenLogo: components.TokenLogo,
  },
})
export default class ExploreStaking extends Mixins(
  mixins.PaginationSearchMixin,
  mixins.FormattedAmountMixin,
  DemeterPageMixin
) {
  @getter.assets.assetDataByAddress private getAsset!: (addr?: string) => Nullable<RegisteredAccountAssetWithDecimals>;

  // override DemeterPageMixin
  isFarmingPage = false;

  order = '';
  property = '';

  get preparedItems() {
    return Object.values(this.pools)
      .flat()
      .map((pool: DemeterPool) => {
        const stakingAsset = this.getAsset(pool.poolAsset);
        const rewardAsset = this.getAsset(pool.rewardAsset);
        const fpStakingAssetPrice = FPNumber.fromCodecValue(this.getAssetFiatPrice(stakingAsset as Asset) ?? 0);
        const fpTvl = pool.totalTokensInPool.mul(fpStakingAssetPrice);

        return {
          stakingAsset,
          rewardAsset,
          tvl: fpTvl.toNumber(),
          tvlFormatted: formatAmountWithSuffix(fpTvl),
        };
      });
  }

  // common
  get isDefaultSort(): boolean {
    return !this.order || !this.property;
  }

  // common
  changeSort({ order = '', property = '' } = {}): void {
    this.order = order;
    this.property = property;
  }

  // common
  handleResetSort(): void {
    this.changeSort();
  }
}
</script>

<style lang="scss">
@include explore-table;
</style>
