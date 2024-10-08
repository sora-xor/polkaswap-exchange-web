<!-- <div class="point-card__info">
        <p>Level: {{ levelCurrent }}</p>
        <p>Points: {{ this.pointsForCategory.points }}</p>
        <p>Current Progress: {{ currentProgress }}</p>
        <p>Minimum Amount For Next Level: {{ minimumAmountForNextLevel }}</p>
        <p>Next Level Reward Points: {{ this.pointsForCategory.nextLevelRewardPoints }}</p>
        <p>Threshold: {{ this.pointsForCategory.threshold }}</p>
      </div> -->

<template>
  <div class="point-card">
    <div class="point-card__progress">
      <progress-card imageName="governance" :progressPercentage="progressPercentage" />
      <p>LVL {{ levelCurrent }} <span>/ LVL 5</span></p>
    </div>
    <p>{{ categoryName }}</p>
  </div>
</template>

<script lang="ts">
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import { CalculateCategoryPointResult } from '@/types/pointSystem';

import ProgressCard from './ProgressCard.vue'; // Adjust the import path as needed

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
    ProgressCard,
  },
})
export default class PointCard extends Mixins(mixins.FormattedAmountMixin, mixins.NumberFormatterMixin) {
  @Prop({ required: true, type: Object })
  readonly pointsForCategory!: CalculateCategoryPointResult;

  @Prop({ required: true, type: String })
  readonly categoryName!: string;

  get levelCurrent(): number {
    return this.pointsForCategory.levelCurrent;
  }

  get currentProgress(): number {
    return this.pointsForCategory.currentProgress;
  }

  get minimumAmountForNextLevel(): number | null {
    return this.pointsForCategory.minimumAmountForNextLevel;
  }

  get progressPercentage(): number {
    if (!this.minimumAmountForNextLevel || this.minimumAmountForNextLevel === 0) return 0;
    return Math.min((this.currentProgress / this.minimumAmountForNextLevel) * 100, 100);
  }
}
</script>

<style lang="scss" scoped>
.point-card {
  padding: 8px;
  border-radius: 12px;
  margin-bottom: 16px;
  text-align: center;

  &__progress {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 12px;

    p {
      font-size: 14px;
      margin-top: 12px;
    }
  }
}
</style>
