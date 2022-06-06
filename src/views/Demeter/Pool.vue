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
      @add="handleStakeAction($event, depositLiquidity)"
      @remove="handleStakeAction($event, withdrawLiquidity)"
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

import PageMixin from '@/components/Demeter/mixins/PageMixin';

import { lazyView, lazyComponent } from '@/router';
import { PageNames, Components } from '@/consts';
import { action, state } from '@/store/decorators';

import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';
import type { DemeterAccountPool } from '@sora-substrate/util/build/demeterFarming/types';
import type { DemeterLiquidityParams } from '@/store/demeterFarming/types';

@Component({
  inheritAttrs: false,
  components: {
    PoolBase: lazyView(PageNames.Pool),
    PoolCard: lazyComponent(Components.PoolCard),
    PoolStatusBadge: lazyComponent(Components.PoolStatusBadge),
    StakeDialog: lazyComponent(Components.DemeterStakeDialog),
    ClaimDialog: lazyComponent(Components.DemeterClaimDialog),
  },
})
export default class DemeterPools extends Mixins(PageMixin, mixins.TransactionMixin) {
  @state.pool.accountLiquidity private accountLiquidity!: Array<AccountLiquidity>;

  @action.demeterFarming.depositLiquidity depositLiquidity!: (params: DemeterLiquidityParams) => Promise<void>;
  @action.demeterFarming.withdrawLiquidity withdrawLiquidity!: (params: DemeterLiquidityParams) => Promise<void>;
  @action.demeterFarming.claimRewards private claimRewards!: (pool: DemeterAccountPool) => Promise<void>;

  get selectedAccountLiquidity(): Nullable<AccountLiquidity> {
    return this.accountLiquidity.find((liquidity) => liquidity.secondAddress === this.poolAsset) ?? null;
  }

  async handleStakeAction(
    params: DemeterLiquidityParams,
    action: (params: DemeterLiquidityParams) => Promise<void>
  ): Promise<void> {
    await this.withNotifications(async () => {
      await action(params);
      this.showStakeDialog = false;
    });
  }

  async handleClaimRewards(pool: DemeterAccountPool): Promise<void> {
    await this.withNotifications(async () => {
      await this.claimRewards(pool);
      this.showClaimDialog = false;
    });
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
