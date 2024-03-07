<template>
  <div>
    <router-view
      class="sora-staking-container"
      v-bind="{
        parentLoading: subscriptionsDataLoading,
        ...$attrs,
      }"
      v-on="$listeners"
    />
    <validators-filter-dialog
      :visible.sync="showFilterDialog"
      :parent-loading="parentLoading || loading"
      :filter="validatorsFilter"
      @save="handleChangeFilter"
    />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';

import SubscriptionsMixin from '@/components/mixins/SubscriptionsMixin';
import router from '@/router';
import { action } from '@/store/decorators';

import { soraStakingLazyComponent } from '../../router';
import { SoraStakingComponents, SoraStakingPageNames } from '../consts';
import StakingMixin from '../mixins/StakingMixin';
import { ValidatorsFilter } from '../types';

@Component({
  components: {
    ValidatorsFilterDialog: soraStakingLazyComponent(SoraStakingComponents.ValidatorsFilterDialog),
  },
})
export default class SoraStakingContainer extends Mixins(StakingMixin, SubscriptionsMixin) {
  @action.staking.getStakingInfo getStakingInfo!: AsyncFnWithoutArgs;
  @action.staking.getValidatorsInfo getValidatorsInfo!: AsyncFnWithoutArgs;
  @action.staking.getMinNominatorBond getMinNominatorBond!: AsyncFnWithoutArgs;
  @action.staking.getUnbondPeriod getUnbondPeriod!: AsyncFnWithoutArgs;
  @action.staking.getMaxNominations getMaxNominations!: AsyncFnWithoutArgs;
  @action.staking.getHistoryDepth getHistoryDepth!: AsyncFnWithoutArgs;
  @action.staking.subscribeOnActiveEra subscribeOnActiveEra!: AsyncFnWithoutArgs;
  @action.staking.subscribeOnCurrentEra subscribeOnCurrentEra!: AsyncFnWithoutArgs;
  @action.staking.subscribeOnCurrentEraTotalStake subscribeOnCurrentEraTotalStake!: AsyncFnWithoutArgs;
  @action.staking.subscribeOnController subscribeOnController!: AsyncFnWithoutArgs;
  @action.staking.subscribeOnPayee subscribeOnPayee!: AsyncFnWithoutArgs;
  @action.staking.subscribeOnNominations subscribeOnNominations!: AsyncFnWithoutArgs;
  @action.staking.subscribeOnAccountLedger subscribeOnAccountLedger!: AsyncFnWithoutArgs;

  get showFilterDialog() {
    return this.showValidatorsFilterDialog;
  }

  set showFilterDialog(show: boolean) {
    this.setShowValidatorsFilterDialog(show);
  }

  handleChangeFilter(filter: ValidatorsFilter): void {
    this.setShowValidatorsFilterDialog(false);
    this.setValidatorsFilter(filter);
  }

  async created(): Promise<void> {
    if (!this.newStakeValidatorsMode) {
      if (router.currentRoute.name !== SoraStakingPageNames.Overview) {
        router.push({ name: SoraStakingPageNames.Overview });
      }
    }

    await this.withParentLoading(async () => {
      await Promise.all([
        this.getStakingInfo(),
        this.getValidatorsInfo(),
        this.getMinNominatorBond(),
        this.getUnbondPeriod(),
        this.getMaxNominations(),
        this.getHistoryDepth(),
        this.getPendingRewards(),
        this.subscribeOnActiveEra(),
        this.subscribeOnCurrentEra(),
        this.subscribeOnController(),
        this.subscribeOnPayee(),
        this.subscribeOnNominations(),
        this.subscribeOnAccountLedger(),
      ]);
      await this.subscribeOnCurrentEraTotalStake();
    });
  }

  @Watch('currentEra')
  handleCurrentEraChange(): void {
    this.subscribeOnCurrentEraTotalStake();
  }
}
</script>

<style lang="scss">
.sora-staking-container {
  display: flex;
  flex-direction: column;
  .info-line:last-child {
    border-bottom: none;
  }
}
</style>
