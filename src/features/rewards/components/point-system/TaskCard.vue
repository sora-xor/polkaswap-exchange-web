<template>
  <div class="task-card">
    <div class="task-card__title-image">
      <token-logo v-if="isTokenImage" :token="getImageSrc(imageName)" size="small"></token-logo>
      <img v-else :src="getImageSrc(imageName)" :alt="imageName" />
      <p>{{ t(`points.${categoryName}.titleProgress`) }}</p>
    </div>
    <p class="task-card__description-task">{{ t(`points.${categoryName}.descriptionTask`) }}</p>
    <div>
      <s-divider></s-divider>
    </div>
    <div class="task-card__current-progress">
      <p v-if="categoryName != 'firstTxAccount'">
        {{ t('points.currently') }}: <span>${{ pointsForCategory.currentProgress.toFixed(2) }}</span>
      </p>
      <s-button :class="{ completed: isCompleted }" @click="handleButtonClick">
        {{ isCompleted ? tc('points.complete', 1) : tc('points.complete', 2) }}
      </s-button>
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
import { getImageSrc, isTokenImage as isTokenImageName } from '@/consts/pointSystem';
import type { CalculateCategoryPointResult } from '@/types/pointSystem';
import TaskDialog from './TaskDialog.vue';
import WalletComponentFormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';
import WalletComponentTokenLogo from '@/lib/soraneo-wallet/src/components/TokenLogo.vue';

defineOptions({
  name: 'TaskCard',
  components: {
    FormattedAmount: WalletComponentFormattedAmount,
    TokenLogo: WalletComponentTokenLogo,
    TaskDialog,
  },
});

const props = defineProps<{
  pointsForCategory: CalculateCategoryPointResult;
  categoryName: string;
}>();

const { t, tc } = useTranslation();

const isDialogVisible = ref(false);

const imageName = computed(() => props.pointsForCategory.imageName);
const isTokenImage = computed(() => isTokenImageName(imageName.value));
const isCompleted = computed(() => !props.pointsForCategory.minimumAmountForNextLevel);

function handleButtonClick(): void {
  if (!isCompleted.value) {
    isDialogVisible.value = true;
  }
}
</script>

<style lang="scss" scoped>
.task-card {
  .el-divider {
    background-color: var(--s-color-base-border-secondary);
    margin-top: $basic-spacing-small;
    margin-bottom: $basic-spacing-small;
  }
  .el-button.s-secondary {
    padding: $inner-spacing-tiny $inner-spacing-small;
    background-color: var(--s-color-theme-accent);
    border-color: var(--s-color-theme-accent);
    box-shadow: unset;
    color: var(--s-color-base-on-accent);

    &:hover,
    &:focus {
      box-shadow: var(--s-shadow-element);
      background-color: var(--s-color-theme-accent-hover);
      border-color: var(--s-color-theme-accent-hover);
      color: var(--s-color-base-on-accent);
    }
  }

  .el-button.completed {
    background-color: transparent;
    color: var(--s-color-base-content-secondary);
    border: 1px solid var(--s-color-base-border-secondary);

    &:hover,
    &:focus {
      box-shadow: none;
      border: 1px solid var(--s-color-base-border-secondary);
      background-color: transparent;
      cursor: default;
      color: var(--s-color-base-content-secondary);
      outline: unset !important;
    }
  }

  display: flex;
  flex-direction: column;
  gap: $inner-spacing-mini;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;

  &:hover {
    border-color: var(--s-color-theme-accent);
    box-shadow: var(--s-shadow-element);
    transform: translateY(-1px);
  }

  &__title-image {
    align-items: center;
    display: flex;
    flex-direction: row;
    gap: $basic-spacing-small;

    :deep(.asset-logo--small),
    img {
      width: 18px;
      height: 18px;
    }

    p {
      color: var(--s-color-base-content-primary);
      font-weight: 700;
      line-height: 1.2;
    }
  }
  &__description-task {
    color: var(--s-color-base-content-secondary);
    font-weight: 400;
    margin-left: calc($inner-spacing-mini * 3.5);
    margin-top: 0;
    max-width: calc(100% - $inner-spacing-big);
  }

  &__current-progress {
    gap: $inner-spacing-small;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    span {
      color: var(--s-color-status-info);
      margin-left: $inner-spacing-tiny;
    }
    p {
      color: var(--s-color-base-content-secondary);
      font-weight: 700;
    }
    button {
      margin-left: auto;
    }
  }

  @include mobile(true) {
    &__description-task {
      margin-left: 0;
      max-width: 100%;
    }
  }
}
</style>
