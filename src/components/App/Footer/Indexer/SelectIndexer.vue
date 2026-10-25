<template>
  <div class="statistics-dialog">
    <s-scrollbar class="statistics-dialog__scrollbar">
      <div class="statistics-dialog__group">
        <span class="statistics-dialog__group-title">{{ t('footer.statistics.dialog.indexer') }}</span>
        <div class="statistics-dialog__block s-flex">
          <div v-for="indexer in indexers" :key="indexer.type" class="statistics-dialog__item service-item s-flex">
            <div class="service-item__label s-flex">
              <div class="service-item__name">{{ indexer.name }}</div>
              <div v-if="indexer.endpoint" class="service-item__endpoint" :title="indexer.endpoint">
                {{ indexer.endpoint }}
              </div>
            </div>
            <div class="service-item__status" :class="indexer.online ? 'success' : 'error'">
              {{ indexer.online ? TranslationConsts.online : TranslationConsts.offline }}
            </div>
          </div>
        </div>
      </div>
    </s-scrollbar>
  </div>
</template>

<script lang="ts" setup>
import { toRef } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import type { Indexer } from '@/types/indexers';

defineOptions({ name: 'SelectIndexer' });

const props = withDefaults(
  defineProps<{
    indexers?: Array<Indexer>;
  }>(),
  {
    indexers: () => [],
  }
);

const { t, TranslationConsts } = useTranslation();
const indexers = toRef(props, 'indexers');
</script>

<style lang="scss" scoped>
$statistics-border-radius: 8px;

.statistics-dialog {
  &__group {
    &-title {
      font-weight: 600;
      letter-spacing: var(--s-letter-spacing-small);
      line-height: var(--s-line-height-small);
      font-size: var(--s-font-size-small);
    }
  }

  &__block {
    flex-direction: column;
    margin-top: $inner-spacing-mini;
    row-gap: $inner-spacing-small;
  }

  &__item {
    align-items: center;
    justify-content: space-between;
    padding: $inner-spacing-medium;
    white-space: normal;
  }
}
.service-item {
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: $inner-spacing-medium;
  background: var(--s-color-base-background);
  border: 1px solid var(--s-color-base-border-secondary);
  border-radius: var(--s-border-radius-mini);
  letter-spacing: var(--s-letter-spacing-small);
  line-height: var(--s-line-height-medium);

  &__label {
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }

  &__name {
    color: var(--s-color-base-content-primary);
    font-size: var(--s-font-size-medium);
    font-weight: 600;
  }

  &__endpoint {
    margin-top: $inner-spacing-tiny;
    border-radius: $statistics-border-radius;
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-mini);
    font-weight: 300;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__status {
    $status-classes: 'error', 'success';

    flex: 0 0 auto;
    padding: 2px 6px;
    border-radius: $statistics-border-radius;
    font-weight: 400;
    font-size: var(--s-font-size-mini);
    letter-spacing: var(--s-letter-spacing-small);

    @each $status in $status-classes {
      &.#{$status} {
        color: var(--s-color-status-#{$status});
        background-color: var(--s-color-status-#{$status}-background);
        [design-system-theme='dark'] & {
          --s-color-status-#{$status}: var(--s-color-base-on-accent);
        }
      }
    }
  }
}
</style>
