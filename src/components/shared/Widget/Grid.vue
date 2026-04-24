<template>
  <grid-layout
    ref="grid"
    :class="[
      'widgets-grid',
      {
        'widgets-grid--auto-resize': autoResize,
        'widgets-grid--editing': draggable || resizable,
        'widgets-grid--layout-settling': autoResize && !layoutMotionReady,
      },
    ]"
    responsive
    :layout="layout"
    :responsive-layouts="layouts"
    :cols="cols"
    :breakpoints="breakpoints"
    :row-height="rowHeight"
    :is-draggable="draggable"
    :is-resizable="resizable"
    :margin="[margin, margin]"
    :prevent-collision="false"
    :vertical-compact="compact"
    :use-css-transforms="false"
    @breakpoint-changed="onBreakpointChanged"
    @layout-updated="onLayoutUpdate"
    @layout-ready="onLayoutReady"
  >
    <div v-if="lines" class="grid-lines" :style="gridLinesStyle"></div>
    <transition-group name="list" tag="div">
      <grid-item v-for="widget in layout" :key="widget.i" :is-resizable="isResizable(widget)" v-bind="widget">
        <slot
          :name="widget.i"
          v-bind="{
            id: widget.i,
            flat,
            loading,
            parentLoading: loading,
            onResize,
            reset,
          }"
        ></slot>
      </grid-item>
    </transition-group>
  </grid-layout>
</template>

<script setup lang="ts">
import cloneDeep from 'lodash/fp/cloneDeep';
import isEmpty from 'lodash/fp/isEmpty';
import isEqual from 'lodash/fp/isEqual';
import omit from 'lodash/fp/omit';
import { computed, nextTick, onMounted, ref, toRaw, watch } from 'vue';
import type { ComponentPublicInstance } from 'vue';

import { GridLayout, GridItem } from '@/lib/grid';

import { normalizeLayoutsWithDefaults } from '@/components/shared/Widget/grid.utils';
import { Breakpoint, BreakpointKey } from '@/consts/layout';
import type {
  Layout,
  LayoutConfig,
  LayoutWidget,
  ResponsiveLayouts,
  Size,
  WidgetsVisibilityModel,
} from '@/types/layout';
import { layoutsStorage } from '@/utils/storage';

function findWidgetInLayout(layout: Nullable<Layout>, widgetId: string) {
  return layout?.find((widget: LayoutWidget) => widget.i === widgetId);
}

function shallowDiff<T extends Record<string, boolean>>(a: T, b: T): Partial<T> {
  return Object.entries(a).reduce(
    (diff, [key, value]) => (isEqual(b[key], value) ? diff : { ...diff, [key]: value }),
    {}
  );
}

function sortBreakpoints(breakpoints: LayoutConfig): BreakpointKey[] {
  const keys = Object.keys(breakpoints) as BreakpointKey[];

  return keys.sort((first, second) => breakpoints[first] - breakpoints[second]);
}

function getBreakpointFromWidth(breakpoints: LayoutConfig, width: number): BreakpointKey {
  const sorted = sortBreakpoints(breakpoints);
  let matching = sorted[0];
  for (let i = 1, len = sorted.length; i < len; i++) {
    const breakpointName = sorted[i];
    if (width > breakpoints[breakpointName]) matching = breakpointName;
  }
  return matching;
}

function getGridStorageKey(gridId: string): string {
  if (!gridId) return '';
  if (typeof window === 'undefined') return gridId;

  const pathname = window.location?.pathname ?? '';
  const cidMatch = pathname.match(/\/ipfs\/([^/?#]+)/i);
  const cid = cidMatch?.[1];

  if (!cid) return gridId;

  return `${cid}::${gridId}`;
}

function parseLayoutsValue(value: string): ResponsiveLayouts | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as ResponsiveLayouts;
  } catch {
    return null;
  }
}

defineOptions({
  name: 'WidgetsGrid',
  components: {
    GridLayout,
    GridItem,
  },
});

const props = withDefaults(
  defineProps<{
    gridId?: string;
    defaultLayouts?: ResponsiveLayouts;
    rowHeight?: number;
    margin?: number;
    autoResize?: boolean;
    draggable?: boolean;
    resizable?: boolean;
    compact?: boolean;
    lines?: boolean;
    cols?: LayoutConfig;
    breakpoints?: LayoutConfig;
    loading?: boolean;
    flat?: boolean;
    modelValue?: WidgetsVisibilityModel;
    value?: WidgetsVisibilityModel;
  }>(),
  {
    gridId: '',
    defaultLayouts: () => ({}) as ResponsiveLayouts,
    rowHeight: 10,
    margin: 16,
    autoResize: false,
    draggable: false,
    resizable: false,
    compact: true,
    lines: false,
    cols: () => ({
      [BreakpointKey.lg]: 24,
      [BreakpointKey.md]: 16,
      [BreakpointKey.sm]: 12,
      [BreakpointKey.xs]: 8,
      [BreakpointKey.xss]: 4,
    }),
    breakpoints: () => ({
      [BreakpointKey.lg]: Breakpoint.HugeDesktop,
      [BreakpointKey.md]: Breakpoint.LargeDesktop,
      [BreakpointKey.sm]: Breakpoint.Desktop,
      [BreakpointKey.xs]: Breakpoint.Tablet,
      [BreakpointKey.xss]: 0,
    }),
    loading: false,
    flat: false,
    modelValue: undefined,
    value: () => ({}) as WidgetsVisibilityModel,
  }
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: WidgetsVisibilityModel): void;
}>();

