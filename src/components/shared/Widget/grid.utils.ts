import cloneDeep from 'lodash/fp/cloneDeep';
import isEqual from 'lodash/fp/isEqual';

import type { BreakpointKey } from '@/consts/layout';
import type { Layout, LayoutConfig, LayoutWidget, ResponsiveLayouts, WidgetsVisibilityModel } from '@/types/layout';

export function findWidgetInLayout(layout: Nullable<Layout>, widgetId: string): LayoutWidget | undefined {
  return layout?.find((widget) => widget.i === widgetId);
}

export function shallowDiff<T extends Record<string, boolean | undefined>>(a: T, b: T): Partial<T> {
  return Object.entries(a).reduce<Partial<T>>((diff, [key, value]) => {
    if (isEqual(b[key], value)) return diff;
    return { ...diff, [key]: value };
  }, {});
}

export function sortBreakpoints(breakpoints: LayoutConfig): BreakpointKey[] {
  const keys = Object.keys(breakpoints) as BreakpointKey[];
  return keys.sort((a, b) => breakpoints[a] - breakpoints[b]);
}

export function getBreakpointFromWidth(breakpoints: LayoutConfig, width: number): BreakpointKey {
  const sorted = sortBreakpoints(breakpoints);
  let matching = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const breakpointName = sorted[i];
    if (width > breakpoints[breakpointName]) matching = breakpointName;
  }

  return matching;
}

export function applyWidgetsDiffToLayouts(
  layoutsToUpdate: ResponsiveLayouts,
  diff: Partial<WidgetsVisibilityModel>,
  defaultLayouts: ResponsiveLayouts
): ResponsiveLayouts {
  const layouts = cloneDeep(layoutsToUpdate);

  const points = new Set<BreakpointKey>([
    ...(Object.keys(layouts) as BreakpointKey[]),
    ...(Object.keys(defaultLayouts) as BreakpointKey[]),
  ]);

  for (const [widgetId, visibilityFlag] of Object.entries(diff)) {
    for (const point of points) {
      const defaultLayout = defaultLayouts[point] ?? [];
      const currentLayout = layouts[point] ?? [];

      if (visibilityFlag) {
        const exists = findWidgetInLayout(currentLayout, widgetId);
        if (exists) continue;
        const fallback = findWidgetInLayout(defaultLayout, widgetId);
        if (fallback) {
          layouts[point] = [...currentLayout, fallback];
        }
      } else {
        layouts[point] = currentLayout.filter((widget) => widget.i !== widgetId);
      }
    }
  }

  return layouts;
}

export function deriveVisibilityModelFromLayout(
  layout: Layout,
  baseModel: WidgetsVisibilityModel
): WidgetsVisibilityModel {
  const initial = Object.keys(baseModel).reduce<WidgetsVisibilityModel>((acc, key) => {
    acc[key] = false;
    return acc;
  }, {});

  for (const widget of layout) {
    if (widget.i in initial) {
      initial[widget.i] = true;
    }
  }

  return initial;
}
