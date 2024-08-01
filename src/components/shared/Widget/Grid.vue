<template>
  <grid-layout
    ref="grid"
    class="widgets-grid"
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
  >
    <div v-if="lines" class="grid-lines" :style="gridLinesStyle" />
    <transition-group name="list" tag="div">
      <grid-item v-for="widget in layout" :key="widget.i" :is-resizable="isResizable(widget)" v-bind="widget">
        <slot
          :name="widget.i"
          v-bind="{
            id: widget.i,
            flat,
            loading,
            onResize,
            reset,
          }"
        />
      </grid-item>
    </transition-group>
  </grid-layout>
</template>

<script lang="ts">
import cloneDeep from 'lodash/fp/cloneDeep';
import isEmpty from 'lodash/fp/isEmpty';
import isEqual from 'lodash/fp/isEqual';
import omit from 'lodash/fp/omit';
import { GridLayout, GridItem } from 'vue-grid-layout';
import { Component, Emit, Prop, Vue, Watch, Ref } from 'vue-property-decorator';

import { Breakpoint, BreakpointKey } from '@/consts/layout';
import type {
  Layout,
  LayoutConfig,
  ResponsiveLayouts,
  LayoutWidget,
  WidgetsVisibilityModel,
  Size,
} from '@/types/layout';
import { layoutsStorage } from '@/utils/storage';

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

  return keys.sort(function (a, b) {
    return breakpoints[a] - breakpoints[b];
  });
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

@Component({
  components: {
    GridLayout,
    GridItem,
  },
})
export default class WidgetsGrid extends Vue {
  @Ref('grid') readonly widgetsGrid!: Vue;

  /** Layout ID to sync it with storage */
  @Prop({ default: '', type: String }) readonly gridId!: string;
  /** Default layouts */
  @Prop({ default: () => ({}), type: Object }) readonly defaultLayouts!: ResponsiveLayouts;

  @Prop({ default: 10, type: Number }) readonly rowHeight!: number;
  @Prop({ default: 16, type: Number }) readonly margin!: number;
  @Prop({ default: false, type: Boolean }) readonly draggable!: boolean;
  @Prop({ default: false, type: Boolean }) readonly resizable!: boolean;
  @Prop({ default: true, type: Boolean }) readonly compact!: boolean;
  @Prop({ default: false, type: Boolean }) readonly lines!: boolean;
  @Prop({ default: () => DEFAULT_COLS, type: Object }) readonly cols!: LayoutConfig;
  @Prop({ default: () => DEFAULT_BREAKPOINTS, type: Object }) readonly breakpoints!: LayoutConfig;

  @Prop({ default: false, type: Boolean }) readonly loading!: boolean;
  @Prop({ default: false, type: Boolean }) readonly flat!: boolean;

  /** Widgets visibility by widget ID */
  @Prop({ default: () => ({}), type: Object }) readonly value!: WidgetsVisibilityModel;
  /** Update layouts depends on widgets visibility */
  @Watch('value')
  private updateLayoutWidgetsByModel(curr: WidgetsVisibilityModel, prev: WidgetsVisibilityModel): void {
    const diff = shallowDiff(curr, prev);

    if (isEmpty(diff)) return;

    this.updateLayoutsByWidgetsModel(this.layouts, diff, true);
  }

  private defaultValue: WidgetsVisibilityModel = {};
  private breakpoint: BreakpointKey = BreakpointKey.lg;

  public layouts: ResponsiveLayouts = {};
  public layout: Layout = [];

  get responsiveLayout(): Layout | undefined {
    return this.layouts[this.breakpoint];
  }

