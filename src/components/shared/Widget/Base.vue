<template>
  <s-card
    ref="container"
    size="big"
    border-radius="small"
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
              <s-icon name="info-16" size="14px"></s-icon>
            </s-tooltip>
          </slot>
        </div>

        <div v-if="$slots.filters" class="base-widget-block base-widget-filters">
          <slot name="filters"></slot>
        </div>

        <div v-if="$slots.types" class="base-widget-block base-widget-types">
          <slot name="types"></slot>
        </div>

        <div v-if="isPipAvailable" class="base-widget-block base-widget-pip">
          <s-button type="action" size="small" alternative @click="openPip" tooltip="Open in top window">
            <template #icon>
              <s-icon name="finance-receive-24" size="24"></s-icon>
            </template>
          </s-button>
        </div>
      </div>
    </template>
    <div v-if="hasContent" :class="['base-widget-content', { extensive }]" ref="content">
      <slot></slot>
    </div>
  </s-card>
</template>

<script lang="ts" setup>
import isEqual from 'lodash/fp/isEqual';
import { computed, getCurrentInstance, onBeforeUnmount, onMounted, reactive, ref, useSlots } from 'vue';

import type { Size } from '@/types/layout';
import { capitalize as capitalizeUtil } from '@/utils';

const props = withDefaults(
  defineProps<{
    id?: string;
    primaryTitle?: boolean;
    title?: string;
    tooltip?: string;
    full?: boolean;
    delimeter?: boolean;
    extensive?: boolean;
    flat?: boolean;
    loading?: boolean;
    pipDisabled?: boolean;
    onResize?: (id: string, size: Size) => void;
  }>(),
  {
    id: '',
    primaryTitle: false,
    title: '',
    tooltip: '',
    full: false,
    delimeter: false,
    extensive: false,
    flat: false,
    loading: false,
    pipDisabled: false,
    onResize: () => {},
  }
);

const slots = useSlots();
const instance = getCurrentInstance();

const container = ref<any>(null);
const content = ref<HTMLElement | null>(null);

const pipOpened = ref(false);
const pipWindow = ref<Window | null>(null);

const size = reactive<Size>({
  width: 0,
  height: 0,
});

const hasHeader = computed(() => Boolean(props.title) || Boolean(slots.title));
const hasContent = computed(() => Boolean(slots.default));
const shadow = computed(() => (props.flat ? 'never' : 'always'));

const capitalize = capitalizeUtil;

const isPipAvailable = computed(() => {
  if (props.pipDisabled || pipOpened.value) return false;
  if (typeof window === 'undefined') return false;
  return 'documentPictureInPicture' in window;
});

let resizeAnimationFrame: number | null = null;

const requestResizeFrame = (callback: FrameRequestCallback): number => {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(callback);
  }

  return window.setTimeout(() => callback(Date.now()), 16);
};

const cancelResizeFrame = (frameId: number): void => {
  if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(frameId);
    return;
  }

  window.clearTimeout(frameId);
};

const handleContentResize = (): void => {
  if (resizeAnimationFrame !== null) return;

  resizeAnimationFrame = requestResizeFrame(() => {
    resizeAnimationFrame = null;
    const currentSize = getRequiredWidgetSize();
    if (!isEqual(currentSize)(size)) {
      props.onResize?.(props.id, currentSize);
      updateSize(currentSize);
    }
  });
};

let contentObserver: ResizeObserver | null = null;
let mutationObserver: MutationObserver | null = null;

function getElementSize(el?: Element | null): Size {
  if (!el) {
    return { width: 0, height: 0 };
  }
  const { width, height } = el.getBoundingClientRect();
  return {
    width: Math.floor(width),
    height: Math.floor(height),
  };
}

function resolveContainerElement(): Element | undefined {
  const el = container.value;
  if (!el) return instance?.proxy?.$el as Element | undefined;
  if (el.$el) return el.$el as Element;
  return el as Element;
}

function getWidgetSize(): Size {
  return getElementSize(resolveContainerElement());
}

function getRequiredWidgetSize(): Size {
  const widgetSize = getWidgetSize();
  const containerEl = resolveContainerElement() as HTMLElement | undefined;
  const contentEl = content.value;

  if (!containerEl || !contentEl) return widgetSize;

  const containerRect = containerEl.getBoundingClientRect();
  const contentRect = contentEl.getBoundingClientRect();
  const contentOffsetTop = Math.max(0, contentRect.top - containerRect.top);
  const intrinsicContentHeight = Array.from(contentEl.children).reduce((height, child) => {
    const childEl = child as HTMLElement;
    const childRect = childEl.getBoundingClientRect();
    const childOffsetTop = Math.max(0, childRect.top - contentRect.top);
    const childHeight = Math.max(Math.ceil(childRect.height), childEl.scrollHeight);
    return Math.max(height, Math.ceil(childOffsetTop + childHeight));
  }, 0);
  const resolvedContentHeight = intrinsicContentHeight || Math.ceil(contentEl.scrollHeight);
  const requiredHeight = Math.ceil(contentOffsetTop + resolvedContentHeight);

  return {
    width: widgetSize.width,
    height: Math.max(1, requiredHeight),
  };
}

