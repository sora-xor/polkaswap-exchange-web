<template>
  <s-card :class="['base-widget', { delimeter }]" border-radius="small" shadow="always" size="big" primary>
    <template #header v-if="hasHeader">
      <div class="base-widget-header">
        <slot name="title">
          <div class="base-widget-title">
            <h4 v-if="title">{{ title }}</h4>
            <s-tooltip v-if="tooltip" border-radius="mini" :content="tooltip">
              <s-icon name="info-16" size="14px" />
            </s-tooltip>
          </div>
        </slot>

        <div v-if="$slots.filters" class="s-flex base-widget-filters">
          <slot name="filters" />
        </div>

        <div v-if="$slots.types" class="s-flex base-widget-types">
          <slot name="types" />
        </div>
      </div>
    </template>

    <div :class="['base-widget-content', { extensive }]">
      <slot />
    </div>
  </s-card>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class BaseWidget extends Vue {
  @Prop({ default: '', type: String }) readonly title!: string;
  @Prop({ default: '', type: String }) readonly tooltip!: string;
  @Prop({ default: false, type: Boolean }) readonly delimeter!: boolean;
  @Prop({ default: false, type: Boolean }) readonly extensive!: boolean;

  get hasHeader(): boolean {
    return !!this.title || !!this.$slots.title;
  }
}
</script>

<style lang="scss">
.base-widget {
  overflow: hidden;

  &.s-card.neumorphic.s-size-big {
    padding: 0;

    &.delimeter .el-card__header {
      border-bottom-color: var(--s-color-base-border-secondary);
    }

    .el-card__body {
      display: flex;
      flex-flow: column nowrap;
      flex: 1;
    }
  }
}
</style>

<style lang="scss" scoped>
$top-offset: $inner-spacing-small;
$left-offset: $inner-spacing-medium;

.base-widget {
  &-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $top-offset $left-offset;
    gap: $inner-spacing-mini;

    font-size: var(--s-font-size-medium);
    font-weight: 500;
    line-height: var(--s-line-height-medium);
  }

  &-title {
    display: flex;
    align-items: center;
    gap: $inner-spacing-mini;
  }

  &-filters {
    order: 1;

    @include large-desktop {
      margin-left: auto;
      width: auto;
      order: initial;
    }
  }

  &-content {
    display: flex;
    flex-flow: column nowrap;
    flex: 1;

    padding: $top-offset $left-offset;

    &.extensive {
      padding: 0;
    }
  }
}
</style>
