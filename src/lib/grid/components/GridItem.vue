<template>
  <div ref="itemRef" class="vue-grid-item" :class="classObj" :style="style">
    <slot></slot>
    <span v-if="resizableAndNotStatic" :class="resizableHandleClass"></span>
    <!--<span v-if="draggable" ref="dragHandle" class="vue-draggable-handle"></span>-->
  </div>
</template>
<script lang="ts">
import interact from '@interactjs/interact';
import '@interactjs/auto-start';
import '@interactjs/auto-scroll';
import '@interactjs/actions/drag';
import '@interactjs/actions/resize';
import '@interactjs/modifiers';
import '@interactjs/dev-tools';
import { computed, inject, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from 'vue';

import { GRID_EVENT_BUS_KEY, GRID_LAYOUT_KEY, type GridMargin } from '@/lib/grid/context';
import { getDocumentDir } from '@/lib/grid/helpers/dom';
import { getControlPosition, createCoreData } from '@/lib/grid/helpers/draggableUtils';
import { getColsFromBreakpoint } from '@/lib/grid/helpers/responsiveUtils';
import { setTopLeft, setTopRight, setTransformRtl, setTransform } from '@/lib/grid/helpers/utils';

type GridPosition = {
  top: number;
  width: number;
  height: number;
  left?: number;
  right?: number;
};
type GridSize = { width: number; height: number };
type GridDragPosition = { top: number; left: number };
type GridInteractEvent = Parameters<typeof getControlPosition>[0] & {
  type: string;
  target: HTMLElement & {
    offsetParent: HTMLElement | null;
  };
};

export default {
  name: 'GridItem',
  props: {
    /*cols: {
             type: Number,
             required: true
             },*/
    /*containerWidth: {
             type: Number,
             required: true

             },
             rowHeight: {
             type: Number,
             required: true
             },
             margin: {
             type: Array,
             required: true
             },
             maxRows: {
             type: Number,
             required: true
             },*/
    isDraggable: {
      type: Boolean,
      required: false,
      default: null,
    },
    isResizable: {
      type: Boolean,
      required: false,
      default: null,
    },
    isBounded: {
      type: Boolean,
      required: false,
      default: null,
    },
    /*useCssTransforms: {
             type: Boolean,
             required: true
             },
             */
    static: {
      type: Boolean,
      required: false,
      default: false,
    },
    minH: {
      type: Number,
      required: false,
      default: 1,
    },
    minW: {
      type: Number,
      required: false,
      default: 1,
    },
    maxH: {
      type: Number,
      required: false,
      default: Infinity,
    },
    maxW: {
      type: Number,
      required: false,
      default: Infinity,
    },
    x: {
      type: Number,
      required: true,
    },
    y: {
      type: Number,
      required: true,
    },
    w: {
      type: Number,
      required: true,
    },
    h: {
      type: Number,
      required: true,
    },
    i: {
      type: [String, Number],
      required: true,
    },
    dragIgnoreFrom: {
      type: String,
      required: false,
      default: 'a, button',
    },
    dragAllowFrom: {
      type: String,
      required: false,
      default: null,
    },
    resizeIgnoreFrom: {
      type: String,
      required: false,
      default: 'a, button',
    },
    preserveAspectRatio: {
      type: Boolean,
      required: false,
      default: false,
    },
    dragOption: {
      type: Object,
      required: false,
      default: () => ({}),
    },
    resizeOption: {
      type: Object,
      required: false,
      default: () => ({}),
    },
  },
  emits: ['container-resized', 'resize', 'resized', 'move', 'moved'],
  setup(props, { emit, slots }) {
    const eventBus = inject(GRID_EVENT_BUS_KEY);
    const layout = inject(GRID_LAYOUT_KEY);

    if (!eventBus || !layout) {
      throw new Error('GridItem must be rendered inside GridLayout');
    }

    const itemRef = ref<HTMLElement | null>(null);
    const cols = ref(1);
    const containerWidth = ref(100);
    const rowHeight = ref(30);
    const margin = ref<GridMargin>([10, 10]);
    const maxRows = ref<number>(Infinity);
    const draggable = ref<boolean | null>(null);
    const resizable = ref<boolean | null>(null);
    const bounded = ref<boolean | null>(null);
    const transformScale = ref(1);
    const useCssTransforms = ref(true);
    const useStyleCursor = ref(true);
    const isDragging = ref(false);
    const dragging = ref<GridDragPosition | null>(null);
    const isResizing = ref(false);
    const resizing = ref<GridSize | null>(null);
    const lastX = ref<number | null>(null);
    const lastY = ref<number | null>(null);
    const lastW = ref<number | null>(null);
    const lastH = ref<number | null>(null);
    const style = ref<CSSProperties>({});
    const rtl = ref(getDocumentDir() === 'rtl');
    const dragEventSet = ref(false);
    const resizeEventSet = ref(false);
    const previousW = ref<number | null>(null);
    const previousH = ref<number | null>(null);
    const previousX = ref<number | null>(null);
    const previousY = ref<number | null>(null);
    const innerX = ref(props.x);
    const innerY = ref(props.y);
    const innerW = ref(props.w);
    const innerH = ref(props.h);
    const interactObj = ref<ReturnType<typeof interact> | null>(null);

    const resizableAndNotStatic = computed(() => Boolean(resizable.value) && !props.static);
    const draggableOrResizableAndNotStatic = computed(
      () => (Boolean(draggable.value) || Boolean(resizable.value)) && !props.static
    );
    const isAndroid = computed(
      () => typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().indexOf('android') !== -1
    );
    const renderRtl = computed(() => (layout.isMirrored.value ? !rtl.value : rtl.value));
    const resizableHandleClass = computed(() => {
      return renderRtl.value ? 'vue-resizable-handle vue-rtl-resizable-handle' : 'vue-resizable-handle';
    });
    const classObj = computed(() => ({
      'vue-resizable': resizableAndNotStatic.value,
      static: props.static,
      resizing: isResizing.value,
      'vue-draggable-dragging': isDragging.value,
      cssTransforms: useCssTransforms.value,
      'render-rtl': renderRtl.value,
      'disable-userselect': isDragging.value,
      'no-touch': isAndroid.value && draggableOrResizableAndNotStatic.value,
    }));

    const calcColWidth = (): number => {
      return (containerWidth.value - margin.value[0] * (cols.value + 1)) / cols.value;
    };

    const calcPosition = (x: number, y: number, w: number, h: number): GridPosition => {
      const colWidth = calcColWidth();

      if (renderRtl.value) {
        return {
          right: Math.round(colWidth * x + (x + 1) * margin.value[0]),
          top: Math.round(rowHeight.value * y + (y + 1) * margin.value[1]),
          width: w === Infinity ? w : Math.round(colWidth * w + Math.max(0, w - 1) * margin.value[0]),
          height: h === Infinity ? h : Math.round(rowHeight.value * h + Math.max(0, h - 1) * margin.value[1]),
        };
      }

      return {
        left: Math.round(colWidth * x + (x + 1) * margin.value[0]),
        top: Math.round(rowHeight.value * y + (y + 1) * margin.value[1]),
        width: w === Infinity ? w : Math.round(colWidth * w + Math.max(0, w - 1) * margin.value[0]),
        height: h === Infinity ? h : Math.round(rowHeight.value * h + Math.max(0, h - 1) * margin.value[1]),
      };
    };

    const createStyle = (): void => {
      if (props.x + props.w > cols.value) {
        innerX.value = 0;
        innerW.value = props.w > cols.value ? cols.value : props.w;
      } else {
        innerX.value = props.x;
        innerW.value = props.w;
      }

      const position = calcPosition(innerX.value, innerY.value, innerW.value, innerH.value);

      if (isDragging.value && dragging.value) {
        position.top = dragging.value.top;
        if (renderRtl.value) {
          position.right = dragging.value.left;
        } else {
          position.left = dragging.value.left;
        }
      }

      if (isResizing.value && resizing.value) {
        position.width = resizing.value.width;
        position.height = resizing.value.height;
      }

      if (useCssTransforms.value) {
        style.value = renderRtl.value
          ? setTransformRtl(position.top, position.right ?? 0, position.width, position.height)
          : setTransform(position.top, position.left ?? 0, position.width, position.height);
        return;
      }

      style.value = renderRtl.value
        ? setTopRight(position.top, position.right ?? 0, position.width, position.height)
        : setTopLeft(position.top, position.left ?? 0, position.width, position.height);
    };

    const emitContainerResized = (): void => {
      const styleProps: Record<'width' | 'height', string> = { width: '', height: '' };

      for (const prop of ['width', 'height'] as const) {
        const rawValue = style.value[prop];
        if (typeof rawValue !== 'string') return;

        const matches = rawValue.match(/^(\d+)px$/);
        if (!matches) return;

        styleProps[prop] = matches[1];
      }

      emit('container-resized', props.i, props.h, props.w, styleProps.height, styleProps.width);
    };

    const calcXY = (top: number, left: number): { x: number; y: number } => {
      const colWidth = calcColWidth();
      let x = Math.round((left - margin.value[0]) / (colWidth + margin.value[0]));
      let y = Math.round((top - margin.value[1]) / (rowHeight.value + margin.value[1]));

      x = Math.max(Math.min(x, cols.value - innerW.value), 0);
      y = Math.max(Math.min(y, maxRows.value - innerH.value), 0);

      return { x, y };
    };

    const calcGridItemWHPx = (gridUnits: number, colOrRowSize: number, marginPx: number): number => {
      if (!Number.isFinite(gridUnits)) return gridUnits;
      return Math.round(colOrRowSize * gridUnits + Math.max(0, gridUnits - 1) * marginPx);
    };

    const clamp = (num: number, lowerBound: number, upperBound: number): number => {
      return Math.max(Math.min(num, upperBound), lowerBound);
    };

    const calcWH = (height: number, width: number, autoSizeFlag = false): { w: number; h: number } => {
      const colWidth = calcColWidth();
      let nextW = Math.round((width + margin.value[0]) / (colWidth + margin.value[0]));
      let nextH = autoSizeFlag
        ? Math.ceil((height + margin.value[1]) / (rowHeight.value + margin.value[1]))
        : Math.round((height + margin.value[1]) / (rowHeight.value + margin.value[1]));

      nextW = Math.max(Math.min(nextW, cols.value - innerX.value), 0);
      nextH = Math.max(Math.min(nextH, maxRows.value - innerY.value), 0);

      return { w: nextW, h: nextH };
    };

    const updateWidth = (width?: number | null, colNum?: number | null): void => {
      if (typeof width === 'number') {
        containerWidth.value = width;
      }
      if (typeof colNum === 'number') {
        cols.value = colNum;
      }
    };

    const compactItem = (): void => {
      createStyle();
    };

    const ensureInteractable = (): ReturnType<typeof interact> | null => {
      if (interactObj.value || !itemRef.value) {
        return interactObj.value;
      }

      interactObj.value = interact(itemRef.value);
      if (!useStyleCursor.value) {
        interactObj.value.styleCursor(false);
      }

      return interactObj.value;
    };

    const handleResize = (event: GridInteractEvent): void => {
      if (props.static) return;

      const position = getControlPosition(event);
      const { x, y } = position;
      const newSize: GridSize = { width: 0, height: 0 };
      let nextPosition: { w: number; h: number };

      switch (event.type) {
        case 'resizestart': {
          tryMakeResizable();
          previousW.value = innerW.value;
          previousH.value = innerH.value;
          const currentPosition = calcPosition(innerX.value, innerY.value, innerW.value, innerH.value);
          newSize.width = currentPosition.width;
          newSize.height = currentPosition.height;
          resizing.value = newSize;
          isResizing.value = true;
          break;
        }
        case 'resizemove': {
          if (!resizing.value) return;

          const coreEvent = createCoreData(lastW.value, lastH.value, x, y);
          newSize.width = renderRtl.value
            ? resizing.value.width - coreEvent.deltaX / transformScale.value
            : resizing.value.width + coreEvent.deltaX / transformScale.value;
          newSize.height = resizing.value.height + coreEvent.deltaY / transformScale.value;
          resizing.value = newSize;
          break;
        }
        case 'resizeend': {
          const currentPosition = calcPosition(innerX.value, innerY.value, innerW.value, innerH.value);
          newSize.width = currentPosition.width;
          newSize.height = currentPosition.height;
          resizing.value = null;
          isResizing.value = false;
          break;
        }
        default:
          return;
      }

      nextPosition = calcWH(newSize.height, newSize.width);

      if (nextPosition.w < props.minW) nextPosition.w = props.minW;
      if (nextPosition.w > props.maxW) nextPosition.w = props.maxW;
      if (nextPosition.h < props.minH) nextPosition.h = props.minH;
      if (nextPosition.h > props.maxH) nextPosition.h = props.maxH;
      if (nextPosition.h < 1) nextPosition.h = 1;
      if (nextPosition.w < 1) nextPosition.w = 1;

      lastW.value = x;
      lastH.value = y;

      if (innerW.value !== nextPosition.w || innerH.value !== nextPosition.h) {
        emit('resize', props.i, nextPosition.h, nextPosition.w, newSize.height, newSize.width);
      }

      if (event.type === 'resizeend' && (previousW.value !== innerW.value || previousH.value !== innerH.value)) {
        emit('resized', props.i, nextPosition.h, nextPosition.w, newSize.height, newSize.width);
      }

      eventBus.$emit('resizeEvent', event.type, props.i, innerX.value, innerY.value, nextPosition.h, nextPosition.w);
    };

    const handleDrag = (event: GridInteractEvent): void => {
      if (props.static || isResizing.value) return;

      const position = getControlPosition(event);
      const { x, y } = position;
      const nextPosition: GridDragPosition = { top: 0, left: 0 };

      switch (event.type) {
        case 'dragstart': {
          previousX.value = innerX.value;
          previousY.value = innerY.value;

          const parentRect = event.target.offsetParent?.getBoundingClientRect();
          if (!parentRect) return;

          const clientRect = event.target.getBoundingClientRect();
          const cLeft = clientRect.left / transformScale.value;
          const pLeft = parentRect.left / transformScale.value;
          const cRight = clientRect.right / transformScale.value;
          const pRight = parentRect.right / transformScale.value;
          const cTop = clientRect.top / transformScale.value;
          const pTop = parentRect.top / transformScale.value;

          nextPosition.left = renderRtl.value ? (cRight - pRight) * -1 : cLeft - pLeft;
          nextPosition.top = cTop - pTop;
          dragging.value = nextPosition;
          isDragging.value = true;
          break;
        }
        case 'dragmove': {
          if (!dragging.value) return;

          const coreEvent = createCoreData(lastX.value, lastY.value, x, y);
          nextPosition.left = renderRtl.value
            ? dragging.value.left - coreEvent.deltaX / transformScale.value
            : dragging.value.left + coreEvent.deltaX / transformScale.value;
          nextPosition.top = dragging.value.top + coreEvent.deltaY / transformScale.value;

          if (bounded.value) {
            const parentHeight = event.target.offsetParent?.clientHeight;
            if (typeof parentHeight === 'number') {
              const bottomBoundary = parentHeight - calcGridItemWHPx(props.h, rowHeight.value, margin.value[1]);
              nextPosition.top = clamp(nextPosition.top, 0, bottomBoundary);
            }

            const colWidth = calcColWidth();
            const rightBoundary = containerWidth.value - calcGridItemWHPx(props.w, colWidth, margin.value[0]);
            nextPosition.left = clamp(nextPosition.left, 0, rightBoundary);
          }

          dragging.value = nextPosition;
          break;
        }
        case 'dragend': {
          if (!isDragging.value) return;

          const parentRect = event.target.offsetParent?.getBoundingClientRect();
          if (!parentRect) return;

          const clientRect = event.target.getBoundingClientRect();
          const cLeft = clientRect.left / transformScale.value;
          const pLeft = parentRect.left / transformScale.value;
          const cRight = clientRect.right / transformScale.value;
          const pRight = parentRect.right / transformScale.value;
          const cTop = clientRect.top / transformScale.value;
          const pTop = parentRect.top / transformScale.value;

          nextPosition.left = renderRtl.value ? (cRight - pRight) * -1 : cLeft - pLeft;
          nextPosition.top = cTop - pTop;
          dragging.value = null;
          isDragging.value = false;
          break;
        }
        default:
          return;
      }

      const nextGridPosition = calcXY(nextPosition.top, nextPosition.left);
      lastX.value = x;
      lastY.value = y;

      if (innerX.value !== nextGridPosition.x || innerY.value !== nextGridPosition.y) {
        emit('move', props.i, nextGridPosition.x, nextGridPosition.y);
      }

      if (event.type === 'dragend' && (previousX.value !== innerX.value || previousY.value !== innerY.value)) {
        emit('moved', props.i, nextGridPosition.x, nextGridPosition.y);
      }

      eventBus.$emit(
        'dragEvent',
        event.type,
        props.i,
        nextGridPosition.x,
        nextGridPosition.y,
        innerH.value,
        innerW.value
      );
    };

    const tryMakeDraggable = (): void => {
      const interactable = ensureInteractable();
      if (!interactable) return;

      if (draggable.value && !props.static) {
        const options = {
          ignoreFrom: props.dragIgnoreFrom,
          allowFrom: props.dragAllowFrom,
          ...props.dragOption,
        };

        interactable.draggable(options);
        if (!dragEventSet.value) {
          dragEventSet.value = true;
          interactable.on('dragstart dragmove dragend', (event) => {
            handleDrag(event as GridInteractEvent);
          });
        }
        return;
      }

      interactable.draggable({ enabled: false });
    };

    const tryMakeResizable = (): void => {
      const interactable = ensureInteractable();
      if (!interactable) return;

      if (resizable.value && !props.static) {
        const maximum = calcPosition(0, 0, props.maxW, props.maxH);
        const minimum = calcPosition(0, 0, props.minW, props.minH);
        const options: Record<string, unknown> = {
          edges: {
            left: false,
            right: '.' + resizableHandleClass.value.trim().replace(' ', '.'),
            bottom: '.' + resizableHandleClass.value.trim().replace(' ', '.'),
            top: false,
          },
          ignoreFrom: props.resizeIgnoreFrom,
          restrictSize: {
            min: {
              height: minimum.height * transformScale.value,
              width: minimum.width * transformScale.value,
            },
            max: {
              height: maximum.height * transformScale.value,
              width: maximum.width * transformScale.value,
            },
          },
          ...props.resizeOption,
        };

        if (props.preserveAspectRatio) {
          options.modifiers = [
            interact.modifiers.aspectRatio({
              ratio: 'preserve',
            }),
          ];
        }

        interactable.resizable(options);
        if (!resizeEventSet.value) {
          resizeEventSet.value = true;
          interactable.on('resizestart resizemove resizeend', (event) => {
            handleResize(event as GridInteractEvent);
          });
        }
        return;
      }

      interactable.resizable({ enabled: false });
    };

    const autoSize = (): void => {
      previousW.value = innerW.value;
      previousH.value = innerH.value;

      const firstSlotNode = slots.default?.()[0];
      if (!(firstSlotNode?.el instanceof Element)) {
        return;
      }

      const newSize = firstSlotNode.el.getBoundingClientRect();
      const nextPosition = calcWH(newSize.height, newSize.width, true);

      if (nextPosition.w < props.minW) nextPosition.w = props.minW;
      if (nextPosition.w > props.maxW) nextPosition.w = props.maxW;
      if (nextPosition.h < props.minH) nextPosition.h = props.minH;
      if (nextPosition.h > props.maxH) nextPosition.h = props.maxH;
      if (nextPosition.h < 1) nextPosition.h = 1;
      if (nextPosition.w < 1) nextPosition.w = 1;

      if (innerW.value !== nextPosition.w || innerH.value !== nextPosition.h) {
        emit('resize', props.i, nextPosition.h, nextPosition.w, newSize.height, newSize.width);
      }

      if (previousW.value !== nextPosition.w || previousH.value !== nextPosition.h) {
        emit('resized', props.i, nextPosition.h, nextPosition.w, newSize.height, newSize.width);
        eventBus.$emit('resizeEvent', 'resizeend', props.i, innerX.value, innerY.value, nextPosition.h, nextPosition.w);
      }
    };

    const updateWidthHandler = (width?: unknown): void => {
      updateWidth(typeof width === 'number' ? width : null);
    };
    const compactHandler = (): void => {
      compactItem();
    };
    const setDraggableHandler = (isDraggable?: unknown): void => {
      if (props.isDraggable === null) {
        draggable.value = typeof isDraggable === 'boolean' ? isDraggable : Boolean(isDraggable);
      }
    };
    const setResizableHandler = (isResizable?: unknown): void => {
      if (props.isResizable === null) {
        resizable.value = typeof isResizable === 'boolean' ? isResizable : Boolean(isResizable);
      }
    };
    const setBoundedHandler = (isBounded?: unknown): void => {
      if (props.isBounded === null) {
        bounded.value = typeof isBounded === 'boolean' ? isBounded : Boolean(isBounded);
      }
    };
    const setTransformScaleHandler = (nextScale?: unknown): void => {
      if (typeof nextScale === 'number') {
        transformScale.value = nextScale;
      }
    };
    const setRowHeightHandler = (nextRowHeight?: unknown): void => {
      if (typeof nextRowHeight === 'number') {
        rowHeight.value = nextRowHeight;
      }
    };
    const setMaxRowsHandler = (nextMaxRows?: unknown): void => {
      if (typeof nextMaxRows === 'number') {
        maxRows.value = nextMaxRows;
      }
    };
    const directionchangeHandler = (): void => {
      rtl.value = getDocumentDir() === 'rtl';
      compactItem();
    };
    const setColNumHandler = (colNum?: unknown): void => {
      const parsed = Number.parseInt(String(colNum), 10);
      if (!Number.isNaN(parsed)) {
        cols.value = parsed;
      }
    };

    eventBus.$on('updateWidth', updateWidthHandler);
    eventBus.$on('compact', compactHandler);
    eventBus.$on('setDraggable', setDraggableHandler);
    eventBus.$on('setResizable', setResizableHandler);
    eventBus.$on('setBounded', setBoundedHandler);
    eventBus.$on('setTransformScale', setTransformScaleHandler);
    eventBus.$on('setRowHeight', setRowHeightHandler);
    eventBus.$on('setMaxRows', setMaxRowsHandler);
    eventBus.$on('directionchange', directionchangeHandler);
    eventBus.$on('setColNum', setColNumHandler);

    watch(
      () => props.isDraggable,
      () => {
        draggable.value = props.isDraggable;
      }
    );
    watch(
      () => props.static,
      () => {
        tryMakeDraggable();
        tryMakeResizable();
      }
    );
    watch(draggable, () => {
      tryMakeDraggable();
    });
    watch(
      () => props.isResizable,
      () => {
        resizable.value = props.isResizable;
      }
    );
    watch(
      () => props.isBounded,
      () => {
        bounded.value = props.isBounded;
      }
    );
    watch(resizable, () => {
      tryMakeResizable();
    });
    watch(rowHeight, () => {
      createStyle();
      emitContainerResized();
    });
    watch(cols, () => {
      tryMakeResizable();
      createStyle();
      emitContainerResized();
    });
    watch(containerWidth, () => {
      tryMakeResizable();
      createStyle();
      emitContainerResized();
    });
    watch(
      () => props.x,
      (newValue) => {
        innerX.value = newValue;
        createStyle();
      }
    );
    watch(
      () => props.y,
      (newValue) => {
        innerY.value = newValue;
        createStyle();
      }
    );
    watch(
      () => props.h,
      (newValue) => {
        innerH.value = newValue;
        createStyle();
      }
    );
    watch(
      () => props.w,
      (newValue) => {
        innerW.value = newValue;
        createStyle();
      }
    );
    watch(renderRtl, () => {
      tryMakeResizable();
      createStyle();
    });
    watch(
      () => props.minH,
      () => {
        tryMakeResizable();
      }
    );
    watch(
      () => props.maxH,
      () => {
        tryMakeResizable();
      }
    );
    watch(
      () => props.minW,
      () => {
        tryMakeResizable();
      }
    );
    watch(
      () => props.maxW,
      () => {
        tryMakeResizable();
      }
    );
    watch(
      () => layout.margin.value,
      (nextMargin) => {
        if (!nextMargin || (nextMargin[0] === margin.value[0] && nextMargin[1] === margin.value[1])) {
          return;
        }

        margin.value = nextMargin.map((item) => Number(item)) as GridMargin;
        createStyle();
        emitContainerResized();
      },
      { deep: true }
    );

    onMounted(() => {
      if (layout.responsive.value && layout.lastBreakpoint.value) {
        cols.value = getColsFromBreakpoint(layout.lastBreakpoint.value, layout.cols.value);
      } else {
        cols.value = layout.colNum.value;
      }

      rowHeight.value = layout.rowHeight.value;
      containerWidth.value = layout.width.value ?? 100;
      margin.value = layout.margin.value !== undefined ? ([...layout.margin.value] as GridMargin) : [10, 10];
      maxRows.value = layout.maxRows.value;
      draggable.value = props.isDraggable === null ? layout.isDraggable.value : props.isDraggable;
      resizable.value = props.isResizable === null ? layout.isResizable.value : props.isResizable;
      bounded.value = props.isBounded === null ? layout.isBounded.value : props.isBounded;
      transformScale.value = layout.transformScale.value;
      useCssTransforms.value = layout.useCssTransforms.value;
      useStyleCursor.value = layout.useStyleCursor.value;
      createStyle();
      autoSize();
    });

    onBeforeUnmount(() => {
      eventBus.$off('updateWidth', updateWidthHandler);
      eventBus.$off('compact', compactHandler);
      eventBus.$off('setDraggable', setDraggableHandler);
      eventBus.$off('setResizable', setResizableHandler);
      eventBus.$off('setBounded', setBoundedHandler);
      eventBus.$off('setTransformScale', setTransformScaleHandler);
      eventBus.$off('setRowHeight', setRowHeightHandler);
      eventBus.$off('setMaxRows', setMaxRowsHandler);
      eventBus.$off('directionchange', directionchangeHandler);
      eventBus.$off('setColNum', setColNumHandler);
      interactObj.value?.unset();
    });

    return {
      itemRef,
      classObj,
      style,
      resizableAndNotStatic,
      resizableHandleClass,
    };
  },
};
</script>
<style>
.vue-grid-item {
  transition: all 200ms ease;
  transition-property: left, top, right;
  /* add right for rtl */
}

.vue-grid-item.no-touch {
  -ms-touch-action: none;
  touch-action: none;
}

.vue-grid-item.cssTransforms {
  transition-property: transform;
  left: 0;
  right: auto;
}

.vue-grid-item.cssTransforms.render-rtl {
  left: auto;
  right: 0;
}

.vue-grid-item.resizing {
  opacity: 0.6;
  z-index: 3;
}

.vue-grid-item.vue-draggable-dragging {
  transition: none;
  z-index: 3;
}

.vue-grid-item.vue-grid-placeholder {
  background: red;
  opacity: 0.2;
  transition-duration: 100ms;
  z-index: 2;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  -o-user-select: none;
  user-select: none;
}

.vue-grid-item > .vue-resizable-handle {
  position: absolute;
  width: 20px;
  height: 20px;
  bottom: 0;
  right: 0;
  background: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/Pg08IS0tIEdlbmVyYXRvcjogQWRvYmUgRmlyZXdvcmtzIENTNiwgRXhwb3J0IFNWRyBFeHRlbnNpb24gYnkgQWFyb24gQmVhbGwgKGh0dHA6Ly9maXJld29ya3MuYWJlYWxsLmNvbSkgLiBWZXJzaW9uOiAwLjYuMSAgLS0+DTwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DTxzdmcgaWQ9IlVudGl0bGVkLVBhZ2UlMjAxIiB2aWV3Qm94PSIwIDAgNiA2IiBzdHlsZT0iYmFja2dyb3VuZC1jb2xvcjojZmZmZmZmMDAiIHZlcnNpb249IjEuMSINCXhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHhtbDpzcGFjZT0icHJlc2VydmUiDQl4PSIwcHgiIHk9IjBweCIgd2lkdGg9IjZweCIgaGVpZ2h0PSI2cHgiDT4NCTxnIG9wYWNpdHk9IjAuMzAyIj4NCQk8cGF0aCBkPSJNIDYgNiBMIDAgNiBMIDAgNC4yIEwgNCA0LjIgTCA0LjIgNC4yIEwgNC4yIDAgTCA2IDAgTCA2IDYgTCA2IDYgWiIgZmlsbD0iIzAwMDAwMCIvPg0JPC9nPg08L3N2Zz4=');
  background-position: bottom right;
  padding: 0 3px 3px 0;
  background-repeat: no-repeat;
  background-origin: content-box;
  box-sizing: border-box;
  cursor: se-resize;
}

.vue-grid-item > .vue-rtl-resizable-handle {
  bottom: 0;
  left: 0;
  background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAuMDAwMDAwMDAwMDAwMDAyIiBoZWlnaHQ9IjEwLjAwMDAwMDAwMDAwMDAwMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KIDwhLS0gQ3JlYXRlZCB3aXRoIE1ldGhvZCBEcmF3IC0gaHR0cDovL2dpdGh1Yi5jb20vZHVvcGl4ZWwvTWV0aG9kLURyYXcvIC0tPgogPGc+CiAgPHRpdGxlPmJhY2tncm91bmQ8L3RpdGxlPgogIDxyZWN0IGZpbGw9Im5vbmUiIGlkPSJjYW52YXNfYmFja2dyb3VuZCIgaGVpZ2h0PSIxMiIgd2lkdGg9IjEyIiB5PSItMSIgeD0iLTEiLz4KICA8ZyBkaXNwbGF5PSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgeT0iMCIgeD0iMCIgaGVpZ2h0PSIxMDAlIiB3aWR0aD0iMTAwJSIgaWQ9ImNhbnZhc0dyaWQiPgogICA8cmVjdCBmaWxsPSJ1cmwoI2dyaWRwYXR0ZXJuKSIgc3Ryb2tlLXdpZHRoPSIwIiB5PSIwIiB4PSIwIiBoZWlnaHQ9IjEwMCUiIHdpZHRoPSIxMDAlIi8+CiAgPC9nPgogPC9nPgogPGc+CiAgPHRpdGxlPkxheWVyIDE8L3RpdGxlPgogIDxsaW5lIGNhbnZhcz0iI2ZmZmZmZiIgY2FudmFzLW9wYWNpdHk9IjEiIHN0cm9rZS1saW5lY2FwPSJ1bmRlZmluZWQiIHN0cm9rZS1saW5lam9pbj0idW5kZWZpbmVkIiBpZD0ic3ZnXzEiIHkyPSItNzAuMTc4NDA3IiB4Mj0iMTI0LjQ2NDE3NSIgeTE9Ii0zOC4zOTI3MzciIHgxPSIxNDQuODIxMjg5IiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlPSIjMDAwIiBmaWxsPSJub25lIi8+CiAgPGxpbmUgc3Ryb2tlPSIjNjY2NjY2IiBzdHJva2UtbGluZWNhcD0idW5kZWZpbmVkIiBzdHJva2UtbGluZWpvaW49InVuZGVmaW5lZCIgaWQ9InN2Z181IiB5Mj0iOS4xMDY5NTciIHgyPSIwLjk0NzI0NyIgeTE9Ii0wLjAxODEyOCIgeDE9IjAuOTQ3MjQ3IiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz4KICA8bGluZSBzdHJva2UtbGluZWNhcD0idW5kZWZpbmVkIiBzdHJva2UtbGluZWpvaW49InVuZGVmaW5lZCIgaWQ9InN2Z183IiB5Mj0iOSIgeDI9IjEwLjA3MzUyOSIgeTE9IjkiIHgxPSItMC42NTU2NCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2U9IiM2NjY2NjYiIGZpbGw9Im5vbmUiLz4KIDwvZz4KPC9zdmc+);
  background-position: bottom left;
  padding-left: 3px;
  background-repeat: no-repeat;
  background-origin: content-box;
  cursor: sw-resize;
  right: auto;
}

.vue-grid-item.disable-userselect {
  user-select: none;
}
</style>
