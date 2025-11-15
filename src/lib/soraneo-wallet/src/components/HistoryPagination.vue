<template>
  <s-pagination class="history-pagination" layout="slot" :current-page="currentPage" :page-size="pageAmount">
    <span class="el-pagination__total">{{ totalText }}</span>
    <s-button
      type="link"
      :tooltip="t('firstText')"
      :disabled="disabledFirstPrev"
      @click="handlePaginationClick(PaginationButton.First)"
    >
      <s-icon name="chevrons-left-16" size="14"></s-icon>
    </s-button>
    <s-button
      type="link"
      :tooltip="t('prevText')"
      :disabled="disabledFirstPrev"
      @click="handlePaginationClick(PaginationButton.Prev)"
    >
      <s-icon name="chevron-left-16" size="14"></s-icon>
    </s-button>
    <s-button
      type="link"
      :tooltip="t('nextText')"
      :disabled="disabledNextLast"
      @click="handlePaginationClick(PaginationButton.Next)"
    >
      <s-icon name="chevron-right-16" size="14"></s-icon>
    </s-button>
    <s-button
      type="link"
      :tooltip="t('lastText')"
      :disabled="disabledNextLast"
      @click="handlePaginationClick(PaginationButton.Last)"
    >
      <s-icon name="chevrons-right-16" size="14"></s-icon>
    </s-button>
  </s-pagination>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { PaginationButton } from '@/consts';

const props = withDefaults(
  defineProps<{
    currentPage?: number;
    pageAmount?: number;
    total?: number;
    loading?: boolean;
    lastPage?: number;
  }>(),
  {
    currentPage: 1,
    pageAmount: 10,
    total: 0,
    loading: false,
    lastPage: 1,
  }
);

const emit = defineEmits<{
  (event: 'pagination-click', value: PaginationButton): void;
}>();

const { t } = useTranslation();

const totalText = computed(() => {
  const upperNumber = props.pageAmount * props.currentPage;
  const lowerBound = upperNumber - props.pageAmount + 1;
  const upperBound = upperNumber > props.total ? props.total : upperNumber;

  return t('ofText', {
    first: `${lowerBound}-${upperBound}`,
    second: props.total,
  });
});

const disabledFirstPrev = computed(() => props.currentPage === 1 || Boolean(props.loading));

const disabledNextLast = computed(() => props.currentPage === props.lastPage || Boolean(props.loading));

const handlePaginationClick = (button: PaginationButton) => {
  emit('pagination-click', button);
};

defineExpose({
  handlePaginationClick,
});
</script>

<style lang="scss">
.history-pagination.el-pagination {
  margin-top: #{$basic-spacing-medium};
  display: flex;
  justify-content: flex-end;
  align-items: baseline;
  padding-left: 0;
  padding-right: 0;
  .el-pagination__total {
    margin-right: auto;
    letter-spacing: var(--s-letter-spacing-small);
    color: var(--s-color-base-content-secondary);
  }
  .el-button.neumorphic {
    margin-left: 0;
    height: var(--s-small-medium);
    padding: 0;
    &:not(:hover):not(:active) {
      color: var(--s-color-base-content-tertiary);
    }
    span {
      min-width: calc(var(--s-basic-spacing) * 2.5);
    }
  }
}
</style>
