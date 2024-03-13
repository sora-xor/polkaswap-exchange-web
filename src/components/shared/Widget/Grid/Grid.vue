<template>
  <grid-layout
    :layout.sync="gridLayout"
    :responsive-layouts="responsiveLayouts"
    :cols="cols"
    :breakpoints="breakpoints"
    :row-height="rowHeight"
    :is-draggable="draggable"
    :is-resizable="resizable"
    :margin="[margin, margin]"
    :responsive="true"
    :prevent-collision="false"
    :vertical-compact="compact"
    :use-css-transforms="true"
    @breakpoint-changed="onBreakpointChanged"
  >
    <grid-item v-for="widget in gridLayout" :key="widget.i" v-bind="widget">
      <slot
        :name="widget.i"
        v-bind="{
          id: widget.i,
          loading,
          onResize: ($event) => onWidgetResize($event, widget.i),
        }"
      />
    </grid-item>
  </grid-layout>
</template>

<script lang="ts">
import debounce from 'lodash/debounce';
import cloneDeep from 'lodash/fp/cloneDeep';
import isEqual from 'lodash/fp/isEqual';
import { GridLayout, GridItem } from 'vue-grid-layout';
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';

import { Breakpoint, BreakpointKey } from '@/consts/layout';
import type { Layout, LayoutConfig, LayoutWidget, LayoutWidgetConfig, ResponsiveLayouts } from '@/types/layout';

const DEFAULT_BREAKPOINTS: LayoutConfig = {
  [BreakpointKey.lg]: Breakpoint.HugeDesktop, // 2092
  [BreakpointKey.md]: Breakpoint.LargeDesktop, // 1440
  [BreakpointKey.sm]: Breakpoint.Desktop, // 1024
  [BreakpointKey.xs]: Breakpoint.Tablet, // 900
  [BreakpointKey.xss]: Breakpoint.Mobile, // 464
};

const DEFAULT_COLS: LayoutConfig = {
  [BreakpointKey.lg]: 24, // 2092
  [BreakpointKey.md]: 16, // 1440
  [BreakpointKey.sm]: 12, // 1024
  [BreakpointKey.xs]: 8, // 900
  [BreakpointKey.xss]: 4, // 464
};

@Component({
  components: {
    GridLayout,
    GridItem,
  },
})
export default class WidgetsGrid extends Vue {
  @Prop({ required: true, type: Object }) readonly layouts!: ResponsiveLayouts<LayoutWidgetConfig>;
  @Prop({ default: 10, type: Number }) readonly rowHeight!: number;
  @Prop({ default: 16, type: Number }) readonly margin!: number;
  @Prop({ default: false, type: Boolean }) readonly draggable!: boolean;
  @Prop({ default: false, type: Boolean }) readonly resizable!: boolean;
  @Prop({ default: false, type: Boolean }) readonly compact!: boolean;
  @Prop({ default: false, type: Boolean }) readonly loading!: boolean;
  @Prop({ default: () => DEFAULT_COLS, type: Object }) readonly cols!: LayoutConfig;
  @Prop({ default: () => DEFAULT_BREAKPOINTS, type: Object }) readonly breakpoints!: LayoutConfig;

  private breakpoint: BreakpointKey = BreakpointKey.lg;
  private layout: Layout<LayoutWidget> = [];

  get gridLayout() {
    return this.layout;
  }

  set gridLayout(updated) {
    this.layout = updated;
    this.onUpdate(this.layout);
  }

  onUpdate = debounce(this.emitUpdate, 500);

  get responsiveLayouts(): ResponsiveLayouts<LayoutWidget> {
    return Object.entries(this.layouts).reduce<ResponsiveLayouts<LayoutWidget>>((acc, [key, layout]) => {
      acc[key] = layout.map((widget) => ({
        ...widget,
        minW: widget.minW ?? widget.w,
        minH: widget.minH ?? widget.h,
      }));
      return acc;
    }, {});
  }

  @Watch('responsiveLayouts')
  private updateCurrentLayout(updatedLayouts: ResponsiveLayouts<LayoutWidget>): void {
    const updatedLayout = updatedLayouts[this.breakpoint];

    if (!updatedLayout || isEqual(this.layout)(updatedLayout)) return;

    this.layout = cloneDeep(updatedLayout) as Layout<LayoutWidget>;
  }

  onBreakpointChanged(newBreakpoint: BreakpointKey): void {
    this.breakpoint = newBreakpoint;
  }

  onWidgetResize(rect: DOMRectReadOnly, id: string): void {
    const layout = cloneDeep(this.gridLayout);
    const widget = layout.find((item) => item.i === id);

    if (!widget) return;

    const { height } = rect;
    // `height = h * (rowHeight + margin) - margin` - library calculates grid-item height (px)
    // `h = (height + margin) / (rowHeight + margin)`
    const calculatedH = Math.ceil((height + this.margin) / (this.rowHeight + this.margin));
    const updatedH = Math.max(widget.minH ?? 1, calculatedH);
    // mutate local layout
    widget.h = updatedH;
    // update component layout
    this.gridLayout = layout;
  }

  private emitUpdate(layout: Layout): void {
    const update: ResponsiveLayouts<LayoutWidget> = {
      [this.breakpoint]: layout,
    };

    this.$emit('update', update);
  }
}
</script>
