import { describe, expect, it } from 'vitest';

import { resolveMenuVisibilityOnBreakpointChange } from '@/views/utils/resolveMenuVisibilityOnBreakpointChange';

describe('resolveMenuVisibilityOnBreakpointChange', () => {
  it('keeps menu closed when it is already hidden', () => {
    expect(resolveMenuVisibilityOnBreakpointChange(false, 'mobile', 'desktop')).toBe(false);
  });

  it('keeps menu open when breakpoint did not actually change', () => {
    expect(resolveMenuVisibilityOnBreakpointChange(true, 'mobile', 'mobile')).toBe(true);
  });

  it('closes menu when breakpoint changes while it is open', () => {
    expect(resolveMenuVisibilityOnBreakpointChange(true, 'mobile', 'desktop')).toBe(false);
  });
});
