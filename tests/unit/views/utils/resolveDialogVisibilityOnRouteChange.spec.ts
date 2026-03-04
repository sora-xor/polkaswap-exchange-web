import { describe, expect, it } from 'vitest';

import { resolveDialogVisibilityOnRouteChange } from '@/views/utils/resolveDialogVisibilityOnRouteChange';

describe('resolveDialogVisibilityOnRouteChange', () => {
  it('keeps dialog closed when it is already hidden', () => {
    expect(resolveDialogVisibilityOnRouteChange(false, '/swap', '/bridge')).toBe(false);
  });

  it('keeps dialog open when route did not actually change', () => {
    expect(resolveDialogVisibilityOnRouteChange(true, '/swap', '/swap')).toBe(true);
  });

  it('closes dialog when route changes while it is open', () => {
    expect(resolveDialogVisibilityOnRouteChange(true, '/swap', '/bridge')).toBe(false);
  });
});
