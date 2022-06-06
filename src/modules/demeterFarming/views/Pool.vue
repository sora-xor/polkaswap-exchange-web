<template>
  <div>
    <pool-base v-bind="{ parentLoading, ...$attrs }" v-on="$listeners">
      <template #title-append="{ liquidity, activeCollapseItems }">
        <pool-status-badge
          v-if="getStatusBadgeVisibility(liquidity.secondAddress, activeCollapseItems)"
          :active="hasActivePools(liquidity.secondAddress)"
          :has-stake="hasAccountPoolsForPoolAsset(liquidity.secondAddress)"
          class="farming-pool-badge"
        />
      </template>
      <template #append="liquidity">
        <pool-card
          v-for="pool in farmingPools[liquidity.secondAddress]"
          :key="`${pool.poolAsset}-${pool.rewardAsset}`"
          :liquidity="liquidity"
          :pool="pool"
          :account-pool="getAccountPool(pool)"
          @add="changePoolStake($event, true)"
          @remove="changePoolStake($event, false)"
          @claim="claimPoolRewards"
          border
          class="demeter-pool"
        />
      </template>
    </pool-base>

    <stake-dialog
      :visible.sync="showStakeDialog"
      :liquidity="selectedAccountLiquidity"
      :pool="selectedPool"
      :account-pool="selectedAccountPool"
      :is-adding="isAddingStake"
      @add="handleStakeAction($event, deposit)"
      @remove="handleStakeAction($event, withdraw)"
    />
    <claim-dialog
      :visible.sync="showClaimDialog"
      :pool="selectedPool"
      :account-pool="selectedAccountPool"
      @confirm="handleClaimRewards"
    />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import PageMixin from '../mixins/PageMixin';

import { demeterLazyComponent } from '../router';
import { DemeterComponents } from '../consts';

import { lazyView, lazyComponent } from '@/router';
import { PageNames, Components } from '@/consts';

import { state } from '@/store/decorators';

import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';

@Component({
  inheritAttrs: false,
  components: {
    PoolBase: lazyView(PageNames.Pool),
    PoolCard: demeterLazyComponent(DemeterComponents.PoolCard),
    PoolStatusBadge: demeterLazyComponent(DemeterComponents.PoolStatusBadge),
    StakeDialog: demeterLazyComponent(DemeterComponents.StakeDialog),
    ClaimDialog: demeterLazyComponent(DemeterComponents.ClaimDialog),
  },
})
export default class DemeterPools extends Mixins(PageMixin, mixins.TransactionMixin) {
  @state.pool.accountLiquidity private accountLiquidity!: Array<AccountLiquidity>;

  get selectedAccountLiquidity(): Nullable<AccountLiquidity> {
    return this.accountLiquidity.find((liquidity) => liquidity.secondAddress === this.poolAsset) ?? null;
  }
}
</script>

<style lang="scss" scoped>
.farming-pool-badge {
  margin-right: $inner-spacing-medium;
}
.demeter-pool {
  margin-top: $inner-spacing-medium;
}
</style>