function updateSize(newSize: Size): void {
  size.width = newSize.width;
  size.height = newSize.height;
}

function createContentObserver(): void {
  if (!hasContent.value || typeof ResizeObserver === 'undefined') return;

  destroyContentObserver();
  contentObserver = new ResizeObserver(() => handleContentResize());
  if (content.value) {
    contentObserver.observe(content.value);
    Array.from(content.value.children).forEach((child) => {
      contentObserver?.observe(child);
    });
  }
}

function destroyContentObserver(): void {
  contentObserver?.disconnect();
  contentObserver = null;
}

function createMutationObserver(): void {
  if (typeof MutationObserver === 'undefined') return;

  destroyMutationObserver();
  const config: MutationObserverInit = { childList: true };

  mutationObserver = new MutationObserver((mutationList) => {
    const pip = pipWindow.value;
    if (!pip) return;

    mutationList.forEach((mutation) => {
      Array.from(mutation.addedNodes).forEach((node) => {
        pip.document.head.appendChild(node.cloneNode(true));
      });
    });
  });

  mutationObserver.observe(document.head, config);
}

function destroyMutationObserver(): void {
  mutationObserver?.disconnect();
  mutationObserver = null;
}

function closePip(): void {
  if (pipOpened.value && pipWindow.value) {
    destroyMutationObserver();
    pipWindow.value.close();
    pipOpened.value = false;
    pipWindow.value = null;
  }
}

async function openPip(): Promise<void> {
  if (!isPipAvailable.value) return;

  try {
    const rootElement = instance?.proxy?.$el as HTMLElement | undefined;
    if (!rootElement) return;

    const requestWindow = (window as any).documentPictureInPicture?.requestWindow?.bind(
      (window as any).documentPictureInPicture
    );
    if (!requestWindow) return;

    const pip: Window = await requestWindow({
      width: rootElement.clientWidth,
      height: rootElement.clientHeight,
    });

    pipOpened.value = true;
    pipWindow.value = pip;

    const originalParent = rootElement.parentNode as HTMLElement | null;

    const allStyles = Array.from(document.styleSheets)
      .map((styleSheet) => {
        try {
          return Array.from(styleSheet.cssRules ?? [])
            .map((rule) => rule.cssText)
            .join('\n');
        } catch {
          // Accessing cssRules can throw a SecurityError for cross-origin stylesheets.
          return '';
        }
      })
      .join('\n');
    const style = pip.document.createElement('style');
    style.textContent = allStyles;
    pip.document.head.appendChild(style);

    const pipHtml = pip.document.documentElement;
    const originalHtml = document.documentElement;
    Array.from(originalHtml.attributes).forEach((attribute) => {
      pipHtml.setAttribute(attribute.nodeName, attribute.nodeValue ?? '');
    });

    pip.document.body.appendChild(rootElement);
    createMutationObserver();

    pip.addEventListener('pagehide', () => {
      closePip();
      if (originalParent) {
        originalParent.appendChild(rootElement);
      }
    });
  } catch (error) {
    console.error('Error during PiP handling:', error);
  }
}

onMounted(() => {
  createContentObserver();
  updateSize(getRequiredWidgetSize());
});

onBeforeUnmount(() => {
  destroyContentObserver();
  destroyMutationObserver();
  if (resizeAnimationFrame !== null) {
    cancelResizeFrame(resizeAnimationFrame);
    resizeAnimationFrame = null;
  }
  closePip();
});

defineExpose({
  openPip,
  closePip,
  pipOpened,
});
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
      padding: 0;
    }
  }

  .el-button + .el-button {
    margin-left: unset;
  }
}
</style>

<style lang="scss" scoped>
$top: $inner-spacing-medium;
$between: $top * 0.5;
$left: $inner-spacing-medium;

.base-widget {
  display: flex;
  flex-flow: column nowrap;
  align-items: normal;
  overflow: hidden;

  &.full {
    width: 100%;
    height: 100%;
    min-height: 0;
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

  &-pip {
    :deep(.s-button) {
      color: var(--s-color-base-content-tertiary);

      &:hover,
      &:focus {
        color: var(--s-color-base-content-secondary);
      }
    }
  }
}
</style>
