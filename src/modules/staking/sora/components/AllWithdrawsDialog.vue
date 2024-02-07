<template>
  <dialog-base :visible.sync="isVisible" :title="title">
    <div class="all-withdraws-dialog">
      <s-scrollbar class="all-withdraws-scrollbar">
        <s-card
          v-for="withdraw in withdraws"
          :key="withdraw.id"
          class="withdraw"
          border-radius="medium"
          shadow="always"
          size="mini"
        >
          <div class="withdraw-content">
            <div class="value">
              {{ withdraw.valueFormatted }}
            </div>
            <s-icon name="el-icon-timer" />
            <div class="countdown">
              {{ withdraw.countdownFormatted }}
            </div>
          </div>
        </s-card>
        <s-card class="information" shadow="always" primary>
          <div class="information-content">
            <div class="information-text">
              {{ t('soraStaking.allWithdrawsDialog.information') }}
            </div>
            <div class="information-icon">
              <s-icon name="notifications-alert-triangle-24" size="20px" />
            </div>
          </div>
        </s-card>
      </s-scrollbar>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { FPNumber } from '@sora-substrate/util';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { formatDecimalPlaces } from '@/utils';

import { soraStakingLazyComponent } from '../../router';
import { DAY_HOURS, ERA_HOURS, SoraStakingComponents } from '../consts';
import StakingMixin from '../mixins/StakingMixin';
import ValidatorsMixin from '../mixins/ValidatorsMixin';

type Withdraw = {
  id: number;
  era: number;
  value: string;
  valueFormatted: string;
  countdownFormatted: string;
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
export default class AllWithdrawsDialog extends Mixins(
  StakingMixin,
  ValidatorsMixin,
  mixins.DialogMixin,
  mixins.LoadingMixin
) {
  get title(): string {
    return this.t('soraStaking.allWithdrawsDialog.title');
  }

  get allWithdraws() {
    return this.accountLedger?.unlocking ?? null;
  }

  get withdraws(): Withdraw[] {
    if (!this.allWithdraws || !this.stakingAsset) return [];

    return this.allWithdraws.map((element) => {
      const value = element.value;
      const era = element.era;

      const hoursTotal = Math.max((element.era - this.currentEra) * ERA_HOURS, 0);
      const days = Math.floor(hoursTotal / DAY_HOURS);
      const hours = hoursTotal - days * DAY_HOURS;
      const minutes = 0;
      const countdownFormatted = this.t('soraStaking.withdraw.countdown', { days, hours, minutes });

      const valueFormatted = formatDecimalPlaces(FPNumber.fromCodecValue(value)) + ' ' + this.stakingAsset?.symbol;

      return {
        id: era,
        era,
        value,
        valueFormatted,
        countdownHours: hoursTotal,
        countdownFormatted,
      };
    });
  }

  get noReward(): boolean {
    return !this.withdraws.length;
  }
}
</script>

<style lang="scss">
.all-withdraws-scrollbar {
  .el-scrollbar__wrap {
    overflow-x: hidden;
  }
  .el-scrollbar__bar.is-horizontal {
    display: none;
  }
}
</style>

<style lang="scss" scoped>
.all-withdraws-dialog {
  @include full-width-button('action-button');

  & > *:not(:first-child) {
    margin-top: $inner-spacing-medium;
  }
}

.all-withdraws-scrollbar {
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

.withdraw {
  margin: 12px 24px;
  cursor: pointer;
}

.withdraw-content {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 12px;
  padding: 8px 18px 8px 12px;
  margin: 0;
}

.withdraw-lines {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.withdraw-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 21px;
}

.withdraw-check {
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
  flex: 1;
}
</style>
