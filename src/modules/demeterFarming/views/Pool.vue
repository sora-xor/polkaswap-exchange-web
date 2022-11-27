<template>
  <div>
    <pool-base v-bind="{ parentLoading, ...$attrs }" v-on="$listeners">
      <template #title-append="{ liquidity, activeCollapseItems }">
        <div v-if="getStatusBadgeVisibility(liquidity.address, activeCollapseItems)" class="s-flex farming-pool-badges">
          <status-badge
            v-for="item in getLiquidityFarmingPools(liquidity)"
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
          v-for="item in getLiquidityFarmingPools(liquidity)"
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
      @add="handleStakeAction($event, deposit, signTx)"
      @remove="handleStakeAction($event, withdraw, signTx)"
    />
    <claim-dialog
      :visible.sync="showClaimDialog"
      :pool="selectedPool"
      :account-pool="selectedAccountPool"
      @confirm="handleClaimRewards($event, signTx)"
    />

    <calculator-dialog
      :visible.sync="showCalculatorDialog"
      :pool="selectedPool"
      :account-pool="selectedAccountPool"
      :liquidity="selectedAccountLiquidity"
    />

    <confirm-dialog :visible.sync="showConfirmTxDialog" @confirm="confirmTransactionDialog" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { XOR } from '@sora-substrate/util/build/assets/consts';

import PageMixin from '../mixins/PageMixin';

import { demeterLazyComponent } from '../router';
import { DemeterComponents } from '../consts';

import { lazyView } from '@/router';
import { PageNames } from '@/consts';

import { getter, state } from '@/store/decorators';

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
    ConfirmDialog: components.ConfirmDialog,
  },
})
export default class DemeterPools extends Mixins(PageMixin, mixins.TransactionMixin, mixins.ConfirmTransactionMixin) {
  @state.pool.accountLiquidity private accountLiquidity!: Array<AccountLiquidity>;

  @getter.settings.isDesktop private isDesktop!: boolean;

  get selectedAccountLiquidity(): Nullable<AccountLiquidity> {
    return this.accountLiquidity.find((liquidity) => liquidity.secondAddress === this.poolAsset) ?? null;
  }

  getLiquidityFarmingPools(liquidity: AccountLiquidity) {
    // DEMETER FARMING ONLY FOR XOR POOLS!
    if (liquidity.firstAddress !== XOR.address) return [];

    return this.getAvailablePools(this.pools[liquidity.secondAddress]);
  }

  async signTx(): Promise<boolean> {
    if (!this.isDesktop) return true;

    this.openConfirmationDialog();
    await this.waitOnNextTxConfirmation();

    if (this.isTxDialogConfirmed) {
      return true;
    }

    return false;
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