  get gridLinesStyle() {
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

  created(): void {
    // save initial model for reset availability
    this.defaultValue = cloneDeep(this.value);
  }

  mounted(): void {
    // detect initial breakpoint
    this.breakpoint = getBreakpointFromWidth(this.breakpoints, this.widgetsGrid.$el.clientWidth);
    this.init();
  }

  private async init(): Promise<void> {
    const storedLayouts = layoutsStorage.get(this.gridId);

    if (storedLayouts) {
      this.saveLayouts(JSON.parse(storedLayouts), false);
    } else {
      this.updateLayoutsByWidgetsModel(this.defaultLayouts, this.defaultValue, false); // don't save in storage initial layout
    }

    this.updateWidgetsModelByLayout();
  }

  private updateLayout(): void {
    if (isEqual(this.layout)(this.responsiveLayout)) return;

    this.layout = cloneDeep(this.responsiveLayout) as Layout;
  }

  private saveLayouts(layouts: ResponsiveLayouts, saveToStorage = true): void {
    this.layouts = cloneDeep(layouts);
    this.updateLayout();
    // update layouts in storage
    if (saveToStorage) {
      this.saveLayoutsToStorage();
    }
  }

  private saveLayoutsToStorage(): void {
    if (this.gridId) {
      layoutsStorage.set(this.gridId, JSON.stringify(this.layouts));
    }
  }

  private clearLayoutsFromStorage(): void {
    if (this.gridId) {
      layoutsStorage.remove(this.gridId);
    }
  }

  reset(): void {
    this.clearLayoutsFromStorage();
    this.init();
  }

  onBreakpointChanged(newBreakpoint: BreakpointKey): void {
    this.breakpoint = newBreakpoint;
    this.updateLayout();
  }

  onLayoutUpdate(updated: Layout): void {
    this.layout = updated;

    const prepared = this.layout.map((widget: LayoutWidget) => omit('moved')(widget)) as Layout;

    if (isEqual(prepared)(this.responsiveLayout)) return;

    this.saveLayouts({ ...this.layouts, [this.breakpoint]: prepared });
  }

  isResizable(widget: LayoutWidget): boolean {
    if (!this.resizable) return false;

    const { maxW, maxH, minW, minH } = widget;
    const fixed = maxW === minW && maxH === minH;

    return !fixed;
  }

  /**
   * Calculate widget layout height
   * Occurs after widget emits resize event with new own rect coordinates
   */
  onResize(widgetId: string, rect: Size): void {
    const layout = cloneDeep(this.layout);
    const widget = findWidgetInLayout(layout, widgetId);

    if (!widget) return;

    const { height } = rect;
    // `height = h * (rowHeight + margin) - margin` - library calculates grid-item height (px)
    // `h = (height + margin) / (rowHeight + margin)`
    const calculatedH = Math.ceil((height + this.margin) / (this.rowHeight + this.margin));
    const updatedH = Math.max(widget.minH ?? 1, calculatedH);
    // mutate local layout
    widget.h = updatedH;
    // update component layout
    this.layout = layout;
  }

  /**
   * Emits widgets visibility model update.
   * Occurs after component created and initial layout is loaded from storage.
   */
  @Emit('input')
  private updateWidgetsModelByLayout() {
    // create initial model, where widgets are not visible
    const initialModel = Object.keys(this.value).reduce((acc, key) => ({ ...acc, [key]: false }), {});
    // mark widgets from layout as visible in model
    return this.layout.reduce<WidgetsVisibilityModel>((acc, widget) => {
      if (widget.i in acc) {
        acc[widget.i] = true;
      }
      return acc;
    }, initialModel);
  }

  private updateLayoutsByWidgetsModel(
    layoutsToUpdate: ResponsiveLayouts,
    diff: Partial<WidgetsVisibilityModel>,
    save: boolean
  ): void {
    const layouts = cloneDeep(layoutsToUpdate);

    for (const [widgetId, visibilityFlag] of Object.entries(diff)) {
      for (const breakpoint in layouts) {
        if (visibilityFlag) {
          const currentWidget = findWidgetInLayout(layouts[breakpoint], widgetId);

          if (currentWidget) continue;

          const defaultWidget = findWidgetInLayout(this.defaultLayouts[breakpoint], widgetId);

          if (defaultWidget) {
            layouts[breakpoint].push(defaultWidget);
          }
        } else {
          layouts[breakpoint] = layouts[breakpoint].filter((widget: LayoutWidget) => widget.i !== widgetId);
        }
      }
    }

    this.saveLayouts(layouts, save);
  }
}
</script>

<style lang="scss">
$line: var(--s-color-base-border-secondary);

.widgets-grid {
  .vue-grid-item {
    transition-property: opacity, scale;
    transition-duration: 0.3s;

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
    background-image: linear-gradient(to right, $line 1px, transparent 1px), linear-gradient($line 1px, transparent 1px);
    background-repeat: repeat;
  }

  // animation
  .list-enter,
  .list-leave-to {
    opacity: 0;
    scale: 0.8;
  }
}
</style>
