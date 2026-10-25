import { describe, expect, it } from 'vitest';

import { getBreakpointFromWidth } from '@/components/shared/Widget/grid.utils';
import { buildSwapGridBreakpoints, DEFAULT_SWAP_LAYOUTS, SwapWidgets } from '@/features/swap/constants/layout';
import { migrateSwapLayouts } from '@/features/swap/constants/layoutMigration';
import type { ResponsiveLayouts } from '@/types/layout';

const legacyDesktop: ResponsiveLayouts = {
  lg: [
    { x: 4, y: 0, w: 7, h: 20, i: SwapWidgets.Form },
    { x: 4, y: 20, w: 7, h: 3, i: SwapWidgets.Customise },
    { x: 11, y: 0, w: 9, h: 20, i: SwapWidgets.Chart },
    { x: 4, y: 24, w: 7, h: 8, i: SwapWidgets.Distribution },
  ],
};

describe('Swap layout migration', () => {
  it.each([
    [1025, 800, 'sm'],
    [1200, 1000, 'sm'],
    [1920, 1500, 'md'],
    [2560, 2200, 'lg'],
    [1024, 900, 'xs'],
    [768, 600, 'xss'],
  ])(
    'uses the saved %s/%s viewport/container breakpoint %s without rewriting layouts',
    (viewport, container, expected) => {
      const original = JSON.stringify(DEFAULT_SWAP_LAYOUTS);
      const breakpoints = buildSwapGridBreakpoints(viewport as number);
      expect(getBreakpointFromWidth(breakpoints, container as number)).toBe(expected);
      expect(JSON.stringify(DEFAULT_SWAP_LAYOUTS)).toBe(original);
    }
  );

  it('moves untouched desktop widgets into equal columns and removes Customize', () => {
    const result = migrateSwapLayouts(legacyDesktop);
    expect(result.lg?.map((widget) => widget.i)).toEqual([
      SwapWidgets.Form,
      SwapWidgets.Chart,
      SwapWidgets.Distribution,
    ]);
    expect(result.lg?.find((widget) => widget.i === SwapWidgets.Form)).toMatchObject({ x: 4, y: 0, w: 8 });
    expect(result.lg?.find((widget) => widget.i === SwapWidgets.Chart)).toMatchObject({ x: 12, y: 0, w: 8 });
    expect(result.lg?.find((widget) => widget.i === SwapWidgets.Distribution)).toMatchObject({ x: 4, y: 20, w: 8 });
    expect(legacyDesktop.lg?.some((widget) => widget.i === SwapWidgets.Customise)).toBe(true);
  });

  it('retains custom desktop geometry and hidden optional widgets', () => {
    const custom = { x: 0, y: 5, w: 10, h: 24, i: SwapWidgets.Form };
    const result = migrateSwapLayouts({
      lg: [custom, legacyDesktop.lg![1], { x: 12, y: 24, w: 6, h: 24, i: SwapWidgets.Transactions }],
    });
    expect(result.lg?.[0]).toEqual(custom);
    expect(result.lg?.some((widget) => widget.i === SwapWidgets.Chart)).toBe(false);
    expect(result.lg?.some((widget) => widget.i === SwapWidgets.Distribution)).toBe(false);
    expect(result.lg?.find((widget) => widget.i === SwapWidgets.Transactions)).toMatchObject({ x: 12, y: 24, w: 6 });
  });

  it.each(['xs', 'xss'] as const)(
    'stacks present %s widgets with Form then Chart and keeps expanded heights',
    (point) => {
      const result = migrateSwapLayouts({
        [point]: [
          { x: 0, y: 0, w: 4, h: 3, i: SwapWidgets.Customise },
          { x: 0, y: 4, w: 4, h: 22, i: SwapWidgets.Form },
          { x: 0, y: 24, w: 4, h: 8, i: SwapWidgets.Distribution },
          { x: 4, y: 0, w: 4, h: 23, i: SwapWidgets.Chart },
        ],
      });
      expect(result[point]?.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }))).toEqual([
        { i: SwapWidgets.Form, x: 0, y: 0, w: point === 'xs' ? 8 : 4, h: 22 },
        { i: SwapWidgets.Chart, x: 0, y: 22, w: point === 'xs' ? 8 : 4, h: 23 },
        { i: SwapWidgets.Distribution, x: 0, y: 45, w: point === 'xs' ? 8 : 4, h: 8 },
      ]);
    }
  );

  it('does not resurrect hidden mobile charts or migrate a second time', () => {
    const result = migrateSwapLayouts({ xss: legacyDesktop.lg!.filter((widget) => widget.i !== SwapWidgets.Chart) });
    expect(result.xss?.map((widget) => widget.i)).toEqual([SwapWidgets.Form, SwapWidgets.Distribution]);
    expect(migrateSwapLayouts(result)).toEqual(result);
    expect(migrateSwapLayouts(DEFAULT_SWAP_LAYOUTS)).toEqual(DEFAULT_SWAP_LAYOUTS);
  });

  it('leaves malformed breakpoint payloads absent for default normalization', () => {
    const result = migrateSwapLayouts({ lg: 'invalid', xs: null } as unknown as ResponsiveLayouts);
    expect(result).toEqual({});
  });

  it('defines equal desktop columns with no standalone Customize widget', () => {
    for (const point of ['lg', 'md', 'sm'] as const) {
      const layout = DEFAULT_SWAP_LAYOUTS[point]!;
      const form = layout.find(({ i }) => i === SwapWidgets.Form)!;
      const chart = layout.find(({ i }) => i === SwapWidgets.Chart)!;
      expect(form.w).toBe(chart.w);
      expect(form.y).toBe(0);
      expect(chart.x).toBe(form.x + form.w);
      expect(layout.some(({ i }) => i === SwapWidgets.Customise)).toBe(false);
    }
  });
});
