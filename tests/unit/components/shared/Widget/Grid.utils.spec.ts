import { describe, expect, it } from 'vitest';

import {
  applyWidgetsDiffToLayouts,
  deriveVisibilityModelFromLayout,
  getBreakpointFromWidth,
  normalizeLayoutsWithDefaults,
  shallowDiff,
  sortBreakpoints,
} from '@/components/shared/Widget/grid.utils';
import { Breakpoint, BreakpointKey } from '@/consts/layout';
import type { ResponsiveLayouts, WidgetsVisibilityModel } from '@/types/layout';

describe('grid utils', () => {
  const baseLayouts: ResponsiveLayouts = {
    [BreakpointKey.lg]: [
      { x: 0, y: 0, w: 4, h: 4, i: 'alpha' },
      { x: 4, y: 0, w: 4, h: 4, i: 'beta' },
    ],
    [BreakpointKey.md]: [
      { x: 0, y: 0, w: 3, h: 3, i: 'alpha' },
      { x: 3, y: 0, w: 3, h: 3, i: 'beta' },
    ],
  };

  it('computes shallow diff between widget models', () => {
    const current = { alpha: true, beta: false };
    const next = { alpha: false, beta: false };

    expect(shallowDiff(next, current)).toEqual({ alpha: false });
  });

  it('adds missing widgets from defaults when toggled on', () => {
    const diff: WidgetsVisibilityModel = { gamma: true };
    const defaults: ResponsiveLayouts = {
      [BreakpointKey.lg]: [{ x: 8, y: 0, w: 4, h: 4, i: 'gamma' }],
      [BreakpointKey.md]: [{ x: 6, y: 0, w: 2, h: 3, i: 'gamma' }],
    };

    const layouts = applyWidgetsDiffToLayouts({}, diff, { ...baseLayouts, ...defaults });

    expect(layouts[BreakpointKey.lg]).toEqual(expect.arrayContaining([expect.objectContaining({ i: 'gamma' })]));
    expect(layouts[BreakpointKey.md]).toEqual(expect.arrayContaining([expect.objectContaining({ i: 'gamma' })]));
  });

  it('removes widgets when visibility flag is false', () => {
    const diff: WidgetsVisibilityModel = { beta: false };
    const layouts = applyWidgetsDiffToLayouts(baseLayouts, diff, baseLayouts);

    expect(layouts[BreakpointKey.lg]).toEqual([expect.objectContaining({ i: 'alpha' })]);
    expect(layouts[BreakpointKey.md]).toEqual([expect.objectContaining({ i: 'alpha' })]);
  });

  it('derives model from layout state', () => {
    const baseModel: WidgetsVisibilityModel = { alpha: false, beta: false, gamma: false };
    const model = deriveVisibilityModelFromLayout(baseLayouts[BreakpointKey.lg] ?? [], baseModel);

    expect(model).toEqual({ alpha: true, beta: true, gamma: false });
  });

  it('orders breakpoints and resolves width mapping', () => {
    const breakpoints = {
      [BreakpointKey.lg]: Breakpoint.HugeDesktop,
      [BreakpointKey.md]: Breakpoint.LargeDesktop,
      [BreakpointKey.sm]: Breakpoint.Desktop,
    } as const satisfies Record<BreakpointKey, number>;

    expect(sortBreakpoints(breakpoints)).toEqual([BreakpointKey.sm, BreakpointKey.md, BreakpointKey.lg]);
    expect(getBreakpointFromWidth(breakpoints, Breakpoint.LargeDesktop + 10)).toBe(BreakpointKey.md);
  });

  it('normalizes stored layout dimensions and removes unknown or duplicate widgets', () => {
    const defaultLayouts: ResponsiveLayouts = {
      [BreakpointKey.lg]: [
        { x: 0, y: 0, w: 4, h: 3, minW: 2, minH: 3, maxH: 3, i: 'customise' },
        { x: 0, y: 4, w: 6, h: 20, minW: 4, minH: 20, i: 'swapForm' },
      ],
    };

    const storedLayouts: ResponsiveLayouts = {
      [BreakpointKey.lg]: [
        { x: -4, y: -3, w: 99, h: 30, minW: 2, minH: 3, i: 'customise' },
        { x: 8, y: 0, w: 5, h: 20, minW: 2, minH: 3, i: 'customise' },
        { x: 30, y: 6, w: 6, h: 20, minW: 4, minH: 20, i: 'swapForm' },
        { x: 0, y: 0, w: 2, h: 2, i: 'unknownWidget' },
      ],
    };

    const cols = {
      [BreakpointKey.lg]: 24,
      [BreakpointKey.md]: 16,
      [BreakpointKey.sm]: 12,
      [BreakpointKey.xs]: 8,
      [BreakpointKey.xss]: 4,
    };

    const normalized = normalizeLayoutsWithDefaults(storedLayouts, defaultLayouts, cols);

    expect(normalized[BreakpointKey.lg]).toEqual([
      {
        x: 0,
        y: 0,
        w: 24,
        h: 3,
        minW: 2,
        minH: 3,
        maxH: 3,
        i: 'customise',
      },
      {
        x: 18,
        y: 6,
        w: 6,
        h: 20,
        minW: 4,
        minH: 20,
        i: 'swapForm',
      },
    ]);
  });
});
