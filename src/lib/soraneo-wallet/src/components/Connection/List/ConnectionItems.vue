<template>
  <s-scrollbar class="connection-items" :style="style">
    <div class="connection-items-list" :style="{ gap: `${itemOffset}px` }">
      <slot></slot>
    </div>
  </s-scrollbar>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    size?: number;
    visible?: number;
    itemOffset?: number;
    itemHeight?: number;
  }>(),
  {
    size: 0,
    visible: 7,
    itemOffset: 8,
    itemHeight: 60,
  }
);

const style = computed<Partial<CSSStyleDeclaration>>(() => {
  const styles: Partial<CSSStyleDeclaration> = {};

  if (props.size >= props.visible) {
    const height = (props.itemHeight + props.itemOffset) * props.visible - props.itemOffset;
    styles.height = `${height}px`;
  }

  return styles;
});
</script>

<style lang="scss">
$item-height: 60px;

.connection-items.el-scrollbar {
  @include scrollbar($basic-spacing-big);
  display: block;
  flex: 0 1 auto;
  overflow: hidden;

  > .el-scrollbar__wrap {
    margin-bottom: 0 !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    scrollbar-width: none;
    -ms-overflow-style: none;

    &::-webkit-scrollbar {
      width: 0;
      height: 0;
      display: none;
    }
  }

  > .el-scrollbar__bar.is-vertical,
  > .el-scrollbar__bar.is-horizontal {
    display: none !important;
  }

  &-list {
    display: flex;
    flex-flow: column nowrap;

    & > .account-card {
      height: $item-height;

      @include focus-outline($withOffset: true);

      &.s-card.neumorphic {
        border-width: 1px;

        &:hover {
          cursor: pointer;
          border-color: var(--s-color-base-content-secondary);
        }
      }

      a.connection-action {
        @include focus-outline($borderRadius: var(--s-border-radius-small));
      }
    }
  }
}
</style>
