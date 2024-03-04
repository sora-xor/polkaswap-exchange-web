<template>
  <div ref="gridWrapper" class="grid-wrapper">
    <grid-layout
      :layout="currentLayout"
      :col-num="columns"
      :cols="cols"
      :breakpoints="breakpoints"
      :row-height="rowHeight"
      :is-draggable="false"
      :is-resizable="false"
      :is-mirrored="false"
      :responsive="true"
      :vertical-compact="verticalCompact"
      :prevent-collision="true"
      :margin="[margin, margin]"
      :use-css-transforms="true"
      @layout-ready="onReady"
    >
      <grid-item
        v-for="item in currentLayout"
        :key="item.i"
        :x="item.x"
        :y="item.y"
        :w="item.w"
        :h="item.h"
        :i="item.i"
        class="grid-item"
      >
        <template v-if="ready">
          <slot v-bind="widgets[item.i]" />
        </template>
      </grid-item>
    </grid-layout>
  </div>
</template>

<script lang="ts">
import debounce from 'lodash.debounce';
import { GridLayout, GridItem } from 'vue-grid-layout';
import { Component, Prop, Ref, Vue, Watch } from 'vue-property-decorator';

import { Breakpoint } from '@/consts';

import { compactItems } from './utils';

const DEFAULT_BREAKPOINT = 'lg';
const DEFAULT_BREAKPOINTS = {
  lg: Breakpoint.HugeDesktop, // 2092
  md: Breakpoint.LargeDesktop, // 1440
  sm: Breakpoint.Desktop, // 1024
  xs: Breakpoint.LargeMobile, // 528
  xss: 0,
};
const DEFAULT_COLS = {
  lg: 12,
  md: 8,
  sm: 8,
  xs: 4,
  xss: 4,
};

@Component({
  components: {
    GridLayout,
    GridItem,
  },
})
export default class WidgetsGrid extends Vue {
  @Prop({ required: true, type: Array }) readonly widgets!: any;
  @Prop({ default: 12, type: Number }) readonly columns!: number;
  @Prop({ default: 100, type: Number }) readonly rowHeight!: number;
  @Prop({ default: 16, type: Number }) readonly margin!: number;
  @Prop({ default: true, type: Boolean }) readonly verticalCompact!: boolean;
  @Prop({ default: () => DEFAULT_COLS, type: Object }) readonly cols!: any;
  @Prop({ default: () => DEFAULT_BREAKPOINTS, type: Object }) readonly breakpoints!: any;

  @Ref('gridWrapper') readonly gridWrapper!: HTMLDivElement;

  // @Watch('breakpoint', { immediate: true })
  // private calculateBreakpointLayout() {
  //   const { gridLayouts, originalLayout, breakpoint, cols, verticalCompact } = this;

  //   if (gridLayouts[breakpoint]) return;

  //   const columnsCount = cols[breakpoint];
  //   const compactLayout = compactItems(originalLayout, columnsCount, verticalCompact);

  //   gridLayouts[breakpoint] = compactLayout;
  // }

  ready = false;
  onReady = debounce(this.setReady);
  gridLayouts = {};
  breakpoint = DEFAULT_BREAKPOINT;
  originalLayout = [];

  created() {
    this.originalLayout = this.widgets.map((widget, i) => ({
      i,
      x: widget.spatialData.x,
      y: widget.spatialData.y,
      w: widget.spatialData.w,
      h: widget.spatialData.h,
    }));
  }

  mounted(): void {
    this.updateCurrentBreakpoint();
    window.addEventListener('resize', this.updateCurrentBreakpoint);
  }

  beforeDestroy(): void {
    window.removeEventListener('resize', this.updateCurrentBreakpoint);
  }

  get currentLayout() {
    return this.gridLayouts[this.breakpoint] ?? this.originalLayout;
  }

  updateCurrentBreakpoint(): void {
    const { breakpoints, gridWrapper } = this;

    if (!gridWrapper) return;

    const { clientWidth } = gridWrapper;

    const currentBreakpoint = Object.keys(breakpoints).find((key) => clientWidth >= breakpoints[key]);

    this.breakpoint = currentBreakpoint ?? DEFAULT_BREAKPOINT;
  }

  setReady(): void {
    this.ready = true;
    this.$emit('init');
  }
}
</script>
