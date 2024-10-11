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
      <p v-else>Currently ${{ this.pointsForCategory.currentProgress }}</p>
      <s-button :class="{ completed: !this.pointsForCategory.minimumAmountForNextLevel }">
        {{ !this.pointsForCategory.minimumAmountForNextLevel ? 'Completed' : 'Complete' }}
      </s-button>
    </div>
  </div>
</template>

<script lang="ts">
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import { CalculateCategoryPointResult } from '@/types/pointSystem';

@Component({
  components: {
    FormattedAmount: components.FormattedAmount,
  },
})
export default class TaskCard extends Mixins(mixins.FormattedAmountMixin, mixins.NumberFormatterMixin) {
  @Prop({ required: true, type: Object })
  readonly pointsForCategory!: CalculateCategoryPointResult;

  @Prop({ required: true, type: String })
  readonly categoryName!: string;

  get imageName(): string {
    return this.pointsForCategory.imageName;
  }

  get imageSrc(): string {
    return require(`@/assets/img/points/${this.imageName}.svg`);
  }

  get formattedCurrentProgress(): string {
    if (this.categoryName === 'firstTxAccount' && typeof this.pointsForCategory.currentProgress === 'number') {
      const date = new Date(this.pointsForCategory.currentProgress);
      return date.toLocaleDateString(); // Format the date as a readable string
    }
    return this.pointsForCategory.currentProgress.toString(); // Return the original value if not firstTxAccount
  }
}
</script>

<style lang="scss" scoped>
.task-card {
  .el-divider {
    background-color: var(--s-color-base-content-tertiary);
    margin-top: 10px;
    margin-bottom: 10px;
  }
  .el-button.s-secondary {
    padding: 6px 12px;
    background-color: #ffffff;
    box-shadow: unset;
    color: var(--s-color-base-content-primary);

    &:hover {
      box-shadow: var(--s-shadow-element-pressed);
      background-color: #ffffff;
      color: var(--s-color-base-content-primary);
    }
  }

  .el-button.completed {
    background-color: transparent;
    color: var(--s-color-base-content-secondary);
    border: 1px solid var(--s-color-base-content-tertiary);

    &:hover {
      box-shadow: none;
      border: 1px solid var(--s-color-base-content-tertiary);
      background-color: transparent;
      cursor: default;
      color: var(--s-color-base-content-secondary);
    }
  }

  display: flex;
  flex-direction: column;
  &__title-image {
    display: flex;
    flex-direction: row;
    gap: 10px;
    p {
      font-weight: 800;
    }
  }
  &__description-task {
    color: var(--s-color-base-content-secondary);
    font-weight: 400;
    margin-left: 28px;
    margin-top: 8px;
  }

  &__current-progress {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}
</style>
