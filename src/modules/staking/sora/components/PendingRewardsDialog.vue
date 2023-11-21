<template>
  <dialog-base :visible.sync="isVisible" :title="title">
    <div class="pending-rewards-dialog">
      <s-scrollbar class="pending-rewards-scrollbar">
        <s-card class="information">
          <div class="information-text">
            {{ t('soraStaking.pendingRewards.information') }}
          </div>
          <div class="information-icon">
            <s-icon name="notifications-alert-triangle-24" size="24px" />
          </div>
        </s-card>

        <s-card
          v-for="reward in rewards"
          :key="reward.id"
          primary
          class="reward"
          border-radius="medium"
          shadow="always"
          size="big"
        >
          <div class="reward-content">
            <validator-avatar class="avatar" :validator="reward.validator">
              <s-icon v-if="reward.daysLeft < 5" icon="notifications-alert-triangle-24" size="12px" slot="icon" />
            </validator-avatar>
            <div class="reward-lines">
              <div class="reward-line">
                <div class="name">
                  {{ reward.name }}
                </div>
                <div class="value">
                  {{ reward.value }}
                </div>
              </div>
              <div class="reward-line">
                <div class="days-left">
                  {{ reward.daysLeft }}
                </div>
                <formatted-amount class="value-fiat" is-fiat-value with-left-shift :value="reward.valueFiat" />
              </div>
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
        :loading="parentLoading"
        :disabled="isInsufficientXorForFee || noReward"
        @click="handleConfirm"
      >
        <template v-if="isInsufficientXorForFee">
          {{ t('insufficientBalanceText', { tokenSymbol: stakingAsset?.symbol }) }}
        </template>
        <template v-else-if="noReward"> There are no pending rewards </template>
        <template v-else> Payout all </template>
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { FPNumber, Operation } from '@sora-substrate/util';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';

import StakingMixin from '../mixins/StakingMixin';

import type { CodecString } from '@sora-substrate/util';

@Component({
  components: {
    TokenInput: lazyComponent(Components.TokenInput),
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
  },
})
export default class PendingRewardsDialog extends Mixins(StakingMixin, mixins.DialogMixin, mixins.LoadingMixin) {
  get networkFee(): CodecString {
    return this.networkFees[Operation.StakingPayout];
  }

  get title(): string {
    return 'Pending rewards';
  }

  get rewards() {
    if (!this.pendingRewards || !this.rewardAsset) return [];

    const rewards = this.pendingRewards
      .map((element) => {
        return element.validators.map((validator) => {
          const validatorInfo = this.validators.find((v) => v.address === validator.address);
          const validatorIdentity = validatorInfo?.identity;
          const name = validatorIdentity?.info.display ? validatorIdentity?.info.display : validator.address;
          const daysLeft = 0;
          const value = validator.value;
          const valueFiat = this.getFiatAmountByFPNumber(
            new FPNumber(value, this.rewardAsset?.decimals),
            this.rewardAsset ?? undefined
          );

          return {
            id: `${validator.address}-${element.era}`,
            name,
            daysLeft,
            value,
            valueFiat,
            validator: validatorInfo,
          };
        });
      })
      .flat();
    return rewards;
  }

  get noReward(): boolean {
    return !this.rewards.length;
  }

  async handleConfirm(): Promise<void> {
    await this.payoutAll();
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
  height: 380px !important;
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
      border-bottom: 1px solid #eaeaea;
    }
  }
}

.el-form--actions {
  @include buttons;
}

.information-icon {
  margin-top: 8px;
  background: var(--s-color-status-info);
  box-shadow: 20px 20px 60px 0px rgba(0, 0, 0, 0.1), 1px 1px 10px 0px #fff inset,
    -10px -10px 30px 0px rgba(255, 255, 255, 0.9);

  i {
    color: white;
  }
}

.reward {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  box-shadow: var(--s-shadow-element) !important;
  margin: 12px 24px;
}

.reward-content {
  display: flex;
  gap: 12px;
  padding: 8px 12px;
}

.reward-lines {
  display: flex;
  flex-direction: column;
}

.reward-line {
  display: flex;
  justify-content: space-between;
}

.icon {
  background-color: #e0e0e0; /* Placeholder for the icon background */
  border-radius: 50%;
  padding: 10px;
  margin-right: 10px;
}

/* Warning icon style */
.warning-icon {
  color: #ff9800; /* Orange color for warning icon */
}

/* Item details */
.name {
  flex-grow: 1;
  font-weight: bold;
}

.days-left {
  color: #757575; /* Grey color for secondary info */
  font-size: 0.9em;
}

.value {
  font-weight: bold;
  color: #4caf50; /* Green color for value */
}
</style>
