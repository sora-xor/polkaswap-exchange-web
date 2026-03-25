<template>
  <dialog-base v-model:visible="isVisible" class="task-dialog" :title="t(`points.${categoryName}.titleProgress`)">
    <div>
      <p class="task-dialog__title-progress">
        {{ t('points.relatedTasks', { title: t(`points.${categoryName}.titleProgress`) }) }}
      </p>
      <div class="task-dialog__card-progress">
        <div class="current-level">
          <p>{{ t('points.yourLevel') }}</p>
          <p>
            {{ t('points.lvl').toUpperCase() }} {{ levelCurrent }}
            <span>/ {{ t('points.lvl').toUpperCase() }} {{ maxLevel }}</span>
          </p>
        </div>
        <div class="progress-container">
          <div class="progress-bar" :style="{ width: progressPercentage + '%' }"></div>
        </div>

        <div class="next-level">
          <p>{{ t('points.rewardNextLvl') }}</p>
          <p>{{ pointsForCategory.nextLevelRewardPoints }}</p>
        </div>
      </div>
      <div class="task-dialog__card-current">
        <div class="img-title">
          <token-logo v-if="isTokenImage" :token="getImageSrc(imageName)" size="small"></token-logo>
          <img v-else :src="getImageSrc(imageName)" :alt="imageName" />
          <p>{{ t(`points.${categoryName}.titleTask`) }}</p>
        </div>
        <p class="description">{{ t(`points.${categoryName}.descriptionTask`) }}</p>
        <s-divider></s-divider>
        <p class="currently-amount">
          {{ t('points.currently') }}: <span> ${{ pointsForCategory.currentProgress.toFixed(2) }}</span>
        </p>
      </div>
    </div>
  </dialog-base>
</template>

<script lang="ts" setup>
import { components } from '@/shims/wallet-components';
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { getImageSrc as resolveImageSrc, isTokenImage as isTokenImageName, MAX_LEVEL } from '@/consts/pointSystem';
import type { CalculateCategoryPointResult } from '@/types/pointSystem';

defineOptions({
  components: {
    DialogBase: components.DialogBase,
    TokenLogo: components.TokenLogo,
  },
});

const props = withDefaults(
  defineProps<{
    pointsForCategory: CalculateCategoryPointResult;
    categoryName: string;
  }>(),
  {}
);

const emit = defineEmits<{
  (event: 'close'): void;
}>();

const isVisible = defineModel<boolean>('visible', { default: false });
const { t } = useTranslation();

const maxLevel = MAX_LEVEL;
const getImageSrc = resolveImageSrc;

const imageName = computed(() => props.pointsForCategory.imageName);
const isTokenImage = computed(() => isTokenImageName(imageName.value));
const levelCurrent = computed(() => props.pointsForCategory.levelCurrent);
const progressPercentage = computed(() => {
  const { minimumAmountForNextLevel, currentProgress } = props.pointsForCategory;
  if (!minimumAmountForNextLevel || minimumAmountForNextLevel === 0) {
    return 0;
  }
  return Math.min((currentProgress / minimumAmountForNextLevel) * 100, 100);
});
</script>

<style lang="scss" scoped>
.task-dialog {
  @include browser-notification-dialog;
  .el-divider {
    margin-top: $basic-spacing-small;
    margin-bottom: $inner-spacing-medium;
    background-color: var(--s-color-base-content-tertiary);
  }
  &__title-progress {
    text-align: left;
  }
  &__card-progress,
  &__card-current {
    background-color: var(--s-color-base-border-primary);
    border-radius: var(--s-border-radius-mini);
    display: flex;
    flex-direction: column;
  }
  &__card-progress {
    box-shadow: var(--s-shadow-dialog);
    margin-top: $inner-spacing-medium;
    margin-bottom: $inner-spacing-small;
    padding: $inner-spacing-small;
    .next-level,
    .current-level {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
    }
    .current-level {
      p:first-of-type {
        font-size: 14px;
        font-weight: 800;
        color: var(--s-color-base-content-secondary);
      }
      p:last-child {
        font-weight: 700;
        color: var(--s-color-base-content-primary);
        span {
          opacity: 0.4;
          font-size: 10px;
        }
      }
    }
    .progress-container {
      margin-top: $inner-spacing-small;
      margin-bottom: $inner-spacing-medium;
      background-color: var(--s-color-base-content-tertiary);
      border-radius: $basic-spacing-small;
      height: $basic-spacing-mini;
      .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, var(--s-color-status-info) 100%, #2b94ff 100%);
        box-shadow: 0px 0px $inner-spacing-tiny rgba(71, 154, 239, 0.5);
        border-radius: inherit;
      }
    }
    .next-level {
      background: var(--s-color-theme-accent-hover);
      padding: $inner-spacing-medium;
      border-radius: 0 0 $inner-spacing-medium $inner-spacing-medium;
      color: var(--s-color-base-on-accent);
      font-size: $inner-spacing-small;
      font-weight: 800;
      margin: 0px -12px -12px -12px;
      box-shadow: 0px 4px 40px rgba(245, 98, 168, 0.4);
    }
  }
  &__card-current {
    margin-top: $inner-spacing-small;
    padding: $inner-spacing-small;
    .img-title {
      display: flex;
      flex-direction: row;
      gap: $inner-spacing-small;
      margin-bottom: $inner-spacing-mini;
      p {
        font-size: 14px;
        font-weight: 800;
        color: var(--s-color-base-content-primary);
      }
      img {
        width: 18px;
        height: 18px;
      }
    }
    .description,
    .currently-amount {
      align-self: flex-start;
      font-weight: 400;
    }
    .description {
      margin-left: calc($basic-spacing-small * 3);
      color: var(--s-color-base-content-secondary);
      max-width: $explore-search-input-max-width;
      text-align: left;
    }
    .currently-amount {
      color: var(--s-color-base-content-secondary);
      font-size: 14px;
      span {
        color: var(--s-color-status-info);
        margin-left: $inner-spacing-mini;
      }
    }
  }
}
</style>
