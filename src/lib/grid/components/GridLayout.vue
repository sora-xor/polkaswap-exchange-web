<template>
  <div ref="itemRef" class="vue-grid-layout" :style="mergedStyle">
    <slot></slot>
    <grid-item
      class="vue-grid-placeholder"
      v-show="isDragging"
      :x="placeholder.x"
      :y="placeholder.y"
      :w="placeholder.w"
      :h="placeholder.h"
      :i="placeholder.i"
    ></grid-item>
  </div>
</template>
<script lang="ts">
import { nextTick, onBeforeMount, onBeforeUnmount, onMounted, provide, ref, toRef, watch, type PropType } from 'vue';

import { GRID_EVENT_BUS_KEY, GRID_LAYOUT_KEY, type GridLayoutContext, type GridMargin } from '@/lib/grid/context';
import { addWindowEventListener, removeWindowEventListener } from '@/lib/grid/helpers/dom';
import { GridEventBus } from '@/lib/grid/helpers/eventBus';
import {
  getBreakpointFromWidth,
  getColsFromBreakpoint,
  findOrGenerateResponsiveLayout,
  type Breakpoints,
  type ResponsiveLayouts,
} from '@/lib/grid/helpers/responsiveUtils';
import {
  bottom,
  compact,
  getLayoutItem,
  moveElement,
  validateLayout,
  cloneLayout,
  getAllCollisions,
} from '@/lib/grid/helpers/utils';
import type { Layout, LayoutItem } from '@/lib/grid/types';

import GridItem from './GridItem.vue';

type PlaceholderItem = { x: number; y: number; w: number; h: number; i: string };
type DragPositions = Record<string, { x: number; y: number }>;
type GridItemId = string | number;

