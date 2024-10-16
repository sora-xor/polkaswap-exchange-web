<template>
  <s-card
    ref="container"
    size="big"
    primary
    :shadow="shadow"
    :class="['base-widget', { delimeter, full, flat, pip: pipOpened }]"
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

        <div v-if="isPipAvailable" class="base-widget-block base-widget-pip">
          <s-button type="action" size="small" alternative @click="openPip" tooltip="Open in top window">
            <s-icon name="finance-receive-24" size="24" />
          </s-button>
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
  /**
   * Widget "Picture in picture" mode is disabled
   */
  @Prop({ default: false, type: Boolean }) readonly pipDisabled!: boolean;

  @Prop({ default: () => {}, type: Function }) readonly onResize!: (id: string, size: Size) => void;

  @Ref('container') readonly container!: Vue;
  @Ref('content') readonly content!: HTMLDivElement;

  private contentObserver: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;
  private handleContentResize = debouncedInputHandler(this.onContentResize, 300, { leading: false });

  private size: Size = {
    width: 0,
    height: 0,
  };

  private pipWindow: Window | null = null;
  private pipOpened = false;

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

  get isPipAvailable() {
    try {
      if (this.pipDisabled) return false;
      if (typeof window === 'undefined') {
        console.info('typeof window === undefined');
        return false;
      }
      return 'documentPictureInPicture' in window && !this.pipOpened;
    } catch (e) {
      console.error('Error when trying get pip availability:', e);
      return false;
    }
  }

  async openPip() {
    if (!this.isPipAvailable) return;

    try {
      const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
        width: this.$el.clientWidth,
        height: this.$el.clientHeight,
      });

      this.pipOpened = true;
      this.pipWindow = pipWindow;

      // Access the root element of the Vue component
      const widgetElement = this.$el as HTMLElement;
      const originalParent = widgetElement.parentNode as HTMLElement;

      // STYLES
      const allStyles = Array.from(document.styleSheets)
        .map((styleSheet) =>
          Array.from(styleSheet.cssRules)
            .map((rule) => rule.cssText)
            .join('\n')
        )
        .join('\n');
      // Create a new style element in the Picture-in-Picture window
      const style = pipWindow.document.createElement('style');
      style.innerHTML = allStyles;
      // Append style element to the Picture-in-Picture window's head
      pipWindow.document.head.appendChild(style);

      // THEME
      // Get the <html> element from the Picture-in-Picture window's document
      const htmlElement = pipWindow.document.documentElement;
      // Get the <html> element from the original document
      const originalHtmlElement = document.documentElement;
      // Copy attributes from the original <html> element to the <html> element in the Picture-in-Picture window's document
      for (const attribute of originalHtmlElement.attributes) {
        htmlElement.setAttribute(attribute.nodeName, attribute.nodeValue);
      }

      // Move the Vue component to the Picture-in-Picture window
      pipWindow.document.body.appendChild(widgetElement);
      // watch original document style adding
      this.createMutationObserver();

      // Event listener when the PiP window is closed
      pipWindow.addEventListener('pagehide', () => {
        // Move the element back to the original document when PiP is closed
        this.$nextTick(() => {
          this.closePip();
          originalParent.appendChild(widgetElement);
        });
      });
    } catch (error) {
      console.error('Error during PiP handling:', error);
    }
  }

  mounted(): void {
    this.createContentObserver();
    this.updateSize(this.getWidgetSize()); // initial
  }

  beforeDestroy(): void {
    this.destroyContentObserver();
    this.closePip();
  }

  private closePip(): void {
    if (this.pipOpened && this.pipWindow) {
      this.destroyMutationObserver();
      this.pipWindow.close();
      this.pipOpened = false;
      this.pipWindow = null;
    }
  }

  private createContentObserver(): void {
    if (!this.hasContent) return;

    this.contentObserver = new ResizeObserver(this.handleContentResize);
    this.contentObserver.observe(this.content);
  }

  private destroyContentObserver(): void {
    this.contentObserver?.disconnect();
    this.contentObserver = null;
  }

  private createMutationObserver(): void {
    const config: MutationObserverInit = { childList: true };

    const callback: MutationCallback = (mutationList: MutationRecord[]) => {
      const pipWindow = this.pipWindow;

      if (!pipWindow) return;

      for (const mutation of mutationList) {
        Array.from(mutation.addedNodes).forEach((node) => {
          pipWindow.document.head.appendChild(node.cloneNode(true));
        });
      }
    };

    this.mutationObserver = new MutationObserver(callback);
    this.mutationObserver.observe(document.head, config);
  }

  private destroyMutationObserver(): void {
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
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

  &.full {
    width: 100%;
    min-height: 100%;

    flex: 1;
  }

  &.flat {
    border: 1px solid var(--s-color-base-border-secondary);

    &.s-border-radius-small {
      border-radius: unset;
    }
  }

  &.pip {
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
    line-height: var(--s-line-height-reset);

    min-height: var(--s-size-small);

    &.primary {
      font-size: var(--s-font-size-large);
      font-weight: 300;
    }
  }

  &-content {
    display: flex;
    flex-flow: column nowrap;
    flex: 1;

    padding: $between $left $top;

    &.extensive {
      // 1px for visible container inner shadow
      padding: 0 1px;
    }
  }
}
</style>
