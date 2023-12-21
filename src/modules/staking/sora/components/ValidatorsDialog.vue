<template>
  <dialog-base class="validators-dialog" :visible.sync="isVisible">
    <staking-header class="header" :has-back-button="hasBackButton" @back="handleBack">
      {{ title }}
    </staking-header>
    <div v-if="!isSelectingEditingMode" class="content">
      <s-tabs v-if="hasTabs" class="tabs" v-model="mode" type="rounded">
        <s-tab v-for="tab in tabs" :key="tab" :label="t(`soraStaking.validatorsDialog.tabs.${tab}`)" :name="tab" />
      </s-tabs>
      <validators-list
        :mode="mode"
        :validators="validators"
        :selected-validators="selectedValidators"
        @update:selected="selectValidators"
      />
      <div class="bottom">
        <div class="info" v-if="mode === ValidatorsListMode.RECOMMENDED || mode === ValidatorsListMode.SELECT">
          <info-line
            :label="t('networkFeeText')"
            :label-tooltip="t('networkFeeTooltipText')"
            :value="networkFeeFormatted"
            :asset-symbol="xor?.symbol"
            :fiat-value="getFiatAmountByCodecString(networkFee)"
            is-formatted
          />
        </div>
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
    </div>
    <select-validators-mode v-else @recommended="handleRecommendedMode" @selected="handleSelectedMode" />
  </dialog-base>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import { mutation, action } from '@/store/decorators';

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
    InfoLine: components.InfoLine,
  },
})
export default class ValidatorsDialog extends Mixins(StakingMixin, mixins.DialogMixin, mixins.LoadingMixin) {
  @mutation.staking.selectValidators selectValidators!: (validators: ValidatorInfoFull[]) => void;

  @action.staking.getStakingInfo getStakingInfo!: AsyncFnWithoutArgs;

  ValidatorsListMode = ValidatorsListMode;

  mode: ValidatorsListMode = ValidatorsListMode.USER;
  isSelectingEditingMode = false;

  @Watch('visible')
  private resetMode() {
    this.mode = ValidatorsListMode.USER;
    this.isSelectingEditingMode = false;
  }

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

  get hasChanges(): boolean {
    const selectedValidators = this.selectedValidators.map((validator) => validator.address);
    const userValidators = this.stakingInfo?.myValidators;
    if (!userValidators) {
      return false;
    }
    return !(
      selectedValidators.every((address) => userValidators.includes(address)) &&
      selectedValidators.length === userValidators.length
    );
  }

  get confirmText(): string {
    switch (this.mode) {
      case ValidatorsListMode.USER:
        return this.t('soraStaking.validators.change');
      case ValidatorsListMode.RECOMMENDED:
        return this.isInsufficientXorForFee
          ? this.t('insufficientBalanceText', { tokenSymbol: this.xor?.symbol })
          : this.hasChanges
          ? this.t('soraStaking.validators.save')
          : this.t('soraStaking.validators.alreadyNominated');
      case ValidatorsListMode.SELECT:
        return this.isInsufficientXorForFee
          ? this.t('insufficientBalanceText', { tokenSymbol: this.xor?.symbol })
          : this.hasChanges
          ? this.t('soraStaking.validators.selected', {
              selected: this.selectedValidators.length,
              total: this.validators.length,
            })
          : this.t('soraStaking.validators.alreadyNominated');
      default:
        return '';
    }
  }

  get showConfirmButton(): boolean {
    return this.mode !== ValidatorsListMode.ALL && !this.isSelectingEditingMode;
  }

  get confirmDisabled(): boolean {
    if (this.isInsufficientXorForFee) {
      return true;
    }
    if (this.mode === ValidatorsListMode.RECOMMENDED) {
      return !this.hasChanges;
    } else if (this.mode === ValidatorsListMode.SELECT) {
      return this.selectedValidators.length === 0 || !this.hasChanges;
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

  async handleConfirm(): Promise<void> {
    if (this.mode === ValidatorsListMode.USER) {
      this.isSelectingEditingMode = true;
    } else {
      await this.nominate();
      await this.getStakingInfo();
      this.mode = ValidatorsListMode.USER;
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
.validators-dialog {
  @include custom-tabs;

  .el-dialog__header {
    position: absolute;
  }
}
</style>

<style lang="scss" scoped>
.header {
  margin: 16px 0;
}

.bottom {
  position: absolute;
  width: calc(100% - 48px);
  bottom: 24px;
}

.confirm {
  width: 100%;
  margin-top: 12px;
}
</style>
