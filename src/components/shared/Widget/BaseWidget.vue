<template>
  <div class="base-widget">
    <div class="base-widget-header">
      <slot name="title">
        <div class="base-widget-header-title">
          <h4 v-if="title" class="base-widget-header-title__text">{{ title }}</h4>
          <s-tooltip v-if="tooltip" slot="suffix" border-radius="mini" :content="tooltip" placement="top" tabindex="-1">
            <s-icon name="info-16" size="14px" />
          </s-tooltip>
        </div>
      </slot>

      <slot name="title-append" />
    </div>

    <div class="base-widget-content s-flex-column">
      <slot />
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class BaseWidget extends Vue {
  @Prop({ default: '', type: String }) readonly title!: string;
  @Prop({ default: '', type: String }) readonly tooltip!: string;
}
</script>

<style lang="scss">
.base-widget {
  padding: unset;
  background-color: var(--s-color-utility-surface);
  box-shadow: var(--s-shadow-dialog);
  color: var(--s-color-base-content-primary);
  border-radius: var(--s-border-radius-small);
  overflow: hidden;

  &-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 $inner-spacing-medium;

    &-title {
      display: flex;
      align-items: center;

      &__text {
        height: 40px;
        line-height: 40px;
        font-weight: 500;
        font-size: 17px;
      }

      .el-tooltip {
        margin-left: $inner-spacing-mini;
      }
    }
  }

  &-content {
    flex: 1;
  }
}
</style>
