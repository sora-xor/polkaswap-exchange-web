<template>
  <dialog-base :visible.sync="isVisible" :title="title">
    <div class="claim-rewards-dialog">
      <div class="reward">
        <formatted-amount-with-fiat-value
          class="reward-amount"
          symbol-as-decimal
          value-can-be-hidden
          :value="rewardedFundsCodec"
          :fiat-value="rewardedFundsFiat"
        />
        <template v-if="rewardAsset">
          <token-logo class="reward-logo" :tokenSymbol="rewardAsset.symbol" />
          <span class="reward-symbol">
            {{ rewardAsset.symbol }}
          </span>
        </template>
      </div>

      <s-input
        v-model="rewardsDestination"
        placeholder="Rewards destination address"
        suffix="s-icon-basic-user-24"
        :disabled="true"
      ></s-input>

      <div class="info">
        <info-line
          v-if="stakingInitialized"
          :label="t('soraStaking.info.allRewards')"
          :value="rewardedFundsFormatted"
          :asset-symbol="rewardAsset?.symbol"
          :fiat-value="rewardedFundsFiat"
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
          <template v-if="isInsufficientBalance">
            {{ t('insufficientBalanceText', { tokenSymbol: rewardAsset?.symbol }) }}
          </template>
          <template v-if="isInsufficientXorForFee">
            {{ t('insufficientBalanceText', { tokenSymbol: xor?.symbol }) }}
          </template>
        </template>
        <template v-else-if="valueFundsEmpty">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else>
          {{ t('confirmText') }}
        </template>
      </s-button>
      <div class="check-pending-rewards" @click="checkPendingRewards">
        {{ t('soraStaking.claimRewardsDialog.checkRewards') }} ({{ pendingRewards?.length ?? 0 }})
      </div>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch, Prop } from 'vue-property-decorator';

import StakingMixin from '../mixins/StakingMixin';

import type { CodecString } from '@sora-substrate/util';
import type { NominatorReward } from '@sora-substrate/util/build/staking/types';

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
    TokenLogo: components.TokenLogo,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
  },
})
export default class ClaimRewardsDialog extends Mixins(StakingMixin, mixins.DialogMixin, mixins.LoadingMixin) {
  @Prop({ default: () => true, type: Boolean }) readonly isAdding!: boolean;

  rewardsDestination = '';
  payoutNetworkFee: string | null = null;

  @Watch('visible', { immediate: true })
  @Watch('payeeAddress', { immediate: true })
  handlePayeeAddressChange() {
    if (this.visible) {
      this.rewardsDestination = this.payeeAddress;
    }
  }

  get payeeAddress() {
    switch (this.payee) {
      case 'Stash':
        return this.stash;
      case 'Controller':
        return this.controller;
      default:
        return this.payee;
    }
  }

  @Watch('pendingRewards', { immediate: true })
  async handlePendingRewardsChange() {
    this.payoutNetworkFee = await this.getPayoutNetworkFee({
      payouts: this.pendingRewards
        ? this.pendingRewards.map((r) => ({ era: r.era, validators: r.validators.map((v) => v.address) }))
        : [],
      payee: this.rewardsDestination !== this.payeeAddress ? this.rewardsDestination : undefined,
    });
  }

  get networkFee() {
    return this.payoutNetworkFee || '0';
  }

  get title(): string {
    return this.t('soraStaking.claimRewardsDialog.title');
  }

  get inputTitle(): string {
    return this.title;
  }

  get rewardedFundsCodec(): CodecString {
    return this.rewardedFunds.toCodecString();
  }

  get part(): FPNumber {
    return this.rewardedFunds.div(FPNumber.HUNDRED);
  }

  get valueFundsEmpty(): boolean {
    return this.rewardedFunds.isZero();
  }

  get stakingBalance(): FPNumber {
    return this.availableFunds;
  }

  get stakingBalanceCodec(): CodecString {
    return this.stakingBalance.toCodecString();
  }

  get isInsufficientBalance(): boolean {
    return FPNumber.lt(this.rewardedFunds, this.rewardedFunds);
  }

  get selectedValidatorsFormatted(): string {
    return `${this.selectedValidators.length} (MAX: ${this.validators.length})`;
  }

  get payouts() {
    if (!this.pendingRewards) return [];

    return (this.pendingRewards as NominatorReward).map((r) => ({
      era: r.era,
      validators: r.validators.map((v) => v.address),
    }));
  }

  async handleConfirm(): Promise<void> {
    await this.payout({
      payouts: this.pendingRewards
        ? this.pendingRewards.map((r) => ({ era: r.era, validators: r.validators.map((v) => v.address) }))
        : [],
      payee: this.rewardsDestination !== this.payeeAddress ? this.rewardsDestination : undefined,
    });

    await this.getPendingRewards();

    this.closeDialog();
  }

  checkPendingRewards(): void {
    this.$emit('show-rewards');
  }
}
</script>

<style lang="scss">
.s-input.s-input--stake-part {
  @include input-slider;
}

.claim-rewards-dialog {
  .reward .formatted-amount--fiat-value {
    font-size: 14px !important;
    font-weight: 600;
  }
}
</style>

<style lang="scss" scoped>
.claim-rewards-dialog {
  @include full-width-button('action-button');

  & > *:not(:first-child) {
    margin-top: $inner-spacing-medium;
  }
}

.reward {
  display: flex;
  width: 100%;
  font-size: 32px;
  font-weight: 700;

  &-amount {
    display: flex;
    flex-direction: column;
  }

  &-logo {
    margin-left: auto;
  }

  &-symbol {
    margin-left: 15px;
  }
}

.el-form--actions {
  @include buttons;
}

.info {
  margin-top: 16px;
}

.check-pending-rewards {
  color: var(--s-color-theme-accent);
  text-align: center;
  font-size: 14px;
  line-height: 20px;
  font-style: normal;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
}
</style>
