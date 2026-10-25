import { describe, expect, it } from 'vitest';

import { resolveWalletOverlayVisibility } from '@/views/utils/resolveWalletOverlayVisibility';

describe('resolveWalletOverlayVisibility', () => {
  it('returns true only when wallet is loaded and teardown is inactive', () => {
    expect(resolveWalletOverlayVisibility(true, false)).toBe(true);
  });

  it('returns false when wallet is not loaded', () => {
    expect(resolveWalletOverlayVisibility(false, false)).toBe(false);
  });

  it('returns false during teardown even if wallet is loaded', () => {
    expect(resolveWalletOverlayVisibility(true, true)).toBe(false);
  });
});
