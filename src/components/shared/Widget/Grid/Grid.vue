<template>
  <grid-layout
    :layout.sync="layout"
    :responsive-layouts="responsiveLayouts"
    :cols="cols"
    :breakpoints="breakpoints"
    :row-height="rowHeight"
    :is-draggable="draggable"
    :is-resizable="resizable"
    :margin="[margin, margin]"
    :responsive="true"
    :prevent-collision="true"
    :vertical-compact="compact"
    :use-css-transforms="false"
    @layout-ready="onReady"
    @breakpoint-changed="onBreakpointChanged"
  >
    <grid-item v-for="widget in layout" :key="widget.i" v-bind="widget">
      <slot
        v-if="ready"
        :name="widget.i"
        v-bind="{
          onResize: ($event) => onWidgetResize($event, widget.i),
        }"
      />
    </grid-item>
  </grid-layout>
</template>

<script lang="ts">
import cloneDeep from 'lodash/fp/cloneDeep';
import debounce from 'lodash.debounce';
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
  @Prop({ default: () => DEFAULT_COLS, type: Object }) readonly cols!: LayoutConfig;
  @Prop({ default: () => DEFAULT_BREAKPOINTS, type: Object }) readonly breakpoints!: LayoutConfig;

  ready = false;
  onReady = debounce(this.setReady);
  breakpoint: BreakpointKey = BreakpointKey.lg;
  layout: Layout<LayoutWidget> = [];

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
  private updateCurrentLayout() {
    const layout =
      this.breakpoint in this.responsiveLayouts
        ? this.responsiveLayouts[this.breakpoint]
        : this.responsiveLayouts[BreakpointKey.lg];

    this.layout = cloneDeep(layout) as Layout<LayoutWidget>;
  }

  setReady(): void {
    this.ready = true;
  }

  onBreakpointChanged(newBreakpoint: BreakpointKey): void {
    this.breakpoint = newBreakpoint;
  }

  onWidgetResize(rect: DOMRectReadOnly, id: string): void {
    const layout = cloneDeep(this.layout);
    const widget = layout.find((item) => item.i === id);

    if (!widget) return;

    const { height } = rect;
    // `height = h * (rowHeight + margin) - margin` - library calculates grid-item height (px)
    // `h = (height + margin) / (rowHeight + margin)`
    const calculatedH = Math.ceil((height + this.margin) / (this.rowHeight + this.margin));
    const updatedH = Math.max(widget.minH, calculatedH);
    // mutate local layout
    widget.h = updatedH;
    // update component layout
    this.layout = layout;
  }
}
</script>
