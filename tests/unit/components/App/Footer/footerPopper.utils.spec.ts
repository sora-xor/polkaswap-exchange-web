import { describe, expect, it } from 'vitest';

import {
  buildPopperClasses,
  buildReferenceClasses,
  isLoadingStatus,
  resolveTabIndex,
} from '@/components/App/Footer/footerPopper.utils';

describe('footerPopper.utils', () => {
  it('builds reference classes from the optional panel class and status', () => {
    expect(buildReferenceClasses('panel-class', 'success')).toEqual(['panel-class', 'success']);
    expect(buildReferenceClasses(null, 'error')).toEqual(['error']);
    expect(buildReferenceClasses(undefined, '')).toEqual([]);
  });

  it('always includes the tooltip base class for popper classes', () => {
    expect(buildPopperClasses('success')).toEqual(['app-status__tooltip', 'success']);
    expect(buildPopperClasses('')).toEqual(['app-status__tooltip']);
  });

  it('removes loading status controls from tab order', () => {
    expect(isLoadingStatus('info')).toBe(true);
    expect(isLoadingStatus('success')).toBe(false);
    expect(resolveTabIndex('info')).toBe(-1);
    expect(resolveTabIndex('success')).toBe(0);
  });
});
