<template>
  <div>
    <pool-base v-bind="{ parentLoading, ...$attrs }" v-on="$listeners">
      <template #title-append="{ liquidity, activeCollapseItems }">
        <div v-if="getStatusBadgeVisibility(liquidity.address, activeCollapseItems)" class="s-flex farming-pool-badges">
          <status-badge
            v-for="item in getAvailablePools(pools[liquidity.secondAddress])"
            :key="`${item.pool.poolAsset}-${item.pool.rewardAsset}`"
            :liquidity="liquidity"
            :pool="item.pool"
            :account-pool="item.accountPool"
            @add="changePoolStake($event, true)"
            class="farming-pool-badge"
          />
        </div>
      </template>
      <template #append="liquidity">
        <pool-card
          v-for="item in getAvailablePools(pools[liquidity.secondAddress])"
          :key="`${item.pool.poolAsset}-${item.pool.rewardAsset}`"
          :liquidity="liquidity"
          :pool="item.pool"
          :account-pool="item.accountPool"
          @add="changePoolStake($event, true)"
          @remove="changePoolStake($event, false)"
          @claim="claimPoolRewards"
          @calculator="showPoolCalculator"
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

    <calculator-dialog
      :visible.sync="showCalculatorDialog"
      :pool="selectedPool"
      :account-pool="selectedAccountPool"
      :liquidity="selectedAccountLiquidity"
    />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { mixins } from '@soramitsu/soraneo-wallet-web';

import PageMixin from '../mixins/PageMixin';

import { demeterLazyComponent } from '../router';
import { DemeterComponents } from '../consts';

import { lazyView } from '@/router';
import { PageNames } from '@/consts';

import { state } from '@/store/decorators';

import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';

@Component({
  inheritAttrs: false,
  components: {
    PoolBase: lazyView(PageNames.Pool),
    PoolCard: demeterLazyComponent(DemeterComponents.PoolCard),
    StatusBadge: demeterLazyComponent(DemeterComponents.StatusBadge),
    StakeDialog: demeterLazyComponent(DemeterComponents.StakeDialog),
    ClaimDialog: demeterLazyComponent(DemeterComponents.ClaimDialog),
    CalculatorDialog: demeterLazyComponent(DemeterComponents.CalculatorDialog),
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
.farming-pool-badges {
  flex-flow: wrap;
}
.demeter-pool {
  margin-top: $inner-spacing-medium;
}
</style>
