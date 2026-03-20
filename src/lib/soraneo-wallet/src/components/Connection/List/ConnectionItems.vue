<template>
  <s-scrollbar class="connection-items" :style="style">
    <div class="connection-items-list" :style="{ gap: `${itemOffset}px` }">
      <slot></slot>
    </div>
  </s-scrollbar>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    size: { default: 0, type: Number },
    visible: { default: 7, type: Number },
    itemOffset: { default: 8, type: Number },
    itemHeight: { default: 60, type: Number },
  },
  computed: {
    style(this: any): Partial<CSSStyleDeclaration> {
      const styles: Partial<CSSStyleDeclaration> = {};

      if (this.size >= this.visible) {
        const height = (this.itemHeight + this.itemOffset) * this.visible - this.itemOffset;
        styles.height = `${height}px`;
      }

      return styles;
    },
  },
});
</script>

<style lang="scss">
$item-height: 60px;

.connection-items.s-scrollbar.el-scrollbar {
  @include scrollbar($basic-spacing-big);
  display: block;
  flex: 0 1 auto;
  overflow: hidden;

  > .el-scrollbar__wrap {
    overflow-x: hidden !important;
    overflow-y: scroll !important;
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
