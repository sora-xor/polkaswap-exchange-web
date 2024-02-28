<template>
  <span> {{ days }}D {{ hours }}H {{ minutes }}M {{ translationKey ? t(translationKey) : '' }} </span>
</template>

<script lang="ts">
import { components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';

import { soraStakingLazyComponent } from '../../router';
import { SoraStakingComponents } from '../consts';
import StakingMixin from '../mixins/StakingMixin';

@Component({
  components: {
    TokenInput: lazyComponent(Components.TokenInput),
    ValidatorAvatar: soraStakingLazyComponent(SoraStakingComponents.ValidatorAvatar),
    DialogBase: components.DialogBase,
    InfoLine: components.InfoLine,
    FormattedAmount: components.FormattedAmount,
    TokenLogo: components.TokenLogo,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
  },
})
export default class EraCountdown extends Mixins(StakingMixin) {
  @Prop({ type: String }) readonly translationKey!: string;
  @Prop({ type: Number }) readonly targetEra!: number;

  interval: ReturnType<typeof setInterval> | null = null;

  days = 0;
  hours = 0;
  minutes = 0;

  calcCountdown() {
    if (!this.activeEraStart || !this.activeEra) return;

    // Calculate the number of eras until the target era
    const erasToTarget = this.targetEra - this.activeEra;
    if (erasToTarget <= 0) {
      // If the target era is the current era or a past era, set countdown to 0
      this.days = 0;
      this.hours = 0;
      this.minutes = 0;
      return;
    }

    // Each era lasts for 6 hours, so calculate the total hours to target
    const totalHoursToTarget = erasToTarget * 6;

    // Calculate the target date and time by adding the total hours to the active era's start date
    const start = new Date(this.activeEraStart);
    const targetDateTime = new Date(start.getTime() + totalHoursToTarget * 3600000); // 3600000 ms in an hour

    // Get the current date and time
    const now = new Date();

    // Calculate the difference in milliseconds between now and the target date/time
    const diff = targetDateTime.getTime() - now.getTime();

    // Ensure that the difference is not negative; if it is, set countdown to 0
    if (diff <= 0) {
      this.days = 0;
      this.hours = 0;
      this.minutes = 0;
      return;
    }

    // Convert the difference from milliseconds to days, hours, and minutes
    this.days = Math.floor(diff / (1000 * 60 * 60 * 24));
    this.hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    this.minutes = Math.floor((diff / (1000 * 60)) % 60);
  }

  mounted() {
    this.calcCountdown();
    this.interval = setInterval(this.calcCountdown, 10_000);
  }

  beforeUnmount() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}
</script>
