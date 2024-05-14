<template>
  <s-card :class="['base-widget', { delimeter }]" border-radius="small" shadow="always" size="big" primary>
    <template #header v-if="hasHeader">
      <div class="base-widget-block base-widget-header">
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

        <s-button type="tertiary" size="small" v-if="isPipAvailable" @click="openPip">PIP</s-button>
      </div>
    </template>

    <div :class="['base-widget-content', { extensive }]">
      <slot />
    </div>
  </s-card>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

import { capitalize } from '@/utils';

declare const documentPictureInPicture: any;


@Component
export default class BaseWidget extends Vue {
  @Prop({ default: '', type: String }) readonly title!: string;
  @Prop({ default: '', type: String }) readonly tooltip!: string;
  @Prop({ default: false, type: Boolean }) readonly delimeter!: boolean;
  @Prop({ default: false, type: Boolean }) readonly extensive!: boolean;
  @Prop({ default: false, type: Boolean }) readonly primaryTitle!: boolean;

  public capitalize = capitalize;
  
  get isPipAvailable() {
    return 'documentPictureInPicture' in window;
  }

  get hasHeader(): boolean {
    return !!this.title || !!this.$slots.title;
  }

  async openPip() {
    if (!this.isPipAvailable) return;

    const pipWindow = await documentPictureInPicture.requestWindow({
      width: this.$el.clientWidth,
      height: this.$el.clientHeight,
    });

    // STYLES
    // Extract all document styles
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
    for (let i = 0; i < originalHtmlElement.attributes.length; i++) {
      const attribute = originalHtmlElement.attributes[i];
      htmlElement.setAttribute(attribute.nodeName, attribute.nodeValue);
    }

    // Append Vue component to the Picture-in-Picture window's body
    pipWindow.document.body.appendChild(this.$el);
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

  &-block {
    display: flex;
    align-items: center;
    gap: $inner-spacing-mini;
  }

  &-header {
    flex-flow: row wrap;
    justify-content: space-between;
    padding: $top $left $between;
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
