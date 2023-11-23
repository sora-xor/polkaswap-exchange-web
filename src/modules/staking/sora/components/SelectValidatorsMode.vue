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
  @Prop({ type: String }) title!: string;

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
  background: var(--base-day-border-primary, #f7f3f4);
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
    gap: 8px;
    width: 100%;
  }

  i {
    color: var(--s-color-status-success);
  }
}

.manual-select {
  color: var(--theme-day-accent, #f8087b);
  text-align: center;
  font-size: 14px;
  font-style: normal;
  font-weight: 500;
  text-transform: uppercase;
  cursor: pointer;
  margin-top: 8px;
}
</style>
