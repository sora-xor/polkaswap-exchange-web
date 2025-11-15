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
import { Components } from '@/consts';
import { MAX_LEVEL } from '@/consts/pointSystem';
import { lazyComponent } from '@/router';
import type { CalculateCategoryPointResult } from '@/types/pointSystem';

import ProgressCard from './ProgressCard.vue';

defineOptions({
  components: {
    TaskDialog: lazyComponent(Components.TaskDialog),
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
  margin-top: $inner-spacing-mini;
  margin-bottom: $inner-spacing-mini;
  background-color: var(--s-color-base-content-tertiary);
}
.point-card {
  position: relative;
  padding: $inner-spacing-mini;
  border-radius: $inner-spacing-small;
  text-align: center;

  &__progress {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-bottom: $inner-spacing-small;

    .progress-circle {
      margin-top: $inner-spacing-mini;
    }

    p {
      font-size: 12px;
      font-weight: 700;
      padding: 3px $inner-spacing-mini;
      border-radius: $inner-spacing-small;
      margin-left: auto;
      margin-bottom: auto;
      background-color: var(--s-color-base-on-accent);
      color: var(--s-color-base-content-primary);
      max-width: 100px;
      span {
        opacity: 0.4;
        font-size: 10px;
      }
    }
  }

  &__name {
    margin-top: $inner-spacing-small;
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
      font-size: 12px;
      color: var(--s-color-base-content-primary);
    }
    i {
      align-self: center;
      color: var(--s-color-base-content-tertiary);
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
    padding: $inner-spacing-mini $inner-spacing-big;
  }
}
</style>
