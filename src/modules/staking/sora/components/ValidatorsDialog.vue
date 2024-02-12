<template>
  <dialog-base class="validators-dialog" :visible.sync="isVisible">
    <staking-header class="header" :has-back-button="hasBackButton" @back="handleBack">
      {{ title }}
    </staking-header>
    <div v-if="!isSelectingEditingMode" class="content">
      <s-tabs v-if="hasTabs" class="tabs" v-model="mode" type="rounded">
        <s-tab v-for="tab in tabs" :key="tab" :label="t(`soraStaking.validatorsDialog.tabs.${tab}`)" :name="tab" />
      </s-tabs>
      <validators-list :mode="mode" @update:selected="selectValidators" />
      <div v-if="showConfirmButton" class="bottom">
        <s-button
          class="confirm"
          type="primary"
          :loading="parentLoading || loading"
          :disabled="confirmDisabled"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </s-button>
        <div class="info" v-if="isEditMode">
          <info-line
            :label="t('networkFeeText')"
            :label-tooltip="t('networkFeeTooltipText')"
            :value="networkFeeFormatted"
            :asset-symbol="xor?.symbol"
            :fiat-value="getFiatAmountByCodecString(networkFee)"
            is-formatted
          />
        </div>
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

import type { MyStakingInfo } from '@sora-substrate/util/build/staking/types';

@Component({
  components: {
    DialogBase: components.DialogBase,
    StakingHeader: soraStakingLazyComponent(SoraStakingComponents.StakingHeader),
    ValidatorsList: soraStakingLazyComponent(SoraStakingComponents.ValidatorsList),
    SelectValidatorsMode: soraStakingLazyComponent(SoraStakingComponents.SelectValidatorsMode),
    InfoLine: components.InfoLine,
  },
})
export default class ValidatorsDialog extends Mixins(StakingMixin, mixins.DialogMixin, mixins.TransactionMixin) {
  @mutation.staking.setStakingInfo setStakingInfo!: (stakingInfo: MyStakingInfo) => void;

  @action.staking.getStakingInfo getStakingInfo!: AsyncFnWithoutArgs;
  @action.staking.getNominateNetworkFee getNominateNetworkFee!: () => Promise<string>;

  ValidatorsListMode = ValidatorsListMode;

  mode: ValidatorsListMode = ValidatorsListMode.USER;
  isSelectingEditingMode = false;
  nominateNetworkFee: string | null = null;

  @Watch('selectedValidators')
  async handleSelectedValidatorsChange() {
    this.withApi(async () => {
      this.nominateNetworkFee = await this.getNominateNetworkFee();
    });
  }

  @Watch('visible')
  private resetMode() {
    if (this.visible) {
      this.setMode(ValidatorsListMode.USER);
      this.selectValidators([]);
    }
  }

  get networkFee() {
    return this.nominateNetworkFee ?? '0';
  }

  get title(): string {
    return this.hasTabs ? this.t('soraStaking.info.validators') : this.t('soraStaking.validatorsDialog.title.edit');
  }

  get hasBackButton(): boolean {
    return this.isEditMode || this.isSelectingEditingMode;
  }

  get isEditMode(): boolean {
    return [ValidatorsListMode.RECOMMENDED, ValidatorsListMode.SELECT].includes(this.mode);
  }

  get hasTabs(): boolean {
    return this.tabs.includes(this.mode);
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
          ? this.t('insufficientBalanceText', { tokenSymbol: this.xor?.symbol ?? '' })
          : this.hasChanges
          ? this.t('soraStaking.validators.save')
          : this.t('soraStaking.validators.alreadyNominated');
      case ValidatorsListMode.SELECT:
        return this.isInsufficientXorForFee
          ? this.t('insufficientBalanceText', { tokenSymbol: this.xor?.symbol ?? '' })
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
    if (this.isInsufficientXorForFee && this.mode !== ValidatorsListMode.USER) {
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
      this.setMode(ValidatorsListMode.USER);
    } else {
      this.isSelectingEditingMode = true;
    }
  }

  async handleConfirm(): Promise<void> {
    if (this.mode === ValidatorsListMode.USER) {
      this.isSelectingEditingMode = true;
    } else {
      await this.withNotifications(async () => {
        await this.nominate();

        if (!this.stakingInfo) throw new Error('There is no staking info');

        this.setStakingInfo({
          ...this.stakingInfo,
          myValidators: this.selectedValidators.map((v) => v.address),
        });

        this.mode = ValidatorsListMode.USER;
      });
    }
  }

  private setMode(mode: ValidatorsListMode): void {
    this.mode = mode;
    this.isSelectingEditingMode = false;
  }

  handleRecommendedMode(): void {
    this.setMode(ValidatorsListMode.RECOMMENDED);
  }

  handleSelectedMode(): void {
    this.setMode(ValidatorsListMode.SELECT);
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
  position: relative;
  width: 100%;
  bottom: var(--s-size-mini);
  margin-top: -16px;
  margin-bottom: -28px;
}

.confirm {
  width: 100%;
}

.info {
  margin-top: 12px;
}
</style>
