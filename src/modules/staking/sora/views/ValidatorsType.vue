<template>
  <div class="container">
    <staking-header :previous-page="SoraStakingPageNames.NewStake">
      {{ t('soraStaking.info.validators') }}
    </staking-header>
    <select-validators-mode @recommended="stakeWithSuggested" @selected="stakeWithSelected" />
    <validators-attention-dialog
      :visible.sync="showValidatorsAttentionDialog"
      :parent-loading="parentLoading || loading"
      @proceed="handleSelectValidators"
    />
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import router from '@/router';
import { mutation } from '@/store/decorators';

import { soraStakingLazyComponent } from '../../router';
import { SoraStakingComponents, SoraStakingPageNames, ValidatorsListMode } from '../consts';
import StakingMixin from '../mixins/StakingMixin';

@Component({
  components: {
    StakingHeader: soraStakingLazyComponent(SoraStakingComponents.StakingHeader),
    ValidatorsAttentionDialog: soraStakingLazyComponent(SoraStakingComponents.ValidatorsAttentionDialog),
    SelectValidatorsMode: soraStakingLazyComponent(SoraStakingComponents.SelectValidatorsMode),
  },
})
export default class ValidatorsType extends Mixins(StakingMixin, mixins.LoadingMixin) {
  @mutation.staking.setValidatorsType private setValidatorsType!: (type: ValidatorsListMode) => void;

  showValidatorsAttentionDialog = false;

  stakeWithSuggested(): void {
    this.showValidatorsAttentionDialog = true;
    this.setValidatorsType(ValidatorsListMode.RECOMMENDED);
  }

  stakeWithSelected(): void {
    this.showValidatorsAttentionDialog = true;
    this.setValidatorsType(ValidatorsListMode.SELECT);
  }

  handleSelectValidators(): void {
    this.showValidatorsAttentionDialog = false;
    router.push({ name: SoraStakingPageNames.SelectValidators });
  }
}
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  width: $inner-window-width;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: $basic-spacing;
}

h4 {
  font-weight: 600;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px;
  border-radius: 24px;
  background: var(--s-color-base-border-primary);
  box-shadow: 1px 1px 2px 0px rgba(255, 255, 255, 0.8) inset, 1px 1px 10px 0px rgba(0, 0, 0, 0.1),
    -5px -5px 10px 0px #fff;
}

.criteria {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  padding: 0;

  li {
    display: flex;
    align-items: center;
    gap: $inner-spacing-mini;
    width: 100%;
  }

  i {
    color: var(--s-color-status-success);
  }
}

.manual-select {
  color: var(--s-color-theme-accent);
  text-align: center;
  font-size: 14px;
  font-style: normal;
  font-weight: 500;
  text-transform: uppercase;
  cursor: pointer;
  margin-top: 8px;
}
</style>
