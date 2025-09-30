<template>
  <dialog-base :visible.sync="isVisible">
    <div class="content">
      <s-icon class="icon" name="notifications-alert-triangle-24" size="64px" />
      <h1 class="title">{{ t('soraStaking.validatorsAttentionDialog.title') }}</h1>
      <div class="description">
        <p v-for="item in description" :key="item">{{ item }}</p>
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

  get description() {
    return this.t('soraStaking.validatorsAttentionDialog.description') as unknown as Array<string>;
  }
}
</script>

<style lang="scss" scoped>
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $basic-spacing;
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
  color: var(--s-color-base-content-primary);
  text-align: center;

  font-size: 14px;
  font-style: normal;
  font-weight: 300;
  line-height: 150%;
  letter-spacing: -0.28px;

  p {
    width: 100%;
    margin: 0 0 $inner-spacing-mini;
  }

  p:last-child {
    margin-bottom: 0;
  }
}

.action-button {
  width: 100%;
}
</style>
