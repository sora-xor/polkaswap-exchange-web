<template>
  <div class="point-card">
    <div class="point-card__progress">
      <progress-card :imageName="imageName" :progressPercentage="progressPercentage" />
      <p>LVL {{ levelCurrent }} <span>/ LVL 6</span></p>
    </div>
    <div class="point-card__name">
      <p>{{ this.pointsForCategory.titleProgress }}</p>
      <i class="icontype s-icon-arrows-chevron-right-rounded-24" />
    </div>
    <div class="point-card__currently-amount">
      <p>Currently</p>
      <p>${{ this.pointsForCategory.currentProgress.toFixed(2) }}</p>
    </div>
    <s-divider />
    <div class="point-card__amount-of-points">
      <template v-if="this.pointsForCategory.nextLevelRewardPoints !== null">
        <p>NEXT LVL</p>
        <p>{{ this.pointsForCategory.nextLevelRewardPoints }}</p>
      </template>
      <template v-else>
        <p class="max-level">You reached max lvl</p>
      </template>
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

  get levelCurrent(): number {
    return this.pointsForCategory.levelCurrent;
  }

  get currentProgress(): number {
    return this.pointsForCategory.currentProgress;
  }

  get minimumAmountForNextLevel(): number | null {
    return this.pointsForCategory.minimumAmountForNextLevel;
  }

  get imageName(): string {
    return this.pointsForCategory.imageName;
  }

  get progressPercentage(): number {
    if (!this.minimumAmountForNextLevel || this.minimumAmountForNextLevel === 0) return 0;
    return Math.min((this.currentProgress / this.minimumAmountForNextLevel) * 100, 100);
  }
}
</script>

<style lang="scss" scoped>
.el-divider {
  margin-top: 8px;
  margin-bottom: 8px;
  background-color: var(--s-color-base-content-tertiary);
}
.point-card {
  position: relative;
  padding: 8px;
  border-radius: 12px;
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
    }
    i {
      align-self: center;
      color: var(--s-color-base-content-tertiary);
    }
  }

  &__currently-amount,
  &__amount-of-points {
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    p {
      font-weight: 800;
      font-size: 11px;
      &:first-of-type {
        color: #a19a9d;
      }
    }
  }
  &__currently-amount {
    margin-top: 14px;
    p {
      color: #479aef;
    }
  }
  &__amount-of-points {
    p {
      color: #f564a9;
    }
    .max-level {
      color: #f564a9 !important;
    }
  }
}
</style>