const grid = ref<ComponentPublicInstance | null>(null);
const breakpoint = ref<BreakpointKey>(BreakpointKey.lg);
const layouts = ref<ResponsiveLayouts>(cloneDeep(toRaw(props.defaultLayouts)));
const layout = ref<Layout>((cloneDeep(layouts.value[breakpoint.value]) as Layout) ?? []);
const layoutMotionReady = ref(!props.autoResize);
const widgetsModel = computed<WidgetsVisibilityModel>(() => props.modelValue ?? props.value);
const defaultValue = ref<WidgetsVisibilityModel>(cloneDeep(widgetsModel.value));
const storageKey = computed(() => getGridStorageKey(props.gridId));

const responsiveLayout = computed(() => layouts.value[breakpoint.value]);

const gridLinesStyle = computed(() => {
  const rowHeight = props.rowHeight;
  const marginHalf = props.margin / 2;
  const columns = props.cols[breakpoint.value];

  return {
    backgroundSize: `calc(calc(100% - ${marginHalf}px) / ${columns}) ${rowHeight + marginHalf * 2}px`,
    height: `calc(100% - ${marginHalf}px)`,
    width: `calc(100% - ${marginHalf}px)`,
    margin: `${marginHalf}px`,
  };
});

const saveLayoutsToStorage = () => {
  if (!storageKey.value) return;
  layoutsStorage.set(storageKey.value, JSON.stringify(layouts.value));
};

const clearLayoutsFromStorage = () => {
  if (!storageKey.value) return;
  layoutsStorage.remove(storageKey.value);
};

const updateLayout = () => {
  const targetLayout = responsiveLayout.value ?? props.defaultLayouts[breakpoint.value];

  if (!targetLayout) {
    layout.value = [];
    return;
  }

  if (isEqual(layout.value)(targetLayout)) return;

  layout.value = cloneDeep(targetLayout) as Layout;
};

const saveLayouts = (layoutsToSave: ResponsiveLayouts, saveToStorage = true) => {
  layouts.value = cloneDeep(layoutsToSave);
  updateLayout();

  if (saveToStorage) {
    saveLayoutsToStorage();
  }
};

const updateWidgetsModelByLayout = () => {
  const initialModel = Object.keys(widgetsModel.value).reduce<WidgetsVisibilityModel>(
    (acc, key) => ({ ...acc, [key]: false }),
    {}
  );

  const model = layout.value.reduce<WidgetsVisibilityModel>((acc, widget) => {
    if (widget.i in acc) {
      acc[widget.i] = true;
    }
    return acc;
  }, initialModel);

  emit('update:modelValue', model);
};

const updateLayoutsByWidgetsModel = (
  layoutsToUpdate: ResponsiveLayouts,
  diff: Partial<WidgetsVisibilityModel>,
  save: boolean
) => {
  const nextLayouts = cloneDeep(toRaw(layoutsToUpdate));

  for (const [widgetId, visibilityFlag] of Object.entries(diff)) {
    for (const breakpointKey of Object.keys(nextLayouts) as BreakpointKey[]) {
      nextLayouts[breakpointKey] = nextLayouts[breakpointKey] ?? [];

      if (visibilityFlag) {
        const currentWidget = findWidgetInLayout(nextLayouts[breakpointKey], widgetId);
        if (currentWidget) continue;

        const defaultWidget = findWidgetInLayout(props.defaultLayouts[breakpointKey], widgetId);
        if (defaultWidget) {
          nextLayouts[breakpointKey].push(defaultWidget);
        }
      } else {
        nextLayouts[breakpointKey] = nextLayouts[breakpointKey].filter((widget) => widget.i !== widgetId);
      }
    }
  }

  saveLayouts(nextLayouts, save);
};

const updateLayoutWidgetsByModel = (curr: WidgetsVisibilityModel, prev: WidgetsVisibilityModel) => {
  const diff = shallowDiff(curr, prev);
  if (isEmpty(diff)) return;

  updateLayoutsByWidgetsModel(layouts.value, diff, true);
};

const init = async () => {
  const storedLayouts = storageKey.value ? layoutsStorage.get(storageKey.value) : null;

  if (storedLayouts) {
    const parsedLayouts = parseLayoutsValue(storedLayouts);

    if (parsedLayouts) {
      const normalizedLayouts = normalizeLayoutsWithDefaults(parsedLayouts, props.defaultLayouts, props.cols);
      const layoutsChanged = !isEqual(normalizedLayouts)(parsedLayouts);

      saveLayouts(normalizedLayouts, layoutsChanged);
    } else {
      clearLayoutsFromStorage();
      updateLayoutsByWidgetsModel(props.defaultLayouts, defaultValue.value, false);
    }
  } else {
    updateLayoutsByWidgetsModel(props.defaultLayouts, defaultValue.value, false);
  }

  updateWidgetsModelByLayout();
};

