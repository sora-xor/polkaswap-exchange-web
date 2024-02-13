<template>
  <dialog-base :visible.sync="isVisible" :title="title">
    <div class="pending-rewards-dialog">
      <s-scrollbar class="pending-rewards-scrollbar">
        <s-card class="information" shadow="always" primary>
          <div class="information-content">
            <div class="information-text">
              {{ t('soraStaking.pendingRewardsDialog.information') }}
            </div>
            <div class="information-icon">
              <s-icon name="notifications-alert-triangle-24" size="20px" />
            </div>
          </div>
        </s-card>

        <s-card
          v-for="reward in rewards"
          :key="reward.id"
          class="reward"
          border-radius="medium"
          shadow="always"
          size="mini"
          @click.native="toggleRewardSelection(reward)"
        >
          <div class="reward-content">
            <validator-avatar class="avatar" :validator="reward.validator">
              <s-icon
                class="alert-icon"
                v-if="reward.alert"
                name="notifications-alert-triangle-24"
                size="16px"
                slot="icon"
              />
            </validator-avatar>
            <div class="reward-lines">
              <div class="reward-line">
                <div class="name">
                  {{ reward.name }}
                </div>
                <div class="value">
                  {{ reward.valueFormatted }}
                </div>
              </div>
              <div class="reward-line">
                <div :class="computedClassDaysLeft(reward.alert)">
                  {{ reward.daysLeftFormatted }}
                </div>
                <formatted-amount class="value-fiat" is-fiat-value with-left-shift :value="reward.valueFiat" />
              </div>
            </div>
            <div :class="{ ['reward-check']: true, ['reward-check--selected']: isRewardSelected(reward) }">
              <s-icon name="basic-check-mark-24" size="18px" />
            </div>
          </div>
        </s-card>
      </s-scrollbar>

      <div class="info">
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
        :loading="parentLoading || loading"
        :disabled="isInsufficientXorForFee || noReward || noSelectedRewards"
        @click="handleConfirm"
      >
        <template v-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: stakingAsset?.symbol }) }}
        </template>
        <template v-else-if="noReward">{{ t('soraStaking.pendingRewardsDialog.noPendingRewards') }}</template>
        <template v-else-if="noSelectedRewards">{{ t('soraStaking.pendingRewardsDialog.noSelectedRewards') }}</template>
        <template v-else>{{ t('soraStaking.pendingRewardsDialog.payout') }} ({{ selectedRewards.length }})</template>
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { formatDecimalPlaces } from '@/utils';

import { soraStakingLazyComponent } from '../../router';
import { ERA_HOURS, SoraStakingComponents } from '../consts';
import StakingMixin from '../mixins/StakingMixin';
import ValidatorsMixin from '../mixins/ValidatorsMixin';

import type { ValidatorInfoFull } from '@sora-substrate/util/build/staking/types';

type Reward = {
  id: string;
  era: string;
  validators: {
    address: string;
    value: string;
  }[];
  name: string;
  daysLeft: number;
  daysLeftFormatted: string;
  alert: boolean;
  value: string;
  valueFormatted: string;
  valueFiat: Nullable<string>;
  validator: ValidatorInfoFull;
};

