import { describe, expect, it } from 'vitest';

import { resolveMenuVisibilityOnRouteChange } from '@/views/utils/resolveMenuVisibilityOnRouteChange';

describe('resolveMenuVisibilityOnRouteChange', () => {
  it('keeps menu closed when it is already hidden', () => {
    expect(resolveMenuVisibilityOnRouteChange(false, '/swap', '/bridge')).toBe(false);
  });

  it('keeps menu open when route did not actually change', () => {
    expect(resolveMenuVisibilityOnRouteChange(true, '/swap', '/swap')).toBe(true);
  });

  it('closes menu when route changes while it is open', () => {
    expect(resolveMenuVisibilityOnRouteChange(true, '/swap', '/bridge')).toBe(false);
  });
});
