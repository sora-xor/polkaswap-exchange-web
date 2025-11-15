<template>
  <div ref="item" class="vue-grid-layout" :style="mergedStyle">
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
import { defineComponent, type PropType } from 'vue';

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

type Margin = [number, number];
type PlaceholderItem = { x: number; y: number; w: number; h: number; i: string };
type DragPositions = Record<string, { x: number; y: number }>;
type VuePropType<T> = PropType<T>;

export default defineComponent({
  name: 'GridLayout',
  components: {
    GridItem,
  },
  provide() {
    return {
      eventBus: this.eventBus,
      layout: this,
    };
  },
  props: {
    autoSize: { type: Boolean, default: true },
    colNum: { type: Number, default: 12 },
    rowHeight: { type: Number, default: 150 },
    maxRows: { type: Number, default: Infinity },
    margin: {
      type: Array as VuePropType<Margin>,
      default: (): Margin => [10, 10],
    },
    isDraggable: { type: Boolean, default: true },
    isResizable: { type: Boolean, default: true },
    isMirrored: { type: Boolean, default: false },
    isBounded: { type: Boolean, default: false },
    useCssTransforms: { type: Boolean, default: true },
    verticalCompact: { type: Boolean, default: true },
    restoreOnDrag: { type: Boolean, default: false },
    layout: {
      type: Array as VuePropType<Layout>,
      required: true,
    },
    responsive: { type: Boolean, default: false },
    responsiveLayouts: {
      type: Object as VuePropType<ResponsiveLayouts>,
      default: (): ResponsiveLayouts => ({}),
    },
    transformScale: { type: Number, default: 1 },
    breakpoints: {
      type: Object as VuePropType<Breakpoints>,
      default: (): Breakpoints => ({ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }),
    },
    cols: {
      type: Object as VuePropType<Breakpoints>,
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
  data() {
    return {
      width: null as number | null,
      mergedStyle: {} as Record<string, string>,
      lastLayoutLength: 0,
      isDragging: false,
      placeholder: {
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        i: '__placeholder__',
      } as PlaceholderItem,
      layouts: {} as ResponsiveLayouts,
      lastBreakpoint: null as string | null,
      originalLayout: null as Layout | null,
      eventBus: new GridEventBus(),
      resizeObserver: null as ResizeObserver | null,
      positionsBeforeDrag: undefined as DragPositions | undefined,
      resizeEventHandler: null as
        | ((eventType: string, id: string, x: number, y: number, h: number, w: number) => void)
        | null,
      dragEventHandler: null as
        | ((eventType: string, id: string, x: number, y: number, h: number, w: number) => void)
        | null,
    };
  },
  watch: {
    width: function (newval, oldval) {
      const self = this;
      this.$nextTick(function () {
        //this.$broadcast("updateWidth", this.width);
        this.eventBus.$emit('updateWidth', this.width);
        if (oldval === null) {
          /*
                            If oldval == null is when the width has never been
                            set before. That only occurs when mouting is
                            finished, and onWindowResize has been called and
                            this.width has been changed the first time after it
                            got set to null in the constructor. It is now time
                            to issue layout-ready events as the GridItems have
                            their sizes configured properly.

                            The reason for emitting the layout-ready events on
                            the next tick is to allow for the newly-emitted
                            updateWidth event (above) to have reached the
                            children GridItem-s and had their effect, so we're
                            sure that they have the final size before we emit
                            layout-ready (for this GridLayout) and
                            item-layout-ready (for the GridItem-s).

                            This way any client event handlers can reliably
                            invistigate stable sizes of GridItem-s.
                        */
          this.$nextTick(() => {
            this.$emit('layout-ready', self.layout);
          });
        }
        this.updateHeight();
      });
    },
    layout: function () {
      this.layoutUpdate();
    },
    colNum: function (val) {
      this.eventBus.$emit('setColNum', val);
    },
    rowHeight: function () {
      this.eventBus.$emit('setRowHeight', this.rowHeight);
    },
    isDraggable: function () {
      this.eventBus.$emit('setDraggable', this.isDraggable);
    },
    isResizable: function () {
      this.eventBus.$emit('setResizable', this.isResizable);
    },
    isBounded: function () {
      this.eventBus.$emit('setBounded', this.isBounded);
    },
    transformScale: function () {
      this.eventBus.$emit('setTransformScale', this.transformScale);
    },
    responsive() {
      if (!this.responsive) {
        this.$emit('update:layout', this.originalLayout);
        this.eventBus.$emit('setColNum', this.colNum);
      }
      this.onWindowResize();
    },
    maxRows: function () {
      this.eventBus.$emit('setMaxRows', this.maxRows);
    },
    margin() {
      this.updateHeight();
    },
  },
  created() {
    this.resizeEventHandler = (eventType, id, x, y, h, w) => {
      this.resizeEvent(eventType, id, x, y, h, w);
    };

    this.dragEventHandler = (eventType, id, x, y, h, w) => {
      this.dragEvent(eventType, id, x, y, h, w);
    };

    this.eventBus.$on('resizeEvent', this.resizeEventHandler!);
    this.eventBus.$on('dragEvent', this.dragEventHandler!);
    this.$emit('layout-created', this.layout);
  },
  beforeUnmount() {
    if (this.resizeEventHandler) {
      this.eventBus.$off('resizeEvent', this.resizeEventHandler);
    }
    if (this.dragEventHandler) {
      this.eventBus.$off('dragEvent', this.dragEventHandler);
    }
    this.eventBus.clear();
    removeWindowEventListener('resize', this.onWindowResize);
    if (this.resizeObserver && this.$refs.item instanceof HTMLElement) {
      this.resizeObserver.unobserve(this.$refs.item);
      this.resizeObserver.disconnect();
    }
  },
  beforeMount: function () {
    this.$emit('layout-before-mount', this.layout);
  },
  mounted() {
    this.$emit('layout-mounted', this.layout);
    this.$nextTick(() => {
      validateLayout(this.layout);

      this.originalLayout = this.layout;
      this.$nextTick(() => {
        this.initResponsiveFeatures();
        this.onWindowResize();

        addWindowEventListener('resize', this.onWindowResize);

        compact(this.layout, this.verticalCompact);

        this.$emit('layout-updated', this.layout);

        this.updateHeight();

        if (typeof ResizeObserver !== 'undefined') {
          this.resizeObserver = new ResizeObserver(() => {
            this.onWindowResize();
          });
          const element = this.$refs.item as HTMLElement | undefined;
          if (element) {
            this.resizeObserver.observe(element);
          }
        }
      });
    });
  },
  methods: {
    layoutUpdate() {
      if (this.layout !== undefined && this.originalLayout !== null) {
        if (this.layout.length !== this.originalLayout.length) {
          // console.log("### LAYOUT UPDATE!", this.layout.length, this.originalLayout.length);

          let diff = this.findDifference(this.layout, this.originalLayout);
          if (diff.length > 0) {
            // console.log(diff);
            if (this.layout.length > this.originalLayout.length) {
              this.originalLayout = this.originalLayout.concat(diff);
            } else {
              this.originalLayout = this.originalLayout.filter((obj) => {
                return !diff.some((obj2) => {
                  return obj.i === obj2.i;
                });
              });
            }
          }

          this.lastLayoutLength = this.layout.length;
          this.initResponsiveFeatures();
        }

        compact(this.layout, this.verticalCompact);
        this.eventBus.$emit('updateWidth', this.width);
        this.updateHeight();

        this.$emit('layout-updated', this.layout);
      }
    },
    updateHeight: function () {
      this.updateHeightWithLayout(this.layout);
    },
    updateHeightWithLayout(layout) {
      if (!this.autoSize) return;
      const containerHeight = bottom(layout) * (this.rowHeight + this.margin[1]) + this.margin[1] + 'px';
      this.mergedStyle = {
        height: containerHeight,
      };
    },
    onWindowResize: function () {
      if (this.$refs !== null && this.$refs.item !== null && this.$refs.item !== undefined) {
        this.width = this.$refs.item.offsetWidth;
      }
      this.eventBus.$emit('resizeEvent');
    },
    dragEvent: function (eventName, id, x, y, h, w) {
      if (eventName === 'dragstart' && !this.verticalCompact) {
        this.positionsBeforeDrag = this.layout.reduce(
          (result, { i, x, y }) => ({
            ...result,
            [i]: { x, y },
          }),
          {}
        );
      }

      const workingLayout = cloneLayout(this.layout);
      const workingItem = getLayoutItem(workingLayout, id);

      if (!workingItem) {
        return;
      }

      const movedLayout = moveElement(workingLayout, workingItem, x, y, true, this.preventCollision);

      if (eventName === 'dragmove' || eventName === 'dragstart') {
        this.placeholder.i = id;
        this.placeholder.x = workingItem.x;
        this.placeholder.y = workingItem.y;
        this.placeholder.w = w ?? workingItem.w;
        this.placeholder.h = h ?? workingItem.h;
        this.$nextTick(function () {
          this.isDragging = true;
        });
        //this.$broadcast("updateWidth", this.width);
        this.eventBus.$emit('updateWidth', this.width);
      } else {
        this.$nextTick(function () {
          this.isDragging = false;
        });
      }

      let updatedLayout;
      if (this.restoreOnDrag) {
        // Do not compact items more than in layout before drag
        // Set moved item as static to avoid to compact it
        workingItem.static = true;
        updatedLayout = compact(movedLayout, this.verticalCompact, this.positionsBeforeDrag);
        workingItem.static = false;
      } else {
        updatedLayout = compact(movedLayout, this.verticalCompact);
      }

      // needed because vue can't detect changes on array element properties
      this.eventBus.$emit('compact');
      this.updateHeightWithLayout(updatedLayout);
      if (eventName === 'dragend') {
        this.positionsBeforeDrag = undefined;
        this.$emit('layout-updated', updatedLayout);
      }
      this.$emit('update:layout', updatedLayout);
    },
    resizeEvent: function (eventName, id, x, y, h, w) {
      let l = getLayoutItem(this.layout, id);
      //GetLayoutItem sometimes return null object
      if (l === undefined || l === null) {
        l = { h: 0, w: 0 };
      }

      let hasCollisions;
      if (this.preventCollision) {
        const collisions = getAllCollisions(this.layout, { ...l, w, h }).filter((layoutItem) => layoutItem.i !== l.i);
        hasCollisions = collisions.length > 0;

        // If we're colliding, we need adjust the placeholder.
        if (hasCollisions) {
          // adjust w && h to maximum allowed space
          let leastX = Infinity,
            leastY = Infinity;
          collisions.forEach((layoutItem) => {
            if (layoutItem.x > l.x) leastX = Math.min(leastX, layoutItem.x);
            if (layoutItem.y > l.y) leastY = Math.min(leastY, layoutItem.y);
          });

          if (Number.isFinite(leastX)) l.w = leastX - l.x;
          if (Number.isFinite(leastY)) l.h = leastY - l.y;
        }
      }

      if (!hasCollisions) {
        // Set new width and height.
        l.w = w;
        l.h = h;
      }

      if (eventName === 'resizestart' || eventName === 'resizemove') {
        this.placeholder.i = id;
        this.placeholder.x = x;
        this.placeholder.y = y;
        this.placeholder.w = l.w;
        this.placeholder.h = l.h;
        this.$nextTick(function () {
          this.isDragging = true;
        });
        //this.$broadcast("updateWidth", this.width);
        this.eventBus.$emit('updateWidth', this.width);
      } else {
        this.$nextTick(function () {
          this.isDragging = false;
        });
      }

      if (this.responsive) this.responsiveGridLayout();

      compact(this.layout, this.verticalCompact);
      this.eventBus.$emit('compact');
      this.updateHeight();

      if (eventName === 'resizeend') this.$emit('layout-updated', this.layout);
    },

    // finds or generates new layouts for set breakpoints
    responsiveGridLayout() {
      let newBreakpoint = getBreakpointFromWidth(this.breakpoints, this.width);
      let newCols = getColsFromBreakpoint(newBreakpoint, this.cols);

      // save actual layout in layouts
      if (this.lastBreakpoint != null && !this.layouts[this.lastBreakpoint])
        this.layouts[this.lastBreakpoint] = cloneLayout(this.layout);

      // Find or generate a new layout.
      let layout = findOrGenerateResponsiveLayout(
        this.originalLayout,
        this.layouts,
        this.breakpoints,
        newBreakpoint,
        this.lastBreakpoint,
        newCols,
        this.verticalCompact
      );

      // Store the new layout.
      this.layouts[newBreakpoint] = layout;

      if (this.lastBreakpoint !== newBreakpoint) {
        this.$emit('breakpoint-changed', newBreakpoint, layout);
      }

      // new prop sync
      this.$emit('update:layout', layout);

      this.lastBreakpoint = newBreakpoint;
      this.eventBus.$emit('setColNum', getColsFromBreakpoint(newBreakpoint, this.cols));
    },

    // clear all responsive layouts
    initResponsiveFeatures() {
      // clear layouts
      this.layouts = Object.assign({}, this.responsiveLayouts);
    },

    // find difference in layouts
    findDifference(layout, originalLayout) {
      //Find values that are in result1 but not in result2
      let uniqueResultOne = layout.filter(function (obj) {
        return !originalLayout.some(function (obj2) {
          return obj.i === obj2.i;
        });
      });

      //Find values that are in result2 but not in result1
      let uniqueResultTwo = originalLayout.filter(function (obj) {
        return !layout.some(function (obj2) {
          return obj.i === obj2.i;
        });
      });

      //Combine the two arrays of unique entries#
      return uniqueResultOne.concat(uniqueResultTwo);
    },
  },
});
</script>
<style>
.vue-grid-layout {
  position: relative;
  transition: height 200ms ease;
}
</style>
