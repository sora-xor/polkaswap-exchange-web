<template>
  <dialog-base :visible.sync="isVisible">
    <div class="content">
      <s-icon class="icon" name="notifications-alert-triangle-24" size="64px" />
      <h1 class="title">Attention</h1>
      <div class="description">
        <template v-for="item in t('soraStaking.validatorsAttentionDialog.description')">
          <p :key="item">
            {{ item }}
          </p>
          <br :key="item" />
        </template>
      </div>

      <s-button type="primary" class="action-button" :loading="parentLoading" @click="handleConfirm">
        {{ t('soraStaking.validatorsAttentionDialog.confirm') }}
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import { Components } from '@/consts';
import router, { lazyComponent } from '@/router';

import { SoraStakingPageNames } from '../consts';
import StakingMixin from '../mixins/StakingMixin';

@Component({
  components: {
    TokenInput: lazyComponent(Components.TokenInput),
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
  },
})
export default class ValidatorsAttentionDialog extends Mixins(StakingMixin, mixins.DialogMixin, mixins.LoadingMixin) {
  @Prop({ default: () => true, type: Boolean }) readonly isRecommended!: boolean;

  handleConfirm(): void {
    if (this.isRecommended) {
      router.push({ name: SoraStakingPageNames.SelectValidators });
    }
  }
}
</script>

<style lang="scss" scoped>
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-top: -50px;
}

.icon {
  display: flex;
  justify-content: center;
  color: var(--s-color-status-error);
}

.title {
  font-weight: 300;
  font-size: 28px;
  text-align: center;
  margin: 0;
}

.description {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  align-self: stretch;
  color: var(--base-day-content-primary, #2a171f);
  text-align: center;
  font-feature-settings: 'case' on, 'clig' off, 'liga' off;

  /* NEU light 14 */
  font-family: Sora;
  font-size: 14px;
  font-style: normal;
  font-weight: 300;
  line-height: 150%; /* 21px */
  letter-spacing: -0.28px;
}

.action-button {
  width: 100%;
}
</style>
../../demeter/consts