export default {
  name: 'GridLayout',
  components: {
    GridItem,
  },
  props: {
    autoSize: { type: Boolean, default: true },
    colNum: { type: Number, default: 12 },
    rowHeight: { type: Number, default: 150 },
    maxRows: { type: Number, default: Infinity },
    margin: {
      type: Array as PropType<GridMargin>,
      default: (): GridMargin => [10, 10],
    },
    isDraggable: { type: Boolean, default: true },
    isResizable: { type: Boolean, default: true },
    isMirrored: { type: Boolean, default: false },
    isBounded: { type: Boolean, default: false },
    useCssTransforms: { type: Boolean, default: true },
    verticalCompact: { type: Boolean, default: true },
    restoreOnDrag: { type: Boolean, default: false },
    layout: {
      type: Array as PropType<Layout>,
      required: true,
    },
    responsive: { type: Boolean, default: false },
    responsiveLayouts: {
      type: Object as PropType<ResponsiveLayouts>,
      default: (): ResponsiveLayouts => ({}),
    },
    transformScale: { type: Number, default: 1 },
    breakpoints: {
      type: Object as PropType<Breakpoints>,
      default: (): Breakpoints => ({ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }),
    },
    cols: {
      type: Object as PropType<Breakpoints>,
      default: (): Breakpoints => ({ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }),
    },
    preventCollision: { type: Boolean, default: false },
    useStyleCursor: { type: Boolean, default: true },
  },
  emits: [
    'layout-created',
    'layout-before-mount',
    'layout-mounted',
    'layout-ready',
    'layout-updated',
    'breakpoint-changed',
    'update:layout',
  ],
  setup(props, { emit }) {
    const itemRef = ref<HTMLElement | null>(null);
    const width = ref<number | null>(null);
    const mergedStyle = ref<Record<string, string>>({});
    const isDragging = ref(false);
    const placeholder = ref<PlaceholderItem>({
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      i: '__placeholder__',
    });
    const layouts = ref<ResponsiveLayouts>({});
    const lastBreakpoint = ref<string | null>(null);
    const originalLayout = ref<Layout | null>(null);
    const resizeObserver = ref<ResizeObserver | null>(null);
    const positionsBeforeDrag = ref<DragPositions>();
    const eventBus = new GridEventBus();
    const layoutContext: GridLayoutContext = {
      responsive: toRef(props, 'responsive'),
      lastBreakpoint,
      cols: toRef(props, 'cols'),
      colNum: toRef(props, 'colNum'),
      rowHeight: toRef(props, 'rowHeight'),
      width,
      margin: toRef(props, 'margin'),
      maxRows: toRef(props, 'maxRows'),
      isDraggable: toRef(props, 'isDraggable'),
      isResizable: toRef(props, 'isResizable'),
      isBounded: toRef(props, 'isBounded'),
      transformScale: toRef(props, 'transformScale'),
      useCssTransforms: toRef(props, 'useCssTransforms'),
      useStyleCursor: toRef(props, 'useStyleCursor'),
      isMirrored: toRef(props, 'isMirrored'),
    };

    provide(GRID_EVENT_BUS_KEY, eventBus);
    provide(GRID_LAYOUT_KEY, layoutContext);

    const updateHeightWithLayout = (layout: Layout): void => {
      if (!props.autoSize) return;

      const containerHeight = bottom(layout) * (props.rowHeight + props.margin[1]) + props.margin[1] + 'px';
      mergedStyle.value = {
        height: containerHeight,
      };
    };

    const updateHeight = (): void => {
      updateHeightWithLayout(props.layout);
    };

    const onWindowResize = (): void => {
      if (itemRef.value) {
        width.value = itemRef.value.offsetWidth;
      }

      eventBus.$emit('resizeEvent');
    };

    const findDifference = (layout: Layout, baseline: Layout): Layout => {
      const uniqueResultOne = layout.filter((item) => {
        return !baseline.some((baselineItem) => item.i === baselineItem.i);
      });
      const uniqueResultTwo = baseline.filter((baselineItem) => {
        return !layout.some((item) => item.i === baselineItem.i);
      });

      return uniqueResultOne.concat(uniqueResultTwo);
    };

    const initResponsiveFeatures = (): void => {
      layouts.value = Object.assign({}, props.responsiveLayouts);
    };

    const responsiveGridLayout = (): void => {
      const newBreakpoint = getBreakpointFromWidth(props.breakpoints, width.value ?? 0);
      const newCols = getColsFromBreakpoint(newBreakpoint, props.cols);

      if (lastBreakpoint.value != null && !layouts.value[lastBreakpoint.value]) {
        layouts.value[lastBreakpoint.value] = cloneLayout(props.layout);
      }

      const layout = findOrGenerateResponsiveLayout(
        originalLayout.value ?? cloneLayout(props.layout),
        layouts.value,
        props.breakpoints,
        newBreakpoint,
        lastBreakpoint.value,
        newCols,
        props.verticalCompact
      );

      layouts.value[newBreakpoint] = layout;

      if (lastBreakpoint.value !== newBreakpoint) {
        emit('breakpoint-changed', newBreakpoint, layout);
      }

      emit('update:layout', layout);
      lastBreakpoint.value = newBreakpoint;
      eventBus.$emit('setColNum', getColsFromBreakpoint(newBreakpoint, props.cols));
    };

    const layoutUpdate = (): void => {
      const baseline = originalLayout.value;
      if (props.layout === undefined || baseline === null) {
        return;
      }

      if (props.layout.length !== baseline.length) {
        const diff = findDifference(props.layout, baseline);

        if (diff.length > 0) {
          if (props.layout.length > baseline.length) {
            originalLayout.value = baseline.concat(diff);
          } else {
            originalLayout.value = baseline.filter((item) => {
              return !diff.some((removedItem) => item.i === removedItem.i);
            });
          }
        }

        initResponsiveFeatures();
      }

      compact(props.layout, props.verticalCompact);
      eventBus.$emit('updateWidth', width.value);
      updateHeight();

      emit('layout-updated', props.layout);
    };

    const dragEvent = (eventName: string, id: GridItemId, x: number, y: number, h?: number, w?: number): void => {
      if (eventName === 'dragstart' && !props.verticalCompact) {
        positionsBeforeDrag.value = props.layout.reduce<DragPositions>((result, item) => {
          result[item.i] = { x: item.x, y: item.y };
          return result;
        }, {});
      }

      const workingLayout = cloneLayout(props.layout);
      const itemId = String(id);
      const workingItem = getLayoutItem(workingLayout, itemId);

      if (!workingItem) {
        return;
      }

      const movedLayout = moveElement(workingLayout, workingItem, x, y, true, props.preventCollision);

      if (eventName === 'dragmove' || eventName === 'dragstart') {
        placeholder.value = {
          i: itemId,
          x: workingItem.x,
          y: workingItem.y,
          w: w ?? workingItem.w,
          h: h ?? workingItem.h,
        };
        void nextTick(() => {
          isDragging.value = true;
        });
        eventBus.$emit('updateWidth', width.value);
      } else {
        void nextTick(() => {
          isDragging.value = false;
        });
      }

      let updatedLayout: Layout;
      if (props.restoreOnDrag) {
        workingItem.static = true;
        updatedLayout = compact(movedLayout, props.verticalCompact, positionsBeforeDrag.value);
        workingItem.static = false;
      } else {
        updatedLayout = compact(movedLayout, props.verticalCompact);
      }

      eventBus.$emit('compact');
      updateHeightWithLayout(updatedLayout);

      if (eventName === 'dragend') {
        positionsBeforeDrag.value = undefined;
        emit('layout-updated', updatedLayout);
      }

      emit('update:layout', updatedLayout);
    };

    const resizeEvent = (eventName: string, id: GridItemId, x: number, y: number, h: number, w: number): void => {
      const itemId = String(id);
      let layoutItem = getLayoutItem(props.layout, itemId);

      if (!layoutItem) {
        layoutItem = { i: itemId, x, y, h: 0, w: 0 };
      }

      let hasCollisions = false;
      if (props.preventCollision) {
        const collisions = getAllCollisions(props.layout, { ...layoutItem, w, h }).filter(
          (currentItem) => currentItem.i !== layoutItem.i
        );
        hasCollisions = collisions.length > 0;

        if (hasCollisions) {
          let leastX = Infinity;
          let leastY = Infinity;

          collisions.forEach((currentItem) => {
            if (currentItem.x > layoutItem.x) leastX = Math.min(leastX, currentItem.x);
            if (currentItem.y > layoutItem.y) leastY = Math.min(leastY, currentItem.y);
          });

          if (Number.isFinite(leastX)) layoutItem.w = leastX - layoutItem.x;
          if (Number.isFinite(leastY)) layoutItem.h = leastY - layoutItem.y;
        }
      }

      if (!hasCollisions) {
        layoutItem.w = w;
        layoutItem.h = h;
      }

      if (eventName === 'resizestart' || eventName === 'resizemove') {
        placeholder.value = {
          i: itemId,
          x,
          y,
          w: layoutItem.w,
          h: layoutItem.h,
        };
        void nextTick(() => {
          isDragging.value = true;
        });
        eventBus.$emit('updateWidth', width.value);
      } else {
        void nextTick(() => {
          isDragging.value = false;
        });
      }

      if (props.responsive) {
        responsiveGridLayout();
      }

      compact(props.layout, props.verticalCompact);
      eventBus.$emit('compact');
      updateHeight();

      if (eventName === 'resizeend') {
        emit('layout-updated', props.layout);
      }
    };

    const resizeEventHandler = (
      eventType: string,
      id: GridItemId,
      x: number,
      y: number,
      h: number,
      w: number
    ): void => {
      resizeEvent(eventType, id, x, y, h, w);
    };
    const dragEventHandler = (eventType: string, id: GridItemId, x: number, y: number, h: number, w: number): void => {
      dragEvent(eventType, id, x, y, h, w);
    };

    eventBus.$on('resizeEvent', resizeEventHandler);
    eventBus.$on('dragEvent', dragEventHandler);
    emit('layout-created', props.layout);

    watch(width, async (_newValue, oldValue) => {
      await nextTick();
      eventBus.$emit('updateWidth', width.value);

      if (props.responsive) {
        responsiveGridLayout();
      }

      if (oldValue === null) {
        await nextTick();
        emit('layout-ready', props.layout);
      }

      updateHeight();
    });

    watch(
      () => props.layout,
      () => {
        layoutUpdate();
      }
    );
    watch(
      () => props.colNum,
      (value) => {
        eventBus.$emit('setColNum', value);
      }
    );
    watch(
      () => props.rowHeight,
      () => {
        eventBus.$emit('setRowHeight', props.rowHeight);
      }
    );
    watch(
      () => props.isDraggable,
      () => {
        eventBus.$emit('setDraggable', props.isDraggable);
      }
    );
    watch(
      () => props.isResizable,
      () => {
        eventBus.$emit('setResizable', props.isResizable);
      }
    );
    watch(
      () => props.isBounded,
      () => {
        eventBus.$emit('setBounded', props.isBounded);
      }
    );
    watch(
      () => props.transformScale,
      () => {
        eventBus.$emit('setTransformScale', props.transformScale);
      }
    );
    watch(
      () => props.responsive,
      () => {
        if (!props.responsive && originalLayout.value) {
          emit('update:layout', originalLayout.value);
          eventBus.$emit('setColNum', props.colNum);
        }

        onWindowResize();
      }
    );
    watch(
      () => props.maxRows,
      () => {
        eventBus.$emit('setMaxRows', props.maxRows);
      }
    );
    watch(
      () => props.margin,
      () => {
        updateHeight();
      },
      { deep: true }
    );

    onBeforeMount(() => {
      emit('layout-before-mount', props.layout);
    });

    onMounted(() => {
      emit('layout-mounted', props.layout);

      void nextTick(async () => {
        validateLayout(props.layout);

        originalLayout.value = cloneLayout(props.layout);
        await nextTick();
        initResponsiveFeatures();
        onWindowResize();
        addWindowEventListener('resize', onWindowResize);
        compact(props.layout, props.verticalCompact);
        emit('layout-updated', props.layout);
        updateHeight();

        if (typeof ResizeObserver !== 'undefined' && itemRef.value) {
          resizeObserver.value = new ResizeObserver(() => {
            onWindowResize();
          });
          resizeObserver.value.observe(itemRef.value);
        }
      });
    });

    onBeforeUnmount(() => {
      eventBus.$off('resizeEvent', resizeEventHandler);
      eventBus.$off('dragEvent', dragEventHandler);
      eventBus.clear();
      removeWindowEventListener('resize', onWindowResize);

      if (resizeObserver.value && itemRef.value) {
        resizeObserver.value.unobserve(itemRef.value);
        resizeObserver.value.disconnect();
      }
    });

    return {
      itemRef,
      mergedStyle,
      isDragging,
      placeholder,
    };
  },
};
</script>
<style>
.vue-grid-layout {
  position: relative;
  transition: height 200ms ease;
}
</style>
