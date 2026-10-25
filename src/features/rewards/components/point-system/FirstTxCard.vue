<template>
  <div class="task-card">
    <p class="task-card__first-trx">{{ t('points.firstSoraNetworkTransaction') }}</p>
    <s-divider direction="vertical"></s-divider>

    <div class="task-card__date">
      <p>{{ t('points.dated') }}</p>
      <p>{{ formattedDate }}</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';

/**
 * Presents the details of the user's first transaction in the points dashboard.
 */
defineOptions({
  name: 'FirstTxCard',
});

const props = defineProps<{
  date: number;
}>();

const { t, formatDate } = useTranslation();

const formattedDate = computed(() => formatDate(props.date, 'L'));
</script>

<style lang="scss" scoped>
.task-card {
  .el-divider {
    height: 100%;
    background-color: var(--s-color-base-border-secondary);
  }
  align-items: center;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: $inner-spacing-big;
  &__first-trx {
    color: var(--s-color-base-content-primary);
    font-size: 15px;
    font-weight: 600;
    line-height: 1.25;
    max-width: calc($inner-spacing-large * 4.5);
  }
  &__date {
    display: flex;
    flex-direction: column;
    color: var(--s-color-base-content-secondary);
    font-weight: 800;
    font-size: 11px;
    gap: $inner-spacing-tiny;
    p:last-of-type {
      color: var(--s-color-status-info);
    }
  }
  @include mobile(true) {
    .el-divider {
      display: none;
    }
    &__date {
      gap: unset;
      margin-left: unset;
    }
    &__first-trx {
      margin-right: 16px;
    }
  }
}
</style>
