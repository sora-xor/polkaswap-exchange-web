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
    <div class="point-card__name">
      <p>{{ categoryName }}</p>
      <i class="icontype s-icon-arrows-chevron-right-rounded-24" />
    </div>
    <div class="point-card__amount-of-points">
      <p>Next LVL</p>
      <p>{{ this.pointsForCategory.nextLevelRewardPoints }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import { CalculateCategoryPointResult } from '@/types/pointSystem';

import ProgressCard from './ProgressCard.vue';

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
  position: relative;
  padding: 8px;
  border-radius: 12px;
  margin-bottom: 16px;
  text-align: center;

  &__progress {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-bottom: 12px;

    .progress-circle {
      margin-top: 8px;
    }

    p {
      font-size: 12px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 12px;
      margin-left: auto;
      margin-bottom: auto;
      background-color: var(--s-color-base-on-accent);
      color: var(--s-color-base-content-primary);
      span {
        opacity: 0.4;
        font-size: 10px;
      }
    }
  }

  &__name {
    margin-top: 12px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    text-align: left;
    &:hover {
      cursor: pointer;
      p {
        color: var(--s-color-base-content-secondary);
      }
    }
    p {
      font-weight: 300;
      font-size: 15px;
      color: var(--s-color-base-content-primary);
      max-width: 124px;
      word-wrap: break-word;
    }
    i {
      align-self: center;
      color: var(--s-color-base-content-tertiary);
    }
  }

  &__amount-of-points {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background-color: rgba(245, 100, 169, 0.2);
    border-radius: 0 0 12px 12px;

    p {
      font-weight: 800;
      font-size: 11px;
      color: #f564a9;
      &:first-of-type {
        text-align: left;
      }
      &:last-of-type {
        text-align: right;
      }
    }
  }
}
</style>
