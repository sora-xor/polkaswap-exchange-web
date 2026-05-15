import { describe, expect, it, vi } from 'vitest';

import { closeVisibleDialog, syncRouteScopedDialogVisibility } from '@/app/shell/dialogVisibility';

describe('app shell dialog visibility helpers', () => {
  it('syncs route-scoped dialogs only when a route transition should close them', () => {
    const setVisibility = vi.fn();

    expect(syncRouteScopedDialogVisibility({ isVisible: false, setVisibility }, '/swap', '/assets')).toBe(false);
    expect(syncRouteScopedDialogVisibility({ isVisible: true, setVisibility }, '/swap', '/swap')).toBe(false);
    expect(syncRouteScopedDialogVisibility({ isVisible: true, setVisibility }, '/swap', undefined)).toBe(false);
    expect(syncRouteScopedDialogVisibility({ isVisible: true, setVisibility }, '/swap', '/assets')).toBe(true);
    expect(syncRouteScopedDialogVisibility({ isVisible: true, setVisibility: undefined }, '/swap', '/assets')).toBe(
      false
    );

    expect(setVisibility).toHaveBeenCalledOnce();
    expect(setVisibility).toHaveBeenCalledWith(false);
  });

  it('closes visible dialogs across breakpoint transitions', () => {
    const setVisibility = vi.fn();

    expect(closeVisibleDialog({ isVisible: false, setVisibility })).toBe(false);
    expect(closeVisibleDialog({ isVisible: true, setVisibility })).toBe(true);
    expect(closeVisibleDialog({ isVisible: true, setVisibility: undefined })).toBe(false);

    expect(setVisibility).toHaveBeenCalledOnce();
    expect(setVisibility).toHaveBeenCalledWith(false);
  });
});
