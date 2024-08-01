<template>
  <s-card
    ref="container"
    size="big"
    primary
    :shadow="shadow"
    :class="['base-widget', { delimeter, full, flat }]"
    v-loading="loading"
  >
    <template #header v-if="hasHeader">
      <div :class="['base-widget-block', 'base-widget-header', { 'with-content': hasContent }]">
        <div :class="['base-widget-block', 'base-widget-title', { primary: primaryTitle }]">
          <slot name="title">
            <span v-if="title">{{ capitalize(title) }}</span>
            <s-tooltip v-if="tooltip" border-radius="mini" :content="tooltip">
              <s-icon name="info-16" size="14px" />
            </s-tooltip>
          </slot>
        </div>

        <div v-if="$slots.filters" class="base-widget-block base-widget-filters">
          <slot name="filters" />
        </div>

        <div v-if="$slots.types" class="base-widget-block base-widget-types">
          <slot name="types" />
        </div>
      </div>
    </template>

    <div v-if="hasContent" :class="['base-widget-content', { extensive }]" ref="content">
      <slot />
    </div>
  </s-card>
</template>

<script lang="ts">
import isEqual from 'lodash/fp/isEqual';
import { Component, Prop, Vue, Ref } from 'vue-property-decorator';

import type { Size } from '@/types/layout';
import { debouncedInputHandler, capitalize } from '@/utils';

@Component
export default class BaseWidget extends Vue {
  /**
   * Widget ID
   */
  @Prop({ default: '', type: String }) readonly id!: string;
  /**
   * The widget title has a large font-size
   */
  @Prop({ default: false, type: Boolean }) readonly primaryTitle!: boolean;
  /**
   * The widget title text
   */
  @Prop({ default: '', type: String }) readonly title!: string;
  /**
   * The widget title tooltip text
   */
  @Prop({ default: '', type: String }) readonly tooltip!: string;
  /**
   * The widget stretches to fit its parent
   */
  @Prop({ default: false, type: Boolean }) readonly full!: boolean;
  /**
   * The widget has a delimeter line between header and content
   */
  @Prop({ default: false, type: Boolean }) readonly delimeter!: boolean;
  /**
   * The widget content has a full width
   */
  @Prop({ default: false, type: Boolean }) readonly extensive!: boolean;
  /**
   * The widget looks like rectangle without shadow
   */
  @Prop({ default: false, type: Boolean }) readonly flat!: boolean;
  /**
   * Widget has a loading state
   */
  @Prop({ default: false, type: Boolean }) readonly loading!: boolean;

  @Prop({ default: () => {}, type: Function }) readonly onResize!: (id: string, size: Size) => void;

  @Ref('container') readonly container!: Vue;
  @Ref('content') readonly content!: HTMLDivElement;

  private observer: ResizeObserver | null = null;
  private handleContentResize = debouncedInputHandler(this.onContentResize, 300, { leading: false });

  private size: Size = {
    width: 0,
    height: 0,
  };

  public capitalize = capitalize;

  get hasHeader(): boolean {
    return !!this.title || !!this.$slots.title;
  }

  get hasContent(): boolean {
    return !!this.$slots.default;
  }

  get shadow(): string | undefined {
    return this.flat ? 'never' : 'always';
  }

  mounted(): void {
    this.createContentObserver();
    this.updateSize(this.getWidgetSize()); // initial
  }

  beforeDestroy(): void {
    this.destroyContentObserver();
  }

  private createContentObserver(): void {
    if (!this.hasContent) return;

    this.observer = new ResizeObserver(this.handleContentResize);
    this.observer.observe(this.content);
  }

  private destroyContentObserver(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private getWidgetSize(): Size {
    return this.getElementSize(this.container.$el);
  }

  private getWidgetContentSize(): Size {
    return this.getElementSize(this.content);
  }

  private getElementSize(el: Element): Size {
    const { width, height } = el.getBoundingClientRect();

    return {
      width: Math.floor(width),
      height: Math.floor(height),
    };
  }

  private updateSize(size: Size): void {
    this.size = size;
  }

  private onContentResize(): void {
    const size = this.getWidgetContentSize();

    if (!isEqual(size)(this.size)) {
      this.onResize(this.id, this.getWidgetSize());
      this.updateSize(this.getWidgetContentSize());
    }
  }
}
</script>

<style lang="scss">
.base-widget {
  &.s-card.neumorphic.s-size-big {
    padding: 0;

    &.delimeter .el-card__header {
      border-bottom-color: var(--s-color-base-border-secondary);
    }

    & > .el-card__body {
      display: flex;
      flex-flow: column nowrap;
      flex: 1;
    }
  }

  .el-button + .el-button {
    margin-left: unset;
  }
}
</style>

<style lang="scss" scoped>
$top: $inner-spacing-medium;
$between: $top / 2;
$left: $inner-spacing-medium;

.base-widget {
  display: flex;
  flex-flow: column nowrap;
  align-items: normal;
  overflow: hidden;
  border: 1px solid transparent;

  &.full {
    width: 100%;
    min-height: 100%;

    flex: 1;
  }

  &.flat {
    border-color: var(--s-color-base-border-secondary);

    &.s-border-radius-small {
      border-radius: unset;
    }
  }

  &-block {
    display: flex;
    align-items: center;
    gap: $inner-spacing-mini;
  }

  &-header {
    flex-flow: row wrap;
    justify-content: space-between;
    padding: $top $left;

    &.with-content {
      padding-bottom: $between;
    }
  }

  &-title {
    flex: 1;
    flex-flow: row nowrap;

    font-size: var(--s-font-size-medium);
    font-weight: 500;
    line-height: var(--s-line-height-medium);

    min-height: var(--s-size-small);

    &.primary {
      font-size: var(--s-font-size-large);
      font-weight: 300;
      line-height: var(--s-line-height-reset);
    }
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

    padding: $between $left $top;

    &.extensive {
      padding: 0;
    }
  }
}
</style>
