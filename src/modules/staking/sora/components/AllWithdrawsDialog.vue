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
            <token-logo class="withdraw-logo" :token-symbol="stakingAsset?.symbol" />
            <formatted-amount-with-fiat-value
              class="amount"
              :asset-symbol="stakingAsset?.symbol"
              symbol-as-decimal
              value-can-be-hidden
              :value="withdraw.valueFormatted"
              :fiat-value="withdrawableFundsFiat"
            />
            <era-countdown
              class="countdown"
              translation-key="soraStaking.withdraw.countdownLeft"
              :target-era="withdraw.era"
            />
          </div>
        </s-card>
      </s-scrollbar>
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
    </div>
  </dialog-base>
</template>

<script lang="ts">
import assert from 'assert';

import { FPNumber } from '@sora-substrate/sdk';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { formatDecimalPlaces } from '@/utils';

import { soraStakingLazyComponent } from '../../router';
import { ERA_HOURS, SoraStakingComponents } from '../consts';
import StakingMixin from '../mixins/StakingMixin';

type Withdraw = {
  id: number;
  era: number;
  value: FPNumber;
  valueFormatted: string;
};

@Component({
  components: {
    TokenInput: lazyComponent(Components.TokenInput),
    ValidatorAvatar: soraStakingLazyComponent(SoraStakingComponents.ValidatorAvatar),
    EraCountdown: soraStakingLazyComponent(SoraStakingComponents.EraCountdown),
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
    FormattedAmount: components.FormattedAmount,
    TokenLogo: components.TokenLogo,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
  },
})
export default class AllWithdrawsDialog extends Mixins(StakingMixin, mixins.DialogMixin, mixins.LoadingMixin) {
  get title(): string {
    return this.t('soraStaking.allWithdrawsDialog.title');
  }

  get allWithdraws() {
    return this.accountLedger?.unlocking ?? null;
  }

  get withdraws(): Withdraw[] {
    if (!this.allWithdraws || !this.stakingAsset) return [];

    const withdraws = this.allWithdraws.map((element) => {
      const value = element.value;
      const era = element.era;

      const hoursTotal = Math.max((element.era - this.currentEra) * ERA_HOURS, 0);

      return {
        era,
        value: FPNumber.fromCodecValue(value),
        countdownHours: hoursTotal,
      };
    });

    const pendingWithdraws = withdraws.filter((withdraw) => withdraw.countdownHours <= 0);
    const upcomingWithdraws = withdraws.filter((withdraw) => withdraw.countdownHours > 0);

    const pendingWithdrawsValueSum = pendingWithdraws.reduce((acc, withdraw) => acc.add(withdraw.value), FPNumber.ZERO);

    const pendingWithdrawsCombined = pendingWithdraws.length
      ? {
          era: pendingWithdraws[0].era,
          value: pendingWithdrawsValueSum,
          countdownHours: 0,
        }
      : null;

    return [...(pendingWithdrawsCombined ? [pendingWithdrawsCombined] : []), ...upcomingWithdraws].map((withdraw) => {
      assert(this.stakingAsset);

      const valueFormatted = formatDecimalPlaces(withdraw.value);
      const valueFiat = this.getFiatAmountByFPNumber(this.withdrawableFunds, this.stakingAsset);

      return {
        ...withdraw,
        id: withdraw.era,
        valueFormatted,
        valueFiat,
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
}

.all-withdraws-scrollbar {
  @include scrollbar;
  height: 200px !important;
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

.amount {
  display: flex;
  flex-direction: column;
  font-weight: 700;
  margin-top: 4px;
}

.countdown {
  margin-left: auto;
  font-weight: 700;
  text-transform: uppercase;
}
</style>
