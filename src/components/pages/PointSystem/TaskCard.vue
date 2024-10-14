<template>
  <div class="task-card">
    <div class="task-card__title-image">
      <img :src="imageSrc" :alt="imageName" width="18" height="18" />
      <p>{{ this.pointsForCategory.titleTask }}</p>
    </div>
    <p class="task-card__description-task">{{ this.pointsForCategory.descriptionTask }}</p>
    <div>
      <s-divider />
    </div>
    <div class="task-card__current-progress">
      <p v-if="categoryName === 'firstTxAccount'">Currently {{ formattedCurrentProgress }}</p>
      <p v-else>Currently ${{ this.pointsForCategory.currentProgress.toFixed(2) }}</p>
      <s-button :class="{ completed: !this.pointsForCategory.minimumAmountForNextLevel }" @click="handleButtonClick">
        {{ !this.pointsForCategory.minimumAmountForNextLevel ? 'Completed' : 'Complete' }}
      </s-button>
    </div>
    <task-dialog
      :pointsForCategory="pointsForCategory"
      :visible="isDialogVisible"
      @close="handleDialogClose"
      :onClose="handleDialogClose"
    />
  </div>
</template>

<script lang="ts">
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { CalculateCategoryPointResult } from '@/types/pointSystem';

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
    TaskDialog: lazyComponent(Components.TaskDialog),
  },
})
export default class TaskCard extends Mixins(mixins.TranslationMixin) {
  @Prop({ required: true, type: Object })
  readonly pointsForCategory!: CalculateCategoryPointResult;

  @Prop({ required: true, type: String })
  readonly categoryName!: string;

  private isDialogVisible = false;

  get imageName(): string {
    return this.pointsForCategory.imageName;
  }

  get imageSrc(): string {
    return require(`@/assets/img/points/${this.imageName}.svg`);
  }

  get formattedCurrentProgress(): string {
    if (this.categoryName === 'firstTxAccount' && typeof this.pointsForCategory.currentProgress === 'number') {
      return this.formatDate(this.pointsForCategory.currentProgress, 'L');
    }
    return this.pointsForCategory.currentProgress.toString();
  }

  handleButtonClick() {
    if (this.pointsForCategory.minimumAmountForNextLevel) {
      this.isDialogVisible = true;
    }
  }

  handleDialogClose() {
    this.isDialogVisible = false;
  }
}
</script>
<style lang="scss" scoped>
.task-card {
  .el-divider {
    background-color: var(--s-color-base-content-tertiary);
    margin-top: $basic-spacing-small;
    margin-bottom: $basic-spacing-small;
  }
  .el-button.s-secondary {
    padding: $inner-spacing-tiny $inner-spacing-small;
    background-color: var(--s-color-base-on-accent);
    box-shadow: unset;
    color: var(--s-color-base-content-primary);

    &:hover,
    &:focus {
      box-shadow: var(--s-shadow-element-pressed);
      background-color: var(--s-color-base-on-accent);
      color: var(--s-color-base-content-primary);
    }
  }

  .el-button.completed {
    background-color: transparent;
    color: var(--s-color-base-content-secondary);
    border: 1px solid var(--s-color-base-content-tertiary);

    &:hover,
    &:focus {
      box-shadow: none;
      border: 1px solid var(--s-color-base-content-tertiary);
      background-color: transparent;
      cursor: default;
      color: var(--s-color-base-content-secondary);
      outline: unset !important;
    }
  }

  display: flex;
  flex-direction: column;
  &__title-image {
    display: flex;
    flex-direction: row;
    gap: $basic-spacing-small;
    p {
      font-weight: 800;
    }
  }
  &__description-task {
    color: var(--s-color-base-content-secondary);
    font-weight: 400;
    margin-left: calc($inner-spacing-mini * 3.5);
    margin-top: $inner-spacing-mini;
  }

  &__current-progress {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}
</style>
