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

      <s-button
        type="primary"
        class="s-typography-button--large action-button"
        :loading="parentLoading"
        :disabled="isInsufficientXorForFee || valueFundsEmpty || isInsufficientBalance"
        @click="handleConfirm"
      >
        <template v-if="isInsufficientXorForFee || isInsufficientBalance">
          {{ t('insufficientBalanceText', { tokenSymbol: stakingAsset?.symbol }) }}
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
import { FPNumber, Operation } from '@sora-substrate/util';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch, Prop } from 'vue-property-decorator';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';

import { StakeDialogMode } from '../consts';
import StakingMixin from '../mixins/StakingMixin';

import type { CodecString } from '@sora-substrate/util';

@Component({
  components: {
    TokenInput: lazyComponent(Components.TokenInput),
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
    AccountCard: components.AccountCard,
  },
})
export default class StakeDialog extends Mixins(StakingMixin, mixins.DialogMixin, mixins.LoadingMixin) {
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
        return this.bondAndNominateNetworkFee || '0';
      case StakeDialogMode.ADD:
        return this.networkFees[Operation.StakingBondExtra];
      default:
        return this.networkFees[Operation.StakingUnbond];
    }
  }

  get title(): string {
    switch (this.mode) {
      case StakeDialogMode.NEW:
        return 'Confirm Staking';
      case StakeDialogMode.ADD:
        return 'Stake More';
      default:
        return 'Remove Stake';
    }
  }

  get inputTitle(): string {
    return this.mode !== StakeDialogMode.REMOVE ? 'To stake' : 'To remove';
  }

  get valuePartCharClass(): string {
    const charClassName =
      {
        3: 'three',
        2: 'two',
      }[this.value.toString().length] ?? 'one';

    return `${charClassName}-char`;
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
    return !FPNumber.eq(this.valueFunds, this.maxStake) && !FPNumber.lte(this.maxStake, FPNumber.ZERO);
  }

  get isInsufficientBalance(): boolean {
    const availableBalance = new FPNumber(this.maxStake, this.stakingAsset?.decimals);

    return FPNumber.lt(availableBalance, this.valueFunds);
  }

  get selectedValidatorsFormatted(): string {
    return `${this.selectedValidators.length} (MAX: ${this.validators.length})`;
  }

  handleValue(value: string | number): void {
    this.value = String(value);
  }

  handleMaxValue(): void {
    this.handleValue(this.maxStake.toString());
  }

  async handleConfirm(): Promise<void> {
    this.setStakeAmount(this.value);

    if (this.mode === StakeDialogMode.NEW) {
      await this.bondAndNominate();
    } else if (this.mode === StakeDialogMode.ADD) {
      await this.bondExtra();
    } else {
      await this.unbond();
    }
    this.$emit('confirm');
  }
}
</script>

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
</style>

<style lang="scss">
.s-input.s-input--stake-part {
  @include input-slider;
}
</style>
