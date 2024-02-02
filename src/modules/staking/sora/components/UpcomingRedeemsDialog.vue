<template>
  <dialog-base :visible.sync="isVisible" :title="title">
    <div class="upcoming-redeems-dialog">
      <s-scrollbar class="upcoming-redeems-scrollbar">
        <s-card class="information" shadow="always" primary>
          <div class="information-content">
            <div class="information-text">
              {{ t('soraStaking.upcomingRedeemsDialog.information') }}
            </div>
            <div class="information-icon">
              <s-icon name="notifications-alert-triangle-24" size="20px" />
            </div>
          </div>
        </s-card>

        <s-card
          v-for="redeem in redeems"
          :key="redeem.id"
          class="redeem"
          border-radius="medium"
          shadow="always"
          size="mini"
        >
          <div class="redeem-content">
            <div class="value">
              {{ redeem.valueFormatted }}
            </div>
            <div class="countdown">
              {{ redeem.countdownFormatted }}
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

type Redeem = {
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
export default class UpcomingRedeemsDialog extends Mixins(
  StakingMixin,
  ValidatorsMixin,
  mixins.DialogMixin,
  mixins.LoadingMixin
) {
  get title(): string {
    return this.t('soraStaking.upcomingRedeemsDialog.title');
  }

  get upcomingRedeems() {
    return this.accountLedger?.unlocking ?? null;
  }

  get redeems(): Redeem[] {
    if (!this.upcomingRedeems || !this.stakingAsset) return [];

    return this.upcomingRedeems.map((element) => {
      const value = element.value;
      const era = element.era;

      const countdownHoursTotal = (element.era - this.currentEra) * ERA_HOURS;
      const countdownDays = Math.floor(countdownHoursTotal / DAY_HOURS);
      const countdownHours = countdownHoursTotal - countdownDays * DAY_HOURS;
      const countdownFormatted = this.t('soraStaking.info.countdown', { days: countdownDays, hours: countdownHours });

      const valueFormatted = formatDecimalPlaces(FPNumber.fromCodecValue(value)) + ' ' + this.stakingAsset?.symbol;

      return {
        id: era,
        era,
        value,
        valueFormatted,
        countdownFormatted,
      };
    });
  }

  get noReward(): boolean {
    return !this.redeems.length;
  }
}
</script>

<style lang="scss">
.upcoming-redeems-scrollbar {
  .el-scrollbar__wrap {
    overflow-x: hidden;
  }
  .el-scrollbar__bar.is-horizontal {
    display: none;
  }
}
</style>

<style lang="scss" scoped>
.upcoming-redeems-dialog {
  @include full-width-button('action-button');

  & > *:not(:first-child) {
    margin-top: $inner-spacing-medium;
  }
}

.upcoming-redeems-scrollbar {
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

.redeem {
  margin: 12px 24px;
  cursor: pointer;
}

.redeem-content {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 12px;
  padding: 8px 18px 8px 12px;
  margin: 0;
}

.redeem-lines {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.redeem-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 21px;
}

.redeem-check {
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
