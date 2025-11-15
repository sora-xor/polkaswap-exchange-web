<template>
  <s-skeleton :loading="loading" animated>
    <template #template>
      <div class="data-row-skeleton">
        <s-skeleton-item v-if="rect" element="rect"></s-skeleton-item>
        <s-skeleton-item v-if="circle" element="circle"></s-skeleton-item>
      </div>
    </template>
    <slot></slot>
  </s-skeleton>
</template>

<script lang="ts" setup>
import { SSkeleton, SSkeletonItem } from '@soramitsu-ui/ui/components/Skeleton';

defineOptions({
  name: 'DataRowSkeleton',
  components: {
    SSkeleton,
    SSkeletonItem,
  },
});

withDefaults(
  defineProps<{
    loading?: boolean;
    rect?: boolean;
    circle?: boolean;
  }>(),
  {
    loading: true,
    rect: false,
    circle: false,
  }
);
</script>

<style lang="scss">
$size: 20px;

.data-row-skeleton {
  display: flex;
  align-items: center;
  gap: $inner-spacing-tiny;

  & > .el-skeleton__item {
    &:not(:last-child) {
      margin: 0;
    }
    &.el-skeleton__rect {
      height: $size;
    }
    &.el-skeleton__circle {
      flex-shrink: 0;
      height: $size;
      width: $size;
    }
  }
}
</style>
