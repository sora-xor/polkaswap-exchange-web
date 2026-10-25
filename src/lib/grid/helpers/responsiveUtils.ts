import { cloneLayout, compact, correctBounds } from './utils';

import type { Layout } from '../types';

type Breakpoint = string;
export type Breakpoints = Record<string, number>;
export type ResponsiveLayouts = Record<string, Layout | undefined>;

export function sortBreakpoints(breakpoints: Breakpoints): Breakpoint[] {
  return Object.keys(breakpoints).sort((a, b) => breakpoints[a] - breakpoints[b]);
}

export function getBreakpointFromWidth(breakpoints: Breakpoints, width: number): Breakpoint {
  const sorted = sortBreakpoints(breakpoints);
  let matching = sorted[0];

  for (let i = 1; i < sorted.length; i += 1) {
    const breakpointName = sorted[i];
    if (width > breakpoints[breakpointName]) {
      matching = breakpointName;
    }
  }

  return matching;
}

export function getColsFromBreakpoint(breakpoint: Breakpoint, cols: Breakpoints): number {
  const columnCount = cols[breakpoint];
  if (typeof columnCount !== 'number') {
    throw new Error(`ResponsiveGridLayout: missing cols entry for breakpoint ${breakpoint}`);
  }
  return columnCount;
}

export function findOrGenerateResponsiveLayout(
  originalLayout: Layout,
  layouts: ResponsiveLayouts,
  breakpoints: Breakpoints,
  breakpoint: Breakpoint,
  lastBreakpoint: Breakpoint | null,
  cols: number,
  verticalCompact: boolean
): Layout {
  const existingLayout = layouts[breakpoint];
  if (existingLayout) {
    return cloneLayout(existingLayout);
  }

  let layout: Layout | undefined = lastBreakpoint ? layouts[lastBreakpoint] : undefined;

  if (!layout) {
    const sorted = sortBreakpoints(breakpoints);
    const breakpointsAbove = sorted.slice(sorted.indexOf(breakpoint));
    for (const point of breakpointsAbove) {
      if (layouts[point]) {
        layout = layouts[point];
        break;
      }
    }
  }

  layout = cloneLayout(layout ?? originalLayout ?? []);
  return compact(correctBounds(layout, { cols }), verticalCompact);
}
