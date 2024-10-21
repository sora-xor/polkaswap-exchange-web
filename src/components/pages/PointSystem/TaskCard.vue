<template>
  <div class="task-card">
    <div class="task-card__title-image">
      <token-logo v-if="isTokenImage" :token="getImageSrc(imageName)" size="small" />
      <img v-else :src="getImageSrc(imageName)" :alt="imageName" />
      <p>{{ pointsForCategory.titleTask }}</p>
    </div>
    <p class="task-card__description-task">{{ pointsForCategory.descriptionTask }}</p>
    <div>
      <s-divider />
    </div>
    <div class="task-card__current-progress">
      <p v-if="categoryName != 'firstTxAccount'">
        Currently: <span>${{ pointsForCategory.currentProgress.toFixed(2) }}</span>
      </p>
      <s-button :class="{ completed: !pointsForCategory.minimumAmountForNextLevel }" @click="handleButtonClick">
        {{ !pointsForCategory.minimumAmountForNextLevel ? 'Completed' : 'Complete' }}
      </s-button>
    </div>
    <task-dialog :pointsForCategory="pointsForCategory" :visible.sync="isDialogVisible" />
  </div>
</template>

<script lang="ts">
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import { Components } from '@/consts';
import { getImageSrc, isTokenImage } from '@/consts/pointSystem';
import { lazyComponent } from '@/router';
import { CalculateCategoryPointResult } from '@/types/pointSystem';

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
    TokenLogo: components.TokenLogo,
    TaskDialog: lazyComponent(Components.TaskDialog),
  },
})
export default class TaskCard extends Mixins(mixins.TranslationMixin) {
  @Prop({ required: true, type: Object })
  readonly pointsForCategory!: CalculateCategoryPointResult;

  @Prop({ required: true, type: String })
  readonly categoryName!: string;

  private isDialogVisible = false;

  getImageSrc(imageName: string): any {
    return getImageSrc(imageName);
  }

  get isTokenImage(): boolean {
    return isTokenImage(this.imageName);
  }

  get imageName(): string {
    return this.pointsForCategory.imageName;
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

<style lang="scss">
.asset-logo--small,
.task-card__title-image img {
  width: 18px !important;
  height: 18px !important;
}
</style>

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
    span {
      color: var(--s-color-status-info);
      margin-left: $inner-spacing-tiny;
    }
    button {
      margin-left: auto;
    }
  }
}
</style>
