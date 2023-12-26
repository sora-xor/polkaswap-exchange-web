<template>
  <div class="container" v-loading="parentLoading || !validators.length">
    <staking-header :previous-page="SoraStakingPageNames.ValidatorsType">{{ title }}</staking-header>
    <validators-list
      :mode="newStakeValidatorsMode"
      :validators="validators"
      :selected-validators="selectedValidators"
      @update:selected="selectValidators"
    />
    <s-button class="confirm" type="primary" @click="handleConfirm" :disabled="confirmDisabled">
      {{ confirmText }}
    </s-button>
    <stake-dialog
      :mode="StakeDialogMode.NEW"
      :visible.sync="showStakeDialog"
      :parent-loading="parentLoading || loading"
      @confirm="handleStake"
    />
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import router from '@/router';
import { mutation } from '@/store/decorators';

import { soraStakingLazyComponent } from '../../router';
import { SoraStakingComponents, SoraStakingPageNames, StakeDialogMode, ValidatorsListMode } from '../consts';
import StakingMixin from '../mixins/StakingMixin';

import type { ValidatorInfoFull } from '@sora-substrate/util/build/staking/types';

@Component({
  components: {
    StakingHeader: soraStakingLazyComponent(SoraStakingComponents.StakingHeader),
    ValidatorsList: soraStakingLazyComponent(SoraStakingComponents.ValidatorsList),
    StakeDialog: soraStakingLazyComponent(SoraStakingComponents.StakeDialog),
  },
})
export default class SelectValidators extends Mixins(StakingMixin, mixins.LoadingMixin) {
  StakeDialogMode = StakeDialogMode;

  showStakeDialog = false;

  get title(): string {
    return this.newStakeValidatorsMode === ValidatorsListMode.RECOMMENDED
      ? this.t('soraStaking.validators.recommended')
      : this.t('soraStaking.validators.select');
  }

  get confirmText(): string {
    return this.newStakeValidatorsMode === ValidatorsListMode.RECOMMENDED
      ? 'NEXT'
      : this.t('soraStaking.validators.selected', {
          selected: this.selectedValidators.length,
          total: this.validators.length,
        });
  }

  get confirmDisabled(): boolean {
    return this.selectedValidators.length === 0;
  }

  handleConfirm(): void {
    this.showStakeDialog = true;
  }

  handleStake(): void {
    router.push({ name: SoraStakingPageNames.Overview });
  }
}
</script>

<style lang="scss" scoped>
.container {
  position: relative;
  max-height: 573px;
}

.confirm {
  position: absolute;
  width: calc(100% - 48px);
  bottom: 24px;
}
</style>
