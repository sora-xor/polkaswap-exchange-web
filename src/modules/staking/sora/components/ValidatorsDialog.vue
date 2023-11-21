<template>
  <dialog-base class="validators-dialog" :visible.sync="isVisible">
    <staking-header class="header" :has-back-button="hasBackButton" @back="handleBack">
      {{ title }}
    </staking-header>
    <div v-if="!isSelectingEditingMode" class="content">
      <s-tabs v-if="hasTabs" class="tabs" v-model="mode" type="rounded">
        <s-tab v-for="tab in tabs" :key="tab" :label="t(`soraStaking.validators.tabs.${tab}`)" :name="tab" />
      </s-tabs>
      <validators-list
        :mode="mode"
        :validators="validators"
        :selected-validators="selectedValidators"
        @update:selected="selectValidators"
      />
      <s-button
        v-if="showConfirmButton"
        class="confirm"
        type="primary"
        :disabled="confirmDisabled"
        @click="handleConfirm"
      >
        {{ confirmText }}
      </s-button>
    </div>
    <select-validators-mode
      v-else
      title="Edit my validators"
      @recommended="handleRecommendedMode"
      @selected="handleSelectedMode"
    />
  </dialog-base>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { mutation } from '@/store/decorators';

import { soraStakingLazyComponent } from '../../router';
import { SoraStakingComponents, ValidatorsListMode } from '../consts';
import StakingMixin from '../mixins/StakingMixin';

import type { ValidatorInfoFull } from '@sora-substrate/util/build/staking/types';

@Component({
  components: {
    DialogBase: components.DialogBase,
    StakingHeader: soraStakingLazyComponent(SoraStakingComponents.StakingHeader),
    ValidatorsList: soraStakingLazyComponent(SoraStakingComponents.ValidatorsList),
    SelectValidatorsMode: soraStakingLazyComponent(SoraStakingComponents.SelectValidatorsMode),
  },
})
export default class ValidatorsDialog extends Mixins(StakingMixin, mixins.DialogMixin, mixins.LoadingMixin) {
  @mutation.staking.selectValidators selectValidators!: (validators: ValidatorInfoFull[]) => void;

  ValidatorsListMode = ValidatorsListMode;

  mode: ValidatorsListMode = ValidatorsListMode.USER;
  isSelectingEditingMode = false;

  get title(): string {
    return this.mode === ValidatorsListMode.USER || this.mode === ValidatorsListMode.ALL
      ? this.t('soraStaking.validatorsDialog.title.default')
      : this.t('soraStaking.validatorsDialog.title.edit');
  }

  get hasBackButton(): boolean {
    return (
      this.mode === ValidatorsListMode.RECOMMENDED ||
      this.mode === ValidatorsListMode.SELECT ||
      this.isSelectingEditingMode
    );
  }

  get hasTabs(): boolean {
    return this.mode === ValidatorsListMode.USER || this.mode === ValidatorsListMode.ALL;
  }

  get tabs() {
    return [ValidatorsListMode.USER, ValidatorsListMode.ALL];
  }

  get confirmText(): string {
    switch (this.mode) {
      case ValidatorsListMode.USER:
        return this.t('soraStaking.validatorsDialog.changeValidators');
      case ValidatorsListMode.RECOMMENDED:
        return this.t('soraStaking.validatorsDialog.saveChanges');
      case ValidatorsListMode.SELECT:
        return this.t('soraStaking.validatorsDialog.selected', {
          selected: this.selectedValidators.length,
          total: this.validators.length,
        });
      default:
        return '';
    }
  }

  get showConfirmButton(): boolean {
    return this.mode !== ValidatorsListMode.ALL && !this.isSelectingEditingMode;
  }

  get confirmDisabled(): boolean {
    if (this.mode === ValidatorsListMode.SELECT) {
      return this.selectedValidators.length === 0;
    }
    return false;
  }

  handleBack(): void {
    if (this.isSelectingEditingMode) {
      this.mode = ValidatorsListMode.USER;
      this.isSelectingEditingMode = false;
    } else {
      this.isSelectingEditingMode = true;
    }
  }

  handleConfirm(): void {
    if (this.mode === ValidatorsListMode.USER) {
      this.isSelectingEditingMode = true;
    } else {
      this.nominate();
    }
  }

  handleRecommendedMode(): void {
    this.mode = ValidatorsListMode.RECOMMENDED;
    this.isSelectingEditingMode = false;
  }

  handleSelectedMode(): void {
    this.mode = ValidatorsListMode.SELECT;
    this.isSelectingEditingMode = false;
  }
}
</script>

<style lang="scss">
.validators-dialog .el-dialog__header {
  position: absolute;
}
</style>

<style lang="scss" scoped>
.header {
  margin: 16px 0;
}

.confirm {
  position: absolute;
  width: calc(100% - 48px);
  bottom: 24px;
}
</style>