@Component({
  components: {
    TokenInput: lazyComponent(Components.TokenInput),
    ValidatorAvatar: soraStakingLazyComponent(SoraStakingComponents.ValidatorAvatar),
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
    FormattedAmount: components.FormattedAmount,
  },
})
export default class PendingRewardsDialog extends Mixins(
  StakingMixin,
  ValidatorsMixin,
  mixins.TransactionMixin,
  mixins.DialogMixin
) {
  payoutNetworkFee: string | null = null;
  selectedRewards: Reward[] = [];

  @Watch('visible', { immediate: true })
  private resetValue() {
    if (this.visible) {
      this.selectedRewards = [];
    }
  }

  @Watch('selectedRewards')
  async handlePendingRewardsChange() {
    this.payoutNetworkFee = await this.getPayoutNetworkFee({
      payouts: this.payouts,
    });
  }

  get networkFee() {
    return this.payoutNetworkFee ?? '0';
  }

  get title(): string {
    return this.t('soraStaking.pendingRewardsDialog.title');
  }

  get rewards(): Reward[] {
    if (!this.pendingRewards || !this.rewardAsset) return [];

    const rewards = this.pendingRewards
      .map((element) => {
        return element.validators.map((validator) => {
          const validatorInfo = this.validators.find((v) => v.address === validator.address);
          if (!validatorInfo) {
            throw new Error(`There is no validator "${validator.address}" in the list`);
          }
          const name = this.formatName(validatorInfo);
          const hoursLeft = ((this.historyDepth ?? 0) - (this.currentEra - Number(element.era))) * ERA_HOURS;
          const daysLeft = Math.floor(hoursLeft / 24);
          const daysLeftFormatted = daysLeft < 1 ? 'less then 1 day left' : daysLeft + ' days left';
          const alert = daysLeft < 5;
          const value = validator.value;
          const valueFormatted =
            formatDecimalPlaces(new FPNumber(value, this.rewardAsset?.decimals)) + ' ' + this.rewardAsset?.symbol;
          const valueFiat = this.getFiatAmountByFPNumber(
            new FPNumber(value, this.rewardAsset?.decimals),
            this.rewardAsset ?? undefined
          );

          return {
            id: `${validator.address}-${element.era}`,
            era: element.era,
            validators: element.validators,
            name,
            daysLeft,
            daysLeftFormatted,
            alert,
            value,
            valueFormatted,
            valueFiat,
            validator: validatorInfo,
          };
        });
      })
      .flat();
    return rewards;
  }

  isRewardSelected(reward: Reward) {
    return this.selectedRewards.some((r) => r.id === reward.id);
  }

  toggleRewardSelection(reward: Reward) {
    const index = this.selectedRewards.findIndex((r) => r.id === reward.id);
    const selected = [...this.selectedRewards];
    if (index > -1) {
      selected.splice(index, 1);
    } else {
      selected.push(reward);
    }
    this.selectedRewards = selected;
  }

  computedClassDaysLeft(alert: boolean): string {
    const base = ['days-left'];

    if (alert) base.push('days-left--alert');

    return base.join(' ');
  }

  get noReward(): boolean {
    return !this.rewards.length;
  }

  get noSelectedRewards(): boolean {
    return !this.selectedRewards.length;
  }

  get payouts() {
    return this.selectedRewards.map((r) => ({ era: r.era, validators: r.validators.map((v) => v.address) }));
  }

  async handleConfirm(): Promise<void> {
    await this.withNotifications(async () => {
      await this.payout({
        payouts: this.payouts,
      });

      await this.getPendingRewards();

      this.closeDialog();
    });
  }
}
</script>

<style lang="scss">
.pending-rewards-scrollbar {
  .el-scrollbar__wrap {
    overflow-x: hidden;
  }
  .el-scrollbar__bar.is-horizontal {
    display: none;
  }
}
</style>

<style lang="scss" scoped>
.pending-rewards-dialog {
  @include full-width-button('action-button');

  & > *:not(:first-child) {
    margin-top: $inner-spacing-medium;
  }
}

.pending-rewards-scrollbar {
  @include scrollbar;
  height: 410px !important;
  margin: 0 -24px !important;

  ul {
    list-style-type: none;
    padding: 0 24px;
    padding-bottom: 64px;

    li {
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 100%;
      padding: 10px 0;
      border-bottom: 1px solid var(--s-color-base-border-secondary);
    }
  }
}

.el-form--actions {
  @include buttons;
}

.information {
  margin: 12px 24px 24px;

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
    // box-shadow: 20px 20px 60px 0px rgba(0, 0, 0, 0.1), 1px 1px 10px 0px #fff inset,
    //   -10px -10px 30px 0px rgba(255, 255, 255, 0.9);

    i {
      margin-bottom: 2px;
      color: white;
    }
  }
}

.reward {
  margin: 12px 24px;
  cursor: pointer;
}

.reward-content {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 12px;
  padding: 8px 18px 8px 12px;
  margin: 0;
}

.reward-lines {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.reward-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 21px;
}

.reward-check {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 32px;
  height: 32px;
  margin-right: -6px;
  background: var(--s-color-base-content-tertiary);
  border-radius: 50%;

  &--selected {
    background: var(--s-color-theme-accent);
  }

  i {
    color: var(--s-color-base-on-accent);
  }
}

.avatar {
  flex-shrink: 0;
}

/* Warning icon style */
.alert-icon {
  margin-bottom: 3px;
  color: var(--s-color-status-warning);
}

/* Item details */
.name {
  flex-grow: 1;
  font-weight: bold;
}

.days-left {
  color: var(--s-color-base-content-secondary);
  font-size: 0.9em;

  &--alert {
    color: var(--s-color-status-warning);
  }
}

.value {
  font-weight: bold;
}
</style>
