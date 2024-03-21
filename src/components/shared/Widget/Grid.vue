<template>
  <grid-layout
    class="widgets-grid"
    :layout="layout"
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
    @layout-updated="updateLayout"
  >
    <div v-if="lines" class="grid-lines" :style="gridLinesStyle" />
    <grid-item v-for="widget in layout" :key="widget.i" v-bind="widget">
      <slot
        :name="widget.i"
        v-bind="{
          id: widget.i,
          loading,
          onResize,
          reset,
        }"
      />
    </grid-item>
  </grid-layout>
</template>

<script lang="ts">
import debounce from 'lodash/debounce';
import cloneDeep from 'lodash/fp/cloneDeep';
import isEmpty from 'lodash/fp/isEmpty';
import isEqual from 'lodash/fp/isEqual';
import omit from 'lodash/fp/omit';
import { GridLayout, GridItem } from 'vue-grid-layout';
import { Component, Emit, Prop, Vue, Watch } from 'vue-property-decorator';

import { Breakpoint, BreakpointKey } from '@/consts/layout';
import type { Layout, LayoutConfig, ResponsiveLayouts, LayoutWidget, WidgetsVisibilityModel } from '@/types/layout';
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

@Component({
  components: {
    GridLayout,
    GridItem,
  },
})
export default class WidgetsGrid extends Vue {
  /** Layout ID to sync it with storage */
  @Prop({ default: '', type: String }) readonly gridId!: string;
  /** Default layouts */
  @Prop({ default: () => ({}), type: Object }) readonly defaultLayouts!: ResponsiveLayouts;

  @Prop({ default: 10, type: Number }) readonly rowHeight!: number;
  @Prop({ default: 16, type: Number }) readonly margin!: number;
  @Prop({ default: false, type: Boolean }) readonly draggable!: boolean;
  @Prop({ default: false, type: Boolean }) readonly resizable!: boolean;
  @Prop({ default: false, type: Boolean }) readonly compact!: boolean;
  @Prop({ default: false, type: Boolean }) readonly lines!: boolean;
  @Prop({ default: false, type: Boolean }) readonly loading!: boolean;
  @Prop({ default: () => DEFAULT_COLS, type: Object }) readonly cols!: LayoutConfig;
  @Prop({ default: () => DEFAULT_BREAKPOINTS, type: Object }) readonly breakpoints!: LayoutConfig;

  /** Widgets visibility by widget ID */
  @Prop({ default: () => ({}), type: Object }) readonly value!: WidgetsVisibilityModel;
  /** Update layouts depends on widgets visibility */
  @Watch('value')
  private updateLayoutWidgetsByModel(curr: WidgetsVisibilityModel, prev: WidgetsVisibilityModel, save = true): void {
    const diff = shallowDiff(curr, prev);

    if (isEmpty(diff)) return;

    this.updateLayoutsByWidgetsModel(this.layouts, diff, save);
  }

  private defaultValue: WidgetsVisibilityModel = {};

  private breakpoint: BreakpointKey = BreakpointKey.md;

  public layouts: ResponsiveLayouts = {};

  public layout: Layout = [];

  updateLayout(updatedLayout: Layout): void {
    this.layout = updatedLayout;
  }

  private checkLayoutUpdate(): void {
    if (this.responsiveLayout && this.shouldUpdate) {
      this.layout = cloneDeep(this.responsiveLayout) as Layout;
    }
  }

  @Watch('layout', { deep: true })
  private onLayoutUpdate = debounce(this.checkLayoutsUpdate, 250, { leading: false });

  private checkLayoutsUpdate(): void {
    if (this.shouldUpdate) {
      this.saveLayouts({ ...this.layouts, [this.breakpoint]: this.gridLayout });
    }
  }

  get responsiveLayout(): Layout | undefined {
    return this.layouts[this.breakpoint];
  }

  get gridLayout(): Layout {
    // omit 'moved' property from lib
    return this.layout.map((widget: LayoutWidget) => omit('moved')(widget)) as Layout;
  }

  get shouldUpdate(): boolean {
    const notEqual = !isEqual(this.gridLayout)(this.responsiveLayout);

    return notEqual;
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

  created(): void {
    // save initial model for reset availability
    this.defaultValue = cloneDeep(this.value);
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

  private saveLayouts(layouts: ResponsiveLayouts, save = true): void {
    this.layouts = cloneDeep(layouts);
    this.checkLayoutUpdate();
    // update layouts in storage
    if (save) {
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
    this.checkLayoutUpdate();
  }

  /**
   * Calculate widget layout height
   * Occurs after widget emits resize event with new own rect coordinates
   */
  onResize(widgetId: string, rect: DOMRect): void {
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
    return this.layout.reduce<WidgetsVisibilityModel>((acc, widget) => ({ ...acc, [widget.i]: true }), initialModel);
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
