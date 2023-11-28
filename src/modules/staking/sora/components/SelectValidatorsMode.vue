<template>
  <div v-loading="parentLoading">
    <div class="content">
      <div class="card">
        <h4>{{ t('soraStaking.selectValidatorsMode.title') }}</h4>
        <p>{{ t('soraStaking.selectValidatorsMode.description') }}</p>
        <ul class="criteria">
          <li v-for="criterion in criteria" :key="criterion">
            <s-icon name="basic-check-mark-24" size="16px" />
            <span>{{ criterion }}</span>
          </li>
        </ul>
        <s-button type="primary" @click="stakeWithSuggested">{{
          t('soraStaking.selectValidatorsMode.confirm.suggested')
        }}</s-button>
      </div>
      <div class="manual-select" @click="stakeWithSelected">
        {{ t('soraStaking.selectValidatorsMode.confirm.manual') }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import { mutation } from '@/store/decorators';

import { soraStakingLazyComponent } from '../../router';
import { SoraStakingComponents, ValidatorsListMode } from '../consts';
import StakingMixin from '../mixins/StakingMixin';

@Component({
  components: {
    ValidatorsAttentionDialog: soraStakingLazyComponent(SoraStakingComponents.ValidatorsAttentionDialog),
  },
})
export default class SelectValidatorsMode extends Mixins(StakingMixin, mixins.LoadingMixin) {
  @Prop({ type: String }) previousPage?: string;

  @mutation.staking.setValidatorsType private setValidatorsType!: (type: ValidatorsListMode) => void;

  showValidatorsAttentionDialog = false;

  get criteria() {
    return this.t('soraStaking.selectValidatorsMode.criteria');
  }

  stakeWithSuggested(): void {
    this.$emit('recommended');
  }

  stakeWithSelected(): void {
    this.$emit('selected');
  }
}
</script>

<style lang="scss" scoped>
.content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 16px;
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
  box-shadow: var(--s-shadow-dialog);
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
    gap: 8px;
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
