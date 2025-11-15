<template>
  <s-scrollbar class="connection-items" :style="style">
    <div class="connection-items-list" :style="{ gap: `${itemOffset}px` }">
      <slot></slot>
    </div>
  </s-scrollbar>
</template>

<script lang="ts">
import { Options, Vue, Prop } from 'vue-property-decorator';

@Options({})
export default class ConnectionItems extends Vue {
  @Prop({ default: 0, type: Number }) readonly size!: number;
  @Prop({ default: 7, type: Number }) readonly visible!: number;
  @Prop({ default: 8, type: Number }) readonly itemOffset!: number;
  @Prop({ default: 60, type: Number }) readonly itemHeight!: number;

  get style() {
    const styles: Partial<CSSStyleDeclaration> = {};

    if (this.size >= this.visible) {
      const height = (this.itemHeight + this.itemOffset) * this.visible - this.itemOffset;
      styles.height = `${height}px`;
    }

    return styles;
  }
}
</script>

<style lang="scss">
$item-height: 60px;

.connection-items {
  @include scrollbar($basic-spacing-big);

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
