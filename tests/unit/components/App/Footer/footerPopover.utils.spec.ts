import { describe, expect, it } from 'vitest';

import { resolvePopoverLeft, shouldClosePopoverOnBreakpointChange } from '@/components/App/Footer/footerPopover.utils';

describe('shouldClosePopoverOnBreakpointChange', () => {
  it('returns true when breakpoint class changes between updates', () => {
    expect(shouldClosePopoverOnBreakpointChange('min-desktop', 'min-mobile')).toBe(true);
  });

  it('returns false when breakpoint class stays the same', () => {
    expect(shouldClosePopoverOnBreakpointChange('min-desktop', 'min-desktop')).toBe(false);
  });

  it('returns false when previous or next breakpoint is missing', () => {
    expect(shouldClosePopoverOnBreakpointChange(undefined, 'min-mobile')).toBe(false);
    expect(shouldClosePopoverOnBreakpointChange('min-desktop', undefined)).toBe(false);
  });
});

describe('resolvePopoverLeft', () => {
  it('shifts popover right when it overflows past the left viewport edge', () => {
    const next = resolvePopoverLeft({
      currentLeft: '-12px',
      popoverLeft: -12,
      popoverRight: 200,
      popoverWidth: 212,
      viewportWidth: 320,
    });

    expect(next).toBe(8);
  });

  it('shifts popover left when it overflows past the right viewport edge', () => {
    const next = resolvePopoverLeft({
      currentLeft: '180px',
      popoverLeft: 180,
      popoverRight: 380,
      popoverWidth: 200,
      viewportWidth: 320,
    });

    expect(next).toBe(112);
  });

  it('falls back to viewport padding when popover is wider than available viewport width', () => {
    const next = resolvePopoverLeft({
      currentLeft: '40px',
      popoverLeft: 40,
      popoverRight: 440,
      popoverWidth: 400,
      viewportWidth: 320,
    });

    expect(next).toBe(8);
  });

  it('falls back to measured popover left when current left offset cannot be parsed', () => {
    const next = resolvePopoverLeft({
      currentLeft: 'auto',
      popoverLeft: -14,
      popoverRight: 86,
      popoverWidth: 100,
      viewportWidth: 320,
    });

    expect(next).toBe(8);
  });
});
