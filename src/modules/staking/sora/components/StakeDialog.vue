<template>
  <dialog-base :visible.sync="isVisible" :title="title">
    <div class="stake-dialog">
      <s-form class="el-form--actions" :show-message="false">
        <token-input
          key="stake-input"
          :balance="stakingBalanceCodec"
          :is-max-available="isMaxButtonAvailable"
          :title="inputTitle"
          :token="stakingAsset"
          :value="value"
          @input="handleValue"
          @max="handleMaxValue"
        />
      </s-form>

      <div class="info">
        <info-line
          v-if="mode === StakeDialogMode.NEW"
          :label="t('soraStaking.info.selectedValidators')"
          :value="selectedValidatorsFormatted"
        />
        <info-line
          v-if="mode === StakeDialogMode.NEW"
          :label="t('soraStaking.info.rewardToken')"
          :value="rewardAsset?.symbol"
        />
        <info-line
          v-if="mode === StakeDialogMode.REMOVE"
          :label="t('soraStaking.info.unstakingPeriod')"
          :value="unbondPeriodFormatted"
        />
        <info-line
          :label="t('networkFeeText')"
          :label-tooltip="t('networkFeeTooltipText')"
          :value="networkFeeFormatted"
          :asset-symbol="xor?.symbol"
          :fiat-value="getFiatAmountByCodecString(networkFee)"
          is-formatted
        />
      </div>

      <s-card v-if="mode === StakeDialogMode.REMOVE" class="information" shadow="always" primary>
        <div class="information-content">
          <div class="information-text">
            {{ t('soraStaking.allWithdrawsDialog.information') }}
          </div>
          <div class="information-icon">
            <s-icon name="notifications-alert-triangle-24" size="20px" />
          </div>
        </div>
      </s-card>

      <s-button
        v-if="stakingAsset"
        type="primary"
        class="s-typography-button--large action-button"
        :loading="parentLoading || loading"
        :disabled="isInsufficientXorForFee || valueFundsEmpty || isInsufficientBalance"
        @click="handleConfirm"
      >
        <template v-if="isInsufficientXorForFee || isInsufficientBalance">
          {{ t('insufficientBalanceText', { tokenSymbol: stakingAsset.symbol }) }}
        </template>
        <template v-else-if="valueFundsEmpty">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else>
          {{ t('confirmText') }}
        </template>
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { FPNumber, Operation } from '@sora-substrate/sdk';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch, Prop } from 'vue-property-decorator';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';

import { StakeDialogMode } from '../consts';
import StakingMixin from '../mixins/StakingMixin';

import type { CodecString } from '@sora-substrate/sdk';

@Component({
  components: {
    TokenInput: lazyComponent(Components.TokenInput),
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
    AccountCard: components.AccountCard,
  },
})
export default class StakeDialog extends Mixins(StakingMixin, mixins.TransactionMixin, mixins.DialogMixin) {
  @Prop({ required: true, type: String }) readonly mode!: StakeDialogMode;

  @Watch('visible')
  private resetValue() {
    if (this.visible) {
      if (this.mode === StakeDialogMode.NEW) {
        this.value = this.stakeAmount;
      } else {
        this.value = '';
      }
    }
  }

  StakeDialogMode = StakeDialogMode;
  value = '';
  bondAndNominateNetworkFee: string | null = null;

  @Watch('selectedValidators', { immediate: true })
  handleSelectedValidatorsChange() {
    this.withApi(async () => {
      this.bondAndNominateNetworkFee = await this.getBondAndNominateNetworkFee();
    });
  }

  get networkFee(): CodecString {
    switch (this.mode) {
      case StakeDialogMode.NEW:
        return this.bondAndNominateNetworkFee ?? '0';
      case StakeDialogMode.ADD:
        return this.networkFees[Operation.StakingBondExtra];
      default:
        return this.networkFees[Operation.StakingUnbond];
    }
  }

  get title(): string {
    switch (this.mode) {
      case StakeDialogMode.NEW:
        return this.t('soraStaking.actions.confirm');
      case StakeDialogMode.ADD:
        if (this.lockedFunds.isZero()) {
          return this.t('soraStaking.newStake.title');
        } else {
          return this.t('soraStaking.actions.more');
        }
      default:
        return this.t('soraStaking.actions.remove');
    }
  }

  get inputTitle(): string {
    return this.mode !== StakeDialogMode.REMOVE
      ? this.t('soraStaking.stakeDialog.toStake')
      : this.t('soraStaking.stakeDialog.toRemove');
  }

  get part(): FPNumber {
    return new FPNumber(this.value).div(FPNumber.HUNDRED);
  }

  get valueFunds(): FPNumber {
    return new FPNumber(this.value);
  }

  get valueFundsEmpty(): boolean {
    return this.valueFunds.isZero();
  }

  get stakingBalance(): FPNumber {
    return this.mode !== StakeDialogMode.REMOVE ? this.availableFunds : this.lockedFunds;
  }

  get stakingBalanceCodec(): CodecString {
    return this.stakingBalance.toCodecString();
  }

  get maxStake(): FPNumber {
    if (!this.stakingAsset) return FPNumber.ZERO;

    const fee = FPNumber.fromCodecValue(this.networkFee);

    return this.mode !== StakeDialogMode.REMOVE ? this.stakingBalance.sub(fee) : this.stakingBalance;
  }

  get isMaxButtonAvailable(): boolean {
    if (this.shouldBalanceBeHidden) {
      return false; // MAX button behavior discloses hidden balance so it should be hidden in ANY case
    }
    return !FPNumber.eq(this.valueFunds, this.maxStake) && !FPNumber.lte(this.maxStake, FPNumber.ZERO);
  }

  get isInsufficientBalance(): boolean {
    const availableBalance = new FPNumber(this.maxStake, this.stakingAsset?.decimals);

    return FPNumber.lt(availableBalance, this.valueFunds);
  }

  get selectedValidatorsFormatted(): string {
    return this.t('soraStaking.selectedValidators', {
      count: this.selectedValidators.length,
      max: this.validators.length,
    });
  }

  handleValue(value: string | number): void {
    this.value = String(value);
  }

  handleMaxValue(): void {
    this.handleValue(this.maxStake.toString());
  }

  async handleConfirm(): Promise<void> {
    this.setStakeAmount(this.value);

    let extrinsic = this.unbond;
    if (this.mode === StakeDialogMode.NEW) {
      extrinsic = this.bondAndNominate;
    } else if (this.mode === StakeDialogMode.ADD) {
      extrinsic = this.bondExtra;
    }

    await this.withNotifications(async () => await extrinsic());
    this.$emit('confirm');
  }

  async mounted() {
    await this.$nextTick();
    const input: HTMLInputElement | null = this.$el.querySelector('.s-input .el-input__inner');
    input?.focus();
  }
}
</script>

<style lang="scss">
.s-input.s-input--stake-part {
  @include input-slider;
}
</style>

<style lang="scss" scoped>
.stake-dialog {
  @include full-width-button('action-button');

  & > *:not(:first-child) {
    margin-top: $inner-spacing-medium;
  }
}

.el-form--actions {
  @include buttons;
}

.information {
  &-content {
    display: flex;
    gap: 38px;
  }

  &-text {
    font-size: 15px;
    line-height: 150%;
  }

  &-icon {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 42px;
    width: 42px;
    margin-top: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--s-color-status-info);
    border: 2px solid var(--s-color-base-border-primary);
    i {
      margin-bottom: 2px;
      color: white;
    }
  }
}
</style>
