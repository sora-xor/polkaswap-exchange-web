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

function toSafeNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function normalizeWidgetByDefault(widget: LayoutWidget, fallback: LayoutWidget, cols: number): LayoutWidget {
  const minW = toSafeNumber(fallback.minW ?? widget.minW, 1);
  const minH = toSafeNumber(fallback.minH ?? widget.minH, 1);

  const maxWRaw = fallback.maxW ?? widget.maxW;
  const maxHRaw = fallback.maxH ?? widget.maxH;

  const maxW = Number.isFinite(maxWRaw) ? Math.max(minW, Number(maxWRaw)) : undefined;
  const maxH = Number.isFinite(maxHRaw) ? Math.max(minH, Number(maxHRaw)) : undefined;

  const widthLimit = Math.max(1, maxW ? Math.min(maxW, cols) : cols);
  const rawW = toSafeNumber(widget.w, fallback.w);
  const w = clamp(rawW, minW, widthLimit);

  const maxX = Math.max(0, cols - w);
  const x = clamp(toSafeNumber(widget.x, fallback.x), 0, maxX);
  const y = Math.max(0, toSafeNumber(widget.y, fallback.y));

  const heightLimit = maxH ?? Number.MAX_SAFE_INTEGER;
  const rawH = toSafeNumber(widget.h, fallback.h);
  const h = clamp(rawH, minH, heightLimit);

  const normalized: LayoutWidget = {
    ...fallback,
    ...widget,
    x,
    y,
    w,
    h,
    minW,
    minH,
  };

  if (maxW !== undefined) {
    normalized.maxW = maxW;
  } else {
    delete normalized.maxW;
  }

  if (maxH !== undefined) {
    normalized.maxH = maxH;
  } else {
    delete normalized.maxH;
  }

  return normalized;
}

/**
 * Ensures persisted layouts remain compatible with the current widget defaults.
 * It drops unknown widgets, removes duplicates, and clamps positions/sizes to
 * the active breakpoint columns and default min/max constraints.
 */
export function normalizeLayoutsWithDefaults(
  storedLayouts: ResponsiveLayouts,
  defaultLayouts: ResponsiveLayouts,
  cols: LayoutConfig
): ResponsiveLayouts {
  const points = new Set<BreakpointKey>([
    ...(Object.keys(defaultLayouts) as BreakpointKey[]),
    ...(Object.keys(storedLayouts) as BreakpointKey[]),
  ]);

  const normalized: ResponsiveLayouts = {};

  for (const point of points) {
    const defaults = defaultLayouts[point] ?? [];
    const defaultById = new Map(defaults.map((widget) => [widget.i, widget] as const));
    const breakpointCols = Math.max(1, cols[point] ?? 1);
    const source = storedLayouts[point] ?? defaults;
    const seen = new Set<string>();

    normalized[point] = source.reduce<Layout>((acc, widget) => {
      if (!widget || typeof widget.i !== 'string' || seen.has(widget.i)) return acc;

      const fallback = defaultById.get(widget.i);
      if (!fallback) return acc;

      seen.add(widget.i);
      acc.push(normalizeWidgetByDefault(widget, fallback, breakpointCols));
      return acc;
    }, []);
  }

  return normalized;
}
