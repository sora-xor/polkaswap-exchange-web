<template>
  <div class="point-card">
    <div class="point-card__progress">
      <progress-card :image-name="imageName" :progress-percentage="progressPercentage"></progress-card>
      <p>
        {{ t('points.lvl').toUpperCase() }} {{ levelCurrent }}
        <span>/ {{ t('points.lvl').toUpperCase() }} {{ maxLevel }}</span>
      </p>
    </div>
    <div class="point-card__name" :class="{ disabled: noNextLevel }" @click="handleClick">
      <p>{{ t(`points.${categoryName}.titleProgress`) }}</p>
      <i v-if="!noNextLevel" class="icontype s-icon-arrows-chevron-right-rounded-24"></i>
    </div>
    <div class="point-card__currently-amount">
      <p>{{ t('points.currently') }}</p>
      <p>${{ pointsForCategory.currentProgress.toFixed(2) }}</p>
    </div>
    <s-divider></s-divider>
    <div class="point-card__amount-of-points">
      <template v-if="!noNextLevel">
        <p>{{ t('points.nextLvl').toUpperCase() }}</p>
        <p>{{ pointsForCategory.nextLevelRewardPoints }}</p>
      </template>
      <template v-else>
        <p class="max-level">{{ t('points.maxLvl') }}</p>
      </template>
    </div>
    <task-dialog
      v-model:visible="isDialogVisible"
      :points-for-category="pointsForCategory"
      :category-name="categoryName"
    ></task-dialog>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { MAX_LEVEL } from '@/consts/pointSystem';
import type { CalculateCategoryPointResult } from '@/types/pointSystem';

import ProgressCard from './ProgressCard.vue';
import TaskDialog from './TaskDialog.vue';

defineOptions({
  name: 'PointCard',
  components: {
    TaskDialog,
    ProgressCard,
  },
});

const props = defineProps<{
  pointsForCategory: CalculateCategoryPointResult;
  categoryName: string;
}>();

const { t } = useTranslation();

const isDialogVisible = ref(false);
const maxLevel = MAX_LEVEL;

const points = computed(() => props.pointsForCategory);

const levelCurrent = computed(() => points.value.levelCurrent);
const minimumAmountForNextLevel = computed(() => points.value.minimumAmountForNextLevel);
const imageName = computed(() => points.value.imageName);
const noNextLevel = computed(() => points.value.nextLevelRewardPoints === null);
const progressPercentage = computed(() => {
  const minimum = minimumAmountForNextLevel.value;
  if (!minimum || minimum === 0) {
    return 0;
  }
  return Math.min((points.value.currentProgress / minimum) * 100, 100);
});

function handleClick(): void {
  if (minimumAmountForNextLevel.value) {
    isDialogVisible.value = true;
  }
}
</script>

<style lang="scss" scoped>
.el-divider {
  background-color: var(--s-color-base-border-secondary);
  margin-bottom: $inner-spacing-small;
  margin-top: $inner-spacing-small;
}
.point-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: $inner-spacing-medium;
  position: relative;
  text-align: left;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;

  &:hover {
    border-color: var(--s-color-theme-accent);
    box-shadow: var(--s-shadow-element);
    transform: translateY(-1px);
  }

  &__progress {
    align-items: flex-start;
    display: flex;
    flex-direction: row;
    gap: $inner-spacing-small;
    justify-content: space-between;
    margin-bottom: $inner-spacing-medium;

    .progress-circle {
      flex: 0 0 auto;
    }

    p {
      background-color: var(--s-color-base-background);
      border: 1px solid var(--s-color-base-border-secondary);
      border-radius: var(--s-border-radius-small);
      color: var(--s-color-base-content-primary);
      font-size: 12px;
      font-weight: 700;
      margin-left: auto;
      max-width: 100px;
      padding: 5px $inner-spacing-mini;
      text-align: center;
      span {
        color: var(--s-color-base-content-secondary);
        font-size: 10px;
      }
    }
  }

  &__name {
    align-items: center;
    display: flex;
    flex-direction: row;
    gap: $inner-spacing-small;
    justify-content: space-between;
    margin-top: auto;
    min-height: 42px;
    &:hover {
      cursor: pointer;
      p {
        color: var(--s-color-theme-accent);
      }
    }
    p {
      font-weight: 300;
      font-size: 15px;
      line-height: 1.25;
      color: var(--s-color-base-content-primary);
    }
    i {
      align-self: center;
      background-color: var(--s-color-base-background);
      border-radius: 50%;
      color: var(--s-color-base-content-secondary);
      flex: 0 0 auto;
      padding: $inner-spacing-mini;
    }
    &.disabled {
      cursor: default;

      &:hover {
        p {
          color: var(--s-color-base-content-primary);
        }
      }
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
      line-height: 1.15;
      &:first-of-type {
        color: var(--s-color-base-content-secondary);
      }
    }
  }
  &__currently-amount {
    margin-top: calc($inner-spacing-small + 2px);
    p {
      color: var(--s-color-status-info);
    }
  }
  &__amount-of-points {
    p {
      color: var(--s-color-status-error);
    }
    .max-level {
      color: var(--s-color-status-error) !important;
    }
  }
  @include mobile(true) {
    padding: $inner-spacing-medium;
  }
}
</style>
