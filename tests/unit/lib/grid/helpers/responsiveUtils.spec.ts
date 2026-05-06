import { describe, expect, it } from 'vitest';

import type { Layout } from '@/lib/grid/types';
import {
  findOrGenerateResponsiveLayout,
  getBreakpointFromWidth,
  getColsFromBreakpoint,
  sortBreakpoints,
} from '@/lib/grid/helpers/responsiveUtils';

describe('grid responsive utils', () => {
  const breakpoints = {
    xs: 0,
    sm: 480,
    md: 768,
    lg: 1200,
  };

  it('sorts breakpoints by width and resolves active breakpoint using strict greater-than thresholds', () => {
    expect(sortBreakpoints({ lg: 1200, xs: 0, md: 768, sm: 480 })).toEqual(['xs', 'sm', 'md', 'lg']);

    expect(getBreakpointFromWidth(breakpoints, 480)).toBe('xs');
    expect(getBreakpointFromWidth(breakpoints, 481)).toBe('sm');
    expect(getBreakpointFromWidth(breakpoints, 769)).toBe('md');
    expect(getBreakpointFromWidth(breakpoints, 1201)).toBe('lg');
  });

  it('returns configured columns and throws for missing breakpoint column entries', () => {
    expect(getColsFromBreakpoint('md', { xs: 4, md: 8 })).toBe(8);
    expect(() => getColsFromBreakpoint('lg', { xs: 4, md: 8 })).toThrow(
      'ResponsiveGridLayout: missing cols entry for breakpoint lg'
    );
  });

  it('returns a clone of an existing responsive layout without mutating the stored layout', () => {
    const stored: Layout = [{ i: 'chart', x: 1, y: 2, w: 3, h: 4 }];
    const generated = findOrGenerateResponsiveLayout([], { md: stored }, breakpoints, 'md', null, 8, true);

    expect(generated).toEqual(stored);
    expect(generated).not.toBe(stored);
    expect(generated[0]).not.toBe(stored[0]);

    generated[0].x = 7;
    expect(stored[0].x).toBe(1);
  });

  it('uses the last breakpoint layout when a direct layout is unavailable', () => {
    const lastLayout: Layout = [{ i: 'wide', x: 11, y: 3, w: 4, h: 1 }];
    const generated = findOrGenerateResponsiveLayout([], { lg: lastLayout }, breakpoints, 'md', 'lg', 8, true);

    expect(generated).toEqual([{ i: 'wide', x: 4, y: 0, w: 4, h: 1, moved: false }]);
    expect(lastLayout).toEqual([{ i: 'wide', x: 11, y: 3, w: 4, h: 1 }]);
  });

  it('searches wider breakpoints before falling back to the original layout', () => {
    const originalLayout: Layout = [{ i: 'original', x: 8, y: 2, w: 3, h: 1 }];
    const largerLayout: Layout = [{ i: 'larger', x: 5, y: 5, w: 2, h: 1 }];

    const fromLarger = findOrGenerateResponsiveLayout(
      originalLayout,
      { lg: largerLayout },
      breakpoints,
      'sm',
      null,
      6,
      true
    );

    expect(fromLarger).toEqual([{ i: 'larger', x: 4, y: 0, w: 2, h: 1, moved: false }]);

    const fromOriginal = findOrGenerateResponsiveLayout(originalLayout, {}, breakpoints, 'sm', null, 6, true);

    expect(fromOriginal).toEqual([{ i: 'original', x: 3, y: 0, w: 3, h: 1, moved: false }]);
  });
});
