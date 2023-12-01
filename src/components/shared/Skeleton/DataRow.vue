<template>
  <s-skeleton :loading="loading" animated>
    <template #template>
      <div class="data-row-skeleton">
        <s-skeleton-item v-if="rect" element="rect" />
        <s-skeleton-item v-if="circle" element="circle" />
      </div>
    </template>
    <slot />
  </s-skeleton>
</template>

<script lang="ts">
import { SSkeleton, SSkeletonItem } from '@soramitsu/soramitsu-js-ui/lib/components/Skeleton';
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component({
  components: {
    SSkeleton,
    SSkeletonItem,
  },
})
export default class DataRowSkeleton extends Vue {
  @Prop({ default: true, type: Boolean }) readonly loading!: boolean;
  @Prop({ default: false, type: Boolean }) readonly rect!: boolean;
  @Prop({ default: false, type: Boolean }) readonly circle!: boolean;
}
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