const reset = () => {
  clearLayoutsFromStorage();
  void init();
};

const onBreakpointChanged = (newBreakpoint: BreakpointKey) => {
  breakpoint.value = newBreakpoint;
  updateLayout();
};

const onLayoutReady = () => {
  if (layoutMotionReady.value) return;

  layoutMotionReady.value = true;
};

const onLayoutUpdate = (updated: Layout) => {
  const prepared = updated.map((widget) => omit('moved')(widget)) as Layout;

  // GridLayout emits `layout-updated` during mount while it is still settling responsive breakpoints.
  // In that phase, `breakpoint.value` may already be updated, but the emitted layout can still be from
  // a previous breakpoint. Persisting such a layout corrupts storage and causes widgets to overlap.
  const colsForBreakpoint = props.cols[breakpoint.value] ?? 0;
  const exceedsBreakpointCols = prepared.some((widget) => {
    const x = widget.x ?? 0;
    const w = widget.w ?? 0;
    return x + w > colsForBreakpoint;
  });

  if (exceedsBreakpointCols) {
    // Keep current layout and force-sync from the responsive layouts for the active breakpoint.
    updateLayout();
    return;
  }

  // Keep the layout reference emitted by GridLayout to avoid triggering extra prop-change cycles.
  layout.value = updated;

  if (!props.draggable && !props.resizable) return;

  if (isEqual(prepared)(responsiveLayout.value)) return;

  saveLayouts({ ...layouts.value, [breakpoint.value]: prepared });
};

const isResizable = (widget: LayoutWidget): boolean => {
  if (!props.resizable) return false;

  const { maxW, maxH, minW, minH } = widget;
  const fixed = maxW === minW && maxH === minH;

  return !fixed;
};

const onResize = (widgetId: string, rect: Size): void => {
  if (!(props.resizable || props.autoResize)) return;

  const nextLayout = cloneDeep(layout.value);
  const widget = findWidgetInLayout(nextLayout, widgetId);

  if (!widget) return;

  const { height } = rect;
  const calculatedH = Math.ceil((height + props.margin) / (props.rowHeight + props.margin));
  const updatedH = Math.max(widget.minH ?? 1, calculatedH);
  if (widget.h === updatedH) return;

  widget.h = updatedH;
  layout.value = nextLayout;
};

watch(
  widgetsModel,
  (curr, prev) => {
    if (!curr || !prev) return;
    updateLayoutWidgetsByModel(curr, prev);
  },
  { deep: true }
);

onMounted(() => {
  nextTick(() => {
    const width =
      (grid.value?.$el as HTMLElement | undefined)?.clientWidth ?? window?.innerWidth ?? Breakpoint.HugeDesktop;
    breakpoint.value = getBreakpointFromWidth(props.breakpoints, width);
    void init();
  });
});
</script>

<style lang="scss">
$line: var(--s-color-base-border-secondary);

.widgets-grid {
  &.widgets-grid--layout-settling {
    .vue-grid-item {
      transition: none !important;
    }
  }

  .vue-grid-item {
    transition-property: opacity, scale;
    transition-duration: 0.3s;
    touch-action: none;

    &.vue-grid-placeholder {
      background: var(--s-color-theme-accent-hover);
      opacity: 0.5;
    }
    &.vue-resizable {
      &:hover {
        .base-widget {
          border-color: var(--s-color-theme-accent-focused);
        }
      }

      .base-widget {
        border-bottom-right-radius: 0px;
      }

      &.resizing {
        opacity: 1;
      }

      & > .vue-resizable-handle {
        width: 23px;
        height: 27px;
        padding: 0;
        background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMyIgaGVpZ2h0PSIyNyIgdmlld0JveD0iMCAwIDIzIDI3IiBmaWxsPSJub25lIj4KPHBhdGggb3BhY2l0eT0iMC40IiBkPSJNMjIuMjAyNSAwLjI0NTExN0wwLjY5NjI4OSAyNi4xODU1SDIyLjIwMjVWMC4yNDUxMTdaIiBmaWxsPSIjRjgwODdCIi8+Cjwvc3ZnPg==');
      }
    }
  }

  .grid-lines {
    position: absolute;
    background-image:
      linear-gradient(to right, $line 1px, transparent 1px), linear-gradient($line 1px, transparent 1px);
    background-repeat: repeat;
  }

  // animation
  .list-enter-from,
  .list-leave-to {
    opacity: 0;
    transform: scale(0.8);
  }

  &.widgets-grid--editing {
    .vue-grid-item {
      touch-action: none;
      will-change: auto;
    }
  }
}
</style>
