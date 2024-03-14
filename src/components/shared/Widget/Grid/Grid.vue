<template>
  <grid-layout
    class="widgets-grid"
    :layout.sync="gridLayout"
    :responsive-layouts="layouts"
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
    <div v-if="lines" class="grid-lines" :style="gridLinesStyle" />
    <grid-item v-for="widget in gridLayout" :key="widget.i" v-bind="widget">
      <slot
        :name="widget.i"
        v-bind="{
          id: widget.i,
          loading,
          onResize,
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
import type { Layout, LayoutConfig, ResponsiveLayouts } from '@/types/layout';

const DEFAULT_BREAKPOINTS: LayoutConfig = {
  [BreakpointKey.lg]: Breakpoint.HugeDesktop, // 2092
  [BreakpointKey.md]: Breakpoint.LargeDesktop, // 1440
  [BreakpointKey.sm]: Breakpoint.Desktop, // 1024
  [BreakpointKey.xs]: Breakpoint.Tablet, // 900
  [BreakpointKey.xss]: 0,
};

const DEFAULT_COLS: LayoutConfig = {
  [BreakpointKey.lg]: 24, // 2092
  [BreakpointKey.md]: 16, // 1440
  [BreakpointKey.sm]: 12, // 1024
  [BreakpointKey.xs]: 8, // 900
  [BreakpointKey.xss]: 4,
};

@Component({
  components: {
    GridLayout,
    GridItem,
  },
})
export default class WidgetsGrid extends Vue {
  @Prop({ required: true, type: Object }) readonly layouts!: ResponsiveLayouts;
  @Prop({ default: 10, type: Number }) readonly rowHeight!: number;
  @Prop({ default: 16, type: Number }) readonly margin!: number;
  @Prop({ default: false, type: Boolean }) readonly draggable!: boolean;
  @Prop({ default: false, type: Boolean }) readonly resizable!: boolean;
  @Prop({ default: false, type: Boolean }) readonly compact!: boolean;
  @Prop({ default: false, type: Boolean }) readonly lines!: boolean;
  @Prop({ default: false, type: Boolean }) readonly loading!: boolean;
  @Prop({ default: () => DEFAULT_COLS, type: Object }) readonly cols!: LayoutConfig;
  @Prop({ default: () => DEFAULT_BREAKPOINTS, type: Object }) readonly breakpoints!: LayoutConfig;

  private breakpoint: BreakpointKey = BreakpointKey.lg;
  private layout: Layout = [];
  private onUpdate = debounce(this.emitUpdate, 500);

  get gridLayout(): Layout {
    return this.layout;
  }

  set gridLayout(updated: Layout) {
    this.layout = updated;
    this.onUpdate(this.layout);
  }

  get gridLinesStyle(): Partial<CSSStyleDeclaration> {
    const r = this.rowHeight;
    const m = this.margin / 2;
    const c = this.cols[this.breakpoint];

    return {
      backgroundSize: `calc(calc(100% - ${m}px) / ${c}) ${r + m * 2}px`,
      height: `calc(100% - ${m}px)`,
      width: `calc(100% - ${m}px)`,
      margin: `${m}px`,
    };
  }

  @Watch('layouts', { deep: true })
  private updateCurrentLayout(updatedLayouts: ResponsiveLayouts): void {
    const updatedLayout = updatedLayouts[this.breakpoint];

    if (!updatedLayout || isEqual(this.layout)(updatedLayout)) return;

    this.layout = cloneDeep(updatedLayout) as Layout;
  }

  onBreakpointChanged(newBreakpoint: BreakpointKey): void {
    this.breakpoint = newBreakpoint;
  }

  onResize(id: string, rect: DOMRect): void {
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
    const update: ResponsiveLayouts = {
      [this.breakpoint]: layout,
    };

    this.$emit('update', update);
  }
}
</script>

<style lang="scss">
$line: var(--s-color-base-border-secondary);

.widgets-grid {
  .vue-grid-item.vue-grid-placeholder {
    background: var(--s-color-status-success-background);
    opacity: 0.5;
  }

  .grid-lines {
    position: absolute;
    background-image: linear-gradient(to right, $line 1px, transparent 1px), linear-gradient($line 1px, transparent 1px);
    background-repeat: repeat;
  }
}
</style>
