<template>
  <div ref="gridWrapper" class="grid-wrapper">
    <grid-layout
      :layout.sync="layout"
      :responsive-layouts="layouts"
      :cols="cols"
      :breakpoints="breakpoints"
      :row-height="rowHeight"
      :is-draggable="draggable"
      :is-resizable="resizable"
      :vertical-compact="compact"
      :margin="[margin, margin]"
      :responsive="true"
      :prevent-collision="true"
      :use-css-transforms="true"
      @layout-ready="onReady"
      @layout-updated="onUpdate"
      @breakpoint-changed="onBreakpointChanged"
    >
      <grid-item
        v-for="item in layout"
        :key="item.i"
        :x="item.x"
        :y="item.y"
        :w="item.w"
        :h="item.h"
        :i="item.i"
        class="grid-item"
      >
        <template v-if="ready">
          <slot v-bind="item" />
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

const DEFAULT_BREAKPOINT = 'lg';
const DEFAULT_BREAKPOINTS = {
  lg: Breakpoint.HugeDesktop, // 2092
  md: Breakpoint.LargeDesktop, // 1440
  sm: Breakpoint.Desktop, // 1024
  xs: Breakpoint.LargeMobile, // 528
  xss: 0,
};
const DEFAULT_COLS = {
  lg: 24,
  md: 12,
  sm: 12,
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
  @Prop({ required: true, type: Object }) readonly layouts!: any;
  @Prop({ default: 10, type: Number }) readonly rowHeight!: number;
  @Prop({ default: 16, type: Number }) readonly margin!: number;
  @Prop({ default: false, type: Boolean }) readonly compact!: boolean;
  @Prop({ default: false, type: Boolean }) readonly draggable!: boolean;
  @Prop({ default: false, type: Boolean }) readonly resizable!: boolean;
  @Prop({ default: () => DEFAULT_COLS, type: Object }) readonly cols!: any;
  @Prop({ default: () => DEFAULT_BREAKPOINTS, type: Object }) readonly breakpoints!: any;

  @Ref('gridWrapper') readonly gridWrapper!: HTMLDivElement;

  ready = false;
  onReady = debounce(this.setReady);
  breakpoint = DEFAULT_BREAKPOINT;
  layout = [];

  setReady(): void {
    this.ready = true;
  }

  onUpdate(newLayout): void {
    console.log('Updated layout: ', newLayout);
  }

  onBreakpointChanged(newBreakpoint, newLayout) {
    console.log('BREAKPOINT CHANGED breakpoint=', newBreakpoint, ', layout: ', newLayout);
  }
}
</script>

<style lang="scss">
.grid-wrapper {
  .grid-item {
    display: flex;
    flex-flow: column nowrap;

    .base-widget {
      flex: 1;
    }
  }
}
</style>
